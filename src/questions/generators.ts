import { APTITUDES, DOMAINS, VALUES } from '../domain/dimensions';
import type { AptitudeKey, CareerCatalog, DomainKey, EvidenceDraft, ResolvedCareer, ValueKey } from '../domain/types';
import { textSignals } from '../engine/textSignals';
import { DOMAIN_ACTIVITY, EVIDENCE_CHECKS, SUBJECTS, evidenceStrength } from './bank';
import { asArray, asRecord, ev } from './helpers';
import { DEMAND_SCALE, bipolarScale, scaleValue, type Question } from './types';

// ---------------------------------------------------------------------------
// Etapa 1: profundizar en materias (no interpretar automáticamente la materia como carrera)

const SUBJECT_REASONS: { id: string; label: string }[] = [
  { id: 'temas', label: 'Los temas en sí me apasionaban' },
  { id: 'porque', label: 'Entender por qué las cosas funcionan así' },
  { id: 'ejercicios', label: 'Resolver ejercicios hasta que salieran' },
  { id: 'facil', label: 'Me salía fácil, me iba bien' },
  { id: 'docente', label: 'Cómo lo explicaba el/la docente' },
  { id: 'experimentar', label: 'Experimentar o hacer cosas con las manos' },
  { id: 'debatir', label: 'Debatir e intercambiar ideas' },
  { id: 'crear', label: 'Crear o expresarme' },
  { id: 'memorizar', label: 'Ordenar y memorizar información' },
  { id: 'companeros', label: 'El grupo o el ambiente de la clase' },
];

export function subjectFollowUp(subject: string): Question | null {
  const s = SUBJECTS[subject];
  if (!s) return null;
  return {
    id: `matf:${subject}`, stage: 1, type: 'multi', minSelect: 1, maxSelect: 3,
    title: `¿Qué era lo que te gustaba de ${s.label}?`,
    help: 'Elegí hasta 3. Esto ayuda a distinguir el interés por el tema de otros motivos (el docente, la facilidad, el grupo).',
    publicReason: 'Profundizar en por qué te gustó una materia, en lugar de asumir que indica una carrera.',
    options: SUBJECT_REASONS,
    evaluate: (a) => {
      const out: EvidenceDraft[] = [];
      for (const r of asArray(a)) {
        if (r === 'temas') s.domains.forEach((d) => out.push(ev('domain', d, 0.9, 'declarada', 1, `Te apasionaban los temas de ${s.label}`)));
        if (r === 'porque') { out.push(ev('riasec', 'I', 0.8, 'declarada', 0.5)); s.domains.forEach((d) => out.push(ev('domain', d, 0.75, 'declarada', 0.5))); }
        if (r === 'ejercicios') { out.push(ev('riasec', 'I', 0.65, 'declarada', 0.3)); out.push(ev('riasec', 'C', 0.6, 'declarada', 0.3)); }
        if (r === 'facil') s.aptitudes.forEach((ap) => out.push(ev('aptitude', ap, 0.7, 'autoevaluacion', 0.6, `Te iba bien en ${s.label}`)));
        if (r === 'docente') s.domains.forEach((d) => out.push(ev('domain', d, 0.55, 'declarada', 0.4, `El interés por ${s.label} podría depender del docente`)));
        if (r === 'experimentar') out.push(ev('riasec', 'R', 0.75, 'declarada', 0.5));
        if (r === 'debatir') { out.push(ev('riasec', 'S', 0.65, 'declarada', 0.3)); out.push(ev('riasec', 'E', 0.65, 'declarada', 0.3)); }
        if (r === 'crear') out.push(ev('riasec', 'A', 0.8, 'declarada', 0.5));
        if (r === 'memorizar') { out.push(ev('riasec', 'C', 0.7, 'declarada', 0.4)); out.push(ev('demand', 'memoria_volumen', 0.7, 'declarada', 0.4)); }
        if (r === 'companeros') out.push(ev('riasec', 'S', 0.6, 'declarada', 0.2));
      }
      return out;
    },
  };
}

