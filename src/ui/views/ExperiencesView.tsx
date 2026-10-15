import { useMemo, useState } from 'react';
import type { ExperienceTemplate } from '../../domain/types';
import { experiencesFor, logValue } from '../../engine/experiences';
import { buildReport, diffSnapshots } from '../../engine/report';
import { pct } from '../../engine/scoring';
import type { ExperienceLog } from '../../engine/session';
import type { ViewId } from '../App';
import { fmtDate } from '../format';
import type { AppApi } from '../useApp';

const TYPE_LABEL: Record<string, string> = { ejercicio: 'Ejercicio', problema: 'Resolución de problemas', caso: 'Análisis de caso', proyecto: 'Pequeño proyecto', creativa: 'Actividad creativa', clase: 'Clase o práctica', plan: 'Revisión de plan de estudios', conversacion: 'Conversación u observación' };

export function ExperiencesView({ app, go }: { app: AppApi; go: (v: ViewId) => void }) {
  const ctx = app.step!.ctx;
  const state = app.state!;
  const report = useMemo(() => buildReport(ctx), [ctx]);
  const [logging, setLogging] = useState<{ careerId: string; tpl: ExperienceTemplate } | null>(null);

  if (state.status !== 'finalizada') {
    return (
      <div className="panel stack-lg">
        <p className="eyebrow">Experiencias prácticas</p>
        <h2>Disponible al finalizar la evaluación</h2>
        <p className="prose">Las experiencias se diseñan para las carreras finalistas, así que primero hace falta completar la evaluación.</p>
        <div><button type="button" className="btn btn-primary" onClick={() => go('evaluacion')}>Continuar la evaluación</button></div>
      </div>
    );
  }

  const nameOf = (id: string) => ctx.careers.find((c) => c.id === id)?.name ?? id;
  const snaps = state.snapshots;
  const changes = snaps.length >= 2 ? diffSnapshots(snaps[snaps.length - 2], snaps[snaps.length - 1], nameOf).filter((c) => Math.abs(c.delta) >= 0.005 || c.rankBefore !== c.rankAfter) : [];

  return (
    <div className="stack-lg" style={{ gap: 32 }}>
      <div className="stack">
        <p className="eyebrow">Verificación práctica</p>
        <h2>Experiencias para tus finalistas</h2>
        <p className="prose muted">Cada experiencia pone a prueba una hipótesis concreta. Después de hacerla, registrá cómo te fue: el análisis se actualiza y te muestra qué cambió. Una sola experiencia mueve poco el resultado; lo que importa son los patrones que se repiten.</p>
      </div>

      {changes.length > 0 && (
        <section className="panel stack">
          <h4>Último cambio: {snaps[snaps.length - 1].reason}</h4>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Carrera</th><th className="num">Antes</th><th className="num">Ahora</th><th>Posición</th><th>Qué cambió</th></tr></thead>
              <tbody>
                {changes.slice(0, 8).map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="num">{c.before == null ? '—' : `${pct(c.before)} %`}</td>
                    <td className="num">{pct(c.after)} %</td>
                    <td className="num">{c.rankBefore ?? '—'} → {c.rankAfter}</td>
                    <td className="small">{explain(c.dims)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {report.finalists.map((f) => {
        const logs = state.experienceLogs.filter((l) => l.careerId === f.entry.id);
        const avg = logs.length ? logs.reduce((s, l) => s + logValue(l), 0) / logs.length : null;
        return (
          <section key={f.entry.id} className="stack">
            <div className="row">
              <h3>{f.career.name}</h3>
              <span className="spacer" />
              <span className="chip">{logs.length} registrada{logs.length === 1 ? '' : 's'}</span>
              {avg != null && <span className={`chip ${avg >= 0.6 ? 'good' : avg <= 0.4 ? 'crit' : 'warn'}`}>{logs.length >= 2 ? 'Patrón' : 'Primera señal'}: {avg >= 0.6 ? 'favorable' : avg <= 0.4 ? 'desfavorable' : 'mixta'}</span>}
            </div>
            <div className="results-grid">
              {experiencesFor(f.career).map((tpl) => {
                const done = logs.find((l) => l.experienceId === tpl.id);
                return (
                  <article key={tpl.id} className="panel stack">
                    <div className="row"><span className="chip">{TYPE_LABEL[tpl.type] ?? tpl.type}</span><span className="chip">{tpl.duration}</span>{done && <span className="chip good">Registrada</span>}</div>
                    <h4>{tpl.title}</h4>
                    <p className="small"><strong>Hipótesis:</strong> {tpl.hypothesis}</p>
                    <ol className="list small" style={{ paddingLeft: 20 }}>{tpl.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                    {done ? (
                      <div className="stack small">
                        <span>Interés {done.interest}/5 · Satisfacción {done.satisfaction}/5 · Dificultad {done.difficulty}/5 · Seguir aprendiendo: {done.continueLearning}</span>
                        {done.learned && <span className="muted">«{done.learned}»</span>}
                        <div className="row"><button type="button" className="btn btn-sm" onClick={() => setLogging({ careerId: f.entry.id, tpl })}>Editar registro</button><button type="button" className="btn btn-sm btn-ghost" onClick={() => app.removeExperience(done.id)}>Eliminar</button></div>
                      </div>
                    ) : (
                      <div><button type="button" className="btn btn-sm btn-primary" onClick={() => setLogging({ careerId: f.entry.id, tpl })}>Registrar cómo me fue</button></div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {snaps.length > 0 && (
        <details className="disclosure panel">
          <summary>Historial de actualizaciones del análisis ({snaps.length})</summary>
          <ul className="list small" style={{ marginTop: 8 }}>
            {snaps.slice().reverse().map((s, i) => <li key={i}>{fmtDate(s.at)} — {s.reason}. Primera: {nameOf(s.ranking[0]?.id)} ({pct(s.ranking[0]?.overall ?? 0)} %)</li>)}
          </ul>
        </details>
      )}

      {logging && (
        <LogDialog
          tpl={logging.tpl}
          careerName={nameOf(logging.careerId)}
          existing={state.experienceLogs.find((l) => l.careerId === logging.careerId && l.experienceId === logging.tpl.id)}
          onClose={() => setLogging(null)}
          onSave={(data) => {
            const id = state.experienceLogs.find((l) => l.careerId === logging.careerId && l.experienceId === logging.tpl.id)?.id ?? `x-${Date.now().toString(36)}`;
            app.addExperience({ ...data, id, careerId: logging.careerId, experienceId: logging.tpl.id, at: new Date().toISOString() });
            setLogging(null);
          }}
        />
      )}
    </div>
  );
}

function explain(d: { A: number; B: number; C: number }) {
  const parts: string[] = [];
  if (Math.abs(d.B) >= 0.005) parts.push(`afinidad ${d.B > 0 ? 'sube' : 'baja'} ${Math.abs(Math.round(d.B * 100))} pts`);
  if (Math.abs(d.A) >= 0.005) parts.push(`aptitudes ${d.A > 0 ? '+' : '−'}${Math.abs(Math.round(d.A * 100))}`);
  if (Math.abs(d.C) >= 0.005) parts.push(`futuro ${d.C > 0 ? '+' : '−'}${Math.abs(Math.round(d.C * 100))}`);
  return parts.join(' · ') || 'Cambio de posición por movimientos de otras carreras';
}

type LogData = Omit<ExperienceLog, 'id' | 'careerId' | 'experienceId' | 'at'>;

function Rating({ id, label, value, onChange, low, high }: { id: string; label: string; value: number; onChange: (n: number) => void; low: string; high: string }) {
  return (
    <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: 6 }}>{label}</legend>
      <div className="row">
        <span className="small muted">{low}</span>
        <div className="segmented" role="radiogroup" aria-label={label}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} data-checked={value === n}><input type="radio" name={id} id={`${id}-${n}`} checked={value === n} onChange={() => onChange(n)} />{n}</label>
          ))}
        </div>
        <span className="small muted">{high}</span>
      </div>
    </fieldset>
  );
}

function LogDialog({ tpl, careerName, existing, onClose, onSave }: { tpl: ExperienceTemplate; careerName: string; existing?: ExperienceLog; onClose: () => void; onSave: (d: LogData) => void }) {
  const [d, setD] = useState<LogData>(existing ? { interest: existing.interest, satisfaction: existing.satisfaction, difficulty: existing.difficulty, difficulties: existing.difficulties, continueLearning: existing.continueLearning, learned: existing.learned } : { interest: 3, satisfaction: 3, difficulty: 3, difficulties: '', continueLearning: 'quizas', learned: '' });
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal panel stack-lg" role="dialog" aria-modal="true" aria-label="Registrar experiencia" onSubmit={(e) => { e.preventDefault(); onSave(d); }}>
        <div className="stack"><p className="eyebrow">{careerName}</p><h3>{tpl.title}</h3><p className="small muted">Hipótesis: {tpl.hypothesis}</p></div>
        <Rating id="lg-int" label="¿Cuánto te interesó?" value={d.interest} onChange={(n) => setD({ ...d, interest: n })} low="Nada" high="Muchísimo" />
        <Rating id="lg-sat" label="¿Qué tan satisfactorio te resultó el proceso?" value={d.satisfaction} onChange={(n) => setD({ ...d, satisfaction: n })} low="Nada" high="Muy satisfactorio" />
        <Rating id="lg-dif" label="¿Qué tan difícil te resultó?" value={d.difficulty} onChange={(n) => setD({ ...d, difficulty: n })} low="Muy fácil" high="Muy difícil" />
        <label className="stack"><span style={{ fontWeight: 600 }}>¿Qué dificultades encontraste?</span><textarea className="textarea" id="lg-difs" style={{ minHeight: 80 }} value={d.difficulties} onChange={(e) => setD({ ...d, difficulties: e.target.value })} /></label>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 6 }}>¿Te gustaría seguir aprendiendo sobre esto?</legend>
          <div className="segmented" role="radiogroup" aria-label="Seguir aprendiendo">
            {([['si', 'Sí'], ['quizas', 'Quizás'], ['no', 'No']] as const).map(([k, l]) => (
              <label key={k} data-checked={d.continueLearning === k}><input type="radio" name="lg-cont" id={`lg-cont-${k}`} checked={d.continueLearning === k} onChange={() => setD({ ...d, continueLearning: k })} />{l}</label>
            ))}
          </div>
        </fieldset>
        <label className="stack"><span style={{ fontWeight: 600 }}>¿Qué aprendiste sobre tus propias preferencias?</span><textarea className="textarea" id="lg-learned" style={{ minHeight: 80 }} value={d.learned} onChange={(e) => setD({ ...d, learned: e.target.value })} /></label>
        <div className="row"><button type="submit" className="btn btn-primary">Guardar y actualizar el análisis</button><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button></div>
      </form>
    </div>
  );
}
