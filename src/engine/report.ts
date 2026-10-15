import { APTITUDES, DOMAINS, RIASEC, RIASEC_KEYS, STYLES, VALUES } from '../domain/dimensions';
import { demandLabel } from '../domain/careerModel';
import type { AptitudeKey, DomainKey, EvidenceSource, ExperienceTemplate, ResolvedCareer, StyleKey, ValueKey } from '../domain/types';
import { completeness, type Completeness } from './adaptive';
import type { EngineContext } from './context';
import { experiencesFor } from './experiences';
import { SOURCE_LABEL, getEst, type Estimate } from './profile';
import { band, pct, type RankingEntry } from './scoring';
import type { RankingSnapshot } from './session';

export interface StrengthItem { label: string; key: string; est: number; demonstrated: boolean; sources: string; }

export interface CareerReport {
  entry: RankingEntry;
  career: ResolvedCareer;
  strengths: string[];
  difficulties: string[];
  evidence: string[];
  perspectives: string;
  perspectivesStatus: 'verificado' | 'estimado' | 'insuficiente';
  preferredVariant?: string;
  experiences: ExperienceTemplate[];
}

export interface LowerAlternative {
  id: string;
  name: string;
  rank: number;
  overall: number;
  reasons: { type: 'falta_interes' | 'actividades' | 'dificultad_academica' | 'falta_informacion' | 'viabilidad'; text: string }[];
}

export interface Report {
  status: 'provisional' | 'final';
  completeness: Completeness;
  profile: {
    summary: string;
    approach: string[];
    stimulating: string[];
    strengths: StrengthItem[];
    environments: string[];
    frustrations: string[];
    uncertain: string[];
    undeveloped: string[];
  };
  ranking: CareerReport[];
  finalists: CareerReport[];
  comparison: { shared: string[]; differences: { aspect: string; values: { name: string; value: string }[] }[]; leanings: string[] };
  development: { label: string; text: string }[];
  lower: LowerAlternative[];
  insufficientData: string[];
  recommendation: {
    kind: 'clara' | 'empate' | 'insuficiente';
    headline: string;
    main: string[];
    alternatives: string[];
    differences: string[];
    doubts: string[];
    plan: string[];
  };
  weights: { A: number; B: number; C: number; explicit: boolean };
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);
const OBSERVED: EvidenceSource[] = ['ejercicio', 'experiencia', 'practica', 'conducta'];

function sourcesText(e: Estimate): string {
  return Object.entries(e.bySource).sort((a, b) => (b[1]?.w ?? 0) - (a[1]?.w ?? 0)).map(([s, x]) => `${SOURCE_LABEL[s as EvidenceSource]} (${x?.n})`).join(' · ');
}

function topEntries(ctx: EngineContext, kind: string, minConf = 0.3) {
  return Object.entries(ctx.profile)
    .filter(([k, e]) => k.startsWith(`${kind}:`) && e.conf >= minConf)
    .map(([k, e]) => ({ key: k.slice(kind.length + 1), e }));
}