export function subjectDifficultyFollowUp(subject: string): Question | null {
  const s = SUBJECTS[subject];
  if (!s) return null;
  return {
    id: `matd:${subject}`, stage: 1, type: 'single',
    title: `¿Por qué creés que te costó o te aburrió ${s.label}?`,
    help: 'Una dificultad pasada no es una limitación permanente: distinguir la causa evita conclusiones injustas.',
    publicReason: 'Diferenciar una dificultad real de falta de base, de interés o de factores del contexto.',
    options: [
      { id: 'no_entendia', label: 'Aunque estudiaba, me costaba entenderla' },
      { id: 'no_interes', label: 'No me interesaba el tema' },
      { id: 'docente', label: 'Por cómo se enseñaba o por el docente' },
      { id: 'base', label: 'Me faltaba base de años anteriores' },
      { id: 'nervios', label: 'Me ponía nervioso/a en las evaluaciones' },
      { id: 'ns', label: 'No lo sé', special: 'no_se' },
    ],
    evaluate: (a) => {
      if (a === 'no_entendia') return s.aptitudes.map((ap) => ev('aptitude', ap, 0.32, 'autoevaluacion', 0.5, `Dificultad declarada en ${s.label}`));
      if (a === 'no_interes') return s.domains.map((d) => ev('domain', d, 0.25, 'declarada', 0.6, `Falta de interés en ${s.label}`));
      return [];
    },
  };
}

// ---------------------------------------------------------------------------
// Etapa 2: interés genuino vs. teórico y comparaciones forzadas

export function behaviorCheck(domain: DomainKey): Question {
  const act = DOMAIN_ACTIVITY[domain];
  return {
    id: `behav:${domain}`, stage: 2, type: 'single',
    title: `En el último año, ¿hiciste algo por tu cuenta relacionado con esto?`,
    help: `«${act}». Por ejemplo: un curso, un proyecto, lecturas, videos que buscaste, una actividad o un hobby.`,
    publicReason: 'Distinguir intereses que llevás a la práctica de intereses que te atraen en teoría.',
    options: [
      { id: 'sostenido', label: 'Sí, varias veces o de forma sostenida' },
      { id: 'alguna', label: 'Sí, alguna vez' },
      { id: 'gustaria', label: 'No, pero me gustaría' },
      { id: 'no', label: 'No, y no lo había pensado' },
    ],
    evaluate: (a) => {
      const map: Record<string, [number, number]> = { sostenido: [0.9, 1], alguna: [0.72, 0.8], gustaria: [0.52, 0.6], no: [0.38, 0.7] };
      const m = map[String(a)];
      if (!m) return [];
      const note = a === 'gustaria' ? 'Interés que todavía no llevaste a la práctica' : a === 'sostenido' ? 'Interés llevado a la práctica de forma sostenida' : undefined;
      return [ev('domain', domain, m[0], 'conducta', m[1], note)];
    },
  };
}

export function domainPair(d1: DomainKey, d2: DomainKey): Question {
  const scale = bipolarScale(DOMAIN_ACTIVITY[d1], DOMAIN_ACTIVITY[d2]);
  scale.splice(4, 2, { id: 'igual', label: 'Me cuesta elegir: los dos por igual', value: null, special: 'depende' });
  return {
    id: `pair:${d1}:${d2}`, stage: 2, type: 'scale',
    title: 'Si pudieras hacer gratis un curso intensivo de un mes, ¿cuál elegirías?',
    help: 'Elegí aunque te gusten los dos: la idea es ver qué priorizás.',
    publicReason: 'Comparar intereses cercanos para establecer prioridades.',
    scale,
    evaluate: (a) => {
      const v = scaleValue(scale, a);
      if (a === 'igual') return [ev('domain', d1, 0.75, 'escenario', 0.3), ev('domain', d2, 0.75, 'escenario', 0.3)];
      if (v == null) return [];
      // v cerca de 0 → prefiere d1
      return [ev('domain', d1, 0.85 - 0.45 * v, 'escenario', 0.7), ev('domain', d2, 0.4 + 0.45 * v, 'escenario', 0.7)];
    },
  };
}

// ---------------------------------------------------------------------------
// Etapa 3: contexto del ejercicio y experiencias de habilidades no evaluables por ejercicio

export const FEEL_OPTIONS = [
  { id: 'comodo', label: 'Me resultó familiar y cómodo' },
  { id: 'disfrute', label: 'Lo disfruté' },
  { id: 'dificil', label: 'Entendí la consigna, pero me resultó difícil' },
  { id: 'nuevo', label: 'Nunca había hecho algo así' },
  { id: 'nervios', label: 'Me puse nervioso/a o sentí presión' },
  { id: 'base', label: 'Me faltaban conocimientos previos' },
  { id: 'aburrido', label: 'Me aburrió o no me interesó' },
];
/** Respuestas que indican que el resultado podría no reflejar la capacidad (reducen el peso del ejercicio). */
export const FEEL_DISCOUNT = new Set(['nuevo', 'nervios', 'base']);

