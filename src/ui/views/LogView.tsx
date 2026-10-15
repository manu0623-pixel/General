import { useMemo, useState } from 'react';
import { APTITUDES, DOMAINS, RIASEC, STYLES, VALUES, labelForTarget } from '../../domain/dimensions';
import { demandLabel } from '../../domain/careerModel';
import type { EvidenceSource } from '../../domain/types';
import { SOURCE_LABEL, getEst } from '../../engine/profile';
import { fmtDate } from '../format';
import type { AppApi } from '../useApp';

type Tab = 'cobertura' | 'evidencias' | 'contradicciones' | 'razones';

export function LogView({ app }: { app: AppApi }) {
  const [tab, setTab] = useState<Tab>('cobertura');
  return (
    <div className="stack-lg">
      <div className="stack">
        <p className="eyebrow">Registro estructurado</p>
        <h2>Evidencias y razonamiento</h2>
        <p className="prose muted">Todo lo que el análisis sabe de vos, de dónde sale y qué falta. Cada evidencia indica su tipo: no es lo mismo una preferencia declarada que una aptitud observada o una experiencia demostrada.</p>
      </div>
      <div className="segmented" role="tablist" aria-label="Secciones del registro">
        {([['cobertura', 'Dimensiones'], ['evidencias', 'Evidencias'], ['contradicciones', 'Contradicciones'], ['razones', 'Razones de las preguntas']] as [Tab, string][]).map(([id, label]) => (
          <label key={id} data-checked={tab === id}><input type="radio" name="log-tab" id={`log-${id}`} checked={tab === id} onChange={() => setTab(id)} />{label}</label>
        ))}
      </div>
      {tab === 'cobertura' && <Coverage app={app} />}
      {tab === 'evidencias' && <EvidenceTable app={app} />}
      {tab === 'contradicciones' && <Contradictions app={app} />}
      {tab === 'razones' && <Reasons app={app} />}
    </div>
  );
}

function confLabel(c: number) { return c >= 0.6 ? 'alta' : c >= 0.35 ? 'media' : c > 0 ? 'baja' : 'sin datos'; }

