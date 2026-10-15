import type { CareerCatalog } from '../domain/types';
import { completeness } from './adaptive';
import { buildContext } from './context';
import { takeSnapshot } from './report';
import type { ExperienceLog, RankingSnapshot, SessionState } from './session';

/** Se conservan las últimas fotos del ranking para acotar el tamaño guardado. */
const cap = (s: RankingSnapshot[]) => s.slice(-40);

/** Marca la evaluación como finalizada si se cumplen los criterios de completitud. */
export function finalize(state: SessionState, catalog: CareerCatalog, now = new Date().toISOString()): { state: SessionState; ok: boolean; missing: string[] } {
  const ctx = buildContext(state, catalog);
  const c = completeness(ctx);
  if (!c.canFinalize) return { state, ok: false, missing: c.missing };
  return {
    ok: true, missing: [],
    state: { ...state, status: 'finalizada', finalizedAt: now, updatedAt: now, snapshots: cap([...state.snapshots, takeSnapshot(ctx, 'Evaluación finalizada', now)]) },
  };
}

/** Registra una experiencia práctica y guarda una foto del ranking antes y después. */
export function addExperienceLog(state: SessionState, log: ExperienceLog, catalog: CareerCatalog): SessionState {
  const before = state.snapshots.length ? null : takeSnapshot(buildContext(state, catalog), 'Antes de las experiencias', log.at);
  const next: SessionState = { ...state, updatedAt: log.at, experienceLogs: [...state.experienceLogs.filter((l) => l.id !== log.id), log] };
  const after = takeSnapshot(buildContext(next, catalog), `Experiencia registrada: ${log.experienceId}`, log.at);
  return { ...next, snapshots: cap([...(before ? [before] : []), ...state.snapshots, after]) };
}

export function removeExperienceLog(state: SessionState, id: string, catalog: CareerCatalog, now = new Date().toISOString()): SessionState {
  const next: SessionState = { ...state, updatedAt: now, experienceLogs: state.experienceLogs.filter((l) => l.id !== id) };
  return { ...next, snapshots: cap([...state.snapshots, takeSnapshot(buildContext(next, catalog), 'Experiencia eliminada', now)]) };
}

/** Si se corrige una respuesta en una evaluación finalizada, se registra una nueva foto para mostrar el cambio. */
export function snapshotAfterEdit(state: SessionState, catalog: CareerCatalog, questionId: string, now = new Date().toISOString()): SessionState {
  if (state.status !== 'finalizada') return state;
  return { ...state, snapshots: cap([...state.snapshots, takeSnapshot(buildContext(state, catalog), `Respuesta corregida (${questionId})`, now)]) };
}
