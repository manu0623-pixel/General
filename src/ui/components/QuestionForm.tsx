import { useEffect, useMemo, useRef, useState } from 'react';
import type { HypothesisItem } from '../../questions/generators';
import { VERDICTS } from '../../questions/generators';
import type { Question } from '../../questions/types';
import { ExerciseVisual } from './ExerciseVisual';

interface Props {
  question: Question;
  initial?: unknown;
  hypotheses?: HypothesisItem[];
  submitLabel?: string;
  onSubmit: (value: unknown) => void;
  onSkip?: () => void;
  onBack?: () => void;
  onCancel?: () => void;
}

function initialFor(q: Question, initial: unknown, hyps?: HypothesisItem[]): unknown {
  if (initial !== undefined) return initial;
  switch (q.type) {
    case 'multi': return [];
    case 'matrix': return {};
    case 'open': return '';
    case 'evidence': return { text: '', checks: [], domains: [] };
    case 'exercise': return q.exercise?.openScoring ? { text: '' } : { choice: null };
    case 'allocate': return { A: 33, B: 34, C: 33, equilibrio: true };
    case 'hypotheses': return { items: (hyps ?? []).map((h) => ({ ...h, verdict: null, comment: '' })) };
    case 'final': return { text: '' };
    case 'scale': return q.checks ? { level: null, checks: [] } : null;
    default: return null;
  }
}

function isComplete(q: Question, v: unknown): boolean {
  const r = (v ?? {}) as Record<string, unknown>;
  switch (q.type) {
    case 'single': return typeof v === 'string';
    case 'multi': { const a = Array.isArray(v) ? (v as string[]) : []; return a.length >= (q.minSelect ?? 1) || (q.minSelect === 0); }
    case 'matrix': return (q.rows ?? []).every((row) => typeof r[row.id] === 'string');
    case 'scale': return q.checks ? typeof r.level === 'string' : typeof v === 'string';
    case 'open': return typeof v === 'string' && v.trim().length > 0;
    case 'evidence': return typeof r.text === 'string' && r.text.trim().split(/\s+/).length >= 5;
    case 'exercise': return r.skip ? true : q.exercise?.openScoring ? String(r.text ?? '').trim().length > 0 : typeof r.choice === 'string';
    case 'allocate': return true;
    case 'hypotheses': return ((r.items as { verdict: string | null }[]) ?? []).every((h) => !!h.verdict);
    case 'final': return true;
    default: return true;
  }
}

export function QuestionForm({ question: q, initial, hypotheses, submitLabel = 'Continuar', onSubmit, onSkip, onBack, onCancel }: Props) {
  const [value, setValue] = useState<unknown>(() => initialFor(q, initial, hypotheses));
  const started = useRef(Date.now());
  const titleRef = useRef<HTMLHeadingElement>(null);
  // El componente se monta de nuevo para cada pregunta (key = id), así el borrador nunca mezcla preguntas.
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, []);

  const complete = isComplete(q, value);
  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!complete) return;
    if (q.type === 'exercise') onSubmit({ ...(value as object), ms: Date.now() - started.current });
    else onSubmit(value);
  };

  return (
    <form className="stack-lg fade-in" onSubmit={submit} key={q.id} aria-labelledby={`qt-${q.id}`}>
      <div className="q-head">
        <h2 className="q-title" id={`qt-${q.id}`} ref={titleRef} tabIndex={-1}>{q.title}</h2>
        {q.help && (q.id.startsWith('demand:') || q.id.startsWith('trade:') || q.id.startsWith('cmp:')
          ? <p className="scenario">{q.help}</p>
          : <p className="q-help">{q.help}</p>)}
      </div>

      <Body q={q} value={value} setValue={setValue} />

      <div className="q-actions">
        <button type="submit" className="btn btn-primary" disabled={!complete}>{submitLabel}</button>
        {onBack && <button type="button" className="btn btn-ghost" onClick={onBack}>← Anterior</button>}
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>}
        <span className="spacer" />
        {onSkip && q.optional && <button type="button" className="btn btn-ghost" onClick={onSkip}>Prefiero no responder</button>}
      </div>
    </form>
  );
}

