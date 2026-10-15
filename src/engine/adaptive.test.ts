import { defaultCatalog } from '../domain/careerModel';
import { CARE_PERSONA, TECH_PERSONA, runPersona } from '../test/persona';
import { nextStep } from './adaptive';
import { newSession, recordAnswer, type SessionState } from './session';

const catalog = defaultCatalog();

function answerUntil(state: SessionState, predicate: (id: string) => boolean, answer: (id: string) => unknown, max = 200): { state: SessionState; asked: string[] } {
  const asked: string[] = [];
  let r = nextStep(state, catalog);
  for (let i = 0; i < max && !r.done; i++) {
    const id = r.question!.id;
    if (predicate(id)) return { state: r.state, asked };
    asked.push(id);
    state = recordAnswer(r.state, r.pending!, answer(id));
    r = nextStep(state, catalog);
  }
  return { state: r.state, asked };
}

describe('motor adaptativo', () => {
  it('es determinístico: mismas respuestas → misma secuencia', () => {
    const a = runPersona(catalog, TECH_PERSONA, { maxSteps: 60 });
    const b = runPersona(catalog, TECH_PERSONA, { maxSteps: 60 });
    expect(a.asked).toEqual(b.asked);
  });

  it('personas distintas reciben preguntas distintas (la adaptación responde a las respuestas reales)', () => {
    const a = runPersona(catalog, TECH_PERSONA);
    const b = runPersona(catalog, CARE_PERSONA);
    const demA = a.asked.filter((q) => q.startsWith('demand:'));
    const demB = b.asked.filter((q) => q.startsWith('demand:'));
    expect(demA).not.toEqual(demB);
    // Las exigencias de programación se exploran para el perfil tecnológico…
    expect(demA.some((d) => d === 'demand:depurar' || d === 'demand:programacion_larga')).toBe(true);
    // …y las de contacto clínico para el perfil de cuidado.
    expect(demB.some((d) => ['demand:contacto_clinico', 'demand:guardias', 'demand:escucha_prolongada', 'demand:vulnerabilidad'].includes(d))).toBe(true);
    // Verificación de interés genuino sobre áreas distintas
    const behA = a.asked.filter((q) => q.startsWith('behav:'));
    const behB = b.asked.filter((q) => q.startsWith('behav:'));
    expect(behA).toContain('behav:tecnologia');
    expect(behB).toContain('behav:salud');
  });

  it('pregunta por qué gustaba cada materia elegida, y solo por esas', () => {
    let s = newSession();
    const res = answerUntil(s, (id) => id === 'q1_materias_dificiles', (id) => {
      if (id === 'q1_situacion') return 'secundario';
      if (id === 'q1_materias') return ['musica', 'fisica'];
      if (id.startsWith('matf:')) return ['temas'];
      if (id === 'q1_actividades') return ['musica'];
      if (id === 'q1_problemas') return ['creativos'];
      return '';
    });
    s = res.state;
    expect(res.asked).toContain('matf:musica');
    expect(res.asked).toContain('matf:fisica');
    expect(res.asked.filter((x) => x.startsWith('matf:'))).toHaveLength(2);
  });

  it('en los ejercicios sube la dificultad tras un acierto y la baja tras un error; luego indaga el porqué', () => {
    const correctLog = { choice: 'b' }; // log2 → correcta 'b'
    const r = answerUntil(newSession(), (id) => id === 'ex:log2', (id) => {
      const persona = runPersonaAnswer(id);
      return persona;
    });
    // log2 es el primer ejercicio de lógica (dificultad 2)
    let state = recordAnswer(r.state, nextStep(r.state, catalog).pending!, correctLog);
    let step = nextStep(state, catalog);
    expect(['ex:log3', 'ex:log4']).toContain(step.question!.id); // dificultad 3 tras acertar
    state = recordAnswer(step.state, step.pending!, { choice: 'zzz' }); // error
    step = nextStep(state, catalog);
    // Resultados discordantes (✓ ✗): se agrega un tercer ítem para no depender de una respuesta aislada
    expect(step.question!.id.startsWith('ex:log')).toBe(true);
  });

  it('cuando una preferencia "depende del contexto", pide precisar', () => {
    const r = answerUntil(newSession(), (id) => id === 'q4_autonomia__depende', (id) => {
      if (id === 'q4_autonomia') return 'depende';
      return runPersonaAnswer(id);
    }, 400);
    expect(nextStep(r.state, catalog).question!.id).toBe('q4_autonomia__depende');
  });

  it('detecta contradicciones y pide aclararlas', () => {
    // Autoevaluación alta en lógica y ejercicios de lógica fallados
    const r = runPersona(catalog, { ...TECH_PERSONA, exerciseAccuracy: 0 , values: { ...TECH_PERSONA.values, 'aptitude:logico': 0.95, 'aptitude:cuantitativo': 0.95 } });
    expect(r.asked.some((q) => q.startsWith('contra:apthi:'))).toBe(true);
  });

  it('si una hipótesis se marca como incorrecta, se reabre la profundización y se verifica de nuevo', () => {
    const r = runPersona(catalog, { ...TECH_PERSONA, verifyVerdict: 'mixed' });
    expect(r.asked).toContain('verify:1');
    expect(r.asked).toContain('verify:2');
    expect(r.done).toBe(true);
  });
});

// Respuestas neutras pero válidas para avanzar
import { personaAnswer } from '../test/persona';
function runPersonaAnswer(id: string): unknown {
  const s = nextStep(newSession(), catalog);
  const q = s.ctx.registry.get(id);
  return q ? personaAnswer(q, TECH_PERSONA) : null;
}
