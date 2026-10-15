import { useState } from 'react';
import { RIASEC, RIASEC_KEYS, VALUES } from '../../domain/dimensions';
import type { Profile } from '../../engine/profile';
import { getEst } from '../../engine/profile';
import { band, pct, type RankingEntry } from '../../engine/scoring';

/** Tooltip liviano compartido. */
function useTip() {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const el = tip ? <div className="tooltip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 290), top: tip.y + 14 }} role="status">{tip.text}</div> : null;
  return {
    el,
    bind: (text: string) => ({
      onMouseMove: (e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, text }),
      onMouseLeave: () => setTip(null),
      onFocus: (e: React.FocusEvent) => { const r = (e.target as Element).getBoundingClientRect(); setTip({ x: r.left, y: r.bottom, text }); },
      onBlur: () => setTip(null),
      tabIndex: 0,
    }),
  };
}

/** Perfil de intereses RIASEC: barra = estimación; bigote = incertidumbre según la confianza. */
export function RiasecChart({ profile }: { profile: Profile }) {
  const tip = useTip();
  const W = 520, rowH = 34, left = 120, right = 44, H = RIASEC_KEYS.length * rowH + 26;
  const x = (v: number) => left + v * (W - left - right);
  return (
    <figure className="stack" style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }} role="img" aria-label="Perfil de intereses por tipo RIASEC">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}><line className="gridline" x1={x(t)} x2={x(t)} y1={4} y2={H - 20} /><text x={x(t)} y={H - 6} textAnchor="middle">{pct(t)}</text></g>
        ))}
        {RIASEC_KEYS.map((k, i) => {
          const e = getEst(profile, 'riasec', k);
          const y = 8 + i * rowH;
          const hw = 0.25 * (1 - e.conf);
          const text = `${RIASEC[k].label}: ${band(e.est)} (≈${pct(e.est)} %). Confianza ${e.conf >= 0.6 ? 'alta' : e.conf >= 0.35 ? 'media' : 'baja'}, ${e.n} evidencias.`;
          return (
            <g key={k} {...tip.bind(text)} style={{ outline: 'none' }}>
              <rect x={0} y={y - 4} width={W} height={rowH} fill="transparent" />
              <text className="label" x={0} y={y + 13}>{RIASEC[k].label}</text>
              <rect x={x(0)} y={y + 2} width={Math.max(2, x(e.est) - x(0))} height={14} rx={4} fill="var(--series-1)" opacity={e.n ? 1 : 0.3} />
              <line x1={x(Math.max(0, e.est - hw))} x2={x(Math.min(1, e.est + hw))} y1={y + 9} y2={y + 9} stroke="var(--ink-2)" strokeWidth={2} />
              <text x={W - 2} y={y + 13} textAnchor="end">{e.n ? pct(e.est) : '—'}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="small muted">Barra: interés estimado. Línea: margen de incertidumbre (más larga = menos evidencia).</figcaption>
      {tip.el}
    </figure>
  );
}

/** Ranking: punto = compatibilidad estimada; línea = intervalo de incertidumbre. */
export function RankingChart({ entries }: { entries: RankingEntry[] }) {
  const tip = useTip();
  const W = 760, rowH = 30, left = 260, right = 40, H = entries.length * rowH + 28;
  const lo = Math.max(0, Math.floor((Math.min(...entries.map((e) => e.overall - e.hw)) - 0.05) * 10) / 10);
  const hi = Math.min(1, Math.ceil((Math.max(...entries.map((e) => e.overall + e.hw)) + 0.05) * 10) / 10);
  const x = (v: number) => left + ((v - lo) / (hi - lo)) * (W - left - right);
  const ticks = [];
  for (let t = lo; t <= hi + 1e-9; t += 0.1) ticks.push(Math.round(t * 10) / 10);
  const trunc = (s: string) => (s.length > 34 ? `${s.slice(0, 33)}…` : s);
  return (
    <figure className="stack" style={{ margin: 0 }}>
      <div className="table-wrap">
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 520, maxWidth: W }} role="img" aria-label="Compatibilidad estimada con intervalo de incertidumbre">
          {ticks.map((t) => (
            <g key={t}><line className="gridline" x1={x(t)} x2={x(t)} y1={4} y2={H - 22} /><text x={x(t)} y={H - 6} textAnchor="middle">{pct(t)}</text></g>
          ))}
          {entries.map((e, i) => {
            const y = 10 + i * rowH;
            const prevSame = i > 0 && entries[i - 1].tieGroup === e.tieGroup;
            const text = `${e.name}: ≈${pct(e.overall)} % (rango ${pct(e.overall - e.hw)}–${pct(e.overall + e.hw)} %). Aptitudes ${pct(e.A)} · Intereses ${pct(e.B)} · Futuro ${pct(e.C)}. Confianza ${e.confidence}.`;
            return (
              <g key={e.id} {...tip.bind(text)} style={{ outline: 'none' }}>
                <rect x={0} y={y - 8} width={W} height={rowH} fill="transparent" />
                {prevSame && <line x1={left - 10} x2={left - 10} y1={y - 22} y2={y + 4} stroke="var(--line-strong)" strokeWidth={2} />}
                <text className="label" x={left - 18} y={y + 4} textAnchor="end">{trunc(e.name)}</text>
                <line x1={x(Math.max(lo, e.overall - e.hw))} x2={x(Math.min(hi, e.overall + e.hw))} y1={y} y2={y} stroke="var(--series-1)" strokeWidth={2} strokeLinecap="round" opacity={0.55} />
                <circle cx={x(e.overall)} cy={y} r={5.5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="small muted">Punto: compatibilidad estimada (no es una probabilidad de éxito). Línea: rango de incertidumbre. La barra vertical a la izquierda agrupa opciones en empate técnico.</figcaption>
      {tip.el}
    </figure>
  );
}

export const DIM_META = [
  { key: 'A' as const, label: 'Aptitudes', color: 'var(--series-1)' },
  { key: 'B' as const, label: 'Intereses', color: 'var(--series-2)' },
  { key: 'C' as const, label: 'Futuro', color: 'var(--series-3)' },
];

export function DimLegend() {
  return <div className="legend">{DIM_META.map((d) => <span key={d.key}><i style={{ background: d.color }} />{d.label}</span>)}</div>;
}

/** Tres dimensiones de una carrera, cada una con su rango. */
export function DimBars({ entry }: { entry: RankingEntry }) {
  return (
    <div className="dim-bars">
      {DIM_META.map((d) => {
        const v = entry[d.key];
        const h = entry.hwDims[d.key];
        return (
          <div key={d.key} className="dim-bar">
            <span>{d.label}</span>
            <div className="dim-track" aria-hidden="true">
              <div className="dim-range" style={{ left: `${Math.max(0, v - h) * 100}%`, width: `${Math.min(1, v + h) * 100 - Math.max(0, v - h) * 100}%`, background: d.color }} />
              <div className="dim-fill" style={{ width: `${v * 100}%`, background: d.color }} />
            </div>
            <span className="num small">{band(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ValuesChart({ profile }: { profile: Profile }) {
  const tip = useTip();
  const vals = (Object.keys(VALUES) as (keyof typeof VALUES)[]).map((k) => ({ k, e: getEst(profile, 'value', k) })).filter((x) => x.e.n).sort((a, b) => b.e.est - a.e.est);
  if (!vals.length) return <p className="muted small">Todavía no hay información sobre tus valores.</p>;
  const W = 520, rowH = 26, left = 200, right = 40, H = vals.length * rowH + 22;
  const x = (v: number) => left + v * (W - left - right);
  return (
    <figure className="stack" style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }} role="img" aria-label="Prioridades de valores">
        {[0, 0.5, 1].map((t) => <g key={t}><line className="gridline" x1={x(t)} x2={x(t)} y1={2} y2={H - 18} /><text x={x(t)} y={H - 4} textAnchor="middle">{t === 0 ? 'nada' : t === 0.5 ? 'moderado' : 'máximo'}</text></g>)}
        {vals.map(({ k, e }, i) => {
          const y = 6 + i * rowH;
          const sc = e.bySource.escenario;
          const text = `${VALUES[k]}: ${band(e.est)}. ${sc ? `En elecciones forzadas: ${band(sc.est)}.` : 'Sin elecciones forzadas.'}`;
          return (
            <g key={k} {...tip.bind(text)} style={{ outline: 'none' }}>
              <text className="label" x={0} y={y + 12}>{VALUES[k]}</text>
              <rect x={x(0)} y={y + 2} width={Math.max(2, x(e.est) - x(0))} height={12} rx={4} fill="var(--series-3)" />
            </g>
          );
        })}
      </svg>
      <figcaption className="small muted">Combina lo que declaraste con lo que elegiste cuando tuviste que priorizar.</figcaption>
      {tip.el}
    </figure>
  );
}
