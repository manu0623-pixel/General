import type { EvidenceDraft, EvidenceSource, TargetKind } from '../domain/types';
import { scaleValue, type ScalePoint } from './types';

export function ev(kind: TargetKind, key: string, value: number, source: EvidenceSource, weight = 1, note?: string): EvidenceDraft {
  return { target: { kind, key }, value, source, weight, note };
}

export function asArray(a: unknown): string[] {
  return Array.isArray(a) ? (a.filter((x) => typeof x === 'string') as string[]) : [];
}

export function asRecord(a: unknown): Record<string, unknown> {
  return a && typeof a === 'object' && !Array.isArray(a) ? (a as Record<string, unknown>) : {};
}

/** Evalúa una matriz: cada fila produce evidencia sobre su objetivo. */
export function matrixEvidence(
  answer: unknown,
  scale: ScalePoint[],
  rowTargets: Record<string, { kind: TargetKind; key: string; weight?: number }[]>,
  source: EvidenceSource,
  note?: string,
): EvidenceDraft[] {
  const out: EvidenceDraft[] = [];
  for (const [row, val] of Object.entries(asRecord(answer))) {
    const v = scaleValue(scale, val);
    if (v == null) continue;
    for (const t of rowTargets[row] ?? []) out.push(ev(t.kind, t.key, v, source, t.weight ?? 1, note));
  }
  return out;
}
