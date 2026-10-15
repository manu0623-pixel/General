import { defaultCatalog } from '../domain/careerModel';
import { nextStep } from '../engine/adaptive';
import { newSession, recordAnswer } from '../engine/session';
import { TECH_PERSONA, personaAnswer, runPersona } from '../test/persona';
import { KEYS, exportSession, importSession, loadSession, memoryStorage, saveSession } from './persistence';

const catalog = defaultCatalog();

describe('persistencia', () => {
  it('guarda y recupera las respuestas exactamente', () => {
    const storage = memoryStorage();
    const { state } = runPersona(catalog, TECH_PERSONA, { maxSteps: 25 });
    expect(saveSession(storage, state).ok).toBe(true);
    const loaded = loadSession(storage);
    expect(loaded.state).not.toBeNull();
    expect(loaded.state!.answers).toEqual(state.answers);
    expect(loaded.state!.order).toEqual(state.order);
    expect(loaded.state!.completedStages).toEqual(state.completedStages);
  });

  it('recupera el progreso después de "cerrar" la aplicación y retoma en la misma pregunta', () => {
    const storage = memoryStorage();
    const { state } = runPersona(catalog, TECH_PERSONA, { maxSteps: 40 });
    const step = nextStep(state, catalog); // deja una pregunta pendiente
    saveSession(storage, step.state);
    // Simula cierre: se descarta todo lo que está en memoria y se vuelve a cargar.
    const reopened = loadSession(storage).state!;
    const resumed = nextStep(reopened, catalog);
    expect(resumed.question!.id).toBe(step.question!.id);
    expect(resumed.state.pending).toEqual(step.state.pending);
  });

  it('registra el historial de correcciones de una respuesta', () => {
    let s = newSession('2026-01-01T00:00:00.000Z');
    const r = nextStep(s, catalog);
    s = recordAnswer(r.state, r.pending!, 'secundario', { now: '2026-01-01T00:00:01.000Z' });
    s = recordAnswer(s, { ...r.pending! }, 'trabajo', { now: '2026-01-01T00:00:02.000Z' });
    expect(s.answers.q1_situacion.value).toBe('trabajo');
    expect(s.answers.q1_situacion.revisions).toHaveLength(1);
    expect(s.answers.q1_situacion.revisions[0].value).toBe('secundario');
  });

  it('si los datos se dañan, usa el respaldo y conserva la copia dañada', () => {
    const storage = memoryStorage();
    const { state: s1 } = runPersona(catalog, TECH_PERSONA, { maxSteps: 10 });
    const { state: s2 } = runPersona(catalog, TECH_PERSONA, { maxSteps: 12 });
    saveSession(storage, s1);
    saveSession(storage, s2); // s1 pasa a respaldo
    storage.setItem(KEYS.session, '{esto no es json');
    const loaded = loadSession(storage);
    expect(loaded.recoveredFromBackup).toBe(true);
    expect(loaded.state!.order).toEqual(s1.order);
    expect(Object.keys(storage.dump()).some((k) => k.startsWith(KEYS.corrupt))).toBe(true);
  });

  it('exporta e importa una evaluación; rechaza archivos inválidos', () => {
    const { state } = runPersona(catalog, TECH_PERSONA, { maxSteps: 15 });
    const back = importSession(exportSession(state));
    expect(back.answers).toEqual(state.answers);
    expect(() => importSession('{"hola": 1}')).toThrow();
    expect(() => importSession('no json')).toThrow();
  });

  it('el respondedor sintético produce respuestas que el motor acepta', () => {
    const r = nextStep(newSession(), catalog);
    expect(personaAnswer(r.question!, TECH_PERSONA)).toBeTruthy();
  });
});