function Body({ q, value, setValue }: { q: Question; value: unknown; setValue: (v: unknown) => void }) {
  switch (q.type) {
    case 'single': return <SingleChoice q={q} value={value as string | null} onChange={setValue} />;
    case 'multi': return <MultiChoice q={q} value={Array.isArray(value) ? (value as string[]) : []} onChange={setValue} />;
    case 'matrix': return <Matrix q={q} value={(value as Record<string, string>) ?? {}} onChange={setValue} />;
    case 'scale': return <ScaleChoice q={q} value={value} onChange={setValue} />;
    case 'open': return <textarea className="textarea" id={`in-${q.id}`} aria-label={q.title} placeholder={q.placeholder} value={(value as string) ?? ''} onChange={(e) => setValue(e.target.value)} />;
    case 'final': return <textarea className="textarea" id={`in-${q.id}`} aria-label={q.title} placeholder={q.placeholder} value={String((value as { text?: string })?.text ?? '')} onChange={(e) => setValue({ text: e.target.value })} />;
    case 'evidence': return <EvidenceInput q={q} value={value as EvidenceValue} onChange={setValue} />;
    case 'exercise': return <Exercise q={q} value={value as ExerciseValue} onChange={setValue} />;
    case 'allocate': return <Allocate q={q} value={value as Record<string, number | boolean>} onChange={setValue} />;
    case 'hypotheses': return <Hypotheses value={value as { items: (HypothesisItem & { verdict: string | null; comment: string })[] }} onChange={setValue} />;
    default: return null;
  }
}

function SingleChoice({ q, value, onChange }: { q: Question; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="choice-list" role="radiogroup" aria-label={q.title}>
      {(q.options ?? []).map((o) => (
        <label key={o.id} className="choice" data-checked={value === o.id} data-special={!!o.special}>
          <input type="radio" name={`r-${q.id}`} id={`r-${q.id}-${o.id}`} checked={value === o.id} onChange={() => onChange(o.id)} />
          <span>{o.label}{o.hint && <span className="hint">{o.hint}</span>}</span>
        </label>
      ))}
    </div>
  );
}

