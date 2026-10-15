import type { AptitudeKey, CareerCatalog, DomainKey, ResolvedCareer, ValueKey } from '../domain/types';
import { contradictionQuestion } from '../engine/contradictions';
import { STATIC_QUESTIONS, STYLE_DEPENDS_FOLLOWUP } from './bank';
import { exerciseById, exerciseQuestion } from './exercises';
import {
  FINAL_QUESTION, behaviorCheck, compareQuestion, demandQuestion, domainPair, evidenceMoreQuestion, evidenceQuestion,
  feelQuestion, hypothesesQuestion, skillQuestion, subjectDifficultyFollowUp, subjectFollowUp, tradeoffQuestion, variantQuestion,
  type HypothesisItem,
} from './generators';
import type { Question } from './types';

const STATIC_MAP = new Map(STATIC_QUESTIONS.map((q) => [q.id, q]));

export interface Registry {
  get(id: string, hypotheses?: HypothesisItem[]): Question | null;
}

/**
 * Resuelve cualquier id de pregunta (estática o generada). Los ids de las preguntas generadas
 * codifican sus parámetros, por lo que se pueden reconstruir siempre igual al recargar la sesión.
 */
export function createRegistry(catalog: CareerCatalog, careers: ResolvedCareer[]): Registry {
  const cache = new Map<string, Question | null>();
  return {
    get(id, hypotheses) {
      if (id.startsWith('verify:')) return hypothesesQuestion(Number(id.split(':')[1]), hypotheses ?? []);
      if (cache.has(id)) return cache.get(id)!;
      const q = build(id);
      cache.set(id, q);
      return q;
    },
  };

  function build(id: string): Question | null {
    const s = STATIC_MAP.get(id);
    if (s) return s;
    if (id.endsWith('__depende')) return STYLE_DEPENDS_FOLLOWUP(id.replace('__depende', ''));
    const [prefix, a, b] = id.split(':');
    switch (prefix) {
      case 'matf': return subjectFollowUp(a);
      case 'matd': return subjectDifficultyFollowUp(a);
      case 'behav': return behaviorCheck(a as DomainKey);
      case 'pair': return domainPair(a as DomainKey, b as DomainKey);
      case 'ex': { const d = exerciseById(a); return d ? exerciseQuestion(d) : null; }
      case 'feel': return feelQuestion(a as AptitudeKey);
      case 'skill': return skillQuestion(a);
      case 'trade': return tradeoffQuestion(a as ValueKey, b as ValueKey);
      case 'evid': return evidenceQuestion(a as AptitudeKey);
      case 'evidmore': return evidenceMoreQuestion(a as AptitudeKey);
      case 'demand': return demandQuestion(catalog, a);
      case 'cmp': return compareQuestion(catalog, careers, a, b);
      case 'variant': return variantQuestion(careers, a);
      case 'contra': return contradictionQuestion(id, catalog);
      case 'final': return FINAL_QUESTION;
      default: return null;
    }
  }
}
