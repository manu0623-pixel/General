import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultCatalog, validateCatalog, type CatalogFile } from '../domain/careerModel';
import type { CareerCatalog } from '../domain/types';
import { addExperienceLog, finalize, removeExperienceLog, snapshotAfterEdit } from '../engine/actions';
import { nextStep } from '../engine/adaptive';
import { newSession, recordAnswer, type ExperienceLog, type SessionState } from '../engine/session';
import { connectCloud, offerDownload, type CloudStatus, type CloudSync } from '../storage/cloud';
import {
  clearSession, importSession, loadCustomCatalog, loadSession, safeStorage, saveCustomCatalog, saveSession,
} from '../storage/persistence';

export type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'brujula-vocacional:tema';

export function buildCatalog(custom: CatalogFile | null): CareerCatalog {
  const base = defaultCatalog();
  if (!custom) return base;
  const c = custom as CatalogFile & Partial<CareerCatalog>;
  return { ...base, version: c.version ?? base.version, careers: c.careers, families: c.families ?? base.families, modifiers: c.modifiers ?? base.modifiers, demands: c.demands ?? base.demands };
}

export function useApp() {
  const storage = useMemo(() => safeStorage(), []);
  const [initial] = useState(() => loadSession(storage));
  const [state, setState] = useState<SessionState | null>(initial.state);
  const [lastVisit] = useState<string | null>(initial.state?.updatedAt ?? null);
  const [custom, setCustom] = useState<CatalogFile | null>(() => loadCustomCatalog(storage));
  const catalog = useMemo(() => buildCatalog(custom), [custom]);
  const [saved, setSaved] = useState<{ at: string; ok: boolean; error?: string } | null>(null);
  const [theme, setThemeState] = useState<Theme>(() => {
    try { return (storage.getItem(THEME_KEY) as Theme) || 'system'; } catch { return 'system'; }
  });

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'system') delete el.dataset.theme; else el.dataset.theme = theme;
    try { storage.setItem(THEME_KEY, theme); } catch { /* sin almacenamiento */ }
  }, [theme, storage]);

  // Guardado automático en cada cambio.
  useEffect(() => {
    if (!state) return;
    const r = saveSession(storage, state);
    setSaved({ at: new Date().toISOString(), ok: r.ok, error: r.error });
  }, [state, storage]);

  // Registro de la visita (una vez por apertura).
  const visited = useRef(false);
  useEffect(() => {
    if (visited.current || !state) return;
    visited.current = true;
    setState((s) => (s ? { ...s, visits: [...s.visits, new Date().toISOString()].slice(-50) } : s));
  }, [state]);

  // Sincronización con el almacenamiento privado de la cuenta (solo dentro de claude.ai).
  const cloudRef = useRef<CloudSync | null>(null);
  const cloudReady = useRef(false);
  const [cloud, setCloud] = useState<'local' | 'conectando' | CloudStatus>('conectando');
  useEffect(() => {
    let alive = true;
    void connectCloud().then(async (c) => {
      if (!alive) return;
      if (!c) { setCloud('local'); return; }
      cloudRef.current = c;
      c.onStatus((st) => alive && setCloud(st));
      const remote = await c.load();
      if (!alive) return;
      cloudReady.current = true;
      setCloud('sincronizado');
      setState((cur) => {
        const pick = remote && (!cur || remote.updatedAt > cur.updatedAt) ? remote : cur;
        if (pick && pick !== remote) c.save(pick);
        return pick;
      });
    });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (cloudRef.current && cloudReady.current && state) cloudRef.current.save(state);
  }, [state]);

  const step = useMemo(() => (state ? nextStep(state, catalog) : null), [state, catalog]);
  useEffect(() => {
    if (step && state && step.state !== state) setState(step.state);
  }, [step, state]);

  const start = useCallback(() => setState(newSession()), []);

  const answer = useCallback((value: unknown, skipped = false) => {
    setState((s) => {
      if (!s) return s;
      const st = nextStep(s, catalog);
      if (!st.pending) return s;
      return recordAnswer(st.state, st.pending, value, { skipped });
    });
  }, [catalog]);

  const editAnswer = useCallback((questionId: string, value: unknown, skipped = false) => {
    setState((s) => {
      if (!s) return s;
      const rec = s.answers[questionId];
      if (!rec) return s;
      const next = recordAnswer(s, { questionId, stage: rec.stage, publicReason: rec.publicReason, internalReason: rec.internalReason }, value, { skipped });
      return snapshotAfterEdit(next, catalog, questionId);
    });
  }, [catalog]);

  const doFinalize = useCallback((): { ok: boolean; missing: string[] } => {
    if (!state) return { ok: false, missing: ['No hay evaluación.'] };
    const r = finalize(state, catalog);
    if (r.ok) setState(r.state);
    return r;
  }, [state, catalog]);

  const addExperience = useCallback((log: ExperienceLog) => setState((s) => (s ? addExperienceLog(s, log, catalog) : s)), [catalog]);
  const removeExperience = useCallback((id: string) => setState((s) => (s ? removeExperienceLog(s, id, catalog) : s)), [catalog]);
  const setExcluded = useCallback((ids: string[]) => setState((s) => (s ? { ...s, settings: { ...s.settings, excludedCareers: ids } } : s)), []);

  const reset = useCallback(() => { clearSession(storage); cloudRef.current?.save(null); setState(null); }, [storage]);
  const importText = useCallback((text: string) => { const st = importSession(text); setState(st); }, []);
  const setCatalogFile = useCallback((file: CatalogFile | null): string[] => {
    if (file) {
      const errs = validateCatalog(buildCatalog(file));
      if (errs.length) return errs;
    }
    saveCustomCatalog(storage, file);
    setCustom(file);
    return [];
  }, [storage]);

  return {
    state, step, catalog, customCatalog: custom, saved, theme, lastVisit, cloud,
    recoveredFromBackup: initial.recoveredFromBackup, corrupted: initial.corrupted,
    setTheme: setThemeState, start, answer, editAnswer, finalize: doFinalize, addExperience, removeExperience,
    setExcluded, reset, importText, setCatalogFile,
  };
}

export type AppApi = ReturnType<typeof useApp>;

export function downloadText(filename: string, text: string): Promise<boolean> {
  return offerDownload(filename, text);
}
