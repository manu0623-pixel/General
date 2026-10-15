import { APTITUDES, DOMAINS, RIASEC_KEYS, STYLES } from '../domain/dimensions';
import { demandLabel } from '../domain/careerModel';
import type { AptitudeKey, CareerCatalog, DomainKey, StyleKey, ValueKey } from '../domain/types';
import { DOMAIN_BLOCKS, RIASEC_BLOCKS, STAGE1, STAGE4, STAGE5_STATIC, STYLE_CONSISTENCY_PAIRS } from '../questions/bank';
import { EXERCISES_BY_APT, exerciseValue } from '../questions/exercises';
import { SKILL_KEYS, uniqueTasks, type HypothesisItem } from '../questions/generators';
import { asArray, asRecord } from '../questions/helpers';
import type { Question } from '../questions/types';
import { buildContext, plausibleCareers, type EngineContext } from './context';
import { generateHypotheses } from './hypotheses';
import { getEst } from './profile';
import { indistinguishable } from './scoring';
import { answerOf, isAnswered, type PendingQuestion, type SessionState } from './session';
import { wordCount } from './textSignals';

/**
 * MOTOR ADAPTATIVO
 * En cada paso se reconstruye el perfil a partir de las respuestas y se elige la pregunta con mayor
 * valor de información para la etapa actual. Las razones de cada elección quedan registradas
 * (una pública, sin nombres de carreras, y una técnica). Los límites evitan alargar artificialmente.
 */
export const LIMITS = {
  demandsMin: 6,
  demandsMax: 14,
  demandInfoThreshold: 0.06,
  stage8Max: 16,
  contradictionsMax: 6,
  verificationRounds: 2,
  exercisesPerAptMax: 3,
};

export interface Candidate {
  id: string;
  internalReason: string;
}

export interface StepResult {
  state: SessionState;
  ctx: EngineContext;
  pending: PendingQuestion | null;
  question: Question | null;
  hypotheses?: HypothesisItem[];
  done: boolean;
}

const fmt = (x: number) => x.toFixed(2);

