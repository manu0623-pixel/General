import { SCHEMA_VERSION, newSession, type SessionState } from '../engine/session';
import type { CatalogFile } from '../domain/careerModel';

/**
 * PERSISTENCIA LOCAL
 * Todo se guarda en el almacenamiento local del navegador (localStorage). Ningún dato sale del
 * dispositivo. Se mantiene una copia de respaldo de la versión anterior y, si los datos están
 * dañados, se conservan aparte en lugar de borrarlos.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const KEYS = {
  session: 'brujula-vocacional:sesion',
  backup: 'brujula-vocacional:sesion:respaldo',
  corrupt: 'brujula-vocacional:sesion:danada',
  catalog: 'brujula-vocacional:catalogo',
};

interface Envelope {
  app: 'brujula-vocacional';
  schemaVersion: number;
  savedAt: string;
  state: SessionState;
}

export function memoryStorage(): StorageLike & { dump(): Record<string, string> } {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

export function safeStorage(): StorageLike {
  try {
    const s = window.localStorage;
    const probe = '__probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return memoryStorage();
  }
}

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

/** Valida la forma del estado. Devuelve una lista de problemas (vacía si es válido). */
export function validateState(x: unknown): string[] {
  const errs: string[] = [];
  if (!isObj(x)) return ['El estado no es un objeto.'];
  if (typeof x.id !== 'string') errs.push('Falta id.');
  if (!isObj(x.answers)) errs.push('Faltan respuestas.');
  if (!Array.isArray(x.order)) errs.push('Falta el orden de preguntas.');
  if (!Array.isArray(x.completedStages)) errs.push('Faltan etapas completadas.');
  if (x.status !== 'en_curso' && x.status !== 'finalizada') errs.push('Estado de evaluación inválido.');
  if (isObj(x.answers)) {
    for (const [k, a] of Object.entries(x.answers)) {
      if (!isObj(a) || a.questionId !== k || typeof a.stage !== 'number') { errs.push(`Respuesta inválida: ${k}`); break; }
    }
  }
  return errs;
}

/** Migraciones entre versiones del esquema (por ahora, normaliza campos opcionales). */
export function migrate(raw: Record<string, unknown>): SessionState {
  const base = newSession(String(raw.createdAt ?? new Date().toISOString()));
  const s = { ...base, ...raw } as SessionState;
  s.schemaVersion = SCHEMA_VERSION;
  s.experienceLogs ??= [];
  s.snapshots ??= [];
  s.visits ??= [];
  s.settings = { ...base.settings, ...(s.settings ?? {}) };
  s.pending ??= null;
  for (const a of Object.values(s.answers)) a.revisions ??= [];
  return s;
}

export function saveSession(storage: StorageLike, state: SessionState, now = new Date().toISOString()): { ok: boolean; error?: string } {
  try {
    const prev = storage.getItem(KEYS.session);
    if (prev) storage.setItem(KEYS.backup, prev);
    const env: Envelope = { app: 'brujula-vocacional', schemaVersion: SCHEMA_VERSION, savedAt: now, state };
    storage.setItem(KEYS.session, JSON.stringify(env));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function parseEnvelope(text: string | null): SessionState | null {
  if (!text) return null;
  try {
    const env = JSON.parse(text) as unknown;
    const st = isObj(env) && 'state' in env ? env.state : env;
    if (validateState(st).length) return null;
    return migrate(st as Record<string, unknown>);
  } catch {
    return null;
  }
}

export interface LoadResult {
  state: SessionState | null;
  recoveredFromBackup: boolean;
  corrupted: boolean;
}

export function loadSession(storage: StorageLike): LoadResult {
  const raw = storage.getItem(KEYS.session);
  const main = parseEnvelope(raw);
  if (main) return { state: main, recoveredFromBackup: false, corrupted: false };
  const backup = parseEnvelope(storage.getItem(KEYS.backup));
  if (raw) {
    // Se conservan los datos dañados para no perderlos definitivamente.
    try { storage.setItem(`${KEYS.corrupt}:${Date.now()}`, raw); } catch { /* sin espacio */ }
  }
  if (backup) return { state: backup, recoveredFromBackup: true, corrupted: !!raw };
  return { state: null, recoveredFromBackup: false, corrupted: !!raw };
}

export function clearSession(storage: StorageLike) {
  const prev = storage.getItem(KEYS.session);
  if (prev) storage.setItem(KEYS.backup, prev);
  storage.removeItem(KEYS.session);
}

export function exportSession(state: SessionState): string {
  const env: Envelope = { app: 'brujula-vocacional', schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), state };
  return JSON.stringify(env, null, 2);
}

export function importSession(text: string): SessionState {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('El archivo no es un JSON válido.'); }
  const st = isObj(parsed) && 'state' in parsed ? parsed.state : parsed;
  const errs = validateState(st);
  if (errs.length) throw new Error(`El archivo no contiene una evaluación válida: ${errs.join(' ')}`);
  return migrate(st as Record<string, unknown>);
}

export function loadCustomCatalog(storage: StorageLike): CatalogFile | null {
  try {
    const t = storage.getItem(KEYS.catalog);
    return t ? (JSON.parse(t) as CatalogFile) : null;
  } catch {
    return null;
  }
}

export function saveCustomCatalog(storage: StorageLike, file: CatalogFile | null) {
  if (!file) storage.removeItem(KEYS.catalog);
  else storage.setItem(KEYS.catalog, JSON.stringify(file));
}
