import { APTITUDES, DOMAINS, STYLES, VALUES } from '../domain/dimensions';
import type { AptitudeKey, CareerCatalog, DomainKey, Evidence, EvidenceSource, StyleKey, ValueKey } from '../domain/types';
import { STYLE_CONSISTENCY_PAIRS } from '../questions/bank';
import type { Question } from '../questions/types';
import { estFromSources, getEst, type Profile } from './profile';

/**
 * CONTRADICCIONES
 * Se detectan comparando evidencias de distinto tipo sobre la misma dimensión.
 * Cada contradicción genera UNA pregunta de aclaración; la respuesta ajusta el peso de las
 * evidencias en conflicto (nunca cambia los criterios de puntuación).
 */
export interface Contradiction {
  id: string;
  kind: 'aptitud_sobreestimada' | 'aptitud_subestimada' | 'interes_teorico' | 'valor' | 'estilo' | 'exigencia';
  key: string;
  description: string;
  stageOfOrigin: number;
}

export interface Adjustment {
  match: (e: Evidence) => boolean;
  factor: number;
  note: string;
}

function avgFromQuestions(evidence: Evidence[], kind: string, key: string, prefix: string): { est: number; w: number } | null {
  let w = 0, s = 0;
  for (const e of evidence) {
    if (e.target.kind === kind && e.target.key === key && e.questionId.startsWith(prefix)) { w += e.weight; s += e.weight * e.value; }
  }
  return w > 0 ? { est: s / w, w } : null;
}

export function detectContradictions(p: Profile, evidence: Evidence[], catalog: CareerCatalog): Contradiction[] {
  const out: Contradiction[] = [];
  // 1-2. Autoevaluación vs. ejercicios
  for (const apt of Object.keys(APTITUDES) as AptitudeKey[]) {
    const e = getEst(p, 'aptitude', apt);
    const self = e.bySource.autoevaluacion;
    const exer = e.bySource.ejercicio;
    if (!self || !exer || exer.n < 2) continue;
    if (self.est >= 0.68 && exer.est <= 0.45) out.push({ id: `contra:apthi:${apt}`, kind: 'aptitud_sobreestimada', key: apt, stageOfOrigin: 3, description: `Te ves fuerte en ${APTITUDES[apt].toLowerCase()}, pero los ejercicios dieron un resultado más bajo.` });
    if (self.est <= 0.38 && exer.est >= 0.72) out.push({ id: `contra:aptlo:${apt}`, kind: 'aptitud_subestimada', key: apt, stageOfOrigin: 3, description: `No te considerás fuerte en ${APTITUDES[apt].toLowerCase()}, pero los ejercicios dieron un resultado alto.` });
  }
  // 3. Interés por un área vs. rechazo de sus tareas centrales
  for (const d of Object.keys(DOMAINS) as DomainKey[]) {
    const de = getEst(p, 'domain', d);
    if (de.est < 0.72 || de.conf < 0.4) continue;
    const core = new Set<string>();
    for (const f of catalog.families) if ((f.domains[d] ?? 0) >= 1) for (const [k, c] of Object.entries(f.demands)) if (c >= 0.9) core.add(k);
    const answered = [...core].map((k) => estFromSources(getEst(p, 'demand', k), ['escenario', 'experiencia'])).filter(Boolean) as { est: number }[];
    if (answered.length >= 2 && answered.reduce((s, x) => s + x.est, 0) / answered.length <= 0.3) {
      out.push({ id: `contra:teoria:${d}`, kind: 'interes_teorico', key: d, stageOfOrigin: 7, description: `Te interesa «${DOMAINS[d]}», pero varias tareas habituales de ese campo te resultan poco atractivas.` });
    }
  }
  // 4. Valor declarado vs. elecciones forzadas
  for (const v of Object.keys(VALUES) as ValueKey[]) {
    const e = getEst(p, 'value', v);
    const dec = e.bySource.declarada, sc = e.bySource.escenario;
    if (dec && sc && sc.n >= 2 && dec.est >= 0.75 && sc.est <= 0.42) out.push({ id: `contra:valor:${v}`, kind: 'valor', key: v, stageOfOrigin: 5, description: `Dijiste que «${VALUES[v]}» es muy importante, pero en las elecciones forzadas priorizaste otras cosas.` });
  }
  // 5. Ítems de estilo formulados de dos maneras
  for (const [q1, q2] of STYLE_CONSISTENCY_PAIRS) {
    const axis = q1.replace('q4_', '') as StyleKey;
    const a = avgFromQuestions(evidence, 'style', axis, q1);
    const b = avgFromQuestions(evidence, 'style', axis, q2);
    if (a && b && Math.abs(a.est - b.est) > 0.5) out.push({ id: `contra:estilo:${axis}`, kind: 'estilo', key: axis, stageOfOrigin: 4, description: `Tus respuestas sobre «${STYLES[axis][0]} / ${STYLES[axis][1]}» fueron en direcciones opuestas.` });
  }
  // 6. Exigencia declarada como tediosa vs. respuesta al escenario
  for (const d of catalog.demands) {
    const e = getEst(p, 'demand', d.key);
    const dec = e.bySource.declarada;
    const sc = estFromSources(e, ['escenario', 'experiencia']);
    if (dec && sc && Math.abs(dec.est - sc.est) > 0.6) out.push({ id: `contra:exig:${d.key}`, kind: 'exigencia', key: d.key, stageOfOrigin: 7, description: `Tu respuesta inicial sobre «${d.label.toLowerCase()}» no coincide con tu reacción ante un escenario concreto.` });
  }
  return out;
}