function buildProfile(ctx: EngineContext): Report['profile'] {
  const p = ctx.profile;
  const riasec = RIASEC_KEYS.map((k) => ({ k, e: getEst(p, 'riasec', k) })).sort((a, b) => b.e.est - a.e.est);
  const style = (k: StyleKey) => getEst(p, 'style', k);
  const approach: string[] = [];
  const pr = style('practica'), ej = style('ejecucion'), pa = style('paciencia'), inc = style('incertidumbre'), es = style('estructura');
  if (pr.n) approach.push(pr.est >= 0.6 ? 'Tendés a entender mejor las cosas cuando las aplicás a problemas concretos.' : pr.est <= 0.4 ? 'Te atrae comprender la teoría y los porqués antes de aplicar.' : 'Combinás comprensión teórica y aplicación práctica sin una preferencia marcada.');
  if (ej.n) approach.push(ej.est >= 0.6 ? 'Disfrutás más producir y ver un resultado terminado que investigar indefinidamente.' : ej.est <= 0.4 ? 'Disfrutás investigar y entender un problema a fondo antes de producir.' : 'Te sentís cómodo/a tanto investigando como produciendo.');
  if (pa.n) approach.push(pa.est >= 0.62 ? 'Tenés disposición para sostener problemas largos (semanas o meses).' : pa.est <= 0.38 ? 'Preferís problemas que se resuelven en plazos cortos y dan resultados rápidos.' : 'Tolerás problemas de duración media.');
  if (inc.n) approach.push(inc.est >= 0.62 ? 'La incertidumbre te estimula: podés avanzar sin tener todas las respuestas.' : inc.est <= 0.38 ? 'Preferís tener certezas antes de avanzar; la incertidumbre te incomoda.' : 'Manejás la incertidumbre de forma moderada.');
  if (es.n) approach.push(es.est >= 0.62 ? 'Te ordenan los procedimientos y criterios claros.' : es.est <= 0.38 ? 'Necesitás libertad para encarar las tareas a tu manera.' : '');
  const probs = (ctx.state.answers.q1_problemas?.value as string[] | undefined) ?? [];
  const probLabels: Record<string, string> = { exactos: 'problemas con respuesta exacta y demostrable', tecnicos: 'problemas técnicos (algo que no funciona)', personas: 'problemas de personas', organizacion: 'problemas de organización', creativos: 'problemas creativos sin respuesta única', comprension: 'entender por qué ocurren las cosas', argumentacion: 'problemas de argumentación', precision: 'problemas de precisión y control' };
  if (probs.length) approach.unshift(`Te atraen especialmente ${list(probs.map((x) => probLabels[x]).filter(Boolean))}.`);

  const doms = topEntries(ctx, 'domain').filter((x) => x.e.est >= 0.65).sort((a, b) => b.e.est - a.e.est).slice(0, 4);
  const likes = topEntries(ctx, 'demand').filter((x) => x.e.est >= 0.68).sort((a, b) => b.e.est - a.e.est).slice(0, 4);
  const stimulating = [
    ...doms.map((d) => `${DOMAINS[d.key as DomainKey]}${d.e.bySource.conducta && d.e.bySource.conducta.est >= 0.7 ? ' (interés que ya llevás a la práctica)' : ''}`),
    ...likes.map((d) => `Tareas como: ${demandLabel(ctx.catalog, d.key).toLowerCase()}`),
  ];

  const strengths: StrengthItem[] = topEntries(ctx, 'aptitude').filter((x) => x.e.est >= 0.62).sort((a, b) => b.e.est - a.e.est).slice(0, 6)
    .map((x) => ({ key: x.key, label: APTITUDES[x.key as AptitudeKey], est: x.e.est, demonstrated: OBSERVED.some((s) => x.e.bySource[s]), sources: sourcesText(x.e) }));

  const environments: string[] = [];
  for (const x of topEntries(ctx, 'style').filter((x) => Math.abs(x.e.est - 0.5) >= 0.2).sort((a, b) => Math.abs(b.e.est - 0.5) - Math.abs(a.e.est - 0.5)).slice(0, 5)) {
    environments.push(STYLES[x.key as StyleKey][x.e.est > 0.5 ? 1 : 0]);
  }
  const frustrations: string[] = topEntries(ctx, 'demand').filter((x) => x.e.est <= 0.3).sort((a, b) => a.e.est - b.e.est).slice(0, 5)
    .map((x) => demandLabel(ctx.catalog, x.key));
  for (const x of topEntries(ctx, 'style').filter((x) => Math.abs(x.e.est - 0.5) >= 0.3).slice(0, 2)) frustrations.push(`Entornos donde predomine: ${STYLES[x.key as StyleKey][x.e.est > 0.5 ? 0 : 1].toLowerCase()}`);

  const uncertain: string[] = [];
  for (const c of ctx.contradictions.filter((c) => !(c.id in ctx.state.answers))) uncertain.push(c.description);
  const finalists = ctx.ranking.slice(0, 5).map((r) => ctx.careers.find((c) => c.id === r.id)!);
  const relevantApts = new Set(finalists.flatMap((c) => Object.entries(c.aptitudes).filter(([, w]) => (w ?? 0) >= 0.7).map(([k]) => k)));
  for (const a of relevantApts) if (getEst(ctx.profile, 'aptitude', a).conf < 0.3) uncertain.push(`Hay poca evidencia sobre ${APTITUDES[a as AptitudeKey].toLowerCase()}, importante en tus opciones principales.`);
  const relevantDem = new Set(finalists.flatMap((c) => Object.entries(c.demands).filter(([, w]) => w >= 0.8).map(([k]) => k)));
  for (const d of relevantDem) if (getEst(ctx.profile, 'demand', d).conf < 0.3) uncertain.push(`Todavía no sabemos cómo vivirías «${demandLabel(ctx.catalog, d).toLowerCase()}».`);

  const undeveloped: string[] = [];
  for (const id of ['q3_auto_a', 'q3_auto_b']) {
    const v = ctx.state.answers[id]?.value as Record<string, string> | undefined;
    for (const [k, val] of Object.entries(v ?? {})) if (val === 'nt') undeveloped.push(APTITUDES[k as AptitudeKey]);
  }

  const top2 = riasec.slice(0, 2).filter((x) => x.e.conf >= 0.3);
  const summary = top2.length
    ? `Tu perfil combina sobre todo intereses de tipo ${list(top2.map((x) => RIASEC[x.k].label.toLowerCase()))}${doms.length ? `, con atracción por ${list(doms.slice(0, 3).map((d) => DOMAINS[d.key as DomainKey].toLowerCase()))}` : ''}.`
    : 'Todavía no hay evidencia suficiente para describir tu perfil de intereses.';

  return { summary, approach: approach.filter(Boolean), stimulating, strengths, environments, frustrations, uncertain: uncertain.slice(0, 8), undeveloped };
}

