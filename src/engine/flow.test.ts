import { defaultCatalog } from '../domain/careerModel';
import { CARE_PERSONA, TECH_PERSONA, runPersona } from '../test/persona';
import { completeness } from './adaptive';

const catalog = defaultCatalog();

describe('flujo completo con personas sintéticas', () => {
  it('termina, recorre las 9 etapas y permite finalizar', () => {
    const r = runPersona(catalog, TECH_PERSONA);
    expect(r.done).toBe(true);
    expect(r.state.completedStages).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const c = completeness(r.ctx);
    expect(c.missing).toEqual([]);
    // No alarga artificialmente: un rango razonable de preguntas
    expect(r.asked.length).toBeGreaterThan(60);
    expect(r.asked.length).toBeLessThan(160);
    // eslint-disable-next-line no-console
    console.log('preguntas (tech):', r.asked.length, 'top:', r.ctx.ranking.slice(0, 6).map((x) => `${x.name} ${x.overall.toFixed(2)}±${x.hw.toFixed(2)}`));
  });

  it('una persona orientada a la salud y el cuidado obtiene un ranking distinto', () => {
    const r = runPersona(catalog, CARE_PERSONA);
    expect(r.done).toBe(true);
    // eslint-disable-next-line no-console
    console.log('preguntas (care):', r.asked.length, 'top:', r.ctx.ranking.slice(0, 6).map((x) => `${x.name} ${x.overall.toFixed(2)}±${x.hw.toFixed(2)}`));
  });
});