export function feelQuestion(apt: AptitudeKey): Question {
  return {
    id: `feel:${apt}`, stage: 3, type: 'multi', minSelect: 1, maxSelect: 2,
    title: `¿Cómo te resultaron los ejercicios de ${APTITUDES[apt].toLowerCase()}?`,
    help: 'Elegí hasta 2. Esto sirve para interpretar bien el resultado: no es lo mismo una dificultad real que nervios o falta de familiaridad.',
    publicReason: 'Diferenciar dificultad real, falta de conocimientos previos, nervios y falta de familiaridad.',
    options: FEEL_OPTIONS,
    // El efecto se aplica en el armado del contexto: reduce el peso de los ejercicios de esta aptitud
    // cuando la respuesta sugiere nervios, falta de familiaridad o de conocimientos previos.
    evaluate: () => [],
  };
}

const SKILL_ITEMS: Record<string, { title: string; options: { id: string; label: string; v: number | null; w?: number; constraint?: string }[]; apt: AptitudeKey }> = {
  manual: {
    apt: 'manual',
    title: '¿Qué describe mejor tu experiencia con trabajos manuales de precisión (dibujo detallado, maquetas, costura, soldadura, modelado, reparaciones finas)?',
    options: [
      { id: 'frecuente', label: 'Los hago seguido y suelen salirme bien', v: 0.82 },
      { id: 'aveces', label: 'Los hice algunas veces y salieron bastante bien', v: 0.65, w: 0.8 },
      { id: 'cuesta', label: 'Los hice y me cuestan más que a otras personas', v: 0.3, w: 0.8 },
      { id: 'nunca', label: 'Casi no tuve oportunidad de hacerlos', v: null },
    ],
  },
  fisico: {
    apt: 'fisico',
    title: '¿Cómo describirías tu relación con la actividad física?',
    options: [
      { id: 'entreno', label: 'Entreno con regularidad (3 o más veces por semana) y rindo bien', v: 0.85 },
      { id: 'regular', label: 'Hago actividad física de vez en cuando', v: 0.55, w: 0.8 },
      { id: 'poca', label: 'Hago poca actividad física y me cuesta', v: 0.25, w: 0.8 },
      { id: 'limit', label: 'Tengo limitaciones que me impiden ciertas actividades', v: null, constraint: 'limit_fisico' },
    ],
  },
  interpersonal: {
    apt: 'interpersonal',
    title: 'Cuando alguien cercano tiene un problema, ¿qué suele pasar?',
    options: [
      { id: 'buscan', label: 'Me buscan para hablar y sienten que los entiendo', v: 0.8 },
      { id: 'ayudo', label: 'Puedo ayudar, aunque no siempre sé qué decir', v: 0.55, w: 0.8 },
      { id: 'cuesta', label: 'Me cuesta darme cuenta de qué les pasa o qué necesitan', v: 0.28, w: 0.8 },
      { id: 'ns', label: 'No lo sé', v: null },
    ],
  },
  idiomas: {
    apt: 'idiomas',
    title: '¿Cuál es tu nivel en el idioma extranjero que mejor manejás?',
    options: [
      { id: 'avanzado', label: 'Leo, escribo y converso con fluidez', v: 0.85 },
      { id: 'propio', label: 'Aprendí bastante por mi cuenta, sin cursos formales', v: 0.78 },
      { id: 'intermedio', label: 'Me defiendo: entiendo bastante y me comunico con errores', v: 0.6, w: 0.8 },
      { id: 'basico', label: 'Nivel básico', v: 0.35, w: 0.6 },
    ],
  },
  auditivo: {
    apt: 'auditivo',
    title: '¿Cuál es tu formación musical?',
    options: [
      { id: 'avanzada', label: 'Toco o canto desde hace años y leo partituras', v: 0.82, constraint: 'musica_previa' },
      { id: 'intermedia', label: 'Toco o canto, aprendí mayormente por mi cuenta', v: 0.65, constraint: 'musica_previa' },
      { id: 'inicial', label: 'Me gusta mucho, pero casi no estudié música', v: null },
      { id: 'ninguna', label: 'Ninguna', v: null },
    ],
  },
};

