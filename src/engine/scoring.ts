import { EXTRINSIC_VALUES, INTRINSIC_VALUES, RIASEC_KEYS } from '../domain/dimensions';
import { applyVariant } from '../domain/careerModel';
import type { ResolvedCareer, RiasecKey, StyleKey, ValueKey } from '../domain/types';
import { estFromSources, getEst, type Profile } from './profile';

/**
 * SISTEMA DE PUNTUACIÓN
 * Transparente y reproducible: mismas respuestas → mismas puntuaciones.
 * Todas las subpuntuaciones están en 0..1, donde 0.5 representa "sin información / neutro".
 * Los pesos de cada componente son constantes documentadas, no se ajustan por carrera.
 */
export const WEIGHTS = {
  B: { riasec: 0.22, domain: 0.28, demand: 0.28, style: 0.12, intrinsic: 0.1 },
  C: { extrinsic: 0.6, outlook: 0.4 },
  /** Penalización cuando aptitud o interés central son bajos: evita que un buen ingreso o un gran
   * entusiasmo compensen por completo una incompatibilidad con las actividades centrales. */
  corePenalty: { threshold: 0.45, factor: 0.6 },
  /** Atenuación del futuro profesional cuando la afinidad o la aptitud central son bajas. */
  futureGate: { from: 0.25, span: 0.25 },
  /** Límite del ajuste por evidencia específica de carrera (comparaciones y experiencias prácticas). */
  careerAdjCap: 0.12,
  /** Límites de los pesos de dimensión ajustables por la persona. */
  dimMin: 0.2,
  dimMax: 0.5,
} as const;

export interface DimensionWeights { A: number; B: number; C: number; explicit: boolean }

export interface CareerScore {
  id: string;
  name: string;
  insufficientData: boolean;
  A: number;          // aptitudes y potencial
  B: number;          // intereses y compatibilidad personal
  C: number;          // futuro profesional
  overall: number;    // compatibilidad estimada global
  hw: number;         // semiancho del intervalo de incertidumbre
  hwDims: { A: number; B: number; C: number };
  confidence: 'alta' | 'media' | 'baja';
  readiness: number | null;  // preparación actual (solo evidencia observada)
  potential: number;          // potencial de desarrollo
  valuesFit: number;          // compatibilidad con valores (intrínsecos + extrínsecos)
  parts: {
    riasec: number; domain: number; demand: number; style: number; intrinsic: number; careerAdj: number;
    extrinsic: number; outlook: number; corePenalty: number; futureGate: number;
  };
  coverage: { A: number; B: number; C: number };
  bestVariant?: { id: string; name: string; B: number };
  /** Principales contribuciones positivas y negativas (para explicar el resultado). */
  drivers: { label: string; kind: string; key: string; impact: number; userEst: number; userConf: number }[];
  viability: Viability;
}