const ADJ: Record<string, Record<string, { label: string; adjust?: (key: string) => Adjustment[] }>> = {
  apthi: {
    nervios: { label: 'Me puse nervioso/a o sentí presión', adjust: (k) => [disc('aptitude', k, 'ejercicio', 0.5, 'Resultado de ejercicios posiblemente afectado por nervios')] },
    formato: { label: 'Los ejercicios eran distintos a como uso esa capacidad', adjust: (k) => [disc('aptitude', k, 'ejercicio', 0.6, 'Formato de ejercicio poco representativo según tu aclaración')] },
    practica: { label: 'Me falta práctica en este tipo de ejercicios', adjust: (k) => [disc('aptitude', k, 'ejercicio', 0.75, 'Falta de práctica con el formato')] },
    sobreestime: { label: 'Quizás me sobreestimé', adjust: (k) => [disc('aptitude', k, 'autoevaluacion', 0.4, 'Reconociste haber sobreestimado esta capacidad')] },
    ns: { label: 'No lo sé' },
  },
  aptlo: {
    no_gusta: { label: 'Me sale, pero no me gusta' },
    malas: { label: 'Tuve malas experiencias en la escuela con esto', adjust: (k) => [disc('aptitude', k, 'autoevaluacion', 0.4, 'Autopercepción afectada por experiencias escolares')] },
    nunca: { label: 'Nunca lo había puesto a prueba', adjust: (k) => [disc('aptitude', k, 'autoevaluacion', 0.4, 'Capacidad no explorada antes')] },
    suerte: { label: 'Creo que fue casualidad', adjust: (k) => [disc('aptitude', k, 'ejercicio', 0.7, 'Consideraste que el resultado pudo ser casual')] },
    ns: { label: 'No lo sé' },
  },
  teoria: {
    tema_no_tarea: { label: 'Me interesa el tema, pero no ese tipo de trabajo' },
    toleraria: { label: 'Podría tolerar esas tareas si el resto me gusta' },
    no_conocia: { label: 'No conocía bien esas tareas; necesito probarlas antes de decidir' },
    ns: { label: 'No lo sé' },
  },
  valor: {
    menos: { label: 'Me importa, pero menos de lo que dije al principio', adjust: (k) => [disc('value', k, 'declarada', 0.4, 'Aclaraste que este valor pesa menos de lo declarado')] },
    depende: { label: 'Depende de cuánto se gane o se pierda en cada caso' },
    error: { label: 'Las comparaciones no reflejaron lo que pienso', adjust: (k) => [disc('value', k, 'escenario', 0.4, 'Aclaraste que las elecciones forzadas no te representaron')] },
  },
  estilo: {
    contexto: { label: 'Depende del contexto', adjust: (k) => [disc('style', k, 'declarada', 0.5, 'Preferencia dependiente del contexto')] },
    primera: { label: 'La primera respuesta me representa más', adjust: (k) => [discQ('style', k, `q4_${k}_b`, 0.3)] },
    segunda: { label: 'La segunda respuesta me representa más', adjust: (k) => [discQ('style', k, `q4_${k}`, 0.3, true)] },
  },
  exig: {
    inicial: { label: 'Mi respuesta inicial me representa más', adjust: (k) => [disc('demand', k, 'escenario', 0.3, 'Aclaraste que tu respuesta inicial es más representativa'), disc('demand', k, 'experiencia', 0.3, '')] },
    escenario: { label: 'Mi reacción al escenario concreto me representa más', adjust: (k) => [disc('demand', k, 'declarada', 0.3, 'Aclaraste que el escenario concreto es más representativo')] },
    contexto: { label: 'Depende del contexto', adjust: (k) => [disc('demand', k, 'declarada', 0.6, 'Depende del contexto'), disc('demand', k, 'escenario', 0.6, '')] },
  },
};