function careerReport(ctx: EngineContext, entry: RankingEntry): CareerReport {
  const career = ctx.careers.find((c) => c.id === entry.id)!;
  const strengths: string[] = [];
  const difficulties: string[] = [];
  const evidence: string[] = [];
  for (const d of entry.drivers) {
    const lbl = d.kind === 'aptitude' ? APTITUDES[d.key as AptitudeKey] : d.kind === 'domain' ? DOMAINS[d.key as DomainKey] : d.kind === 'demand' ? demandLabel(ctx.catalog, d.key) : `interés ${RIASEC[d.key as keyof typeof RIASEC]?.label.toLowerCase()}`;
    const e = getEst(ctx.profile, d.kind as never, d.key);
    if (d.impact > 0.04) {
      if (d.kind === 'aptitude') strengths.push(`${lbl} (${band(e.est)})`);
      else if (d.kind === 'demand') strengths.push(`Buena disposición frente a: ${lbl.toLowerCase()}`);
      else strengths.push(`Afinidad con ${lbl.toLowerCase()}`);
      evidence.push(`${lbl}: ${band(e.est)} — ${sourcesText(e)}`);
    } else if (d.impact < -0.04) {
      if (d.kind === 'demand') difficulties.push(`Te resultaría poco atractivo: ${lbl.toLowerCase()}`);
      else if (d.kind === 'aptitude') difficulties.push(`${lbl} aparece como un área a desarrollar`);
      else difficulties.push(`Menor afinidad con ${lbl.toLowerCase()}`);
      evidence.push(`${lbl}: ${band(e.est)} — ${sourcesText(e)}`);
    }
  }
  for (const d of career.difficulties.slice(0, 2)) difficulties.push(d);
  for (const i of entry.viability.issues) difficulties.push(`Viabilidad: ${i.text}`);
  const pref = Object.entries(ctx.profile).find(([k]) => k.startsWith(`career:${career.id}#`));
  const preferredVariant = pref ? career.variants?.find((v) => v.id === pref[0].split('#')[1])?.name : entry.bestVariant?.name;
  const perspectivesStatus = career.dataStatus;
  const perspectives = `${career.futureNote ? `${career.futureNote} ` : ''}Inserción laboral estimada: ${band(career.future.demanda ?? 0.5)}; ingresos potenciales: ${band(career.future.ingresos ?? 0.5)}. ${perspectivesStatus === 'verificado' ? '' : 'Estimación cualitativa general, pendiente de verificar con datos oficiales.'}`;
  return { entry, career, strengths: strengths.slice(0, 5), difficulties: difficulties.slice(0, 6), evidence: evidence.slice(0, 6), perspectives, perspectivesStatus, preferredVariant, experiences: experiencesFor(career) };
}

