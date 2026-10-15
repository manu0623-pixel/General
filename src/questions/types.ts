import type { EvidenceDraft } from '../domain/types';
import type { EngineContext } from '../engine/context';

export type QuestionType =
  | 'single'      // una opción
  | 'multi'       // varias opciones
  | 'matrix'      // varias filas con la misma escala
  | 'scale'       // una escala (por ejemplo, escenario con grados)
  | 'open'        // texto libre
  | 'exercise'    // ejercicio con respuesta correcta y criterio explícito
  | 'evidence'    // relato de experiencia + verificaciones
  | 'allocate'    // repartir 100 puntos
  | 'hypotheses'  // verificación de hipótesis (etapa 9)
  | 'final';      // cierre de la evaluación

export interface Option {
  id: string;
  label: string;
  hint?: string;
  /** Opción especial: no aporta evidencia (no sé, sin experiencia, depende). */
  special?: 'no_se' | 'sin_experiencia' | 'depende' | 'ninguna';
}

export interface ScalePoint {
  id: string;
  label: string;
  /** valor 0..1; null para especiales */
  value: number | null;
  special?: Option['special'];
}

export interface MatrixRow {
  id: string;
  label: string;
}

export interface ExerciseSpec {
  aptitude: string;
  difficulty: 1 | 2 | 3;
  /** id de la opción correcta */
  correct: string;
  /** criterio de evaluación explícito, se muestra al revisar */
  criterion: string;
  explanation: string;
  /** visual opcional */
  visual?: { kind: 'grid-shapes'; ref: number[][]; options: Record<string, number[][]> }
    | { kind: 'cube-net'; cells: [number, number, string][]; mark: string }
    | { kind: 'table'; head: string[]; rows: (string | number)[][] }
    | { kind: 'audio'; sequences: Record<string, number[]>; noteMs?: number };
  /** Para ejercicios abiertos de fluidez (creatividad). */
  openScoring?: 'fluency';
}

export interface Question {
  id: string;
  stage: number;
  type: QuestionType;
  title: string;
  help?: string;
  options?: Option[];
  scale?: ScalePoint[];
  rows?: MatrixRow[];
  minSelect?: number;
  maxSelect?: number;
  placeholder?: string;
  exercise?: ExerciseSpec;
  /** Para 'evidence': lista de verificaciones concretas. */
  checks?: Option[];
  /** Para 'allocate': claves y etiquetas. */
  allocate?: { key: string; label: string; hint: string }[];
  /** Para 'hypotheses'. */
  hypotheses?: { id: string; text: string; basis: string }[];
  /** Permite saltear (se registra como omitida). */
  optional?: boolean;
  /** Razón visible durante el test (no menciona carreras). */
  publicReason: string;
  /** Solo para preguntas estáticas: condición para formularla. */
  when?: (ctx: EngineContext) => boolean;
  /**
   * Convierte la respuesta en evidencia. Es una función pura de la respuesta (no depende del perfil),
   * para que recalcular desde cero siempre dé el mismo resultado.
   */
  evaluate: (answer: unknown) => EvidenceDraft[];
}

export type AnswerValue = unknown;

// ---------------------------------------------------------------------------
// Escalas reutilizables

export const INTEREST_SCALE: ScalePoint[] = [
  { id: '1', label: 'Me desagrada', value: 0.05 },
  { id: '2', label: 'Poco interés', value: 0.3 },
  { id: '3', label: 'Indiferente', value: 0.5 },
  { id: '4', label: 'Me interesa', value: 0.75 },
  { id: '5', label: 'Me entusiasma', value: 0.95 },
  { id: 'ns', label: 'No sé / nunca lo probé', value: null, special: 'no_se' },
];

export const DEMAND_SCALE: ScalePoint[] = [
  { id: 'disfruto', label: 'Lo disfrutaría', value: 0.95 },
  { id: 'tolero', label: 'Lo toleraría sin problema', value: 0.7 },
  { id: 'costaria', label: 'Me costaría, pero podría', value: 0.4 },
  { id: 'evito', label: 'Lo evitaría; me desmotivaría mucho', value: 0.05 },
  { id: 'depende', label: 'Depende del contexto', value: null, special: 'depende' },
  { id: 'ns', label: 'No sé / no tengo experiencia', value: null, special: 'sin_experiencia' },
];

export const SELF_SCALE: ScalePoint[] = [
  { id: '1', label: 'Me cuesta bastante', value: 0.15 },
  { id: '2', label: 'Algo por debajo de la mayoría', value: 0.35 },
  { id: '3', label: 'Como la mayoría', value: 0.5 },
  { id: '4', label: 'Por encima de la mayoría', value: 0.7 },
  { id: '5', label: 'Es una fortaleza clara', value: 0.88 },
  { id: 'nt', label: 'No tuve oportunidad de comprobarlo', value: null, special: 'sin_experiencia' },
];

export const IMPORTANCE_SCALE: ScalePoint[] = [
  { id: '1', label: 'Nada importante', value: 0.05 },
  { id: '2', label: 'Poco', value: 0.3 },
  { id: '3', label: 'Moderado', value: 0.5 },
  { id: '4', label: 'Importante', value: 0.75 },
  { id: '5', label: 'Imprescindible', value: 0.95 },
  { id: 'ns', label: 'No lo sé todavía', value: null, special: 'no_se' },
];

/** Escala bipolar para estilo de trabajo (se completan las etiquetas con los polos). */
export function bipolarScale(left: string, right: string): ScalePoint[] {
  return [
    { id: 'L2', label: `Claramente: ${left}`, value: 0.05 },
    { id: 'L1', label: `Más bien: ${left}`, value: 0.3 },
    { id: 'R1', label: `Más bien: ${right}`, value: 0.7 },
    { id: 'R2', label: `Claramente: ${right}`, value: 0.95 },
    { id: 'depende', label: 'Depende del contexto', value: null, special: 'depende' },
    { id: 'ns', label: 'No lo sé', value: null, special: 'no_se' },
  ];
}

export function scaleValue(scale: ScalePoint[], id: unknown): number | null {
  const p = scale.find((s) => s.id === id);
  return p ? p.value : null;
}
