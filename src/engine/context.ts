import { resolveAll } from '../domain/careerModel';
import type { CareerCatalog, Evidence, ResolvedCareer } from '../domain/types';
import { FEEL_DISCOUNT } from '../questions/generators';
import { asArray } from '../questions/helpers';
import { createRegistry, type Registry } from '../questions/registry';
import { adjustmentsFromAnswers, detectContradictions, type Contradiction } from './contradictions';
import { experienceEvidence } from './experiences';
import { computeProfile, toEvidence, type Profile } from './profile';
import { dimensionWeights, rankCareers, scoreCareer, type CareerScore, type DimensionWeights, type RankingEntry } from './scoring';
import type { SessionState } from './session';

export interface EngineContext {
  catalog: CareerCatalog;
  careers: ResolvedCareer[];
  registry: Registry;
  state: SessionState;
  evidence: Evidence[];
  profile: Profile;
  constraints: Set<string>;
  maxYears: number | null;
  dw: DimensionWeights;
  scores: CareerScore[];
  ranking: RankingEntry[];
  contradictions: Contradiction[];
}

/** Reconstruye TODO a partir de las respuestas guardadas (determinístico). */
export function buildContext(state: SessionState, catalog: CareerCatalog, opts: { includeExperiences?: boolean } = {}): EngineContext {
  const careers = resolveAll(catalog, state.settings.excludedCareers);
  const registry = createRegistry(catalog, careers);

  let evidence: Evidence[] = [];
  for (const id of state.order.length ? state.order : Object.keys(state.answers)) {
    const a = state.answers[id];
    if (!a || a.skipped) continue;
    const q = registry.get(id);
    if (!q) continue;
    evidence.push(...toEvidence(id, q.evaluate(a.value)));
  }
  if (opts.includeExperiences !== false) {
    evidence.push(...experienceEvidence(state.experienceLogs, careers));
  }

  // Ajuste por contexto de los ejercicios (nervios, falta de familiaridad o de base).
  const discountedApts = new Set<string>();
  for (const [id, a] of Object.entries(state.answers)) {
    if (!id.startsWith('feel:') || a.skipped) continue;
    if (asArray(a.value).some((x) => FEEL_DISCOUNT.has(x))) discountedApts.add(id.split(':')[1]);
  }
  const adjustments = adjustmentsFromAnswers(state.answers);
  evidence = evidence.map((e) => {
    let { weight, note } = e;
    if (e.source === 'ejercicio' && e.target.kind === 'aptitude' && discountedApts.has(e.target.key)) {
      weight *= 0.6;
      note = `${note ?? ''} · peso reducido: indicaste nervios, falta de familiaridad o de conocimientos previos`.trim();
    }
    for (const adj of adjustments) {
      if (adj.match(e)) { weight *= adj.factor; if (adj.note) note = `${note ?? ''} · ${adj.note}`.trim(); }
    }
    return weight === e.weight ? e : { ...e, weight, note };
  });

  const profile = computeProfile(evidence);
  const constraints = new Set<string>();
  let maxYears: number | null = null;
  for (const e of evidence) {
    if (e.target.kind !== 'constraint') continue;
    if (e.target.key.startsWith('anios_')) maxYears = Number(e.target.key.slice(6));
    else constraints.add(e.target.key);
  }
  const dw = dimensionWeights(profile);
  const scores = careers.map((c) => scoreCareer(c, profile, dw, constraints, maxYears));
  const ranking = rankCareers(scores);
  const contradictions = detectContradictions(profile, evidence, catalog);
  return { catalog, careers, registry, state, evidence, profile, constraints, maxYears, dw, scores, ranking, contradictions };
}

/** Distribución de "plausibilidad" sobre las carreras mejor ubicadas (softmax). Guía la adaptación. */
export function plausibleCareers(ctx: EngineContext, n = 20, temperature = 0.04): { career: ResolvedCareer; p: number; score: CareerScore }[] {
  const top = ctx.ranking.slice(0, n);
  if (!top.length) return [];
  const max = top[0].overall;
  const ws = top.map((s) => Math.exp((s.overall - max) / temperature));
  const sum = ws.reduce((a, b) => a + b, 0);
  return top.map((s, i) => ({ career: ctx.careers.find((c) => c.id === s.id)!, p: ws[i] / sum, score: s }));
}
