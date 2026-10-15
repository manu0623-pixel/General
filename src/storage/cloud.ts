import type { SessionState } from '../engine/session';
import { migrate, validateState } from './persistence';

/**
 * Sincronización opcional con el almacenamiento privado por persona que ofrece claude.ai cuando la
 * aplicación se publica como página allí. Solo la persona que responde puede leer su documento
 * (`data/users/<id>/sesion`); ni siquiera quien publica la página puede verlo. Fuera de claude.ai
 * (por ejemplo con `npm run dev`) no existe `window.claude` y la app usa solo el navegador.
 */
type AnyNs = Record<string, (...args: never[]) => Promise<unknown>>;
type ClaudeWin = { claude?: { use(name: string): Promise<unknown> } };

interface DocRef {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}

export interface CloudSync {
  load(): Promise<SessionState | null>;
  save(state: SessionState | null): void;
  onStatus(fn: (s: CloudStatus) => void): void;
}
export type CloudStatus = 'sincronizado' | 'guardando' | 'error';

export async function connectCloud(): Promise<CloudSync | null> {
  const c = (window as unknown as ClaudeWin).claude;
  if (!c?.use) return null;
  try {
    const [db, user] = (await Promise.all([c.use('db'), c.use('user')])) as [{ doc(p: string): DocRef } | null, AnyNs | null];
    if (!db || !user) return null;
    const uid = (await (user.id as () => Promise<string | null>)()) ?? null;
    if (!uid) return null;
    const ref = db.doc(`data/users/${uid}/sesion`);
    let last = '';
    let pending: SessionState | null | undefined;
    let writing = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let listener: ((s: CloudStatus) => void) | null = null;
    const emit = (s: CloudStatus) => listener?.(s);

    const flush = async () => {
      if (writing || pending === undefined) return;
      const st = pending;
      pending = undefined;
      const body = st ? JSON.stringify(st) : '';
      if (body === last) return;
      writing = true;
      emit('guardando');
      try {
        if (st) await ref.set({ savedAt: new Date().toISOString(), state: JSON.parse(body) as Record<string, unknown> });
        else await ref.delete();
        last = body;
        emit('sincronizado');
      } catch {
        emit('error');
      } finally {
        writing = false;
        if (pending !== undefined) void flush();
      }
    };

    return {
      async load() {
        try {
          const snap = await ref.get();
          const st = snap.exists ? snap.data()?.state : undefined;
          if (!st || validateState(st).length) return null;
          last = JSON.stringify(st);
          return migrate(st as Record<string, unknown>);
        } catch {
          return null;
        }
      },
      save(state) {
        pending = state;
        if (timer) clearTimeout(timer);
        // Agrupa ráfagas de cambios en una sola escritura.
        timer = setTimeout(() => void flush(), 1200);
      },
      onStatus(fn) { listener = fn; },
    };
  } catch {
    return null;
  }
}

/** Ofrece un archivo para guardar: usa la capacidad de descargas de claude.ai si existe, o un enlace local. */
export async function offerDownload(filename: string, text: string): Promise<boolean> {
  const c = (window as unknown as ClaudeWin).claude;
  if (c?.use) {
    try {
      const dl = (await c.use('downloads')) as { save(r: { filename: string; data: string }): Promise<unknown> } | null;
      if (dl) { await dl.save({ filename, data: text }); return true; }
    } catch {
      return false;
    }
  }
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
