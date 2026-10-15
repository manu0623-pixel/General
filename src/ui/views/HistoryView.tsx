import { useState } from 'react';
import { STAGES } from '../../domain/dimensions';
import type { HypothesisItem } from '../../questions/generators';
import { EditDialog } from '../components/EditDialog';
import { fmtDate, summarizeAnswer } from '../format';
import type { AppApi } from '../useApp';

export function HistoryView({ app }: { app: AppApi }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [stage, setStage] = useState<number | 'all'>('all');
  const state = app.state!;
  const reg = app.step!.ctx.registry;
  const ids = state.order.filter((id) => id in state.answers && (stage === 'all' || state.answers[id].stage === stage));
  return (
    <div className="stack-lg">
      <div className="stack">
        <p className="eyebrow">Historial</p>
        <h2>Tus respuestas</h2>
        <p className="prose muted">Podés corregir cualquier respuesta. El análisis se recalcula a partir de todas tus respuestas, y queda registro de cada versión anterior.</p>
      </div>
      <div className="row">
        <label className="small muted" htmlFor="hist-stage">Etapa</label>
        <select id="hist-stage" className="input" value={String(stage)} onChange={(e) => setStage(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">Todas</option>
          {STAGES.map((s) => <option key={s.n} value={s.n}>{s.n}. {s.title}</option>)}
        </select>
        <span className="counter">{ids.length} respuestas</span>
      </div>
      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Etapa</th><th>Pregunta</th><th>Respuesta</th><th>Fecha</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {ids.map((id) => {
                const a = state.answers[id];
                const q = reg.get(id, (a.value as { items?: HypothesisItem[] } | undefined)?.items);
                return (
                  <tr key={id}>
                    <td className="num">{a.stage}</td>
                    <td style={{ minWidth: 220, maxWidth: 420 }}>{q?.title ?? id}{a.revisions.length > 0 && <span className="chip" style={{ marginLeft: 6 }}>corregida ×{a.revisions.length}</span>}</td>
                    <td style={{ minWidth: 200, maxWidth: 380 }} className="small">{summarizeAnswer(q, a.value, a.skipped)}</td>
                    <td className="small muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(a.answeredAt)}</td>
                    <td><button type="button" className="btn btn-sm" onClick={() => setEditing(id)}>Corregir</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {editing && <EditDialog app={app} questionId={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
