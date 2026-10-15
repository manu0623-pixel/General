import { useState } from 'react';
import { STAGES } from '../../domain/dimensions';
import { completeness, currentStage } from '../../engine/adaptive';
import type { ViewId } from '../App';
import { EditDialog } from '../components/EditDialog';
import { QuestionForm } from '../components/QuestionForm';
import type { AppApi } from '../useApp';

export function StageRail({ app }: { app: AppApi }) {
  const state = app.state!;
  const cur = currentStage(state);
  return (
    <nav className="rail" aria-label="Etapas de la evaluación">
      {STAGES.map((s) => {
        const done = state.completedStages.includes(s.n);
        const st = done ? 'done' : s.n === cur && state.status !== 'finalizada' ? 'current' : 'todo';
        const n = Object.values(state.answers).filter((a) => a.stage === s.n).length;
        return (
          <div key={s.n} className="rail-item" data-state={st} aria-current={st === 'current' ? 'step' : undefined}>
            <span className="rail-dot">{done ? '✓' : s.n}</span>
            <span className="rail-text">
              <span className="rail-title">{s.title}</span>
              <span className="rail-sub" style={{ display: 'block' }}>{n ? `${n} respuesta${n === 1 ? '' : 's'}` : st === 'current' ? 'En curso' : ''}</span>
            </span>
          </div>
        );
      })}
    </nav>
  );
}

export function AssessView({ app, go }: { app: AppApi; go: (v: ViewId) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [finalMsg, setFinalMsg] = useState<string[] | null>(null);
  const step = app.step!;
  const state = app.state!;
  const lastAnswered = state.order.filter((id) => id in state.answers).slice(-1)[0];

  let content: React.ReactNode;
  if (state.status === 'finalizada' && step.done) {
    content = (
      <div className="panel stack-lg">
        <p className="eyebrow">Evaluación finalizada</p>
        <h2>Tu informe vocacional está listo</h2>
        <p className="prose">Podés seguir corrigiendo respuestas en «Respuestas»; cada cambio actualiza el análisis y queda registrado. El paso siguiente es poner a prueba a las finalistas con experiencias prácticas.</p>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={() => go('resultados')}>Ver el informe</button>
          <button type="button" className="btn" onClick={() => go('experiencias')}>Experiencias prácticas</button>
        </div>
      </div>
    );
  } else if (step.done) {
    const comp = completeness(step.ctx);
    content = (
      <div className="panel stack-lg">
        <p className="eyebrow">Cierre</p>
        <h2>Terminaste el recorrido</h2>
        <p className="prose">Revisaste las hipótesis y respondiste las preguntas necesarias. Al finalizar se genera el informe definitivo; vas a poder seguir corrigiendo respuestas y registrar experiencias.</p>
        {!comp.canFinalize && <div className="callout warn"><strong>Todavía falta información esencial:</strong><ul className="list">{comp.missing.map((m) => <li key={m}>{m}</li>)}</ul></div>}
        {finalMsg && <div className="callout crit"><ul className="list">{finalMsg.map((m) => <li key={m}>{m}</li>)}</ul></div>}
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={!comp.canFinalize} onClick={() => { const r = app.finalize(); if (r.ok) go('resultados'); else setFinalMsg(r.missing); }}>Finalizar y ver el informe</button>
          <button type="button" className="btn" onClick={() => go('historial')}>Revisar respuestas</button>
        </div>
      </div>
    );
  } else {
    const q = step.question!;
    const stage = step.pending!.stage;
    const meta = STAGES[stage - 1];
    const prevStage = lastAnswered ? state.answers[lastAnswered].stage : 0;
    const enteringStage = prevStage !== stage && !Object.values(state.answers).some((a) => a.stage === stage);
    const revisit = q.id.startsWith('contra:');
    const progress = (state.completedStages.length + 0.5) / 9;
    content = (
      <div className="stack-lg">
        <div className="stack">
          <div className="row">
            <span className="eyebrow">Etapa {stage} de 9 · {meta.title}</span>
            <span className="spacer" />
            <span className="counter">{Object.keys(state.answers).length} respuestas</span>
          </div>
          <div className="progress" aria-hidden="true"><span style={{ width: `${progress * 100}%` }} /></div>
        </div>
        {enteringStage && (
          <div className="callout fade-in">
            <strong>{meta.title}.</strong> {meta.desc}
            {stage === 3 && ' Los ejercicios son breves y exploratorios: no son un examen ni una medida definitiva de tu capacidad. No hay límite de tiempo y podés responder «No lo sé».'}
            {stage === 7 && ' Vas a ver escenarios concretos. Respondé según cómo te sentirías haciéndolo de forma habitual, no según lo que te parece valioso.'}
            {stage === 9 && ' Revisá con atención: tus correcciones cambian las conclusiones.'}
          </div>
        )}
        {revisit && <p className="callout warn">Volvemos sobre una dimensión anterior porque apareció una contradicción.</p>}
        <div>
          <QuestionForm
            key={q.id}
            question={q}
            hypotheses={step.hypotheses}
            onSubmit={(v) => app.answer(v)}
            onSkip={() => app.answer(null, true)}
            onBack={lastAnswered ? () => setEditing(lastAnswered) : undefined}
          />
        </div>
        <details className="disclosure small muted">
          <summary>¿Por qué esta pregunta?</summary>
          <p style={{ marginTop: 8 }}>{step.pending!.publicReason}</p>
        </details>
      </div>
    );
  }

  return (
    <div className="layout-assess">
      <StageRail app={app} />
      <div style={{ minWidth: 0 }}>{content}</div>
      {editing && <EditDialog app={app} questionId={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