function Coverage({ app }: { app: AppApi }) {
  const p = app.step!.ctx.profile;
  const groups: [string, string, Record<string, unknown>][] = [
    ['Intereses (RIASEC)', 'riasec', RIASEC],
    ['Áreas de interés', 'domain', DOMAINS],
    ['Aptitudes', 'aptitude', APTITUDES],
    ['Estilo de trabajo', 'style', STYLES],
    ['Valores', 'value', VALUES],
    ['Exigencias reales', 'demand', Object.fromEntries(app.catalog.demands.map((d) => [d.key, d.label]))],
  ];
  return (
    <div className="results-grid">
      {groups.map(([title, kind, keys]) => {
        const rows = Object.keys(keys).map((k) => ({ k, e: getEst(p, kind as never, k) }));
        const explored = rows.filter((r) => r.e.conf >= 0.35).length;
        return (
          <section key={kind} className="panel stack">
            <div className="row"><h4>{title}</h4><span className="spacer" /><span className="chip">{explored} / {rows.length} exploradas</span></div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Dimensión</th><th className="num">Estimación</th><th>Confianza</th></tr></thead>
                <tbody>
                  {rows.sort((a, b) => b.e.conf - a.e.conf).map(({ k, e }) => (
                    <tr key={k}>
                      <td>{kind === 'demand' ? demandLabel(app.catalog, k) : labelForTarget(kind, k)}</td>
                      <td className="num">{e.n ? `${Math.round(e.est * 100)}` : '—'}</td>
                      <td><span className={`chip ${e.conf >= 0.6 ? 'good' : e.conf >= 0.35 ? 'accent' : e.n ? 'warn' : ''}`}>{confLabel(e.conf)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function EvidenceTable({ app }: { app: AppApi }) {
  const ctx = app.step!.ctx;
  const [src, setSrc] = useState<EvidenceSource | 'all'>('all');
  const rows = useMemo(() => ctx.evidence.filter((e) => e.target.kind !== 'constraint' && (src === 'all' || e.source === src)), [ctx.evidence, src]);
  const label = (kind: string, key: string) => {
    if (kind === 'demand') return demandLabel(app.catalog, key);
    if (kind === 'career') { const [id, v] = key.split('#'); const c = ctx.careers.find((x) => x.id === id); return `Carrera: ${c?.name ?? id}${v ? ` (orientación ${c?.variants?.find((x) => x.id === v)?.name ?? v})` : ''}`; }
    return labelForTarget(kind, key);
  };
  const constraints = ctx.evidence.filter((e) => e.target.kind === 'constraint');
  return (
    <div className="stack">
      <div className="row">
        <label htmlFor="ev-src" className="small muted">Tipo de evidencia</label>
        <select id="ev-src" className="input" value={src} onChange={(e) => setSrc(e.target.value as EvidenceSource | 'all')}>
          <option value="all">Todas</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="counter">{rows.length} evidencias</span>
      </div>
      {constraints.length > 0 && <p className="callout small"><strong>Factores prácticos externos (no afectan la afinidad):</strong> {constraints.map((c) => c.target.key.replace('_', ' ')).join(' · ')}</p>}
      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap" style={{ maxHeight: 560 }}>
          <table className="table">
            <thead><tr><th>Dimensión</th><th className="num">Valor</th><th className="num">Peso</th><th>Tipo</th><th>Origen</th></tr></thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={i}>
                  <td>{label(e.target.kind, e.target.key)}</td>
                  <td className="num">{Math.round(e.value * 100)}</td>
                  <td className="num">{e.weight.toFixed(2)}</td>
                  <td className="small">{SOURCE_LABEL[e.source]}</td>
                  <td className="small muted" style={{ maxWidth: 320 }}>{ctx.registry.get(e.questionId)?.title.slice(0, 80) ?? e.questionId}{e.note ? ` · ${e.note}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Contradictions({ app }: { app: AppApi }) {
  const ctx = app.step!.ctx;
  const answered = Object.entries(app.state!.answers).filter(([k]) => k.startsWith('contra:'));
  return (
    <div className="stack">
      {ctx.contradictions.length === 0 && answered.length === 0 && <p className="muted">No se detectaron contradicciones entre tus respuestas.</p>}
      {ctx.contradictions.map((c) => {
        const a = app.state!.answers[c.id];
        const q = ctx.registry.get(c.id);
        return (
          <div key={c.id} className="panel panel-tight stack">
            <div className="row"><strong>{c.description}</strong><span className="spacer" /><span className={`chip ${a ? 'good' : 'warn'}`}>{a ? 'aclarada' : 'pendiente'}</span></div>
            {a && <p className="small muted">Tu aclaración: {q?.options?.find((o) => o.id === a.value)?.label ?? String(a.value)}</p>}
          </div>
        );
      })}
    </div>
  );
}

function Reasons({ app }: { app: AppApi }) {
  const [show, setShow] = useState(false);
  const state = app.state!;
  const reg = app.step!.ctx.registry;
  if (!show) {
    return (
      <div className="panel stack">
        <p>Este registro muestra la razón técnica de cada pregunta, incluyendo qué carreras estaba ayudando a distinguir. Verlo antes de terminar podría influir en tus respuestas.</p>
        <div><button type="button" className="btn" onClick={() => setShow(true)}>Mostrar el registro técnico</button></div>
      </div>
    );
  }
  return (
    <div className="panel" style={{ padding: 0 }}>
      <div className="table-wrap" style={{ maxHeight: 600 }}>
        <table className="table">
          <thead><tr><th>#</th><th>Pregunta</th><th>Razón</th><th>Fecha</th></tr></thead>
          <tbody>
            {state.order.filter((id) => id in state.answers).map((id, i) => {
              const a = state.answers[id];
              return (
                <tr key={id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ maxWidth: 300 }}>{reg.get(id)?.title ?? id}</td>
                  <td className="small" style={{ maxWidth: 420 }}>{a.internalReason}</td>
                  <td className="small muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(a.answeredAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