// ---------------------------------------------------------------------------
// Etapa 1
function stage1(ctx: EngineContext): Candidate[] {
  const out: Candidate[] = [];
  const { state } = ctx;
  for (const q of STAGE1) {
    if (q.when && !q.when(ctx)) continue;
    out.push({ id: q.id, internalReason: `Pregunta inicial fija de exploración (${q.id}).` });
    if (q.id === 'q1_materias') {
      for (const s of asArray(answerOf(state, 'q1_materias')).slice(0, 3)) out.push({ id: `matf:${s}`, internalReason: `Elegiste la materia «${s}»: se indaga el motivo en lugar de asumir que indica una carrera.` });
    }
    if (q.id === 'q1_materias_dificiles') {
      for (const s of asArray(answerOf(state, 'q1_materias_dificiles')).slice(0, 2)) out.push({ id: `matd:${s}`, internalReason: `Materia difícil «${s}»: distinguir dificultad real, falta de base, interés o contexto.` });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Etapa 2
function riasecAmbiguous(ctx: EngineContext): { amb: boolean; why: string } {
  const ests = RIASEC_KEYS.map((k) => ({ k, e: getEst(ctx.profile, 'riasec', k) })).sort((a, b) => b.e.est - a.e.est);
  const spread = ests[0].e.est - ests[2].e.est;
  // Dispersión dentro de un mismo tipo (ítems que se contradicen)
  let maxRange = 0, which = '';
  for (const k of RIASEC_KEYS) {
    const vals = ctx.evidence.filter((e) => e.target.kind === 'riasec' && e.target.key === k && e.questionId.startsWith('q2_riasec')).map((e) => e.value);
    if (vals.length >= 2) { const r = Math.max(...vals) - Math.min(...vals); if (r > maxRange) { maxRange = r; which = k; } }
  }
  if (spread < 0.1) return { amb: true, why: `Los tres tipos de interés principales están muy parejos (diferencia ${fmt(spread)}).` };
  if (maxRange > 0.6) return { amb: true, why: `Respuestas dispares dentro del tipo ${which} (rango ${fmt(maxRange)}).` };
  return { amb: false, why: '' };
}

function stage2(ctx: EngineContext): Candidate[] {
  const { state } = ctx;
  const out: Candidate[] = [];
  out.push({ id: 'q2_riasec_1', internalReason: 'Bloque RIASEC base.' }, { id: 'q2_riasec_2', internalReason: 'Bloque RIASEC base.' });
  for (let i = 3; i <= RIASEC_BLOCKS.length - 1; i++) {
    if (!isAnswered(state, `q2_riasec_${i - 1}`)) break;
    const { amb, why } = riasecAmbiguous(ctx);
    if (!amb && !isAnswered(state, `q2_riasec_${i}`)) break;
    out.push({ id: `q2_riasec_${i}`, internalReason: `Bloque RIASEC adicional: ${why || 'ya formulado'}` });
  }
  DOMAIN_BLOCKS.forEach((_, i) => out.push({ id: `q2_dom_${i + 1}`, internalReason: 'Exploración de áreas de interés.' }));
  if (DOMAIN_BLOCKS.every((_, i) => isAnswered(state, `q2_dom_${i + 1}`))) {
    const doms = (Object.keys(DOMAINS) as DomainKey[]).map((d) => ({ d, e: getEst(ctx.profile, 'domain', d) })).sort((a, b) => b.e.est - a.e.est);
    const top = doms.filter((x) => x.e.est >= 0.62).slice(0, 4);
    for (const t of top) out.push({ id: `behav:${t.d}`, internalReason: `Área con interés declarado alto (${fmt(t.e.est)}): verificar si es interés genuino (conducta) o teórico.` });
    const pairs: [DomainKey, DomainKey, number][] = [];
    for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) pairs.push([top[i].d, top[j].d, Math.abs(top[i].e.est - top[j].e.est)]);
    pairs.sort((a, b) => a[2] - b[2]).filter((p) => p[2] < 0.15).slice(0, 3)
      .forEach(([a, b, diff]) => out.push({ id: `pair:${a}:${b}`, internalReason: `Intereses casi empatados (${a} vs ${b}, diferencia ${fmt(diff)}): elección forzada para priorizar.` }));
  }
  out.push({ id: 'q2_combinacion', internalReason: 'Búsqueda de combinaciones de intereses poco habituales.' });
  return out;
}

// ---------------------------------------------------------------------------
// Etapa 3
export function aptitudeRelevance(ctx: EngineContext, apt: string): { rel: number; top: string[] } {
  const pl = plausibleCareers(ctx, 20, 0.06);
  let rel = 0;
  const contrib: [string, number][] = [];
  for (const { career, p } of pl) {
    const w = (career.aptitudes as Record<string, number>)[apt] ?? 0;
    rel += p * w;
    if (w >= 0.7) contrib.push([career.name, p]);
  }
  return { rel, top: contrib.sort((a, b) => b[1] - a[1]).slice(0, 3).map((c) => c[0]) };
}

const CORE_APTS: AptitudeKey[] = ['logico', 'cuantitativo', 'verbal', 'espacial', 'aprendizaje'];

function aptitudePlan(ctx: EngineContext): { apt: AptitudeKey; reason: string }[] {
  const plan: { apt: AptitudeKey; reason: string }[] = CORE_APTS.map((a) => ({ apt: a, reason: 'Aptitud de base, relevante para casi todas las opciones.' }));
  const others = (Object.keys(EXERCISES_BY_APT) as AptitudeKey[]).filter((a) => !CORE_APTS.includes(a));
  const rels = others.map((a) => ({ a, ...aptitudeRelevance(ctx, a) })).sort((x, y) => y.rel - x.rel);
  const musicPlausible = getEst(ctx.profile, 'domain', 'musica').est >= 0.65 || aptitudeRelevance(ctx, 'auditivo').rel >= 0.15;
  let added = 0;
  for (const r of rels) {
    if (r.a === 'auditivo') { if (musicPlausible) plan.push({ apt: 'auditivo', reason: 'La música aparece entre tus intereses u opciones plausibles.' }); continue; }
    if (added < 4 && r.rel >= 0.12) { plan.push({ apt: r.a, reason: `Relevante para opciones plausibles (peso medio ${fmt(r.rel)}${r.top.length ? `: ${r.top.join(', ')}` : ''}).` }); added++; }
  }
  return plan;
}

function nextExercise(ctx: EngineContext, apt: AptitudeKey): { id: string | null; results: (boolean | null)[] } {
  const items = EXERCISES_BY_APT[apt] ?? [];
  const asked = items.filter((e) => isAnswered(ctx.state, `ex:${e.id}`));
  const results = asked.map((e) => {
    const a = ctx.state.answers[`ex:${e.id}`];
    if (a.skipped) return null;
    const v = exerciseValue(e, a.value);
    return v ? v.correct : null;
  });
  if (asked.some((e) => asRecord(ctx.state.answers[`ex:${e.id}`].value).skip === 'audio')) return { id: null, results };
  const pick = (d: number) => items.find((e) => e.difficulty === d && !isAnswered(ctx.state, `ex:${e.id}`));
  if (apt === 'creatividad') {
    // Creatividad: un ítem, y un segundo si es muy relevante
    if (!asked.length) return { id: `ex:${items[0].id}`, results };
    if (asked.length === 1 && aptitudeRelevance(ctx, apt).rel >= 0.5 && items[1]) return { id: `ex:${items[1].id}`, results };
    return { id: null, results };
  }
  if (!asked.length) return { id: `ex:${(pick(2) ?? items[0]).id}`, results };
  if (asked.length >= LIMITS.exercisesPerAptMax) return { id: null, results };
  const last = results[results.length - 1];
  const lastDef = asked[asked.length - 1];
  if (asked.length === 1) {
    const next = last ? pick(3) ?? pick(lastDef.difficulty) : pick(1) ?? pick(lastDef.difficulty);
    return { id: next ? `ex:${next.id}` : null, results };
  }
  // Con 2 resultados: si coinciden, alcanza; si difieren, un tercero para no depender de una respuesta aislada.
  const [r1, r2] = results;
  if (r1 !== r2) {
    const next = pick(2) ?? pick(3) ?? pick(1);
    return { id: next ? `ex:${next.id}` : null, results };
  }
  return { id: null, results };
}

function stage3(ctx: EngineContext): Candidate[] {
  const out: Candidate[] = [
    { id: 'q3_auto_a', internalReason: 'Autopercepción de aptitudes (se contrasta luego con ejercicios).' },
    { id: 'q3_auto_b', internalReason: 'Autopercepción de aptitudes (se contrasta luego con ejercicios).' },
  ];
  if (!isAnswered(ctx.state, 'q3_auto_b')) return out;
  for (const { apt, reason } of aptitudePlan(ctx)) {
    if (apt === 'auditivo' && !isAnswered(ctx.state, 'skill:auditivo')) out.push({ id: 'skill:auditivo', internalReason: 'Formación musical previa (también condiciona la viabilidad de ingreso).' });
    const nx = nextExercise(ctx, apt);
    if (nx.id) { out.push({ id: nx.id, internalReason: `Ejercicio de ${APTITUDES[apt]}: ${reason} Resultados previos: ${nx.results.map((r) => (r == null ? '—' : r ? '✓' : '✗')).join(' ') || 'ninguno'}.` }); break; }
    if (nx.results.some((r) => r === false) && !isAnswered(ctx.state, `feel:${apt}`)) {
      out.push({ id: `feel:${apt}`, internalReason: `Hubo respuestas incorrectas en ${APTITUDES[apt]}: interpretar si fue dificultad real, nervios o falta de familiaridad.` });
      break;
    }
  }
  for (const key of SKILL_KEYS) {
    if (key === 'auditivo') continue;
    const { rel, top } = aptitudeRelevance(ctx, key);
    if (rel >= 0.2) out.push({ id: `skill:${key}`, internalReason: `Capacidad práctica relevante (peso medio ${fmt(rel)}${top.length ? `: ${top.join(', ')}` : ''}).` });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Etapa 4
const GENERAL_STYLE: StyleKey[] = ['autonomia', 'colaboracion', 'estructura', 'variedad', 'practica', 'ejecucion'];
function stage4(ctx: EngineContext): Candidate[] {
  const out: Candidate[] = [];
  const pl = plausibleCareers(ctx, 20, 0.06);
  for (const q of STAGE4) {
    const axis = q.id.replace('q4_', '').replace('_b', '') as StyleKey;
    if (axis in STYLES && !GENERAL_STYLE.includes(axis)) {
      const rel = pl.reduce((s, { career, p }) => s + p * (career.style[axis]?.[1] ?? 0), 0);
      if (rel < 0.1 && !isAnswered(ctx.state, q.id)) continue;
    }
    const isConsistency = STYLE_CONSISTENCY_PAIRS.some(([, b]) => b === q.id);
    out.push({ id: q.id, internalReason: isConsistency ? 'Ítem de consistencia: la misma preferencia formulada de otra manera.' : 'Estilo de trabajo.' });
    if (answerOf(ctx.state, q.id) === 'depende') out.push({ id: `${q.id}__depende`, internalReason: 'Respondiste «depende del contexto»: se pide precisar de qué depende.' });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Etapa 5
const FIXED_TRADEOFFS: [ValueKey, ValueKey][] = [['ingresos', 'equilibrio'], ['estabilidad', 'autonomia_v'], ['impacto', 'ingresos'], ['creatividad_v', 'estabilidad']];
function stage5(ctx: EngineContext): Candidate[] {
  const out: Candidate[] = [
    { id: 'q5_valores_a', internalReason: 'Importancia declarada de valores.' },
    { id: 'q5_valores_b', internalReason: 'Importancia declarada de valores.' },
  ];
  if (!isAnswered(ctx.state, 'q5_valores_b')) return out;
  for (const [a, b] of FIXED_TRADEOFFS) out.push({ id: `trade:${a}:${b}`, internalReason: `Elección forzada clásica (${a} vs ${b}).` });
  const asked = new Set(Object.keys(ctx.state.answers).filter((k) => k.startsWith('trade:')).flatMap((k) => { const [, x, y] = k.split(':'); return [`${x}:${y}`, `${y}:${x}`]; }));
  FIXED_TRADEOFFS.forEach(([a, b]) => { asked.add(`${a}:${b}`); asked.add(`${b}:${a}`); });
  const high = Object.entries(ctx.profile).filter(([k, e]) => k.startsWith('value:') && e.est >= 0.68).map(([k, e]) => ({ v: k.slice(6) as ValueKey, est: e.est })).sort((x, y) => y.est - x.est).slice(0, 6);
  const pairs: [ValueKey, ValueKey, number][] = [];
  for (let i = 0; i < high.length; i++) for (let j = i + 1; j < high.length; j++) {
    if (!asked.has(`${high[i].v}:${high[j].v}`)) pairs.push([high[i].v, high[j].v, Math.abs(high[i].est - high[j].est)]);
  }
  const existingAdaptive = Object.keys(ctx.state.answers).filter((k) => k.startsWith('trade:') && !FIXED_TRADEOFFS.some(([a, b]) => k === `trade:${a}:${b}`)).length;
  pairs.sort((x, y) => x[2] - y[2]).slice(0, Math.max(0, 3 - existingAdaptive))
    .forEach(([a, b, d]) => out.push({ id: `trade:${a}:${b}`, internalReason: `Dos valores declarados como muy importantes (${a}, ${b}; diferencia ${fmt(d)}): se fuerza una prioridad.` }));
  for (const k of Object.keys(ctx.state.answers).filter((k) => k.startsWith('trade:') && !FIXED_TRADEOFFS.some(([a, b]) => k === `trade:${a}:${b}`))) out.push({ id: k, internalReason: 'Elección forzada adaptativa ya formulada.' });
  for (const q of STAGE5_STATIC.slice(2)) out.push({ id: q.id, internalReason: 'Equilibrio entre dimensiones (aptitudes, intereses, futuro).' });
  return out;
}

// ---------------------------------------------------------------------------
// Etapa 6
function stage6(ctx: EngineContext): Candidate[] {
  const out: Candidate[] = [];
  const claimed = (Object.keys(APTITUDES) as AptitudeKey[])
    .map((a) => ({ a, self: getEst(ctx.profile, 'aptitude', a).bySource.autoevaluacion?.est ?? 0, rel: aptitudeRelevance(ctx, a).rel }))
    .filter((x) => x.self >= 0.68)
    .sort((x, y) => y.rel + y.self - (x.rel + x.self))
    .slice(0, 3);
  for (const c of claimed) {
    out.push({ id: `evid:${c.a}`, internalReason: `Te autoevaluaste alto en ${APTITUDES[c.a]} (${fmt(c.self)}); relevancia para opciones plausibles ${fmt(c.rel)}. Se pide evidencia concreta.` });
    const ans = ctx.state.answers[`evid:${c.a}`];
    if (ans && !ans.skipped && wordCount(asRecord(ans.value).text) < 25) out.push({ id: `evidmore:${c.a}`, internalReason: 'La respuesta anterior fue demasiado general (menos de 25 palabras).' });
  }
  out.push({ id: 'q6_sostenido', internalReason: 'Interés sostenido en el tiempo.' }, { id: 'q6_aprendizaje', internalReason: 'Facilidad para aprender y transferir (potencial).' });
  const cap = ctx.state.answers.q1_capaz;
  if (cap && typeof cap.value === 'string' && cap.value.trim().length > 10) out.push({ id: 'q6_capaz_detalle', internalReason: 'Profundizar en la experiencia de satisfacción relatada al inicio.' });
  return out;
}

// ---------------------------------------------------------------------------
// Etapa 7
export function demandInfo(ctx: EngineContext, key: string, temperature = 0.06) {
  const pl = plausibleCareers(ctx, 20, temperature);
  let rel = 0;
  for (const { career, p } of pl) rel += p * (career.demands[key] ?? 0);
  let varSum = 0;
  for (const { career, p } of pl) varSum += p * ((career.demands[key] ?? 0) - rel) ** 2;
  const disc = Math.sqrt(varSum);
  const conf = getEst(ctx.profile, 'demand', key).conf;
  const tops = pl.filter(({ career }) => (career.demands[key] ?? 0) >= 0.8).slice(0, 3).map(({ career }) => career.name);
  return { info: (0.6 * rel + 0.4 * disc) * (1 - conf), rel, disc, conf, tops };
}

function stage7(ctx: EngineContext): Candidate[] {
  const asked = Object.keys(ctx.state.answers).filter((k) => k.startsWith('demand:'));
  const out: Candidate[] = asked.map((id) => ({ id, internalReason: 'Ya formulada.' }));
  if (asked.length >= LIMITS.demandsMax) return out;
  const ranked = ctx.catalog.demands
    .filter((d) => !asked.includes(`demand:${d.key}`))
    .map((d) => ({ d, ...demandInfo(ctx, d.key) }))
    .sort((a, b) => b.info - a.info);
  const best = ranked[0];
  if (best && (best.info >= LIMITS.demandInfoThreshold || asked.length < LIMITS.demandsMin)) {
    out.push({
      id: `demand:${best.d.key}`,
      internalReason: `Valor de información ${fmt(best.info)} (relevancia ${fmt(best.rel)}, poder de discriminación ${fmt(best.disc)}, confianza actual ${fmt(best.conf)}). «${best.d.label}» es central en: ${best.tops.join(', ') || 'varias opciones plausibles'}.`,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Etapa 8
function stage8(ctx: EngineContext): Candidate[] {
  const out: Candidate[] = [];
  const asked8 = Object.values(ctx.state.answers).filter((a) => a.stage === 8).length;
  if (asked8 >= LIMITS.stage8Max) return [];
  const top = ctx.ranking.slice(0, 5);
  const byId = (id: string) => ctx.careers.find((c) => c.id === id)!;
  // a) comparación de semanas de trabajo entre opciones casi empatadas
  for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) {
    const a = top[i], b = top[j];
    if (!(indistinguishable(a, b) || Math.abs(a.overall - b.overall) < 0.05)) continue;
    const [ta, tb] = uniqueTasks(byId(a.id), byId(b.id));
    if (ta.length < 2 || tb.length < 2) continue;
    const id = `cmp:${a.id}:${b.id}`;
    if (!isAnswered(ctx.state, id) && !isAnswered(ctx.state, `cmp:${b.id}:${a.id}`)) out.push({ id, internalReason: `Empate técnico entre «${a.name}» (${fmt(a.overall)}) y «${b.name}» (${fmt(b.overall)}): comparación de tareas concretas.` });
  }
  // a2) mismo campo, distinto nivel o tipo de título
  const fams = new Map<string, Set<string>>();
  for (const t of ctx.ranking.slice(0, 6)) { const c = byId(t.id); (fams.get(c.family) ?? fams.set(c.family, new Set()).get(c.family)!).add(c.level); }
  for (const [fam, levels] of fams) {
    if (levels.has('tecnicatura') && levels.size > 1) out.push({ id: 'q8_nivel', internalReason: `Entre las opciones cercanas de la familia «${fam}» hay tecnicaturas y carreras largas.` });
    if (levels.has('profesorado') && [...levels].some((l) => l !== 'profesorado')) out.push({ id: 'q8_docencia', internalReason: `Entre las opciones cercanas de la familia «${fam}» hay profesorados y otros títulos.` });
  }
  // b) exigencias que más diferencian a las finalistas y aún tienen poca evidencia
  const diffs: { k: string; d: number; pair: string }[] = [];
  for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) {
    const ca = byId(top[i].id), cb = byId(top[j].id);
    for (const k of new Set([...Object.keys(ca.demands), ...Object.keys(cb.demands)])) {
      if (getEst(ctx.profile, 'demand', k).conf >= 0.4 || isAnswered(ctx.state, `demand:${k}`)) continue;
      diffs.push({ k, d: Math.abs((ca.demands[k] ?? 0) - (cb.demands[k] ?? 0)), pair: `${ca.name} / ${cb.name}` });
    }
  }
  diffs.sort((a, b) => b.d - a.d).filter((x) => x.d >= 0.4).slice(0, 2)
    .forEach((x) => out.push({ id: `demand:${x.k}`, internalReason: `«${demandLabel(ctx.catalog, x.k)}» diferencia a ${x.pair} (diferencia de centralidad ${fmt(x.d)}) y aún no hay evidencia suficiente.` }));
  // c) aptitudes muy pesadas en las finalistas con poca evidencia observada
  for (const t of top.slice(0, 3)) {
    const c = byId(t.id);
    for (const [apt, w] of Object.entries(c.aptitudes)) {
      if ((w ?? 0) < 0.8 || !(apt in EXERCISES_BY_APT)) continue;
      if (getEst(ctx.profile, 'aptitude', apt).conf >= 0.4) continue;
      const nx = nextExercise(ctx, apt as AptitudeKey);
      if (nx.id) { out.push({ id: nx.id, internalReason: `${APTITUDES[apt as AptitudeKey]} es central en «${c.name}» y la evidencia observada todavía es escasa.` }); break; }
    }
  }
  // d) interés genuino en el área principal de las finalistas
  for (const t of top.slice(0, 4)) {
    const main = Object.entries(byId(t.id).domains).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0];
    if (main && !isAnswered(ctx.state, `behav:${main}`)) out.push({ id: `behav:${main}`, internalReason: `Área principal de «${t.name}»: verificar interés genuino.` });
  }
  // e) orientaciones dentro de una carrera finalista
  for (const t of ctx.ranking.slice(0, 8)) if (byId(t.id).variants?.length) out.push({ id: `variant:${t.id}`, internalReason: `«${t.name}» tiene orientaciones muy distintas entre sí.` });
  return out.filter((c) => !isAnswered(ctx.state, c.id));
}

// ---------------------------------------------------------------------------
// Etapa 9
function verificationRound(state: SessionState): number {
  return 1 + (state.reopenedAfterVerification ?? 0);
}

function stage9(ctx: EngineContext): Candidate[] {
  const round = verificationRound(ctx.state);
  const out: Candidate[] = [];
  if (!isAnswered(ctx.state, `verify:${round}`)) out.push({ id: `verify:${round}`, internalReason: `Verificación de hipótesis (ronda ${round}).` });
  out.push({ id: 'final', internalReason: 'Cierre.' });
  return out;
}

const STAGE_FNS: Record<number, (ctx: EngineContext) => Candidate[]> = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7, 8: stage8, 9: stage9 };

function firstUnanswered(ctx: EngineContext, cands: Candidate[]): Candidate | null {
  for (const c of cands) if (!isAnswered(ctx.state, c.id) && ctx.registry.get(c.id)) return c;
  return null;
}

/** Calcula el siguiente paso. Función pura: recibe un estado y devuelve el nuevo estado + la pregunta. */
export function nextStep(input: SessionState, catalog: CareerCatalog): StepResult {
  let state = input;
  let ctx = buildContext(state, catalog);

  // Reanudación: si hay una pregunta pendiente sin responder, se retoma exactamente esa.
  if (state.pending && !isAnswered(state, state.pending.questionId)) {
    const hyp = state.pending.questionId.startsWith('verify:') ? generateHypotheses(ctx) : undefined;
    const q = ctx.registry.get(state.pending.questionId, hyp);
    if (q) return { state, ctx, pending: state.pending, question: q, hypotheses: hyp, done: false };
  }

  // Reapertura tras la verificación si alguna hipótesis fue marcada como incorrecta.
  const round = verificationRound(state);
  const verif = state.answers[`verify:${round}`];
  if (verif && !verif.skipped && round < LIMITS.verificationRounds) {
    const raw = asRecord(verif.value).items;
    const verdicts = (Array.isArray(raw) ? raw : []).map((x) => asRecord(x).verdict);
    if (verdicts.includes('no')) {
      state = { ...state, reopenedAfterVerification: round, completedStages: state.completedStages.filter((s) => s < 8) };
      ctx = buildContext(state, catalog);
    }
  }

  // Contradicciones pendientes de aclarar (permiten volver sobre dimensiones anteriores).
  const contraAsked = Object.keys(state.answers).filter((k) => k.startsWith('contra:')).length;
  if (contraAsked < LIMITS.contradictionsMax) {
    const c = ctx.contradictions.find((x) => state.completedStages.includes(x.stageOfOrigin) && !isAnswered(state, x.id));
    if (c) return pend(state, ctx, { id: c.id, internalReason: `Contradicción detectada: ${c.description}` }, 8);
  }

  for (let s = 1; s <= 9; s++) {
    if (state.completedStages.includes(s)) continue;
    const cand = firstUnanswered(ctx, STAGE_FNS[s](ctx));
    if (cand) return pend(state, ctx, cand, s);
    state = { ...state, completedStages: [...state.completedStages, s].sort((a, b) => a - b) };
    ctx = { ...ctx, state };
    // Al cerrar una etapa puede aparecer una contradicción originada en ella.
    if (contraAsked < LIMITS.contradictionsMax) {
      const c = ctx.contradictions.find((x) => x.stageOfOrigin === s && !isAnswered(state, x.id));
      if (c) return pend(state, ctx, { id: c.id, internalReason: `Contradicción detectada: ${c.description}` }, 8);
    }
  }
  return { state: { ...state, pending: null }, ctx, pending: null, question: null, done: true };
}

function pend(state: SessionState, ctx: EngineContext, cand: Candidate, stage: number): StepResult {
  const hyp = cand.id.startsWith('verify:') ? generateHypotheses(ctx) : undefined;
  const q = ctx.registry.get(cand.id, hyp)!;
  const pending: PendingQuestion = { questionId: cand.id, stage, publicReason: q.publicReason, internalReason: cand.internalReason };
  const next = { ...state, pending };
  return { state: next, ctx: { ...ctx, state: next }, pending, question: q, hypotheses: hyp, done: false };
}

// ---------------------------------------------------------------------------
// Completitud y estado de la evaluación

export interface Completeness {
  canFinalize: boolean;
  missing: string[];
  stageProgress: { stage: number; done: boolean; answered: number }[];
}

export function completeness(ctx: EngineContext): Completeness {
  const { state, profile } = ctx;
  const missing: string[] = [];
  for (let s = 1; s <= 7; s++) if (!state.completedStages.includes(s)) missing.push(`Completar la etapa ${s}.`);
  const riasecConf = RIASEC_KEYS.reduce((a, k) => a + getEst(profile, 'riasec', k).conf, 0) / 6;
  if (riasecConf < 0.3) missing.push('Más evidencia sobre tus tipos de interés.');
  const aptCount = Object.entries(profile).filter(([k, e]) => k.startsWith('aptitude:') && e.conf >= 0.3).length;
  if (aptCount < 4) missing.push('Evidencia sobre al menos 4 aptitudes.');
  const demCount = Object.keys(state.answers).filter((k) => k.startsWith('demand:') && !state.answers[k].skipped).length;
  if (demCount < 5) missing.push('Tu disposición frente a al menos 5 exigencias reales.');
  const valCount = Object.entries(profile).filter(([k, e]) => k.startsWith('value:') && e.conf >= 0.3).length;
  if (valCount < 5) missing.push('Tus prioridades sobre al menos 5 valores.');
  if (!Object.keys(state.answers).some((k) => k.startsWith('verify:'))) missing.push('Verificar las hipótesis (etapa 9).');
  const stageProgress = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => ({
    stage: s, done: state.completedStages.includes(s),
    answered: Object.values(state.answers).filter((a) => a.stage === s).length,
  }));
  return { canFinalize: missing.length === 0, missing, stageProgress };
}

export function currentStage(state: SessionState): number {
  if (state.pending) return state.pending.stage;
  for (let s = 1; s <= 9; s++) if (!state.completedStages.includes(s)) return s;
  return 9;
}
