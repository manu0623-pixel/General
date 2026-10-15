import type { Evidence, EvidenceDraft, EvidenceSource, TargetKind } from '../domain/types';

/**
 * Peso de confiabilidad por tipo de evidencia. Lo observado o demostrado pesa más que lo declarado;
 * la autoevaluación y las señales automáticas de texto pesan menos.
 * Estos valores son una decisión metodológica explícita (ver docs/METODOLOGIA.md).
 */
export const SOURCE_WEIGHT: Record<EvidenceSource, number> = {
  declarada: 1.0,
  autoevaluacion: 0.6,
  ejercicio: 1.2,
  experiencia: 1.5,
  escenario: 1.3,
  conducta: 1.4,
  practica: 1.8,
  texto: 0.3,
  verificacion: 2.0,
  externo: 1.0,
};

export const SOURCE_LABEL: Record<EvidenceSource, string> = {
  declarada: 'Preferencia declarada',
  autoevaluacion: 'Autoevaluación',
  ejercicio: 'Aptitud observada en ejercicio',
  experiencia: 'Experiencia demostrada',
  escenario: 'Elección en escenario',
  conducta: 'Conducta real reciente',
  practica: 'Experiencia práctica de verificación',
  texto: 'Señal automática de texto (baja confianza)',
  verificacion: 'Corrección en la verificación',
  externo: 'Factor práctico externo',
};

/** Peso del "prior" neutro (0.5): evita que una sola respuesta determine un resultado. */
export const PRIOR_WEIGHT = 1.0;
/** Constante de saturación de la confianza. */
const CONF_K = 1.5;

export function toEvidence(questionId: string, drafts: EvidenceDraft[]): Evidence[] {
  return drafts
    .filter((d) => Number.isFinite(d.value))
    .map((d) => ({
      questionId,
      target: d.target,
      value: Math.max(0, Math.min(1, d.value)),
      weight: (d.weight ?? 1) * SOURCE_WEIGHT[d.source],
      source: d.source,
      note: d.note,
    }));
}

export interface Estimate {
  /** estimación 0..1 (con prior neutro) */
  est: number;
  /** confianza 0..1 basada en la cantidad y calidad de evidencia */
  conf: number;
  /** suma de pesos */
  w: number;
  n: number;
  bySource: Partial<Record<EvidenceSource, { est: number; w: number; n: number }>>;
}

export const EMPTY_ESTIMATE: Estimate = { est: 0.5, conf: 0, w: 0, n: 0, bySource: {} };

export type Profile = Record<string, Estimate>; // clave: `${kind}:${key}`

export const pkey = (kind: TargetKind, key: string) => `${kind}:${key}`;

export function computeProfile(evidence: Evidence[]): Profile {
  const acc: Record<string, { sw: number; svw: number; n: number; src: Record<string, { sw: number; svw: number; n: number }> }> = {};
  for (const e of evidence) {
    const k = pkey(e.target.kind, e.target.key);
    const a = (acc[k] ??= { sw: 0, svw: 0, n: 0, src: {} });
    a.sw += e.weight;
    a.svw += e.weight * e.value;
    a.n += 1;
    const s = (a.src[e.source] ??= { sw: 0, svw: 0, n: 0 });
    s.sw += e.weight;
    s.svw += e.weight * e.value;
    s.n += 1;
  }
  const out: Profile = {};
  for (const [k, a] of Object.entries(acc)) {
    const bySource: Estimate['bySource'] = {};
    for (const [src, s] of Object.entries(a.src)) {
      bySource[src as EvidenceSource] = { est: s.sw > 0 ? s.svw / s.sw : 0.5, w: s.sw, n: s.n };
    }
    out[k] = {
      est: (PRIOR_WEIGHT * 0.5 + a.svw) / (PRIOR_WEIGHT + a.sw),
      conf: a.sw / (a.sw + CONF_K),
      w: a.sw,
      n: a.n,
      bySource,
    };
  }
  return out;
}

export function getEst(p: Profile, kind: TargetKind, key: string): Estimate {
  return p[pkey(kind, key)] ?? EMPTY_ESTIMATE;
}

/** Estimación usando solo ciertas fuentes (por ejemplo, solo lo observado). */
export function estFromSources(e: Estimate, sources: EvidenceSource[]): { est: number; w: number } | null {
  let w = 0;
  let vw = 0;
  for (const s of sources) {
    const b = e.bySource[s];
    if (b) { w += b.w; vw += b.w * b.est; }
  }
  return w > 0 ? { est: vw / w, w } : null;
}
