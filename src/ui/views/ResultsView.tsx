import { useMemo, useState } from 'react';
import { buildReport, type CareerReport } from '../../engine/report';
import { band, pct } from '../../engine/scoring';
import type { ViewId } from '../App';
import { DimBars, DimLegend, RankingChart, RiasecChart, ValuesChart } from '../components/Charts';
import type { AppApi } from '../useApp';

const VIAB: Record<string, { cls: string; label: string }> = {
  sin_restricciones: { cls: 'good', label: '✓ Sin restricciones detectadas' },
  con_condiciones: { cls: 'warn', label: '! Con condiciones' },
  restriccion_importante: { cls: 'crit', label: '✕ Restricción importante' },
};
const CONF: Record<string, string> = { alta: 'good', media: 'accent', baja: 'warn' };

export function ResultsView({ app, go }: { app: AppApi; go: (v: ViewId) => void }) {
  const ctx = app.step!.ctx;
  const report = useMemo(() => buildReport(ctx), [ctx]);
  const [showAll, setShowAll] = useState(false);
  const provisional = report.status === 'provisional';
  const answered = Object.keys(app.state!.answers).length;

  if (answered < 15) {
    return (
      <div className="panel stack-lg">
        <p className="eyebrow">Resultados</p>
        <h2>Todavía es muy pronto para mostrar resultados</h2>
        <p className="prose">Con {answered} respuestas cualquier ranking sería una especulación. Seguí con la evaluación: a partir de la etapa 2 vas a ver un panorama provisional.</p>
        <div><button type="button" className="btn btn-primary" onClick={() => go('evaluacion')}>Continuar la evaluación</button></div>
      </div>
    );
  }

  const ranking = showAll ? ctx.ranking.slice(0, 25) : ctx.ranking.slice(0, 12);
  return (
    <div className="stack-lg" style={{ gap: 36 }}>
      <header className="stack">
        <p className="eyebrow">{provisional ? 'Panorama provisional' : 'Informe vocacional'}</p>
        <h1 style={{ fontSize: 'var(--step-4)' }}>{provisional ? 'Lo que se ve hasta ahora' : 'Tu informe vocacional'}</h1>
        {provisional ? (
          <div className="callout warn stack">
            <strong>Este no es un ranking definitivo.</strong>
            <span>Falta información esencial, por eso no hay recomendación todavía:</span>
            <ul className="list">{report.completeness.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            <div><button type="button" className="btn btn-sm" onClick={() => go('evaluacion')}>Continuar la evaluación</button></div>
          </div>
        ) : (
          <p className="lede">{report.recommendation.headline}</p>
        )}
      </header>

      {/* Perfil general */}
      <section className="stack">
        <h2>Perfil general</h2>
        <p className="prose">{report.profile.summary}</p>
        <div className="results-grid">
          <div className="panel stack">
            <h4>Cómo abordás los problemas</h4>
            {report.profile.approach.length ? <ul className="list">{report.profile.approach.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="muted small">Sin datos suficientes.</p>}
          </div>
          <div className="panel stack">
            <h4>Intereses por tipo de actividad</h4>
            <RiasecChart profile={ctx.profile} />
          </div>
          <div className="panel stack">
            <h4>Qué podría estimularte</h4>
            {report.profile.stimulating.length ? <ul className="list">{report.profile.stimulating.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="muted small">Sin datos suficientes.</p>}
            <h4 style={{ marginTop: 12 }}>Ambientes que podrían favorecerte</h4>
            {report.profile.environments.length ? <ul className="list">{report.profile.environments.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="muted small">No aparecen preferencias marcadas: probablemente te adaptes a distintos entornos.</p>}
          </div>
          <div className="panel stack">
            <h4>Qué podría frustrarte</h4>
            {report.profile.frustrations.length ? <ul className="list">{report.profile.frustrations.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="muted small">No aparecen rechazos marcados.</p>}
            <h4 style={{ marginTop: 12 }}>Lo que sigue siendo incierto</h4>
            {report.profile.uncertain.length ? <ul className="list">{report.profile.uncertain.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="muted small">No hay incertidumbres importantes pendientes.</p>}
          </div>
          <div className="panel stack">
            <h4>Prioridades</h4>
            <ValuesChart profile={ctx.profile} />
          </div>
          <div className="panel stack">
            <h4>Fortalezas que aparecen con consistencia</h4>
            {report.profile.strengths.length ? (
              <ul className="list">
                {report.profile.strengths.map((s) => (
                  <li key={s.key}>
                    <strong>{s.label}</strong> <span className={`chip ${s.demonstrated ? 'good' : 'warn'}`}>{s.demonstrated ? 'demostrada' : 'hipótesis por verificar'}</span>
                    <div className="small muted">{s.sources}</div>
                  </li>
                ))}
              </ul>
            ) : <p className="muted small">Todavía no hay fortalezas con evidencia suficiente.</p>}
          </div>
        </div>
      </section>

      {/* Ranking */}
      <section className="stack">
        <div className="row"><h2>{provisional ? 'Panorama provisional de carreras' : 'Ranking de carreras'}</h2></div>
        <p className="prose muted small">
          Pesos de las dimensiones: aptitudes {pct(report.weights.A)} %, intereses {pct(report.weights.B)} %, futuro {pct(report.weights.C)} %{report.weights.explicit ? ' (ajustados según tus prioridades explícitas)' : ' (equilibrio por defecto)'}.
          Los valores se redondean a múltiplos de 5 % para no sugerir una precisión que no existe.
        </p>
        <div className="panel"><RankingChart entries={ranking} /></div>
        <div className="row"><button type="button" className="btn btn-sm" onClick={() => setShowAll((x) => !x)}>{showAll ? 'Mostrar menos' : 'Mostrar más carreras'}</button></div>
      </section>

      {!provisional && (
        <>
          <section className="stack">
            <h2>Finalistas</h2>
            <DimLegend />
            <div className="stack">
              {report.finalists.map((f) => <CareerCard key={f.entry.id} r={f} />)}
            </div>
          </section>

          {report.finalists.length >= 2 && (
            <section className="stack">
              <h2>Comparación de finalistas</h2>
              {report.comparison.shared.length > 0 && <p className="prose"><strong>Qué comparten:</strong> {report.comparison.shared.join(' · ')}.</p>}
              <div className="panel" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Aspecto</th>{report.finalists.map((f) => <th key={f.entry.id}>{f.career.name}</th>)}</tr></thead>
                    <tbody>
                      {report.comparison.differences.map((d) => (
                        <tr key={d.aspect}><td>{d.aspect}</td>{d.values.map((v) => <td key={v.name}>{v.value}</td>)}</tr>
                      ))}
                      <tr><td>Tareas típicas</td>{report.finalists.map((f) => <td key={f.entry.id} className="small">{f.career.tasks.slice(0, 3).join('; ')}</td>)}</tr>
                      <tr><td>Exigencias de la formación</td>{report.finalists.map((f) => <td key={f.entry.id} className="small">{f.career.study.slice(0, 3).join('; ')}</td>)}</tr>
                    </tbody>
                  </table>
                </div>
              </div>
              {report.comparison.leanings.length > 0 && <div className="stack"><h4>Qué inclinaría la decisión</h4><ul className="list">{report.comparison.leanings.map((l) => <li key={l}>{l}</li>)}</ul></div>}
            </section>
          )}

          <section className="two-col">
            <div className="panel stack">
              <h3>Áreas de desarrollo</h3>
              {report.development.length ? <ul className="list">{report.development.map((d) => <li key={d.label}><strong>{d.label}.</strong> {d.text}</li>)}</ul> : <p className="muted small">Las aptitudes centrales de tus finalistas no aparecen como áreas débiles.</p>}
            </div>
            <div className="panel stack">
              <h3>Alternativas menos compatibles</h3>
              <ul className="list">
                {report.lower.slice(0, 8).map((l) => (
                  <li key={l.id}><strong>{l.name}</strong> <span className="muted small">#{l.rank}</span><div className="small muted">{l.reasons.map((r) => r.text).join(' ')}</div></li>
                ))}
              </ul>
              <p className="small muted">Ninguna se descarta solo por falta de experiencia previa.</p>
            </div>
          </section>

          <section className="panel stack-lg">
            <h2>Recomendación</h2>
            <p className="lede" style={{ color: 'var(--ink)' }}>{report.recommendation.headline}</p>
            {report.recommendation.alternatives.length > 0 && <p><strong>Alternativas fuertes:</strong> {report.recommendation.alternatives.join(' · ')}</p>}
            <div className="two-col">
              <div className="stack"><h4>Diferencias a considerar</h4><ul className="list">{report.recommendation.differences.map((d) => <li key={d}>{d}</li>)}</ul></div>
              <div className="stack"><h4>Dudas que todavía hay que resolver</h4><ul className="list">{report.recommendation.doubts.map((d) => <li key={d}>{d}</li>)}</ul></div>
            </div>
            <div className="stack">
              <h4>Plan para verificar antes de decidir</h4>
              <ol className="list" style={{ paddingLeft: 22 }}>{report.recommendation.plan.map((p) => <li key={p}>{p}</li>)}</ol>
            </div>
            <div><button type="button" className="btn btn-primary" onClick={() => go('experiencias')}>Ir a las experiencias prácticas</button></div>
          </section>
        </>
      )}

      {report.insufficientData.length > 0 && <p className="callout small">Sin información suficiente para concluir (no reciben puntuación): {report.insufficientData.join(', ')}.</p>}

      <details className="disclosure panel">
        <summary>Limitaciones de este análisis</summary>
        <ul className="list small" style={{ marginTop: 10 }}>
          <li>No es un diagnóstico psicológico ni un test psicométrico validado. Los porcentajes expresan compatibilidad estimada, no probabilidad de éxito.</li>
          <li>Los perfiles de las carreras se construyeron a partir de conocimiento general de cada disciplina; salvo donde se indica, los planes de estudio, duraciones y perspectivas laborales son estimaciones a verificar con fuentes oficiales.</li>
          <li>Los ejercicios son pocos y breves: aportan indicios, no mediciones.</li>
          <li>El resultado depende de la sinceridad y del momento de tus respuestas; conviene revisarlo con experiencias prácticas.</li>
        </ul>
      </details>
    </div>
  );
}

function CareerCard({ r }: { r: CareerReport }) {
  const e = r.entry;
  const v = VIAB[e.viability.level];
  return (
    <article className="panel career-card">
      <div className="career-head">
        <span className="rank-num">#{e.rank}</span>
        <h3 style={{ flex: '1 1 260px' }}>{r.career.name}</h3>
        <span className="num">≈ {pct(e.overall)} % <span className="muted small">({pct(e.overall - e.hw)}–{pct(e.overall + e.hw)})</span></span>
      </div>
      <div className="row">
        <span className={`chip ${CONF[e.confidence]}`}>Confianza {e.confidence}</span>
        <span className={`chip ${v.cls}`}><span className="ico">{v.label}</span></span>
        <span className="chip">{r.career.facultad}</span>
        {r.preferredVariant && <span className="chip accent">Orientación sugerida: {r.preferredVariant}</span>}
      </div>
      <DimBars entry={e} />
      <dl className="kv">
        <dt>Compatibilidad con valores</dt><dd>{band(e.valuesFit)}</dd>
        <dt>Preparación actual</dt><dd>{e.readiness == null ? 'Sin evidencia observada suficiente' : band(e.readiness)}</dd>
        <dt>Potencial de desarrollo</dt><dd>{band(e.potential)}</dd>
        <dt>Perspectivas</dt><dd>{r.perspectives} <span className={`chip ${r.perspectivesStatus === 'verificado' ? 'good' : 'warn'}`}>{r.perspectivesStatus === 'verificado' ? 'datos verificados' : 'estimación'}</span></dd>
      </dl>
      <div className="two-col">
        <div className="stack"><h4>Fortalezas que podrías aprovechar</h4>{r.strengths.length ? <ul className="list">{r.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="small muted">Sin fortalezas específicas destacadas.</p>}</div>
        <div className="stack"><h4>Dificultades a considerar</h4>{r.difficulties.length ? <ul className="list">{r.difficulties.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="small muted">No aparecen dificultades relevantes.</p>}</div>
      </div>
      <details className="disclosure">
        <summary>Evidencias que respaldan esta posición</summary>
        <ul className="list small" style={{ marginTop: 8 }}>{r.evidence.map((x) => <li key={x}>{x}</li>)}</ul>
      </details>
    </article>
  );
}
