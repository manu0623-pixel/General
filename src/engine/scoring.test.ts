import { defaultCatalog, resolveAll } from '../domain/careerModel';
import type { CareerCatalog, Evidence } from '../domain/types';
import { TECH_PERSONA, runPersona } from '../test/persona';
import { buildContext } from './context';
import { computeProfile } from './profile';
import { dimensionWeights, indistinguishable, rankCareers, scoreCareer, WEIGHTS } from './scoring';
import { newSession } from './session';

const catalog = defaultCatalog();
const careers = resolveAll(catalog);
const ev = (kind: Evidence['target']['kind'], key: string, value: number, weight = 1, source: Evidence['source'] = 'declarada'): Evidence => ({ questionId: 'test', target: { kind, key }, value, weight, source });
const dwEq = { A: 1 / 3, B: 1 / 3, C: 1 / 3, explicit: false };

describe('puntuación', () => {
  it('es reproducible: mismas respuestas → mismas puntuaciones', () => {
    const r = runPersona(catalog, TECH_PERSONA);
    const a = buildContext(r.state, catalog).ranking.map((x) => [x.id, x.overall]);
    const b = buildContext(JSON.parse(JSON.stringify(r.state)), catalog).ranking.map((x) => [x.id, x.overall]);
    expect(a).toEqual(b);
  });

  it('subir el interés por un área sube las carreras centradas en esa área (monotonía)', () => {
    const base = [ev('domain', 'musica', 0.5)];
    const hi = [ev('domain', 'musica', 0.95)];
    const piano = careers.find((c) => c.id === 'musica-piano')!;
    const s0 = scoreCareer(piano, computeProfile(base), dwEq, new Set(), null);
    const s1 = scoreCareer(piano, computeProfile(hi), dwEq, new Set(), null);
    expect(s1.B).toBeGreaterThan(s0.B);
    expect(s1.overall).toBeGreaterThan(s0.overall);
  });

  it('los pesos de dimensión solo cambian con prioridades explícitas y quedan acotados', () => {
    expect(dimensionWeights(computeProfile([]))).toMatchObject({ explicit: false });
    const w = dimensionWeights(computeProfile([ev('weight', 'A', 0.05), ev('weight', 'B', 0.9), ev('weight', 'C', 0.05)]));
    expect(w.explicit).toBe(true);
    for (const k of ['A', 'B', 'C'] as const) {
      expect(w[k]).toBeGreaterThanOrEqual(WEIGHTS.dimMin / (WEIGHTS.dimMax + 2 * WEIGHTS.dimMin) - 1e-9);
    }
    expect(w.B).toBeLessThan(0.6);
  });

  it('una carrera con muy buen futuro no queda primera si sus actividades centrales no coinciden', () => {
    // Persona que rechaza lo técnico pero valora mucho ingresos
    const evidence = [
      ev('domain', 'tecnologia', 0.05, 2), ev('domain', 'matematica', 0.1, 2), ev('demand', 'depurar', 0.05, 2), ev('demand', 'programacion_larga', 0.05, 2),
      ev('domain', 'artes_visuales', 0.9, 2), ev('riasec', 'A', 0.9, 2), ev('demand', 'produccion_creativa_sostenida', 0.85, 2),
      ev('value', 'ingresos', 0.95, 3), ev('value', 'remoto', 0.95, 3),
    ];
    const p = computeProfile(evidence);
    const ranked = rankCareers(careers.map((c) => scoreCareer(c, p, dwEq, new Set(), null)));
    const inf = ranked.find((r) => r.id === 'lic-informatica')!;
    expect(inf.C).toBeGreaterThan(0.6);
    expect(inf.rank).toBeGreaterThan(10);
    expect(inf.parts.corePenalty).toBeGreaterThan(0);
  });

  it('nunca recomienda carreras fuera de la lista y respeta las exclusiones', () => {
    const r = runPersona(catalog, TECH_PERSONA, { maxSteps: 50 });
    const state = { ...r.state, settings: { ...r.state.settings, excludedCareers: ['lic-informatica'] } };
    const ctx = buildContext(state, catalog);
    const ids = new Set(catalog.careers.map((c) => c.id));
    for (const x of ctx.ranking) expect(ids.has(x.id)).toBe(true);
    expect(ctx.ranking.some((x) => x.id === 'lic-informatica')).toBe(false);
  });

  it('la incertidumbre es mayor con menos evidencia', () => {
    const few = buildContext(runPersona(catalog, TECH_PERSONA, { maxSteps: 15 }).state, catalog);
    const many = buildContext(runPersona(catalog, TECH_PERSONA).state, catalog);
    const hwFew = few.ranking.find((x) => x.id === 'lic-informatica')!.hw;
    const hwMany = many.ranking.find((x) => x.id === 'lic-informatica')!.hw;
    expect(hwFew).toBeGreaterThan(hwMany);
    const empty = buildContext(newSession(), catalog);
    expect(empty.ranking.every((x) => x.confidence === 'baja')).toBe(true);
  });

  it('sin evidencia, todas las carreras quedan empatadas o casi (no inventa diferencias)', () => {
    const ctx = buildContext(newSession(), catalog);
    const top = ctx.ranking[0], bottom = ctx.ranking[ctx.ranking.length - 1];
    // Las diferencias sin evidencia provienen solo de los datos de futuro (C); A y B son neutros.
    for (const r of ctx.ranking) { expect(r.A).toBeCloseTo(0.5, 5); }
    expect(top.overall - bottom.overall).toBeLessThan(0.15);
  });

  it('detecta empates técnicos cuando la diferencia es menor que la incertidumbre', () => {
    const mk = (overall: number, hw: number) => ({ overall, hw }) as never;
    expect(indistinguishable(mk(0.7, 0.08), mk(0.68, 0.08))).toBe(true);
    expect(indistinguishable(mk(0.7, 0.03), mk(0.55, 0.03))).toBe(false);
  });

  it('las carreras sin información suficiente no reciben puntuación ni conclusiones inventadas', () => {
    const custom: CareerCatalog = { ...catalog, careers: catalog.careers.map((c) => (c.id === 'medicina' ? { ...c, dataStatus: 'insuficiente' as const } : c)) };
    const ctx = buildContext(runPersona(custom, TECH_PERSONA, { maxSteps: 30 }).state, custom);
    const med = ctx.scores.find((s) => s.id === 'medicina')!;
    expect(med.insufficientData).toBe(true);
    expect(Number.isNaN(med.overall)).toBe(true);
    expect(ctx.ranking.some((r) => r.id === 'medicina')).toBe(false);
  });

  it('la viabilidad práctica se informa por separado y no altera la afinidad', () => {
    const p = computeProfile([ev('domain', 'administracion', 0.5)]);
    const gest = careers.find((c) => c.id === 'gestion-univ')!;
    const a = scoreCareer(gest, p, dwEq, new Set(), null);
    const b = scoreCareer(gest, p, dwEq, new Set(['nodocente']), null);
    expect(a.overall).toBeCloseTo(b.overall, 10);
    expect(a.viability.level).toBe('restriccion_importante');
    expect(b.viability.level).toBe('sin_restricciones');
  });
});