export interface Viability {
  level: 'sin_restricciones' | 'con_condiciones' | 'restriccion_importante';
  issues: { severity: 'bloqueante' | 'condicion' | 'info'; text: string }[];
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function dimensionWeights(p: Profile): DimensionWeights {
  const a = getEst(p, 'weight', 'A');
  const b = getEst(p, 'weight', 'B');
  const c = getEst(p, 'weight', 'C');
  if (a.n + b.n + c.n === 0) return { A: 1 / 3, B: 1 / 3, C: 1 / 3, explicit: false };
  // Se usan solo los valores declarados (sin prior) y se acotan para que ninguna dimensión domine.
  const raw = [a, b, c].map((e) => (e.n ? Object.values(e.bySource).reduce((s, x) => s + (x?.est ?? 0) * (x?.w ?? 0), 0) / e.w : 1 / 3));
  const bounded = raw.map((x) => Math.max(WEIGHTS.dimMin, Math.min(WEIGHTS.dimMax, x)));
  const sum = bounded.reduce((s, x) => s + x, 0);
  return { A: bounded[0] / sum, B: bounded[1] / sum, C: bounded[2] / sum, explicit: true };
}

function weightedMean(entries: [number, number][]): number {
  let w = 0, s = 0;
  for (const [weight, v] of entries) { w += weight; s += weight * v; }
  return w > 0 ? s / w : 0.5;
}

function riasecFit(c: ResolvedCareer, p: Profile): { fit: number; cov: number } {
  const ests = RIASEC_KEYS.map((k) => getEst(p, 'riasec', k));
  const mean = ests.reduce((s, e) => s + e.est, 0) / ests.length;
  let fit = 0, cov = 0;
  RIASEC_KEYS.forEach((k, i) => {
    const w = c.riasec[k as RiasecKey] ?? 0;
    const abs = ests[i].est;
    const rel = clamp01(0.5 + (ests[i].est - mean) * 1.5);
    fit += w * (0.5 * abs + 0.5 * rel);
    cov += w * ests[i].conf;
  });
  return { fit, cov };
}

function mapFit(map: Record<string, number | undefined>, p: Profile, kind: 'domain' | 'demand' | 'aptitude') {
  const entries: [number, number][] = [];
  let covW = 0, cov = 0;
  for (const [k, w] of Object.entries(map)) {
    if (!w) continue;
    const e = getEst(p, kind, k);
    entries.push([w, e.est]);
    covW += w; cov += w * e.conf;
  }
  return { fit: weightedMean(entries), cov: covW ? cov / covW : 0 };
}

function styleFit(c: ResolvedCareer, p: Profile) {
  const entries: [number, number][] = [];
  let covW = 0, cov = 0;
  for (const [k, tw] of Object.entries(c.style)) {
    if (!tw) continue;
    const [t, w] = tw;
    const e = getEst(p, 'style', k as StyleKey);
    // Neutro (0,5) cuando no hay información: se mide la mejora respecto de no saber nada.
    entries.push([w, 0.5 + (Math.abs(0.5 - t) - Math.abs(e.est - t))]);
    covW += w; cov += w * e.conf;
  }
  return { fit: weightedMean(entries), cov: covW ? cov / covW : 0 };
}

function valuesFit(c: ResolvedCareer, p: Profile, keys: ValueKey[]) {
  // Solo cuentan los valores que la persona considera importantes (por encima de neutro):
  // no valorar algo no vuelve peor a una carrera que lo ofrece. Sin información → 0,5.
  let sw = 0, s = 0, cov = 0;
  for (const k of keys) {
    const imp = getEst(p, 'value', k);
    const w = Math.max(0, (imp.est - 0.5) * 2);
    sw += w;
    s += w * ((c.future[k] ?? 0.5) - 0.5);
    cov += imp.conf;
  }
  return { fit: clamp01(0.5 + s / Math.max(sw, 1.5)), cov: cov / keys.length };
}

function careerAdj(c: ResolvedCareer, p: Profile): { adj: number; w: number } {
  const e = getEst(p, 'career', c.id);
  if (!e.n) return { adj: 0, w: 0 };
  // Desviación respecto de neutro, con encogimiento: una única experiencia no decide.
  const raw = (e.est - 0.5) * (e.w / (e.w + 3));
  return { adj: Math.max(-WEIGHTS.careerAdjCap, Math.min(WEIGHTS.careerAdjCap, raw)), w: e.w };
}

export function scoreCareer(c: ResolvedCareer, p: Profile, dw: DimensionWeights, constraints: Set<string>, maxYears: number | null): CareerScore {
  const viability = computeViability(c, constraints, maxYears);
  if (c.dataStatus === 'insuficiente') {
    return {
      id: c.id, name: c.name, insufficientData: true, A: NaN, B: NaN, C: NaN, overall: NaN, hw: NaN,
      hwDims: { A: NaN, B: NaN, C: NaN }, confidence: 'baja', readiness: null, potential: NaN, valuesFit: NaN,
      parts: { riasec: NaN, domain: NaN, demand: NaN, style: NaN, intrinsic: NaN, careerAdj: 0, extrinsic: NaN, outlook: NaN, corePenalty: 0, futureGate: 0 },
      coverage: { A: 0, B: 0, C: 0 }, drivers: [], viability,
    };
  }

  // A — aptitudes
  const apt = mapFit(c.aptitudes as Record<string, number>, p, 'aptitude');
  let rW = 0, rS = 0;
  for (const [k, w] of Object.entries(c.aptitudes)) {
    if (!w) continue;
    const obs = estFromSources(getEst(p, 'aptitude', k), ['ejercicio', 'experiencia', 'practica']);
    if (obs) { rW += w; rS += w * obs.est; }
  }
  const totalAptW = Object.values(c.aptitudes).reduce((s: number, x) => s + (x ?? 0), 0);
  const readiness = rW > 0 && rW / totalAptW >= 0.35 ? rS / rW : null;

  // B — intereses y compatibilidad personal
  const r = riasecFit(c, p);
  const d = mapFit(c.domains as Record<string, number>, p, 'domain');
  const dm = mapFit(c.demands, p, 'demand');
  const st = styleFit(c, p);
  const vi = valuesFit(c, p, INTRINSIC_VALUES);
  const adj = careerAdj(c, p);
  let B = WEIGHTS.B.riasec * r.fit + WEIGHTS.B.domain * d.fit + WEIGHTS.B.demand * dm.fit + WEIGHTS.B.style * st.fit + WEIGHTS.B.intrinsic * vi.fit;
  B = clamp01(B + adj.adj);
  const covB = 0.22 * r.cov + 0.28 * d.cov + 0.28 * dm.cov + 0.12 * st.cov + 0.1 * vi.cov;

  // Mejor variante (orientación), si la carrera tiene variantes
  let bestVariant: CareerScore['bestVariant'];
  if (c.variants?.length) {
    for (const v of c.variants) {
      const vc = applyVariant(c, v);
      const vB = WEIGHTS.B.riasec * riasecFit(vc, p).fit + WEIGHTS.B.domain * mapFit(vc.domains as Record<string, number>, p, 'domain').fit
        + WEIGHTS.B.demand * mapFit(vc.demands, p, 'demand').fit + WEIGHTS.B.style * st.fit + WEIGHTS.B.intrinsic * vi.fit + adj.adj;
      if (!bestVariant || vB > bestVariant.B) bestVariant = { id: v.id, name: v.name, B: clamp01(vB) };
    }
  }

  // C — futuro profesional
  const ve = valuesFit(c, p, EXTRINSIC_VALUES);
  const outlook = c.future.demanda ?? 0.5;
  const C = WEIGHTS.C.extrinsic * ve.fit + WEIGHTS.C.outlook * outlook;
  // El futuro profesional de una carrera cuyas actividades no te interesan o no te resultan
  // accesibles pesa menos: se atenúa su desviación respecto de neutro según min(A, B).
  const gate = Math.max(0, Math.min(1, (Math.min(apt.fit, B) - WEIGHTS.futureGate.from) / WEIGHTS.futureGate.span));
  const Ceff = 0.5 + (C - 0.5) * gate;
  const dataConf = c.dataStatus === 'verificado' ? 0.75 : 0.5;

  // Potencial: aptitud estimada + facilidad de aprendizaje + interés (autoeficacia e interés se retroalimentan).
  const learn = getEst(p, 'aptitude', 'aprendizaje');
  const potential = clamp01(apt.fit + 0.25 * (learn.est - 0.5) + 0.2 * (B - 0.5));

  const base = dw.A * apt.fit + dw.B * B + dw.C * Ceff;
  const pen = WEIGHTS.corePenalty.factor * Math.max(0, WEIGHTS.corePenalty.threshold - Math.min(apt.fit, B));
  const overall = clamp01(base - pen);

  // Semiancho del intervalo: crece cuando falta evidencia (cobertura) y cuando los datos de la carrera son estimados.
  const hwA = 0.02 + 0.16 * (1 - apt.cov);
  const hwB = 0.02 + 0.16 * (1 - covB);
  const hwC = 0.02 + 0.12 * (1 - ve.cov) + 0.06 * (1 - dataConf);
  const hw = 0.8 * (dw.A * hwA + dw.B * hwB + dw.C * hwC) + 0.01;
  const confidence = hw < 0.07 ? 'alta' : hw < 0.11 ? 'media' : 'baja';

  return {
    id: c.id, name: c.name, insufficientData: false,
    A: apt.fit, B, C, overall, hw, hwDims: { A: hwA, B: hwB, C: hwC }, confidence,
    readiness, potential,
    valuesFit: (vi.fit + ve.fit) / 2,
    parts: { riasec: r.fit, domain: d.fit, demand: dm.fit, style: st.fit, intrinsic: vi.fit, careerAdj: adj.adj, extrinsic: ve.fit, outlook, corePenalty: pen, futureGate: gate },
    coverage: { A: apt.cov, B: covB, C: ve.cov * (dataConf / 0.75) },
    bestVariant,
    drivers: computeDrivers(c, p),
    viability,
  };
}

/** Contribuciones: (valor del usuario − 0,5) × peso en la carrera. Explica por qué una carrera sube o baja. */
function computeDrivers(c: ResolvedCareer, p: Profile): CareerScore['drivers'] {
  const out: CareerScore['drivers'] = [];
  const push = (kind: 'aptitude' | 'domain' | 'demand' | 'riasec', key: string, w: number, scale: number) => {
    const e = getEst(p, kind, key);
    if (!e.n) return;
    out.push({ label: key, kind, key, impact: (e.est - 0.5) * w * scale, userEst: e.est, userConf: e.conf });
  };
  for (const [k, w] of Object.entries(c.aptitudes)) push('aptitude', k, w ?? 0, 1);
  for (const [k, w] of Object.entries(c.domains)) push('domain', k, w ?? 0, 1);
  for (const [k, w] of Object.entries(c.demands)) push('demand', k, w ?? 0, 1);
  for (const [k, w] of Object.entries(c.riasec)) push('riasec', k, (w ?? 0) * 2, 1);
  return out.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 10);
}