export function skillQuestion(key: string): Question | null {
  const s = SKILL_ITEMS[key];
  if (!s) return null;
  return {
    id: `skill:${key}`, stage: 3, type: 'single',
    title: s.title,
    help: 'Esta capacidad no se puede observar con un ejercicio en pantalla, por eso te pedimos experiencias concretas.',
    publicReason: 'Estimar una capacidad práctica a partir de experiencias reales.',
    options: s.options.map((o) => ({ id: o.id, label: o.label, special: o.v == null && !o.constraint ? 'sin_experiencia' : undefined })),
    evaluate: (a) => {
      const o = s.options.find((x) => x.id === a);
      if (!o) return [];
      const out: EvidenceDraft[] = [];
      if (o.v != null) out.push(ev('aptitude', s.apt, o.v, 'experiencia', o.w ?? 1, 'Experiencia descrita'));
      if (o.constraint) out.push(ev('constraint', o.constraint, 1, 'externo'));
      return out;
    },
  };
}
export const SKILL_KEYS = Object.keys(SKILL_ITEMS);

// ---------------------------------------------------------------------------
// Etapa 5: elecciones forzadas entre valores

const VALUE_PHRASES: Record<ValueKey, [string, string]> = {
  ingresos: ['ingresos claramente por encima del promedio', 'ingresos apenas suficientes'],
  estabilidad: ['un puesto estable y previsible por años', 'contratos por proyecto, sin continuidad garantizada'],
  autonomia_v: ['total autonomía para decidir cómo trabajar', 'tareas definidas y supervisadas por otros'],
  emprender: ['la posibilidad de armar tu propio emprendimiento', 'trabajar siempre para una organización'],
  creatividad_v: ['mucho espacio para crear cosas propias', 'tareas estandarizadas con poco lugar para la creatividad'],
  crecimiento: ['un camino claro para crecer y ascender', 'pocas posibilidades de ascenso'],
  reconocimiento: ['reconocimiento y prestigio social', 'un trabajo poco visible'],
  impacto: ['un impacto directo y visible en la vida de otras personas', 'un impacto social indirecto o poco visible'],
  desafio: ['problemas intelectualmente desafiantes todo el tiempo', 'tareas poco desafiantes'],
  flexibilidad: ['horarios flexibles que vos elegís', 'horarios fijos y estrictos'],
  remoto: ['trabajar desde tu casa la mayor parte del tiempo', 'presencialidad completa todos los días'],
  movilidad: ['oportunidades de trabajar en otras ciudades o países', 'un trabajo atado a un lugar'],
  equilibrio: ['jornadas acotadas y tiempo libre garantizado', 'jornadas largas y poco tiempo libre'],
  especializacion: ['volverte experto/a en un tema muy específico', 'tareas generales, sin especialización'],
  variedad_v: ['proyectos muy variados', 'tareas similares todos los días'],
};

export function tradeoffQuestion(v1: ValueKey, v2: ValueKey): Question {
  const a = `${VALUE_PHRASES[v1][0]}, pero ${VALUE_PHRASES[v2][1]}`;
  const b = `${VALUE_PHRASES[v2][0]}, pero ${VALUE_PHRASES[v1][1]}`;
  const scale = bipolarScale(`Trabajo A`, `Trabajo B`);
  scale.splice(4, 2, { id: 'nopuedo', label: 'No puedo elegir', value: null, special: 'depende' });
  return {
    id: `trade:${v1}:${v2}`, stage: 5, type: 'scale',
    title: 'Tenés dos ofertas de trabajo. Todo lo demás es igual. ¿Cuál elegirías?',
    help: `Trabajo A: ${a}.\nTrabajo B: ${b}.`,
    publicReason: 'Las elecciones forzadas revelan prioridades reales cuando no se puede tener todo.',
    scale,
    evaluate: (ans) => {
      const v = scaleValue(scale, ans);
      if (v == null) return [];
      const strong = v < 0.1 || v > 0.9;
      const win = strong ? 0.88 : 0.72;
      const lose = strong ? 0.32 : 0.45;
      const [w, l] = v < 0.5 ? [v1, v2] : [v2, v1];
      return [ev('value', w, win, 'escenario', 1, `Elegido frente a «${VALUES[l]}»`), ev('value', l, lose, 'escenario', 1, `Postergado frente a «${VALUES[w]}»`)];
    },
  };
}

// ---------------------------------------------------------------------------
// Etapa 6: evidencia concreta de fortalezas declaradas

