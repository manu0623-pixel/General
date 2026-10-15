import { defaultCatalog } from '../domain/careerModel';
import { CARE_PERSONA, TECH_PERSONA, runPersona } from '../test/persona';
import { addExperienceLog, finalize } from './actions';
import { buildContext } from './context';
import { diffSnapshots, buildReport } from './report';
import { newSession, type ExperienceLog } from './session';

const catalog = defaultCatalog();

describe('informe', () => {
  it('es provisional mientras falte información esencial y no muestra recomendación definitiva', () => {
    const r = runPersona(catalog, TECH_PERSONA, { maxSteps: 30 });
    const rep = buildReport(buildContext(r.state, catalog));
    expect(rep.status).toBe('provisional');
    expect(rep.recommendation.kind).toBe('insuficiente');
    expect(rep.completeness.missing.length).toBeGreaterThan(0);
  });

  it('es final solo tras finalizar una evaluación completa', () => {
    const r = runPersona(catalog, TECH_PERSONA);
    const f = finalize(r.state, catalog);
    expect(f.ok).toBe(true);
    const rep = buildReport(buildContext(f.state, catalog));
    expect(rep.status).toBe('final');
    expect(rep.finalists.length).toBeGreaterThanOrEqual(1);
    expect(rep.finalists.length).toBeLessThanOrEqual(5);
    expect(['clara', 'empate']).toContain(rep.recommendation.kind);
  });

  it('no permite finalizar una evaluación incompleta', () => {
    const f = finalize(runPersona(catalog, TECH_PERSONA, { maxSteps: 20 }).state, catalog);
    expect(f.ok).toBe(false);
    expect(f.missing.length).toBeGreaterThan(0);
  });

  it('refleja la evidencia disponible: fortalezas "demostradas" solo con evidencia observada', () => {
    const r = runPersona(catalog, TECH_PERSONA);
    const ctx = buildContext(r.state, catalog);
    const rep = buildReport(ctx);
    for (const s of rep.profile.strengths) {
      const e = ctx.profile[`aptitude:${s.key}`];
      const observed = ['ejercicio', 'experiencia', 'practica', 'conducta'].some((k) => k in e.bySource);
      expect(s.demonstrated).toBe(observed);
    }
    // Las evidencias de cada carrera citan fuentes reales
    for (const c of rep.finalists) for (const line of c.evidence) expect(line).toMatch(/\(\d+\)/);
  });

  it('solo incluye carreras de la lista', () => {
    const ids = new Set(catalog.careers.map((c) => c.id));
    const rep = buildReport(buildContext(runPersona(catalog, CARE_PERSONA).state, catalog));
    for (const c of [...rep.ranking, ...rep.finalists]) expect(ids.has(c.entry.id)).toBe(true);
    for (const l of rep.lower) expect(ids.has(l.id)).toBe(true);
  });

  it('reconoce empates cuando no hay una ganadora clara', () => {
    const ctx = buildContext(newSession(), catalog);
    const rep = buildReport(ctx);
    // Sin evidencia: muchas carreras indistinguibles y recomendación no concluyente
    expect(rep.recommendation.kind).toBe('insuficiente');
    expect(ctx.ranking.filter((r) => r.tieGroup === 0).length).toBeGreaterThan(1);
  });
});

describe('experiencias prácticas', () => {
  const r = runPersona(catalog, TECH_PERSONA);
  const fin = finalize(r.state, catalog).state;
  const ctx0 = buildContext(fin, catalog);
  const target = ctx0.ranking[2];
  const log = (id: string, interest: number, sat: number, cont: ExperienceLog['continueLearning']): ExperienceLog => ({
    id, careerId: target.id, experienceId: `plan-${target.id}`, at: `2026-02-0${id.length}T10:00:00.000Z`,
    interest, satisfaction: sat, difficulty: 2, difficulties: '', continueLearning: cont, learned: '',
  });

  it('una experiencia mueve poco el resultado; varias consistentes lo mueven más (patrones, no episodios)', () => {
    const s1 = addExperienceLog(fin, log('a', 5, 5, 'si'), catalog);
    const s2 = addExperienceLog(s1, { ...log('bb', 5, 5, 'si'), experienceId: `charla-${target.id}` }, catalog);
    const b0 = ctx0.ranking.find((x) => x.id === target.id)!.B;
    const b1 = buildContext(s1, catalog).ranking.find((x) => x.id === target.id)!.B;
    const b2 = buildContext(s2, catalog).ranking.find((x) => x.id === target.id)!.B;
    expect(b1).toBeGreaterThan(b0);
    expect(b1 - b0).toBeLessThan(0.08);
    expect(b2 - b0).toBeGreaterThan(b1 - b0);
    expect(b2 - b0).toBeLessThanOrEqual(0.12 + 1e-9);
  });

  it('guarda fotos del ranking y explica qué cambió', () => {
    const s1 = addExperienceLog(fin, log('a', 1, 1, 'no'), catalog);
    const snaps = s1.snapshots;
    expect(snaps.length).toBeGreaterThanOrEqual(2);
    const d = diffSnapshots(snaps[snaps.length - 2], snaps[snaps.length - 1], (id) => id);
    const ch = d.find((x) => x.id === target.id);
    if (ch) expect(ch.delta).toBeLessThan(0);
  });
});
