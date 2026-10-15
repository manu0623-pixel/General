// Modelo de la sesión de evaluación. Es el único estado que se persiste:
// todo lo demás (evidencias, perfil, puntuaciones, informe) se recalcula a partir de él,
// lo que garantiza que una corrección de respuesta se propague de forma consistente.

export const SCHEMA_VERSION = 1;

export interface AnswerRecord {
  questionId: string;
  value: unknown;
  /** true si la persona decidió omitir la pregunta */
  skipped?: boolean;
  stage: number;
  answeredAt: string;
  /** Razón visible al momento de formular la pregunta. */
  publicReason: string;
  /** Razón técnica (puede mencionar carreras). Solo se muestra en el registro técnico. */
  internalReason: string;
  revisions: { value: unknown; at: string; skipped?: boolean }[];
}

export interface ExperienceLog {
  id: string;
  careerId: string;
  experienceId: string;
  at: string;
  interest: number;      // 1..5
  satisfaction: number;  // 1..5
  difficulty: number;    // 1..5 (dificultad percibida)
  difficulties: string;
  continueLearning: 'si' | 'quizas' | 'no';
  learned: string;
}

export interface RankingSnapshot {
  at: string;
  reason: string;
  ranking: { id: string; overall: number; A: number; B: number; C: number; hw: number }[];
}

export interface PendingQuestion {
  questionId: string;
  stage: number;
  publicReason: string;
  internalReason: string;
}

export interface SessionSettings {
  excludedCareers: string[];
  theme: 'system' | 'light' | 'dark';
}

export interface SessionState {
  schemaVersion: number;
  id: string;
  createdAt: string;
  updatedAt: string;
  answers: Record<string, AnswerRecord>;
  /** Orden en que se formularon las preguntas. */
  order: string[];
  completedStages: number[];
  pending: PendingQuestion | null;
  status: 'en_curso' | 'finalizada';
  finalizedAt?: string;
  /** Se pidió reabrir la profundización tras la verificación. */
  reopenedAfterVerification?: number;
  experienceLogs: ExperienceLog[];
  snapshots: RankingSnapshot[];
  visits: string[];
  settings: SessionSettings;
}

export function newSession(now = new Date().toISOString()): SessionState {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    answers: {},
    order: [],
    completedStages: [],
    pending: null,
    status: 'en_curso',
    experienceLogs: [],
    snapshots: [],
    visits: [now],
    settings: { excludedCareers: [], theme: 'system' },
  };
}

export function recordAnswer(
  state: SessionState,
  pending: PendingQuestion,
  value: unknown,
  opts: { skipped?: boolean; now?: string } = {},
): SessionState {
  const now = opts.now ?? new Date().toISOString();
  const prev = state.answers[pending.questionId];
  const rec: AnswerRecord = prev
    ? {
        ...prev,
        value,
        skipped: opts.skipped,
        answeredAt: now,
        revisions: [...prev.revisions, { value: prev.value, at: prev.answeredAt, skipped: prev.skipped }],
      }
    : {
        questionId: pending.questionId,
        value,
        skipped: opts.skipped,
        stage: pending.stage,
        answeredAt: now,
        publicReason: pending.publicReason,
        internalReason: pending.internalReason,
        revisions: [],
      };
  return {
    ...state,
    updatedAt: now,
    answers: { ...state.answers, [pending.questionId]: rec },
    order: state.order.includes(pending.questionId) ? state.order : [...state.order, pending.questionId],
    pending: state.pending?.questionId === pending.questionId ? null : state.pending,
  };
}

export function isAnswered(state: SessionState, id: string): boolean {
  return id in state.answers;
}

export function answerOf<T = unknown>(state: SessionState, id: string): T | undefined {
  const a = state.answers[id];
  if (!a || a.skipped) return undefined;
  return a.value as T;
}
