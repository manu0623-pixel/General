import { useRef, useState } from 'react';
import type { ExerciseSpec } from '../../questions/types';

type Visual = NonNullable<ExerciseSpec['visual']>;

function Shape({ cells, size = 22 }: { cells: number[][]; size?: number }) {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const box = 4 * size;
  const ox = (box - w * size) / 2, oy = (box - h * size) / 2;
  return (
    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} role="img" aria-label="Figura formada por cuadrados">
      {cells.map(([x, y], i) => <rect key={i} x={ox + x * size} y={oy + y * size} width={size} height={size} rx={3} />)}
    </svg>
  );
}

export function ExerciseVisual({ visual, onAudioUnavailable }: { visual: Visual; onAudioUnavailable: () => void }) {
  if (visual.kind === 'grid-shapes') {
    return (
      <div className="exercise-visual">
        <div className="shape-card ref"><Shape cells={visual.ref} /><span>Referencia</span></div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} aria-hidden="true" />
        {Object.entries(visual.options).map(([id, cells]) => (
          <div key={id} className="shape-card"><Shape cells={cells} /><span>Figura {id.toUpperCase()}</span></div>
        ))}
      </div>
    );
  }
  if (visual.kind === 'cube-net') {
    const s = 46;
    return (
      <svg width={3 * s + 2} height={4 * s + 2} viewBox={`-1 -1 ${3 * s + 2} ${4 * s + 2}`} role="img" aria-label="Desarrollo plano de un cubo con caras A a F">
        {visual.cells.map(([x, y, label]) => (
          <g key={label}>
            <rect x={x * s} y={y * s} width={s} height={s} fill={label === visual.mark ? 'var(--accent-soft)' : 'var(--surface)'} stroke="var(--ink-2)" strokeWidth={1.5} />
            <text x={x * s + s / 2} y={y * s + s / 2 + 6} textAnchor="middle" fontSize={18} fontWeight={700} fill="var(--ink)" fontFamily="var(--font-data)">{label}</text>
          </g>
        ))}
      </svg>
    );
  }
  if (visual.kind === 'table') {
    return (
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr>{visual.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{visual.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === 'number' ? 'num' : ''}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  return <AudioPlayer sequences={visual.sequences} noteMs={visual.noteMs ?? 450} onUnavailable={onAudioUnavailable} />;
}

function AudioPlayer({ sequences, noteMs, onUnavailable }: { sequences: Record<string, number[]>; noteMs: number; onUnavailable: () => void }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const play = async (name: string, freqs: number[]) => {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current ??= new AC();
      const ctx = ctxRef.current;
      await ctx.resume();
      setPlaying(name);
      let t = ctx.currentTime + 0.05;
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
        gain.gain.setValueAtTime(0.25, t + noteMs / 1000 - 0.06);
        gain.gain.linearRampToValueAtTime(0, t + noteMs / 1000);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t); osc.stop(t + noteMs / 1000 + 0.01);
        t += noteMs / 1000 + 0.08;
      }
      setTimeout(() => setPlaying(null), (t - ctx.currentTime) * 1000);
    } catch {
      setError('No se pudo reproducir audio en este dispositivo.');
    }
  };
  return (
    <div className="stack">
      <div className="row">
        {Object.entries(sequences).map(([name, freqs]) => (
          <button type="button" key={name} className="btn" onClick={() => play(name, freqs)} aria-pressed={playing === name}>
            {playing === name ? '♪ Sonando…' : `▶ ${name}`}
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onUnavailable}>No puedo escuchar audio ahora</button>
      </div>
      {error && <p className="callout warn">{error}</p>}
    </div>
  );
}