function pickFinalists(ranking: RankingEntry[]): RankingEntry[] {
  if (!ranking.length) return [];
  const out: RankingEntry[] = [];
  for (const r of ranking) {
    if (out.length >= 5) break;
    if (out.length >= 3 && r.tieGroup !== out[out.length - 1].tieGroup) break;
    if (r.overall < ranking[0].overall - 0.15) break;
    out.push(r);
  }
  return out;
}

function compareFinalists(ctx: EngineContext, fin: CareerReport[]): Report['comparison'] {
  if (fin.length < 2) return { shared: [], differences: [], leanings: [] };
  const cs = fin.map((f) => f.career);
  const shared: string[] = [];
  for (const d of Object.keys(DOMAINS) as DomainKey[]) if (cs.every((c) => (c.domains[d] ?? 0) >= 0.6)) shared.push(`Área común: ${DOMAINS[d].toLowerCase()}`);
  for (const k of Object.keys(APTITUDES) as AptitudeKey[]) if (cs.every((c) => (c.aptitudes[k] ?? 0) >= 0.7)) shared.push(`Aptitud requerida en todas: ${APTITUDES[k].toLowerCase()}`);
  const differences: Report['comparison']['differences'] = [];
  const demandKeys = new Set(cs.flatMap((c) => Object.keys(c.demands)));
  const diffs = [...demandKeys].map((k) => ({ k, vals: cs.map((c) => c.demands[k] ?? 0) })).map((x) => ({ ...x, range: Math.max(...x.vals) - Math.min(...x.vals) })).filter((x) => x.range >= 0.4).sort((a, b) => b.range - a.range).slice(0, 5);
  const lvl = (v: number) => (v >= 0.8 ? 'central' : v >= 0.5 ? 'frecuente' : v > 0 ? 'ocasional' : 'poco habitual');
  for (const d of diffs) differences.push({ aspect: demandLabel(ctx.catalog, d.k), values: cs.map((c, i) => ({ name: c.name, value: lvl(d.vals[i]) })) });
  differences.push({ aspect: 'Duración estimada', values: cs.map((c) => ({ name: c.name, value: c.durationYears ? `${c.durationYears} años${c.durationStatus === 'verificado' ? '' : ' (a verificar)'}` : 'sin datos' })) });
  differences.push({ aspect: 'Futuro profesional (estimado)', values: fin.map((f) => ({ name: f.career.name, value: band(f.entry.C) })) });
  const leanings: string[] = [];
  for (const d of diffs.slice(0, 3)) {
    const e = getEst(ctx.profile, 'demand', d.k);
    const hi = cs[d.vals.indexOf(Math.max(...d.vals))].name;
    const lo = cs[d.vals.indexOf(Math.min(...d.vals))].name;
    if (e.conf < 0.3) leanings.push(`Si «${demandLabel(ctx.catalog, d.k).toLowerCase()}» te resultara atractivo, se inclinaría hacia ${hi}; si no, hacia ${lo}. Todavía no hay evidencia suficiente sobre esto.`);
    else leanings.push(`Tu disposición frente a «${demandLabel(ctx.catalog, d.k).toLowerCase()}» (${band(e.est)}) ${e.est >= 0.55 ? `favorece a ${hi}` : `favorece a ${lo}`}.`);
  }
  return { shared: shared.slice(0, 6), differences, leanings };
}