function MultiChoice({ q, value, onChange }: { q: Question; value: string[]; onChange: (v: string[]) => void }) {
  const max = q.maxSelect ?? 99;
  const toggle = (id: string, special?: string) => {
    if (special === 'ninguna') return onChange(value.includes(id) ? [] : [id]);
    const base = value.filter((x) => (q.options ?? []).find((o) => o.id === x)?.special !== 'ninguna');
    if (base.includes(id)) onChange(base.filter((x) => x !== id));
    else if (base.length < max) onChange([...base, id]);
  };
  return (
    <div className="stack">
      <div className="counter" aria-live="polite">{value.length} de {max === 99 ? 'varias' : max} seleccionadas</div>
      <div className={(q.options?.length ?? 0) > 8 ? 'choice-grid' : 'choice-list'}>
        {(q.options ?? []).map((o) => {
          const checked = value.includes(o.id);
          const disabled = !checked && value.filter((x) => x !== 'ninguna').length >= max && o.special !== 'ninguna';
          return (
            <label key={o.id} className="choice" data-checked={checked} data-special={!!o.special} style={disabled ? { opacity: 0.55 } : undefined}>
              <input type="checkbox" id={`c-${q.id}-${o.id}`} checked={checked} disabled={disabled} onChange={() => toggle(o.id, o.special)} />
              <span>{o.label}{o.hint && <span className="hint">{o.hint}</span>}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Matrix({ q, value, onChange }: { q: Question; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const scale = q.scale ?? [];
  return (
    <div className="matrix-wrap">
      <table className="matrix">
        <thead>
          <tr><th scope="col"><span className="sr-only">Afirmación</span></th>{scale.map((s) => <th key={s.id} scope="col">{s.label}</th>)}</tr>
        </thead>
        <tbody>
          {(q.rows ?? []).map((row) => (
            <tr key={row.id}>
              <td id={`row-${q.id}-${row.id}`}>{row.label}</td>
              {scale.map((s) => (
                <td key={s.id} className="cell">
                  <label>
                    <input type="radio" name={`m-${q.id}-${row.id}`} id={`m-${q.id}-${row.id}-${s.id}`} aria-labelledby={`row-${q.id}-${row.id}`} aria-label={s.label}
                      checked={value[row.id] === s.id} onChange={() => onChange({ ...value, [row.id]: s.id })} />
                    <span className="cell-label">{s.label}</span>
                  </label>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScaleChoice({ q, value, onChange }: { q: Question; value: unknown; onChange: (v: unknown) => void }) {
  const withChecks = !!q.checks;
  const level = withChecks ? (value as { level: string | null })?.level : (value as string | null);
  const checks = withChecks ? ((value as { checks: string[] })?.checks ?? []) : [];
  const set = (lv: string) => onChange(withChecks ? { level: lv, checks } : lv);
  return (
    <div className="stack">
      <div className="scale-list" role="radiogroup" aria-label={q.title}>
        {(q.scale ?? []).map((s) => (
          <label key={s.id} className="choice" data-checked={level === s.id} data-special={s.value == null}>
            <input type="radio" name={`s-${q.id}`} id={`s-${q.id}-${s.id}`} checked={level === s.id} onChange={() => set(s.id)} />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
      {withChecks && (q.checks ?? []).map((c) => (
        <label key={c.id} className="row small">
          <input type="checkbox" id={`sc-${q.id}-${c.id}`} checked={checks.includes(c.id)}
            onChange={() => onChange({ level, checks: checks.includes(c.id) ? checks.filter((x) => x !== c.id) : [...checks, c.id] })} />
          {c.label}
        </label>
      ))}
    </div>
  );
}

type EvidenceValue = { text: string; checks: string[]; domains?: string[] };
function EvidenceInput({ q, value, onChange }: { q: Question; value: EvidenceValue; onChange: (v: EvidenceValue) => void }) {
  const words = value.text.trim() ? value.text.trim().split(/\s+/).length : 0;
  return (
    <div className="stack">
      <textarea className="textarea" id={`ev-${q.id}`} aria-label={q.title} placeholder={q.placeholder} value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} />
      <div className="counter">{words} palabras {words > 0 && words < 25 ? '· sumá detalles concretos: qué hiciste, cómo y con qué resultado' : ''}</div>
      {q.checks && (
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 8 }}>Marcá lo que corresponda</legend>
          {q.checks.map((c) => (
            <label key={c.id} className="row small">
              <input type="checkbox" id={`evc-${q.id}-${c.id}`} checked={value.checks.includes(c.id)} onChange={() => onChange({ ...value, checks: value.checks.includes(c.id) ? value.checks.filter((x) => x !== c.id) : [...value.checks, c.id] })} />
              {c.label}
            </label>
          ))}
        </fieldset>
      )}
      {q.options && (
        <details className="disclosure">
          <summary>¿Con qué áreas se relaciona? <span className="muted small">({value.domains?.length ?? 0} elegidas)</span></summary>
          <div className="choice-grid" style={{ marginTop: 10 }}>
            {q.options.map((o) => {
              const on = value.domains?.includes(o.id) ?? false;
              return (
                <label key={o.id} className="choice" data-checked={on}>
                  <input type="checkbox" id={`evd-${q.id}-${o.id}`} checked={on} onChange={() => onChange({ ...value, domains: on ? (value.domains ?? []).filter((x) => x !== o.id) : [...(value.domains ?? []), o.id] })} />
                  <span className="small">{o.label}</span>
                </label>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

type ExerciseValue = { choice?: string | null; text?: string; skip?: string };
function Exercise({ q, value, onChange }: { q: Question; value: ExerciseValue; onChange: (v: ExerciseValue) => void }) {
  const ex = q.exercise!;
  const lines = useMemo(() => new Set(String(value.text ?? '').split('\n').map((l) => l.trim().toLowerCase()).filter((l) => l.length > 1)).size, [value.text]);
  return (
    <div className="stack-lg">
      <div className="row">
        <span className="chip accent">Ejercicio exploratorio</span>
        <span className="chip">Dificultad {'●'.repeat(ex.difficulty)}{'○'.repeat(3 - ex.difficulty)}</span>
        <span className="chip">Sin límite de tiempo</span>
      </div>
      {ex.visual && <ExerciseVisual visual={ex.visual} onAudioUnavailable={() => onChange({ choice: null, skip: 'audio' })} />}
      {ex.openScoring ? (
        <div className="stack">
          <textarea className="textarea" id={`ex-${q.id}`} aria-label="Tus ideas, una por línea" placeholder={'Una idea por línea…'} value={value.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} />
          <div className="counter">{lines} ideas distintas · Criterio: {ex.criterion}</div>
        </div>
      ) : (
        <div className="choice-list" role="radiogroup" aria-label="Opciones">
          {(q.options ?? []).map((o) => (
            <label key={o.id} className="choice" data-checked={value.choice === o.id} data-special={!!o.special}>
              <input type="radio" name={`ex-${q.id}`} id={`ex-${q.id}-${o.id}`} checked={value.choice === o.id} onChange={() => onChange({ choice: o.id })} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
      {value.skip === 'audio' && <p className="callout">Marcaste que no podés escuchar audio ahora: este ejercicio no se va a usar como evidencia. Tocá «Continuar».</p>}
    </div>
  );
}

function Allocate({ q, value, onChange }: { q: Question; value: Record<string, number | boolean>; onChange: (v: Record<string, number | boolean>) => void }) {
  const keys = (q.allocate ?? []).map((a) => a.key);
  const total = keys.reduce((s, k) => s + Number(value[k] ?? 0), 0);
  const setKey = (k: string, n: number) => {
    // Mantener la suma en 100 repartiendo la diferencia entre las otras dos dimensiones.
    const others = keys.filter((x) => x !== k);
    const rest = 100 - n;
    const curOthers = others.reduce((s, x) => s + Number(value[x] ?? 0), 0) || 1;
    const next: Record<string, number | boolean> = { [k]: n, equilibrio: false };
    let acc = 0;
    others.forEach((x, i) => {
      const v = i === others.length - 1 ? rest - acc : Math.round((Number(value[x] ?? 0) / curOthers) * rest);
      next[x] = Math.max(0, v); acc += Math.max(0, v);
    });
    onChange(next);
  };
  return (
    <div className="stack">
      <label className="row">
        <input type="checkbox" id="alloc-eq" checked={value.equilibrio === true} onChange={(e) => onChange(e.target.checked ? { A: 33, B: 34, C: 33, equilibrio: true } : { ...value, equilibrio: false })} />
        Prefiero un equilibrio entre las tres
      </label>
      {(q.allocate ?? []).map((a) => (
        <div key={a.key} className="allocate-row" style={value.equilibrio ? { opacity: 0.55 } : undefined}>
          <div><strong>{a.label}</strong><div className="small muted">{a.hint}</div></div>
          <input type="range" id={`alloc-${a.key}`} aria-label={a.label} min={0} max={100} step={1} disabled={value.equilibrio === true} value={Number(value[a.key] ?? 0)} onChange={(e) => setKey(a.key, Number(e.target.value))} />
          <span className="num">{Number(value[a.key] ?? 0)}</span>
        </div>
      ))}
      <div className="counter">Total: {total} / 100</div>
    </div>
  );
}

function Hypotheses({ value, onChange }: { value: { items: (HypothesisItem & { verdict: string | null; comment: string })[] }; onChange: (v: unknown) => void }) {
  const items = value.items;
  if (!items.length) return <p className="callout">Todavía no hay hipótesis con evidencia suficiente para verificar. Podés continuar.</p>;
  const set = (i: number, patch: Partial<(typeof items)[number]>) => onChange({ items: items.map((h, j) => (j === i ? { ...h, ...patch } : h)) });
  return (
    <div className="panel panel-tight">
      {items.map((h, i) => (
        <div key={h.id} className="hyp">
          <p style={{ fontWeight: 600 }}>{h.text}</p>
          <p className="small muted">{h.basis}</p>
          <div className="segmented" role="radiogroup" aria-label={`Verificación: ${h.text}`}>
            {VERDICTS.map((v) => (
              <label key={v.id} data-checked={h.verdict === v.id}>
                <input type="radio" name={`h-${h.id}`} id={`h-${h.id}-${v.id}`} checked={h.verdict === v.id} onChange={() => set(i, { verdict: v.id })} />
                {v.label}
              </label>
            ))}
          </div>
          {(h.verdict === 'no' || h.verdict === 'parcial') && (
            <input className="input" id={`hc-${h.id}`} placeholder="¿Qué no es correcto? (opcional)" value={h.comment} onChange={(e) => set(i, { comment: e.target.value })} aria-label="Comentario" />
          )}
        </div>
      ))}
    </div>
  );
}
