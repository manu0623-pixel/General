import { useMemo, useRef, useState } from 'react';
import { defaultCatalog, resolveAll, type CatalogFile } from '../../domain/careerModel';
import { DOMAINS } from '../../domain/dimensions';
import type { DomainKey } from '../../domain/types';
import { downloadText, type AppApi } from '../useApp';
import { WhereToStudy } from '../components/WhereToStudy';

const RESTR: Record<string, string> = {
  solo_nodocentes: 'Solo nodocentes UNLP', requiere_titulo_previo: 'Requiere título previo', formacion_musical_previa: 'Formación musical previa',
  aptitud_fisica: 'Exigencia física', materiales_costosos: 'Materiales costosos', carga_horaria_alta: 'Carga horaria alta', verificar_oferta: 'Verificar oferta',
};

export function CareersView({ app }: { app: AppApi }) {
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ kind: 'good' | 'crit'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const careers = useMemo(() => resolveAll(app.catalog), [app.catalog]);
  const excluded = new Set(app.state?.settings.excludedCareers ?? []);
  const [inst, setInst] = useState<'todas' | 'UNLP' | 'UBA'>('todas');
  const filtered = careers.filter((c) => (inst === 'todas' || c.offerings.some((o) => o.institution === inst)) && `${c.name} ${c.offerings.map((o) => `${o.facultad} ${o.institution} ${o.title ?? ''}`).join(' ')} ${c.familyLabel}`.toLowerCase().includes(q.toLowerCase()));
  const norm = (defaultCatalog() as { normalization?: { original: string; note: string }[] }).normalization ?? [];
  const toggle = (id: string) => {
    if (!app.state) return;
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id); else next.add(id);
    app.setExcluded([...next]);
  };
  const exportCatalog = () => {
    const file: CatalogFile & Record<string, unknown> = { version: app.catalog.version, careers: app.catalog.careers, families: app.catalog.families, modifiers: app.catalog.modifiers, demands: app.catalog.demands };
    downloadText('carreras.json', JSON.stringify(file, null, 2));
  };
  return (
    <div className="stack-lg">
      <div className="stack">
        <p className="eyebrow">Lista de carreras · {app.customCatalog ? 'catálogo personalizado' : 'UNLP y UBA'}</p>
        <div className="page-icon" aria-hidden="true">🎓</div>
        <h1>Las {careers.length} carreras evaluadas</h1>
        <p className="prose muted">El ranking y las recomendaciones usan exclusivamente esta lista. Podés excluir carreras que no te interesa considerar o reemplazar la lista importando un archivo editado, sin tocar la lógica de evaluación.</p>
      </div>
      <div className="row">
        <input className="input" id="careers-q" placeholder="Buscar carrera, facultad, universidad o área…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" style={{ flex: '1 1 240px' }} />
        <select className="input" id="careers-inst" aria-label="Universidad" value={inst} onChange={(e) => setInst(e.target.value as 'todas' | 'UNLP' | 'UBA')}>
          <option value="todas">UNLP y UBA</option><option value="UNLP">Solo UNLP</option><option value="UBA">Solo UBA</option>
        </select>
        <button type="button" className="btn btn-sm" onClick={exportCatalog}>Exportar lista (JSON)</button>
        <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>Importar lista editada</button>
        {app.customCatalog && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { app.setCatalogFile(null); setMsg({ kind: 'good', text: 'Se restauró la lista original.' }); }}>Restaurar original</button>}
        <input ref={fileRef} type="file" accept="application/json,.json" hidden id="catalog-file" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const parsed = JSON.parse(await f.text()) as CatalogFile;
            if (!Array.isArray(parsed.careers)) throw new Error('El archivo debe tener una lista "careers".');
            const errs = app.setCatalogFile(parsed);
            setMsg(errs.length ? { kind: 'crit', text: `No se importó. Problemas: ${errs.slice(0, 6).join(' · ')}` } : { kind: 'good', text: `Lista importada: ${parsed.careers.length} carreras.` });
          } catch (x) { setMsg({ kind: 'crit', text: x instanceof Error ? x.message : String(x) }); }
          e.target.value = '';
        }} />
      </div>
      {msg && <p className={`callout ${msg.kind}`}>{msg.text}</p>}
      {!app.state && <p className="callout small">Para excluir carreras, primero comenzá una evaluación.</p>}
      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Incluir</th><th>Carrera</th><th>Dónde se dicta</th><th className="num">Duración</th><th>Datos</th><th>Áreas principales</th><th>Condiciones</th></tr></thead>
            <tbody>
              {filtered.map((c) => {
                const doms = Object.entries(c.domains).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 2).map(([d]) => DOMAINS[d as DomainKey]);
                return (
                  <tr key={c.id} style={excluded.has(c.id) ? { opacity: 0.5 } : undefined}>
                    <td><input type="checkbox" id={`inc-${c.id}`} aria-label={`Incluir ${c.name}`} checked={!excluded.has(c.id)} disabled={!app.state} onChange={() => toggle(c.id)} /></td>
                    <td style={{ minWidth: 220 }}>
                      <strong>{c.name}</strong>
                      {c.variants?.length ? <div className="small muted">Orientaciones: {c.variants.map((v) => v.name).join(', ')}</div> : null}
                      {c.notes?.map((n) => <div key={n} className="small muted">{n}</div>)}
                      {c.sources?.map((s) => <div key={s.url} className="small"><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></div>)}
                    </td>
                    <td style={{ minWidth: 240 }}><WhereToStudy career={c} catalog={app.catalog} compact /></td>
                    <td className="num small">{c.durationYears ? `${c.durationYears} años` : '—'}{c.durationStatus !== 'verificado' && c.durationYears ? <div className="muted">aprox.</div> : null}</td>
                    <td><span className={`chip ${c.dataStatus === 'verificado' ? 'good' : c.dataStatus === 'insuficiente' ? 'crit' : 'warn'}`}>{c.dataStatus}</span></td>
                    <td className="small" style={{ minWidth: 180 }}>{doms.join(' · ')}</td>
                    <td className="small">{(c.restrictions ?? []).map((r) => RESTR[r] ?? r).join(' · ') || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <details className="disclosure panel">
        <summary>Cómo se normalizó tu lista original</summary>
        <ul className="list small" style={{ marginTop: 8 }}>{norm.map((n) => <li key={n.original}><strong>{n.original}:</strong> {n.note}</li>)}</ul>
      </details>
      <details className="disclosure panel">
        <summary>Qué significa el estado de los datos</summary>
        <ul className="list small" style={{ marginTop: 8 }}>
          <li><strong>verificado:</strong> al menos un dato (por ejemplo, la duración) se confirmó con una fuente oficial enlazada.</li>
          <li><strong>estimado:</strong> el perfil se construyó con conocimiento general de la disciplina; materias, duración y perspectivas deben verificarse.</li>
          <li><strong>insuficiente:</strong> no hay información para construir un perfil; la carrera no recibe puntuación ni conclusiones.</li>
        </ul>
      </details>
    </div>
  );
}