function lowerAlternatives(ctx: EngineContext, finalistIds: Set<string>): LowerAlternative[] {
  const rest = ctx.ranking.filter((r) => !finalistIds.has(r.id));
  const sample = [...rest.slice(0, 6), ...rest.slice(-4)];
  return sample.map((r) => {
    const reasons: LowerAlternative['reasons'] = [];
    if (r.parts.domain < 0.45 || r.parts.riasec < 0.45) reasons.push({ type: 'falta_interes', text: 'Menor interés por las áreas y tipos de actividad centrales de esta carrera.' });
    if (r.parts.demand < 0.45) reasons.push({ type: 'actividades', text: 'Varias actividades habituales de la formación o el trabajo te resultarían poco atractivas.' });
    const observedA = r.readiness;
    if (r.A < 0.45 && observedA != null) reasons.push({ type: 'dificultad_academica', text: 'Algunas aptitudes centrales aparecen, por ahora, como áreas a desarrollar (no es una limitación permanente).' });
    if (r.coverage.B < 0.35 || r.coverage.A < 0.3) reasons.push({ type: 'falta_informacion', text: 'Hay poca evidencia sobre dimensiones importantes para esta carrera; podría estar subestimada.' });
    if (r.viability.level === 'restriccion_importante') reasons.push({ type: 'viabilidad', text: r.viability.issues.find((i) => i.severity === 'bloqueante')?.text ?? 'Restricción práctica importante.' });
    if (!reasons.length) reasons.push({ type: 'actividades', text: 'Tiene buena afinidad, pero algo menor que las opciones mejor ubicadas en el balance de las tres dimensiones.' });
    return { id: r.id, name: r.name, rank: r.rank, overall: r.overall, reasons };
  });
}

