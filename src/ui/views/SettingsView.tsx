import { useRef, useState } from 'react';
import { exportSession } from '../../storage/persistence';
import type { ViewId } from '../App';
import { downloadText, type AppApi, type Theme } from '../useApp';

export function SettingsView({ app, go }: { app: AppApi; go: (v: ViewId) => void }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'good' | 'crit'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const copy = async () => {
    if (!app.state) return;
    try { await navigator.clipboard.writeText(exportSession(app.state)); setMsg({ kind: 'good', text: 'Copia copiada al portapapeles.' }); }
    catch { setMsg({ kind: 'crit', text: 'No se pudo copiar. Usá «Descargar copia».' }); }
  };
  return (
    <div className="stack-lg">
      <div className="stack"><p className="eyebrow">Ajustes</p><h2>Datos, apariencia y privacidad</h2></div>
      <section className="panel stack">
        <h4>Apariencia</h4>
        <div className="segmented" role="radiogroup" aria-label="Tema">
          {([['system', 'Según el sistema'], ['light', 'Claro'], ['dark', 'Oscuro']] as [Theme, string][]).map(([k, l]) => (
            <label key={k} data-checked={app.theme === k}><input type="radio" name="theme" id={`theme-${k}`} checked={app.theme === k} onChange={() => app.setTheme(k)} />{l}</label>
          ))}
        </div>
      </section>
      <section className="panel stack">
        <h4>Tus datos</h4>
        <p className="small">Todo se guarda automáticamente en este navegador después de cada respuesta. Si borrás los datos del navegador o cambiás de dispositivo, se pierden: descargá una copia de respaldo de vez en cuando.</p>
        <div className="row">
          <button type="button" className="btn" disabled={!app.state} onClick={() => app.state && downloadText(`evaluacion-vocacional-${new Date().toISOString().slice(0, 10)}.json`, exportSession(app.state))}>Descargar copia</button>
          <button type="button" className="btn" disabled={!app.state} onClick={copy}>Copiar copia</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Restaurar desde archivo</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden id="restore-file" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try { app.importText(await f.text()); setMsg({ kind: 'good', text: 'Evaluación restaurada.' }); } catch (x) { setMsg({ kind: 'crit', text: x instanceof Error ? x.message : String(x) }); }
            e.target.value = '';
          }} />
        </div>
        {msg && <p className={`callout ${msg.kind}`}>{msg.text}</p>}
        <hr className="divider" />
        {!confirmReset ? (
          <div><button type="button" className="btn btn-danger" disabled={!app.state} onClick={() => setConfirmReset(true)}>Empezar de nuevo…</button></div>
        ) : (
          <div className="callout crit stack">
            <strong>¿Borrar la evaluación actual?</strong>
            <span className="small">Se conserva una copia de respaldo interna, pero conviene descargar una copia antes.</span>
            <div className="row">
              <button type="button" className="btn btn-danger" onClick={() => { app.reset(); setConfirmReset(false); go('inicio'); }}>Sí, borrar y empezar de nuevo</button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </section>
      <section className="panel stack">
        <h4>Privacidad y uso de inteligencia artificial</h4>
        <p className="small">La aplicación no transmite datos a ningún servicio externo. La metodología funciona con reglas explícitas, sin APIs de inteligencia artificial: las respuestas abiertas se analizan con un diccionario de palabras clave cuyo resultado se marca como «señal automática de baja confianza» en el registro. Ningún modelo asigna puntuaciones ni modifica el ranking.</p>
      </section>
    </div>
  );
}