export function computeViability(c: ResolvedCareer, constraints: Set<string>, maxYears: number | null): Viability {
  const issues: Viability['issues'] = [];
  const r = new Set(c.restrictions ?? []);
  if (r.has('solo_nodocentes') && !constraints.has('nodocente')) issues.push({ severity: 'bloqueante', text: 'Está destinada a trabajadores nodocentes de la UNLP.' });
  if (r.has('requiere_titulo_previo') && !constraints.has('titulo_previo')) issues.push({ severity: 'bloqueante', text: 'Probablemente requiera un título previo afín para ingresar (verificar).' });
  if (r.has('formacion_musical_previa') && !constraints.has('musica_previa')) issues.push({ severity: 'condicion', text: 'Puede requerir formación musical previa para el ingreso; verificar requisitos y, si hace falta, prepararse antes.' });
  if (r.has('materiales_costosos') && constraints.has('presupuesto')) issues.push({ severity: 'condicion', text: 'Requiere gastos en materiales o instrumental; indicaste un presupuesto ajustado.' });
  if (r.has('carga_horaria_alta') && constraints.has('trabaja')) issues.push({ severity: 'condicion', text: 'Tiene una carga horaria alta; indicaste que necesitás trabajar mientras estudiás.' });
  if ((c.demands.guardias ?? 0) >= 0.8 && constraints.has('trabaja')) issues.push({ severity: 'condicion', text: 'Las prácticas incluyen turnos y guardias, difíciles de combinar con un trabajo.' });
  if (r.has('aptitud_fisica') && constraints.has('limit_fisico')) issues.push({ severity: 'condicion', text: 'Exige rendimiento físico; indicaste una condición que limita el esfuerzo físico.' });
  if (r.has('verificar_oferta')) issues.push({ severity: 'condicion', text: 'No se pudo confirmar la oferta vigente ni su facultad: verificar antes de decidir.' });
  if (maxYears != null && c.durationYears != null && c.durationYears > maxYears) issues.push({ severity: 'condicion', text: `Duración estimada de ${c.durationYears} años (${c.durationStatus === 'verificado' ? 'verificada' : 'a verificar'}); indicaste hasta ${maxYears}.` });
  if (constraints.has('corta') && c.level !== 'tecnicatura' && (c.durationYears ?? 5) > 3) issues.push({ severity: 'info', text: 'Indicaste preferir carreras cortas; esta es una carrera de grado extensa.' });
  if (constraints.has('no_laplata')) issues.push({ severity: 'condicion', text: 'Se dicta en La Plata en modalidad presencial (verificar opciones a distancia); indicaste no poder trasladarte.' });
  if (c.durationStatus === 'insuficiente' && !r.has('verificar_oferta')) issues.push({ severity: 'info', text: 'No hay datos confiables de duración.' });
  const level: Viability['level'] = issues.some((i) => i.severity === 'bloqueante')
    ? 'restriccion_importante'
    : issues.some((i) => i.severity === 'condicion') ? 'con_condiciones' : 'sin_restricciones';
  return { level, issues };
}

