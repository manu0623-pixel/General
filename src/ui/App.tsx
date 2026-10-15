import { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Icon } from './components/Icons';
import { useApp } from './useApp';
import { AssessView } from './views/AssessView';
import { CareersView } from './views/CareersView';
import { ExperiencesView } from './views/ExperiencesView';
import { HistoryView } from './views/HistoryView';
import { HomeView } from './views/HomeView';
import { LogView } from './views/LogView';
import { ResultsView } from './views/ResultsView';
import { SettingsView } from './views/SettingsView';

export type ViewId = 'inicio' | 'evaluacion' | 'historial' | 'registro' | 'resultados' | 'experiencias' | 'carreras' | 'ajustes' | 'mas';

const NAV: { id: ViewId; label: string; needsState?: boolean }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'evaluacion', label: 'Test', needsState: true },
  { id: 'resultados', label: 'Resultados', needsState: true },
  { id: 'carreras', label: 'Carreras' },
  { id: 'mas', label: 'Más' },
  { id: 'experiencias', label: 'Experiencias', needsState: true },
  { id: 'historial', label: 'Mis respuestas', needsState: true },
  { id: 'registro', label: 'Registro de evidencias', needsState: true },
  { id: 'ajustes', label: 'Datos y privacidad' },
];

const TABS: { id: ViewId; label: string; icon: () => JSX.Element; needsState?: boolean }[] = [
  { id: 'inicio', label: 'Inicio', icon: Icon.home },
  { id: 'evaluacion', label: 'Test', icon: Icon.test, needsState: true },
  { id: 'resultados', label: 'Resultados', icon: Icon.chart, needsState: true },
  { id: 'carreras', label: 'Carreras', icon: Icon.cap },
  { id: 'mas', label: 'Más', icon: Icon.more },
];
const MORE: { id: ViewId; label: string; icon: () => JSX.Element; color: string; needsState?: boolean }[] = [
  { id: 'experiencias', label: 'Experiencias prácticas', icon: Icon.flask, color: '#34c759', needsState: true },
  { id: 'historial', label: 'Mis respuestas', icon: Icon.list, color: '#ff9500', needsState: true },
  { id: 'registro', label: 'Registro de evidencias', icon: Icon.search, color: '#5856d6', needsState: true },
  { id: 'ajustes', label: 'Datos y privacidad', icon: Icon.gear, color: '#8e8e93' },
];
const SUBPAGES: ViewId[] = ['experiencias', 'historial', 'registro', 'ajustes'];


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
    : app.cloud === 'sincronizado' ? 'Guardado'
    : app.cloud === 'guardando' ? 'Guardando…'
    : app.saved ? 'Guardado' : '';
  const currentLabel = NAV.find((n) => n.id === current)?.label;
  const isSub = SUBPAGES.includes(current);
  const tabFor = isSub ? 'mas' : current;

  return (
    <div className="app-ios">
      <header className="navbar">
        <div className="navbar-inner">
          {isSub ? <button type="button" className="navbar-back" onClick={() => go('mas')}><Icon.back />Más</button> : <span />}
          <span className="navbar-title">{current === 'inicio' ? 'Brújula Vocacional' : currentLabel}</span>
          {app.state && saveText ? <span className="save-state" role="status" aria-live="polite" title={app.saved?.error ?? ''}>{saveText}</span> : <span />}
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
          {current === 'mas' && (
            <div className="stack-lg">
              <div className="large-title"><h1>Más</h1></div>
              <div className="ios-list">
                {MORE.filter((m) => !m.needsState || app.state).map((m) => (
                  <button key={m.id} type="button" className="ios-row" onClick={() => go(m.id)}>
                    <span className="ico-box" style={{ background: m.color }}><m.icon /></span>
                    {m.label}
                    <span className="chev"><Icon.chevron /></span>
                  </button>
                ))}
              </div>
              {!app.state && <p className="group-foot">Las demás secciones aparecen cuando empezás el test.</p>}
              <p className="group-foot">Carreras de la UNLP y la UBA. Tus respuestas se guardan solo en tu dispositivo.</p>
            </div>
          )}
        </ErrorBoundary>
      </main>
      <nav className="tabbar" aria-label="Secciones">
        <div className="tabbar-inner">
          {TABS.filter((t) => !t.needsState || app.state).map((t) => (
            <button key={t.id} type="button" className="tab" aria-current={tabFor === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
              <t.icon />{t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