export function evidenceQuestion(apt: AptitudeKey): Question {
  return {
    id: `evid:${apt}`, stage: 6, type: 'evidence', optional: true,
    title: `Indicaste que «${APTITUDES[apt].toLowerCase()}» es una fortaleza. Contá una situación concreta en la que la hayas usado.`,
    help: '¿Qué hiciste exactamente, cómo llegaste a la solución y qué dificultades tuviste que superar? Si no tenés un ejemplo formal, también vale uno informal.',
    placeholder: 'Por ejemplo: en un trabajo grupal me tocó…, lo resolví…, el resultado fue…',
    publicReason: 'Distinguir la confianza en una habilidad de la capacidad demostrada en situaciones reales.',
    checks: EVIDENCE_CHECKS,
    evaluate: (a) => {
      const s = evidenceStrength(a);
      if (!s.weight) return [];
      return [ev('aptitude', apt, s.value, 'experiencia', s.weight, `Ejemplo concreto (${s.words} palabras, ${s.checks.length} verificaciones)`), ...textSignals(asRecord(a).text, 'Mencionado al describir una fortaleza')];
    },
  };
}

export function evidenceMoreQuestion(apt: AptitudeKey): Question {
  return {
    id: `evidmore:${apt}`, stage: 6, type: 'evidence', optional: true,
    title: 'Tu ejemplo fue bastante general. ¿Podrías dar más detalles?',
    help: `Sobre «${APTITUDES[apt].toLowerCase()}»: qué hiciste paso a paso, qué dificultades encontraste, cómo las resolviste y qué resultado obtuviste.`,
    publicReason: 'Una respuesta general no permite distinguir confianza de capacidad demostrada.',
    checks: EVIDENCE_CHECKS,
    evaluate: (a) => {
      const s = evidenceStrength(a);
      if (!s.weight) return [];
      return [ev('aptitude', apt, s.value, 'experiencia', s.weight, 'Detalle adicional de un ejemplo')];
    },
  };
}

// ---------------------------------------------------------------------------
// Etapa 7: exigencias reales

export function demandQuestion(catalog: CareerCatalog, key: string): Question | null {
  const d = catalog.demands.find((x) => x.key === key);
  if (!d) return null;
  return {
    id: `demand:${key}`, stage: 7, type: 'scale',
    title: 'Imaginá que esto forma parte habitual de tu formación o trabajo. ¿Cómo te sentirías?',
    help: d.scenario,
    publicReason: 'No alcanza con que te guste la idea de una profesión: exploramos tu disposición frente a tareas reales y cotidianas.',
    scale: DEMAND_SCALE,
    checks: [{ id: 'vivido', label: 'Ya viví algo parecido (en la escuela, un trabajo, un hobby)' }],
    evaluate: (a) => {
      const r = asRecord(a);
      const v = scaleValue(DEMAND_SCALE, r.level);
      if (v == null) return [];
      const lived = asArray(r.checks).includes('vivido');
      return [ev('demand', key, v, lived ? 'experiencia' : 'escenario', lived ? 1 : 0.85, lived ? 'Basado en una experiencia similar vivida' : undefined)];
    },
  };
}

// ---------------------------------------------------------------------------
// Etapa 8: discriminación entre opciones cercanas

export function uniqueTasks(c1: ResolvedCareer, c2: ResolvedCareer): [string[], string[]] {
  const t2 = new Set(c2.tasks);
  const t1 = new Set(c1.tasks);
  return [c1.tasks.filter((t) => !t2.has(t)).slice(0, 3), c2.tasks.filter((t) => !t1.has(t)).slice(0, 3)];
}

export function compareQuestion(catalog: CareerCatalog, careers: ResolvedCareer[], c1id: string, c2id: string): Question | null {
  const c1 = careers.find((c) => c.id === c1id);
  const c2 = careers.find((c) => c.id === c2id);
  if (!c1 || !c2) return null;
  void catalog;
  const [a, b] = uniqueTasks(c1, c2);
  if (a.length < 2 || b.length < 2) return null;
  const scale = bipolarScale('Semana A', 'Semana B');
  scale.splice(4, 2,
    { id: 'igual', label: 'Me gustarían las dos por igual', value: null, special: 'depende' },
    { id: 'ninguna', label: 'Ninguna me atrae', value: null, special: 'ninguna' });
  return {
    id: `cmp:${c1id}:${c2id}`, stage: 8, type: 'scale',
    title: 'Imaginá dos semanas de trabajo. ¿Cuál preferirías vivir?',
    help: `Semana A: ${a.join('; ')}.\nSemana B: ${b.join('; ')}.`,
    publicReason: 'Hay opciones con resultados muy parecidos; esta comparación ayuda a distinguirlas a partir de tareas concretas.',
    scale,
    evaluate: (ans) => {
      if (ans === 'igual') return [ev('career', c1id, 0.7, 'escenario', 0.4), ev('career', c2id, 0.7, 'escenario', 0.4)];
      if (ans === 'ninguna') return [ev('career', c1id, 0.25, 'escenario', 0.7), ev('career', c2id, 0.25, 'escenario', 0.7)];
      const v = scaleValue(scale, ans);
      if (v == null) return [];
      return [ev('career', c1id, 0.85 - 0.55 * v, 'escenario', 0.8, 'Comparación de semanas de trabajo'), ev('career', c2id, 0.3 + 0.55 * v, 'escenario', 0.8, 'Comparación de semanas de trabajo')];
    },
  };
}

