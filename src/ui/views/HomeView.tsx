import { useRef, useState } from 'react';
import { STAGES } from '../../domain/dimensions';
import { completeness, currentStage } from '../../engine/adaptive';
import { generateHypotheses } from '../../engine/hypotheses';
import type { ViewId } from '../App';
import { fmtDate } from '../format';
import type { AppApi } from '../useApp';

export function HomeView({ app, go }: { app: AppApi; go: (v: ViewId) => void }) {
  if (!app.state || !app.step) return <Welcome app={app} go={go} />;
  return <Resume app={app} go={go} />;
}

function Welcome({ app, go }: { app: AppApi; go: (v: ViewId) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const n = app.catalog.careers.filter((c) => c.active !== false).length;
  return (
    <div className="stack-lg" style={{ gap: 40 }}>
      <section className="hero">
        <div className="stack-lg">
          <p className="eyebrow">Orientación vocacional · Universidad Nacional de La Plata</p>
          <h1>¿Qué carrera combina mejor lo que podés, lo que te gusta y lo que buscás?</h1>
          <p className="lede">
            Una evaluación profunda y adaptativa sobre las {n} carreras de tu lista. Las preguntas cambian según tus respuestas, combinan
            escenarios, ejercicios breves y experiencias concretas, y el resultado muestra la evidencia que lo sostiene y lo que todavía es incierto.
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => { app.start(); go('evaluacion'); }}>Comenzar la evaluación</button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Retomar desde un archivo</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden id="import-file"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { app.importText(await f.text()); go('inicio'); } catch (x) { setErr(x instanceof Error ? x.message : String(x)); }
              }} />
          </div>
          {err && <p className="callout crit">{err}</p>}
          <p className="small muted">Lleva entre 60 y 120 preguntas según tu perfil. Se guarda sola en este dispositivo: podés pausar y volver cuando quieras.</p>
        </div>
        <div className="panel stack">
          <p className="eyebrow">Tres dimensiones, en equilibrio</p>
          <div className="dims3" style={{ gridTemplateColumns: '1fr' }}>
            <div className="dim-card" data-dim="A"><strong>Aptitudes y potencial</strong><span className="small muted">Ejercicios, experiencias demostradas y facilidad para aprender.</span></div>
            <div className="dim-card" data-dim="B"><strong>Intereses y compatibilidad</strong><span className="small muted">Intereses genuinos, estilo de trabajo, valores y disposición frente a las tareas reales.</span></div>
            <div className="dim-card" data-dim="C"><strong>Futuro profesional</strong><span className="small muted">Salida laboral, crecimiento, ingresos y condiciones de vida según tus prioridades.</span></div>
          </div>
          <p className="small muted">Ninguna dimensión decide sola. La viabilidad práctica (requisitos, duración, costos) se informa aparte.</p>
        </div>
      </section>

      <section className="stack">
        <h3>Cómo funciona</h3>
        <ol className="list" style={{ paddingLeft: 22 }}>
          {STAGES.map((s) => <li key={s.n}><strong>{s.title}.</strong> <span className="muted">{s.desc}</span></li>)}
        </ol>
      </section>

      <section className="two-col">
        <div className="panel stack">
          <h4>Qué es y qué no es</h4>
          <p className="small">Es una herramienta de exploración basada en marcos reconocidos (intereses RIASEC de Holland, ajuste persona–entorno, autoeficacia, valores laborales). No es un diagnóstico psicológico ni una prueba psicométrica validada, y los porcentajes no son probabilidades de éxito.</p>
        </div>
        <div className="panel stack">
          <h4>Privacidad</h4>
          <p className="small">Tus respuestas se guardan solo en este navegador. No se envían a ningún servidor ni a servicios de inteligencia artificial. Podés exportar una copia en Ajustes.</p>
        </div>
      </section>
    </div>
  );
}

function Resume({ app, go }: { app: AppApi; go: (v: ViewId) => void }) {
  const state = app.state!;
  const ctx = app.step!.ctx;
  const comp = completeness(ctx);
  const stage = currentStage(state);
  const hyps = generateHypotheses(ctx).slice(0, 4);
  const answered = Object.keys(state.answers).length;
  const pct = Math.round((state.completedStages.length / 9) * 100);
  const done = state.status === 'finalizada';
  return (
    <div className="stack-lg">
      <div className="stack">
        <p className="eyebrow">{done ? 'Evaluación finalizada' : 'Evaluación en curso'}</p>
        <h1 style={{ fontSize: 'var(--step-4)' }}>{done ? 'Tu informe está listo' : 'Bienvenido/a de vuelta'}</h1>
        <p className="lede">
          {done
            ? `Finalizaste el ${fmtDate(state.finalizedAt)}. Podés revisar el informe, registrar experiencias prácticas o corregir respuestas: el análisis se actualiza solo.`
            : `Última actividad: ${fmtDate(app.lastVisit ?? state.updatedAt)}. Respondiste ${answered} preguntas y estás en la etapa ${stage}: ${STAGES[stage - 1].title.toLowerCase()}.`}
        </p>
      </div>
      <div className="stack" style={{ maxWidth: 560 }}>
        <div className="row small"><span>Etapas completas</span><span className="spacer" /><span className="num">{state.completedStages.length} / 9</span></div>
        <div className="progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="row">
        {!done && <button type="button" className="btn btn-primary" onClick={() => go('evaluacion')}>Continuar donde lo dejaste</button>}
        <button type="button" className={done ? 'btn btn-primary' : 'btn'} onClick={() => go('resultados')}>{done ? 'Ver el informe' : 'Ver resultados provisionales'}</button>
        {done && <button type="button" className="btn" onClick={() => go('experiencias')}>Experiencias prácticas</button>}
      </div>
      <div className="two-col">
        <section className="panel stack">
          <h4>Hipótesis provisionales</h4>
          {hyps.length ? <ul className="list">{hyps.map((h) => <li key={h.id}>{h.text}</li>)}</ul> : <p className="muted small">Todavía no hay evidencia suficiente para formular hipótesis.</p>}
          <p className="small muted">Se verifican con vos antes de cerrar la evaluación.</p>
        </section>
        <section className="panel stack">
          <h4>Lo que falta explorar</h4>
          {comp.missing.length ? <ul className="list">{comp.missing.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="small">Hay evidencia suficiente en todas las dimensiones esenciales.</p>}
          {ctx.contradictions.filter((c) => !(c.id in state.answers)).length > 0 && (
            <p className="callout warn small">Hay {ctx.contradictions.filter((c) => !(c.id in state.answers)).length} contradicción(es) para aclarar más adelante.</p>
          )}
        </section>
      </div>
    </div>
  );
}
