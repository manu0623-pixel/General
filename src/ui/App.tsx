import { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
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

const NAV: { id: ViewId; label: string; icon: string; needsState?: boolean }[] = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'evaluacion', label: 'Evaluación', icon: '📝', needsState: true },
  { id: 'resultados', label: 'Resultados', icon: '📊', needsState: true },
  { id: 'experiencias', label: 'Experiencias', icon: '🧪', needsState: true },
  { id: 'historial', label: 'Respuestas', icon: '🗂️', needsState: true },
  { id: 'registro', label: 'Registro', icon: '🔎', needsState: true },
  { id: 'carreras', label: 'Carreras', icon: '🎓' },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
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

  const saveText = app.saved?.ok === false ? 'No se pudo guardar'
    : app.cloud === 'sincronizado' ? 'Guardado en tu cuenta'
    : app.cloud === 'guardando' ? 'Guardando…'
    : app.saved ? 'Guardado en este navegador' : '';
  const items = NAV.filter((n) => !n.needsState || app.state);
  const navButtons = items.map((n) => (
    <button key={n.id} type="button" className="side-item" aria-current={current === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
      <span className="ico" aria-hidden="true">{n.icon}</span>{n.label}
    </button>
  ));
  const currentLabel = NAV.find((n) => n.id === current)?.label;

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navegación">
        <div className="brand">🧭 Brújula Vocacional</div>
        <div className="side-label">Tu evaluación</div>
        {navButtons.slice(0, items.findIndex((n) => n.id === 'carreras'))}
        <div className="side-label">General</div>
        {navButtons.slice(items.findIndex((n) => n.id === 'carreras'))}
        <div className="side-foot">Carreras de la UNLP y la UBA. Tus respuestas se guardan solo para vos.</div>
      </aside>
      <div className="page">
        <div className="page-top">
          <span className="crumb">Brújula Vocacional <span className="muted">/</span> {currentLabel}</span>
          <span className="spacer" />
          {app.state && saveText && <span className="save-state" role="status" aria-live="polite" title={app.saved?.error ?? ''}>{saveText}</span>}
        </div>
        <nav className="mobile-nav" aria-label="Secciones">{navButtons}</nav>
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
    </div>
  );
}
