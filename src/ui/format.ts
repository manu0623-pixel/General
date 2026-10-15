import type { Question } from '../questions/types';

export function summarizeAnswer(q: Question | null, value: unknown, skipped?: boolean): string {
  if (skipped) return 'Omitida';
  if (!q) return '—';
  const opt = (id: unknown) => q.options?.find((o) => o.id === id)?.label ?? String(id);
  const sc = (id: unknown) => q.scale?.find((s) => s.id === id)?.label ?? String(id);
  const r = (value ?? {}) as Record<string, unknown>;
  switch (q.type) {
    case 'single': return opt(value);
    case 'multi': return (Array.isArray(value) ? (value as string[]) : []).map(opt).join(' · ') || 'Ninguna';
    case 'matrix': return (q.rows ?? []).map((row) => `${row.label}: ${sc(r[row.id])}`).join(' · ');
    case 'scale': return q.checks ? `${sc(r.level)}${(r.checks as string[] | undefined)?.length ? ' · lo viví' : ''}` : sc(value);
    case 'open': return String(value || '—');
    case 'final': return String(r.text || '—');
    case 'evidence': return `${String(r.text ?? '').slice(0, 160)}${String(r.text ?? '').length > 160 ? '…' : ''}`;
    case 'exercise': {
      if (r.skip) return 'Sin audio disponible';
      if (q.exercise?.openScoring) return `${String(r.text ?? '').split('\n').filter((l) => l.trim()).length} ideas`;
      const ok = r.choice === q.exercise?.correct;
      return `${opt(r.choice)} — ${r.choice === 'ns' ? 'no lo sabía' : ok ? 'correcta' : 'incorrecta'}`;
    }
    case 'allocate': return r.equilibrio ? 'Equilibrio' : `Aptitudes ${r.A} · Intereses ${r.B} · Futuro ${r.C}`;
    case 'hypotheses': {
      const items = (r.items as { verdict: string }[] | undefined) ?? [];
      const c = (v: string) => items.filter((i) => i.verdict === v).length;
      return `${c('si')} correctas · ${c('parcial')} en parte · ${c('no')} incorrectas`;
    }
    default: return '—';
  }
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
