import { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { fmtDate } from './format';
import { useApp } from './useApp';
import { AssessView } from './views/AssessView';
import { CareersView } from './views/CareersView';
import { ExperiencesView } from './views/ExperiencesView';
import { HistoryView } from './views/HistoryView';
import { HomeView } from './views/HomeView';
import { LogView } from './views/LogView';
import { ResultsView } from './views/ResultsView';
import { SettingsView } from './views/SettingsView';

export type ViewId = 'inicio' | 'evaluacion' | 'historial' | 'registro' | 'resultados' | 'experiencias' | 'carreras' | 'ajustes';

const NAV: { id: ViewId; label: string; needsState?: boolean }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'evaluacion', label: 'Evaluación', needsState: true },
  { id: 'historial', label: 'Respuestas', needsState: true },
  { id: 'registro', label: 'Registro', needsState: true },
  { id: 'resultados', label: 'Resultados', needsState: true },
  { id: 'experiencias', label: 'Experiencias', needsState: true },
  { id: 'carreras', label: 'Carreras' },
  { id: 'ajustes', label: 'Ajustes' },
];

function readHash(): ViewId {
  const h = window.location.hash.replace('#', '') as ViewId;
  return NAV.some((n) => n.id === h) ? h : 'inicio';
}

export function App() {
  const app = useApp();
  const [view, setView] = useState<ViewId>(() => readHash());
  useEffect(() => {
    const on = () => setView(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (v: ViewId) => {
    setView(v);
    try { history.replaceState(null, '', `#${v}`); } catch { /* entorno sin historial */ }
    window.scrollTo({ top: 0 });
  };
  const current = !app.state && NAV.find((n) => n.id === view)?.needsState ? 'inicio' : view;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
              <circle cx="13" cy="13" r="11.5" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
              <path d="M13 4 L16 13 L13 22 L10 13 Z" fill="var(--accent)" />
              <path d="M13 4 L16 13 L10 13 Z" fill="var(--ink)" opacity="0.85" />
            </svg>
            Brújula Vocacional
          </div>
          <nav className="nav" aria-label="Secciones">
            {NAV.filter((n) => !n.needsState || app.state).map((n) => (
              <button key={n.id} type="button" aria-current={current === n.id ? 'page' : undefined} onClick={() => go(n.id)}>{n.label}</button>
            ))}
          </nav>
          <span className="spacer" />
          {app.state && (
            <span className="save-state" role="status" aria-live="polite" title={app.saved?.error ?? ''}>
              {app.saved?.ok === false ? '⚠ No se pudo guardar' : app.saved ? `Guardado ${fmtDate(app.saved.at).split(',').pop()}` : 'Guardado local'}
            </span>
          )}
        </div>
      </header>
      <main className="main" id="contenido">
        {app.recoveredFromBackup && <p className="callout warn" style={{ marginBottom: 16 }}>Los datos guardados estaban dañados: se recuperó la copia de respaldo anterior. La copia dañada se conservó aparte.</p>}
        <ErrorBoundary key={current}>
        {current === 'inicio' && <HomeView app={app} go={go} />}
        {current === 'evaluacion' && <AssessView app={app} go={go} />}
        {current === 'historial' && <HistoryView app={app} />}
        {current === 'registro' && <LogView app={app} />}
        {current === 'resultados' && <ResultsView app={app} go={go} />}
        {current === 'experiencias' && <ExperiencesView app={app} go={go} />}
        {current === 'carreras' && <CareersView app={app} />}
        {current === 'ajustes' && <SettingsView app={app} go={go} />}
        </ErrorBoundary>
      </main>
    </div>
  );
}