function disc(kind: string, key: string, source: EvidenceSource, factor: number, note: string): Adjustment {
  return { match: (e) => e.target.kind === kind && e.target.key === key && e.source === source, factor, note };
}
function discQ(kind: string, key: string, qid: string, factor: number, exact = false): Adjustment {
  return { match: (e) => e.target.kind === kind && e.target.key === key && (exact ? e.questionId === qid : e.questionId.startsWith(qid)), factor, note: 'Aclaración de consistencia' };
}

export function contradictionQuestion(id: string, catalog: CareerCatalog): Question | null {
  const [, kind, key] = id.split(':');
  const opts = ADJ[kind];
  if (!opts) return null;
  let title = '';
  let help = '';
  if (kind === 'apthi') { title = `En los ejercicios de ${APTITUDES[key as AptitudeKey]?.toLowerCase()} el resultado fue más bajo de lo que esperabas. ¿Qué creés que pasó?`; help = 'Un resultado puntual no define tu capacidad. Tu aclaración ayuda a interpretarlo correctamente.'; }
  if (kind === 'aptlo') { title = `Te fue mejor de lo que esperabas en ${APTITUDES[key as AptitudeKey]?.toLowerCase()}. ¿Por qué creés que no lo considerabas una fortaleza?`; help = 'Recordá que hacer algo bien no implica disfrutarlo: ambas cosas se analizan por separado.'; }
  if (kind === 'teoria') {
    title = `Te interesa «${DOMAINS[key as DomainKey]}», pero varias tareas habituales de ese campo te resultaron poco atractivas. ¿Cómo lo ves?`;
    help = 'Es común que un tema atraiga más en teoría que en la práctica cotidiana. No hay respuesta correcta.';
  }
  if (kind === 'valor') { title = `Dijiste que «${VALUES[key as ValueKey]}» es muy importante, pero en las elecciones forzadas elegiste otras cosas. ¿Cuál refleja mejor lo que pensás?`; }
  if (kind === 'estilo') { const s = STYLES[key as StyleKey]; title = `Respondiste en direcciones opuestas sobre «${s?.[0]}» frente a «${s?.[1]}». ¿Qué te representa más?`; }
  if (kind === 'exig') { const d = catalog.demands.find((x) => x.key === key); title = `Sobre «${d?.label.toLowerCase()}», tu respuesta inicial y tu reacción al escenario concreto fueron distintas. ¿Cuál te representa más?`; }
  return {
    id, stage: 8, type: 'single', title, help,
    publicReason: 'Apareció una contradicción entre respuestas; aclararla mejora la precisión del análisis.',
    options: Object.entries(opts).map(([oid, o]) => ({ id: oid, label: o.label, special: oid === 'ns' ? 'no_se' as const : undefined })),
    evaluate: (a) => {
      if (kind === 'teoria' && a === 'toleraria') {
        const core = new Set<string>();
        for (const f of catalog.families) if ((f.domains[key as DomainKey] ?? 0) >= 1) for (const [k, c] of Object.entries(f.demands)) if (c >= 0.9) core.add(k);
        return [...core].map((k) => ({ target: { kind: 'demand' as const, key: k }, value: 0.5, weight: 0.5, source: 'escenario' as const, note: 'Podrías tolerarlo si el resto te gusta' }));
      }
      return [];
    },
  };
}

/** Ajustes de peso derivados de las aclaraciones de contradicciones ya respondidas. */
export function adjustmentsFromAnswers(answers: Record<string, { value: unknown; skipped?: boolean }>): Adjustment[] {
  const out: Adjustment[] = [];
  for (const [id, a] of Object.entries(answers)) {
    if (!id.startsWith('contra:') || a.skipped) continue;
    const [, kind, key] = id.split(':');
    const opt = ADJ[kind]?.[String(a.value)];
    if (opt?.adjust) out.push(...opt.adjust(key));
  }
  return out;
}