export interface RankingEntry extends CareerScore {
  rank: number;
  /** id del grupo de empate técnico */
  tieGroup: number;
}

/** Diferencia mínima para considerar que dos carreras se distinguen. */
export function indistinguishable(a: CareerScore, b: CareerScore): boolean {
  const diff = Math.abs(a.overall - b.overall);
  return diff < 0.025 || diff < 0.5 * (a.hw + b.hw) * 0.6;
}

export function rankCareers(scores: CareerScore[]): RankingEntry[] {
  const valid = scores.filter((s) => !s.insufficientData).sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
  const out: RankingEntry[] = [];
  let group = 0;
  let leader: CareerScore | null = null;
  valid.forEach((s, i) => {
    // Un grupo de empate se forma con las carreras indistinguibles de la primera del grupo
    // (no por encadenamiento, que uniría opciones claramente distintas).
    if (!leader) leader = s;
    else if (!indistinguishable(leader, s)) { group += 1; leader = s; }
    out.push({ ...s, rank: i + 1, tieGroup: group });
  });
  return out;
}

/** Redondeo honesto: múltiplos de 5 %, para no sugerir una precisión que no existe. */
export function pct(x: number): number {
  return Math.round((x * 100) / 5) * 5;
}

export function band(x: number): string {
  if (x >= 0.75) return 'muy alta';
  if (x >= 0.65) return 'alta';
  if (x >= 0.55) return 'media-alta';
  if (x >= 0.45) return 'media';
  if (x >= 0.35) return 'media-baja';
  return 'baja';
}