export function buildReport(ctx: EngineContext): Report {
  const comp = completeness(ctx);
  const final = ctx.state.status === 'finalizada' && comp.canFinalize;
  const profile = buildProfile(ctx);
  const top = ctx.ranking.filter((r) => r.overall >= (ctx.ranking[0]?.overall ?? 0) - 0.2).slice(0, 12);
  const ranking = top.map((r) => careerReport(ctx, r));
  const finalists = pickFinalists(ctx.ranking).map((r) => ranking.find((x) => x.entry.id === r.id) ?? careerReport(ctx, r));
  const comparison = compareFinalists(ctx, finalists);
  const lower = lowerAlternatives(ctx, new Set(finalists.map((f) => f.entry.id)));

  const development: Report['development'] = [];
  for (const f of finalists.slice(0, 3)) {
    for (const [k, w] of Object.entries(f.career.aptitudes)) {
      if ((w ?? 0) < 0.7) continue;
      const e = getEst(ctx.profile, 'aptitude', k);
      if (e.est < 0.5 && !development.some((d) => d.label === APTITUDES[k as AptitudeKey])) {
        development.push({ label: APTITUDES[k as AptitudeKey], text: `Importante en ${f.career.name}. Hoy aparece ${band(e.est)}${e.conf < 0.35 ? ' (con poca evidencia)' : ''}; se puede entrenar con práctica deliberada antes y durante la carrera.` });
      }
    }
  }
  for (const u of profile.undeveloped) development.push({ label: u, text: 'Indicaste que todavía no tuviste oportunidad de comprobarla: es una hipótesis abierta, no una debilidad.' });

  const firstGroup = ctx.ranking.filter((r) => r.tieGroup === ctx.ranking[0]?.tieGroup);
  let kind: Report['recommendation']['kind'] = firstGroup.length >= 2 ? 'empate' : 'clara';
  if (!comp.canFinalize) kind = 'insuficiente';
  const doubts: string[] = [...profile.uncertain.slice(0, 4)];
  for (const f of finalists) for (const i of f.entry.viability.issues.filter((i) => i.severity !== 'info')) doubts.push(`${f.career.name}: ${i.text}`);
  if (finalists.some((f) => f.perspectivesStatus !== 'verificado')) doubts.push('Las perspectivas laborales son estimaciones cualitativas: conviene verificarlas con datos oficiales (planes de estudio, observatorios de empleo, graduados).');
  const plan: string[] = [];
  for (const f of finalists.slice(0, 4)) {
    const exp = f.experiences[0];
    plan.push(`${f.career.name}: hacer la experiencia «${exp.title}» para comprobar que ${exp.hypothesis.charAt(0).toLowerCase()}${exp.hypothesis.slice(1)}`);
  }
  plan.push('Revisar los planes de estudio oficiales de las finalistas y marcar qué materias de los primeros años entusiasman, se tolerarían o preocupan.');
  plan.push('Conversar con al menos un estudiante avanzado o graduado de cada finalista.');
  if (finalists.some((f) => (f.career.restrictions ?? []).length)) plan.push('Consultar en las facultades los requisitos de ingreso y condiciones señaladas en viabilidad.');
  plan.push('Registrar cada experiencia en la sección «Experiencias»: el análisis se actualiza y muestra qué cambió y por qué.');

  const names = (rs: { name: string }[]) => rs.map((r) => r.name);
  const headline = kind === 'insuficiente'
    ? 'Resultados provisionales: todavía falta información esencial para una recomendación.'
    : kind === 'empate'
      ? `No hay una ganadora clara: ${list(names(firstGroup.slice(0, 4)))} son igualmente compatibles con la evidencia actual.`
      : `La opción con la combinación más convincente de aptitudes, intereses y futuro profesional es ${ctx.ranking[0].name}.`;
  const differences = comparison.leanings.length ? comparison.leanings : ['Las diferencias entre las finalistas son pequeñas en todas las dimensiones evaluadas.'];

  return {
    status: final ? 'final' : 'provisional',
    completeness: comp,
    profile,
    ranking,
    finalists,
    comparison,
    development,
    lower,
    insufficientData: ctx.scores.filter((s) => s.insufficientData).map((s) => s.name),
    recommendation: {
      kind, headline,
      main: kind === 'clara' ? [ctx.ranking[0].name] : names(firstGroup.slice(0, 5)),
      alternatives: names(finalists.filter((f) => !firstGroup.some((g) => g.id === f.entry.id)).map((f) => f.entry)),
      differences,
      doubts: doubts.slice(0, 8),
      plan,
    },
    weights: ctx.dw,
  };
}

export function fmtPct(x: number) {
  return `${pct(x)} %`;
}

export function takeSnapshot(ctx: EngineContext, reason: string, at = new Date().toISOString()): RankingSnapshot {
  return { at, reason, ranking: ctx.ranking.slice(0, 15).map((r) => ({ id: r.id, overall: r.overall, A: r.A, B: r.B, C: r.C, hw: r.hw })) };
}

export interface SnapshotChange { id: string; name: string; before: number | null; after: number; rankBefore: number | null; rankAfter: number; delta: number; dims: { A: number; B: number; C: number } }

export function diffSnapshots(prev: RankingSnapshot, curr: RankingSnapshot, nameOf: (id: string) => string): SnapshotChange[] {
  return curr.ranking.map((r, i) => {
    const j = prev.ranking.findIndex((x) => x.id === r.id);
    const p = j >= 0 ? prev.ranking[j] : null;
    return {
      id: r.id, name: nameOf(r.id), before: p?.overall ?? null, after: r.overall, rankBefore: j >= 0 ? j + 1 : null, rankAfter: i + 1,
      delta: p ? r.overall - p.overall : 0, dims: { A: p ? r.A - p.A : 0, B: p ? r.B - p.B : 0, C: p ? r.C - p.C : 0 },
    };
  });
}

export const VALUE_LABEL = (k: string) => VALUES[k as ValueKey] ?? k;