export function variantQuestion(careers: ResolvedCareer[], careerId: string): Question | null {
  const c = careers.find((x) => x.id === careerId);
  if (!c?.variants?.length) return null;
  return {
    id: `variant:${careerId}`, stage: 8, type: 'single',
    title: 'Dentro de un mismo campo hay orientaciones muy distintas. ¿Cuál te atrae más?',
    help: 'Elegí la que te resulte más atractiva para dedicarle años de trabajo.',
    publicReason: 'Una misma carrera puede desarrollarse en ámbitos muy diferentes; conviene saber cuál te interesa.',
    options: [
      ...c.variants.map((v) => ({ id: v.id, label: v.name, hint: v.description })),
      { id: 'ninguna', label: 'Ninguna me atrae especialmente', special: 'ninguna' as const },
    ],
    evaluate: (a) => {
      if (a === 'ninguna') return [ev('career', careerId, 0.35, 'escenario', 0.5, 'Ninguna orientación resultó atractiva')];
      if (typeof a !== 'string') return [];
      return [ev('career', `${careerId}#${a}`, 0.85, 'escenario', 1, 'Orientación preferida')];
    },
  };
}

// ---------------------------------------------------------------------------
// Etapa 9: verificación de hipótesis y cierre

export interface HypothesisItem {
  id: string;
  text: string;
  basis: string;
  /** objetivo que se corrige si la hipótesis es incorrecta */
  targets: { kind: string; key: string; value: number }[];
}

export const VERDICTS = [
  { id: 'si', label: 'Correcto' },
  { id: 'parcial', label: 'En parte' },
  { id: 'no', label: 'Incorrecto' },
  { id: 'ns', label: 'No lo sé' },
];

export function hypothesesQuestion(round: number, items: HypothesisItem[]): Question {
  return {
    id: `verify:${round}`, stage: 9, type: 'hypotheses',
    title: 'Estas son las principales hipótesis que surgieron. ¿Son correctas?',
    help: 'Marcá cada una. Si alguna es incorrecta, contá por qué: las conclusiones se corrigen y, si hace falta, se vuelve a explorar esa dimensión.',
    publicReason: 'Antes de cerrar, verificamos con vos las conclusiones provisionales.',
    hypotheses: items.map((h) => ({ id: h.id, text: h.text, basis: h.basis })),
    evaluate: (a) => {
      const r = asRecord(a);
      const stored = (Array.isArray(r.items) ? r.items : []) as (HypothesisItem & { verdict?: string })[];
      const out: EvidenceDraft[] = [];
      for (const h of stored) {
        for (const t of h.targets ?? []) {
          if (h.verdict === 'no') out.push(ev(t.kind as never, t.key, 1 - t.value, 'verificacion', 1, `Corregiste: «${h.text}»`));
          if (h.verdict === 'parcial') out.push(ev(t.kind as never, t.key, 0.5 + (t.value - 0.5) * 0.4, 'verificacion', 0.4, `Parcialmente: «${h.text}»`));
          if (h.verdict === 'si') out.push(ev(t.kind as never, t.key, t.value, 'verificacion', 0.25, `Confirmaste: «${h.text}»`));
        }
      }
      return out;
    },
  };
}

export const FINAL_QUESTION: Question = {
  id: 'final', stage: 9, type: 'final', optional: true,
  title: '¿Querés agregar algo antes de cerrar la evaluación?',
  help: 'Por ejemplo, algo importante sobre vos que no se haya preguntado. Al confirmar, se genera el informe final; podés seguir corrigiendo respuestas después.',
  placeholder: 'Opcional',
  publicReason: 'Cierre de la evaluación.',
  evaluate: (a) => textSignals(asRecord(a).text ?? a, 'Mencionado en el comentario final'),
};

export function domainLabel(d: string) {
  return DOMAINS[d as DomainKey] ?? d;
}
