import type { DomainKey, EvidenceDraft, RiasecKey, StyleKey, ValueKey } from '../domain/types';
import { VALUES } from '../domain/dimensions';
import { textSignals, wordCount } from '../engine/textSignals';
import { asArray, asRecord, ev, matrixEvidence } from './helpers';
import {
  IMPORTANCE_SCALE, INTEREST_SCALE, SELF_SCALE, bipolarScale, scaleValue, type Option, type Question,
} from './types';

// ===========================================================================
// ETAPA 1 — Exploración inicial
// ===========================================================================

type OptMap = Record<string, { label: string; ev: EvidenceDraft[] }>;

const ACTIVITIES: OptMap = {
  programar: { label: 'Programar, modificar juegos o configurar aplicaciones', ev: [ev('domain', 'tecnologia', 0.85, 'declarada'), ev('riasec', 'I', 0.7, 'declarada', 0.5), ev('riasec', 'R', 0.65, 'declarada', 0.4)] },
  arreglar: { label: 'Armar, desarmar o arreglar aparatos y objetos', ev: [ev('domain', 'ingenieria', 0.85, 'declarada'), ev('riasec', 'R', 0.85, 'declarada', 0.7)] },
  acertijos: { label: 'Resolver acertijos o problemas de lógica o matemática', ev: [ev('domain', 'matematica', 0.85, 'declarada'), ev('riasec', 'I', 0.8, 'declarada', 0.6)] },
  universo: { label: 'Ver documentales o leer sobre el universo, la física o fenómenos naturales', ev: [ev('domain', 'fisica', 0.85, 'declarada'), ev('riasec', 'I', 0.8, 'declarada', 0.5)] },
  naturaleza: { label: 'Cuidar plantas, tener una huerta o estar en la naturaleza', ev: [ev('domain', 'tierra_ambiente', 0.85, 'declarada'), ev('riasec', 'R', 0.7, 'declarada', 0.4)] },
  animales: { label: 'Cuidar, observar o entrenar animales', ev: [ev('domain', 'animales', 0.9, 'declarada'), ev('riasec', 'R', 0.65, 'declarada', 0.3)] },
  experimentar: { label: 'Hacer experimentos o cocinar probando variantes', ev: [ev('domain', 'quimica_bio', 0.8, 'declarada'), ev('riasec', 'I', 0.65, 'declarada', 0.3), ev('riasec', 'R', 0.65, 'declarada', 0.3)] },
  dibujar: { label: 'Dibujar, pintar o modelar', ev: [ev('domain', 'artes_visuales', 0.9, 'declarada'), ev('riasec', 'A', 0.85, 'declarada', 0.6)] },
  disenar: { label: 'Diseñar cosas: logos, ropa, ambientes, objetos', ev: [ev('domain', 'diseno', 0.9, 'declarada'), ev('riasec', 'A', 0.8, 'declarada', 0.5)] },
  filmar: { label: 'Sacar fotos, filmar o editar videos', ev: [ev('domain', 'artes_visuales', 0.8, 'declarada'), ev('domain', 'comunicacion', 0.65, 'declarada', 0.5), ev('riasec', 'A', 0.75, 'declarada', 0.4)] },
  musica: { label: 'Tocar un instrumento, cantar o producir música', ev: [ev('domain', 'musica', 0.92, 'declarada'), ev('riasec', 'A', 0.8, 'declarada', 0.5)] },
  escribir: { label: 'Leer novelas, escribir textos, cuentos o poesía', ev: [ev('domain', 'lenguas', 0.85, 'declarada'), ev('riasec', 'A', 0.7, 'declarada', 0.4)] },
  idiomas: { label: 'Aprender idiomas o consumir contenido en otro idioma', ev: [ev('domain', 'lenguas', 0.75, 'declarada', 0.7), ev('aptitude', 'idiomas', 0.65, 'autoevaluacion', 0.5)] },
  debatir_historia: { label: 'Leer o discutir sobre historia, política o filosofía', ev: [ev('domain', 'humanidades', 0.85, 'declarada'), ev('riasec', 'I', 0.65, 'declarada', 0.3)] },
  aconsejar: { label: 'Escuchar y aconsejar a amigos cuando tienen problemas', ev: [ev('domain', 'sociedad', 0.75, 'declarada'), ev('riasec', 'S', 0.85, 'declarada', 0.6)] },
  explicar: { label: 'Explicarle a otros cosas que entendés', ev: [ev('domain', 'educacion', 0.85, 'declarada'), ev('riasec', 'S', 0.75, 'declarada', 0.5)] },
  deporte: { label: 'Hacer deporte o entrenar', ev: [ev('domain', 'deporte', 0.85, 'declarada'), ev('riasec', 'R', 0.6, 'declarada', 0.3)] },
  organizar: { label: 'Organizar eventos, viajes o actividades de un grupo', ev: [ev('domain', 'organizacion', 0.85, 'declarada'), ev('riasec', 'E', 0.75, 'declarada', 0.5)] },
  vender: { label: 'Vender, negociar o emprender algo propio', ev: [ev('domain', 'economia', 0.85, 'declarada'), ev('riasec', 'E', 0.85, 'declarada', 0.6)] },
  contenido: { label: 'Seguir la actualidad o crear contenido para redes', ev: [ev('domain', 'comunicacion', 0.85, 'declarada'), ev('riasec', 'E', 0.6, 'declarada', 0.3), ev('riasec', 'A', 0.6, 'declarada', 0.3)] },
  voluntariado: { label: 'Participar en voluntariados o causas sociales', ev: [ev('domain', 'sociedad', 0.85, 'declarada'), ev('riasec', 'S', 0.85, 'declarada', 0.6)] },
  salud: { label: 'Informarte sobre el cuerpo humano, la salud o las enfermedades', ev: [ev('domain', 'salud', 0.85, 'declarada'), ev('riasec', 'I', 0.6, 'declarada', 0.3)] },
  planillas: { label: 'Llevar cuentas, listas o planillas ordenadas', ev: [ev('domain', 'economia', 0.6, 'declarada', 0.4), ev('riasec', 'C', 0.85, 'declarada', 0.7)] },
  argumentar: { label: 'Discutir sobre lo que es justo y defender posiciones', ev: [ev('domain', 'derecho', 0.8, 'declarada'), ev('riasec', 'E', 0.65, 'declarada', 0.4)] },
};

const PROBLEMS: OptMap = {
  exactos: { label: 'Problemas con una respuesta exacta que se puede demostrar', ev: [ev('riasec', 'I', 0.8, 'declarada'), ev('domain', 'matematica', 0.75, 'declarada', 0.6)] },
  tecnicos: { label: 'Problemas técnicos: algo que no funciona y hay que descubrir por qué', ev: [ev('riasec', 'R', 0.8, 'declarada'), ev('riasec', 'I', 0.65, 'declarada', 0.5), ev('demand', 'depurar', 0.75, 'declarada', 0.4)] },
  personas: { label: 'Problemas de personas: conflictos o alguien que necesita ayuda', ev: [ev('riasec', 'S', 0.85, 'declarada'), ev('domain', 'sociedad', 0.75, 'declarada', 0.5)] },
  organizacion: { label: 'Problemas de organización: coordinar recursos, tiempos y personas', ev: [ev('riasec', 'E', 0.7, 'declarada'), ev('riasec', 'C', 0.65, 'declarada', 0.5), ev('domain', 'organizacion', 0.8, 'declarada', 0.6)] },
  creativos: { label: 'Problemas creativos: no hay una respuesta correcta, hay que inventar algo', ev: [ev('riasec', 'A', 0.85, 'declarada')] },
  comprension: { label: 'Entender por qué ocurre algo en la naturaleza o en la sociedad', ev: [ev('riasec', 'I', 0.85, 'declarada')] },
  argumentacion: { label: 'Problemas de argumentación: convencer o defender una postura', ev: [ev('riasec', 'E', 0.75, 'declarada'), ev('domain', 'derecho', 0.65, 'declarada', 0.4), ev('demand', 'escritura_argumentativa', 0.7, 'declarada', 0.3)] },
  precision: { label: 'Problemas de precisión: que todo cuadre y no haya errores', ev: [ev('riasec', 'C', 0.85, 'declarada'), ev('demand', 'normas_detalle', 0.7, 'declarada', 0.4)] },
};

export const SUBJECTS: Record<string, { label: string; domains: DomainKey[]; aptitudes: string[] }> = {
  matematica: { label: 'Matemática', domains: ['matematica'], aptitudes: ['cuantitativo', 'logico'] },
  fisica: { label: 'Física', domains: ['fisica'], aptitudes: ['cuantitativo', 'sistemas'] },
  quimica: { label: 'Química', domains: ['quimica_bio'], aptitudes: ['cuantitativo', 'aprendizaje'] },
  biologia: { label: 'Biología', domains: ['quimica_bio', 'salud'], aptitudes: ['aprendizaje', 'interpretacion'] },
  historia: { label: 'Historia', domains: ['humanidades'], aptitudes: ['verbal', 'interpretacion'] },
  geografia: { label: 'Geografía', domains: ['tierra_ambiente', 'sociedad'], aptitudes: ['interpretacion', 'espacial'] },
  lengua: { label: 'Lengua y Literatura', domains: ['lenguas'], aptitudes: ['verbal', 'critico'] },
  idiomas: { label: 'Inglés u otros idiomas', domains: ['lenguas'], aptitudes: ['idiomas'] },
  plastica: { label: 'Plástica / Artes visuales', domains: ['artes_visuales', 'diseno'], aptitudes: ['creatividad', 'espacial'] },
  musica: { label: 'Música', domains: ['musica'], aptitudes: ['auditivo'] },
  edfisica: { label: 'Educación Física', domains: ['deporte'], aptitudes: ['fisico'] },
  economia: { label: 'Economía / Contabilidad / Gestión', domains: ['economia', 'organizacion'], aptitudes: ['cuantitativo', 'planificacion'] },
  informatica: { label: 'Informática / Tecnología', domains: ['tecnologia'], aptitudes: ['logico', 'sistemas'] },
  filosofia: { label: 'Filosofía / Psicología', domains: ['humanidades', 'sociedad'], aptitudes: ['critico', 'verbal'] },
  ciudadania: { label: 'Construcción de Ciudadanía / Política / Derecho', domains: ['derecho', 'sociedad'], aptitudes: ['critico', 'verbal'] },
  taller: { label: 'Taller / materias técnicas', domains: ['ingenieria'], aptitudes: ['manual', 'espacial'] },
};

const TEDIOUS: OptMap = {
  pantalla: { label: 'Pasar muchas horas seguidas frente a una computadora', ev: [ev('demand', 'programacion_larga', 0.15, 'declarada', 0.8)] },
  memorizar: { label: 'Memorizar mucha información', ev: [ev('demand', 'memoria_volumen', 0.15, 'declarada', 0.8)] },
  rehacer: { label: 'Rehacer un trabajo muchas veces hasta que quede perfecto', ev: [ev('demand', 'critica_iterativa', 0.2, 'declarada', 0.8), ev('demand', 'practica_instrumental', 0.3, 'declarada', 0.4)] },
  publico: { label: 'Hablar en público o exponer', ev: [ev('demand', 'exposicion_publica', 0.15, 'declarada', 0.8), ev('demand', 'frente_aula', 0.3, 'declarada', 0.5)] },
  cuentas: { label: 'Hacer cuentas y trabajar con números', ev: [ev('demand', 'numeros_contables', 0.15, 'declarada', 0.7), ev('domain', 'matematica', 0.25, 'declarada', 0.5), ev('demand', 'calculo_intensivo', 0.25, 'declarada', 0.5)] },
  leer_largo: { label: 'Leer textos largos y densos', ev: [ev('demand', 'lectura_teorica', 0.15, 'declarada', 0.8)] },
  escribir: { label: 'Escribir informes, ensayos o monografías', ev: [ev('demand', 'escritura_argumentativa', 0.15, 'declarada', 0.8)] },
  quieto: { label: 'Estar quieto/a muchas horas en el mismo lugar', ev: [ev('style', 'exterior', 0.8, 'declarada', 0.6), ev('style', 'variedad', 0.75, 'declarada', 0.4)] },
  incomodo: { label: 'Estar al aire libre en condiciones incómodas (calor, frío, barro)', ev: [ev('demand', 'campo', 0.15, 'declarada', 0.8), ev('demand', 'trabajo_rural', 0.25, 'declarada', 0.5)] },
  personas_mal: { label: 'Tratar con personas que están mal, angustiadas o enojadas', ev: [ev('demand', 'vulnerabilidad', 0.15, 'declarada', 0.7), ev('demand', 'atencion_publico', 0.3, 'declarada', 0.4), ev('demand', 'escucha_prolongada', 0.3, 'declarada', 0.4)] },
  reglas: { label: 'Seguir reglas y procedimientos estrictos', ev: [ev('style', 'estructura', 0.2, 'declarada', 0.7), ev('demand', 'normas_detalle', 0.25, 'declarada', 0.5)] },
  minucioso: { label: 'Tareas manuales minuciosas y de precisión', ev: [ev('demand', 'precision_manual', 0.15, 'declarada', 0.8)] },
  sangre: { label: 'Ver sangre, heridas o procedimientos médicos', ev: [ev('demand', 'contacto_clinico', 0.08, 'declarada', 0.9)] },
  conflictos: { label: 'Discusiones, conflictos y negociaciones tensas', ev: [ev('demand', 'conflicto', 0.12, 'declarada', 0.8)] },
  repetir: { label: 'Practicar lo mismo una y otra vez', ev: [ev('demand', 'practica_instrumental', 0.15, 'declarada', 0.7), ev('style', 'variedad', 0.75, 'declarada', 0.3)] },
};

const EXPECT: OptMap = {
  ingresos: { label: 'Ganar bien', ev: [ev('value', 'ingresos', 0.85, 'declarada', 0.8)] },
  estabilidad: { label: 'Tener estabilidad y seguridad laboral', ev: [ev('value', 'estabilidad', 0.85, 'declarada', 0.8)] },
  libertad: { label: 'Libertad para organizar mi tiempo', ev: [ev('value', 'flexibilidad', 0.85, 'declarada', 0.6), ev('value', 'autonomia_v', 0.8, 'declarada', 0.5)] },
  crear: { label: 'Crear cosas propias', ev: [ev('value', 'creatividad_v', 0.85, 'declarada', 0.8)] },
  ayudar: { label: 'Ayudar a otros o mejorar la sociedad', ev: [ev('value', 'impacto', 0.85, 'declarada', 0.8)] },
  desafio: { label: 'Seguir aprendiendo y tener desafíos intelectuales', ev: [ev('value', 'desafio', 0.85, 'declarada', 0.8)] },
  reconocimiento: { label: 'Reconocimiento o prestigio', ev: [ev('value', 'reconocimiento', 0.85, 'declarada', 0.8)] },
  viajar: { label: 'Viajar o poder trabajar en otros países', ev: [ev('value', 'movilidad', 0.85, 'declarada', 0.8)] },
  remoto: { label: 'Poder trabajar desde casa', ev: [ev('value', 'remoto', 0.85, 'declarada', 0.8)] },
  emprender: { label: 'Tener mi propio emprendimiento', ev: [ev('value', 'emprender', 0.85, 'declarada', 0.8)] },
  vida: { label: 'Tiempo para mi vida personal', ev: [ev('value', 'equilibrio', 0.85, 'declarada', 0.8)] },
  variedad: { label: 'Variedad: que no sea siempre lo mismo', ev: [ev('value', 'variedad_v', 0.85, 'declarada', 0.8)] },
};

const CONSTRAINTS: Record<string, string> = {
  trabaja: 'Necesito trabajar mientras estudio',
  no_laplata: 'No puedo vivir en La Plata ni viajar con frecuencia',
  presupuesto: 'Tengo un presupuesto ajustado para materiales o instrumental',
  corta: 'Prefiero una carrera corta (hasta 3 años)',
  nodocente: 'Soy trabajador/a nodocente de la UNLP',
  titulo_previo: 'Tengo un título terciario o universitario previo',
  musica_previa: 'Tengo formación musical previa (instrumento, lectura musical)',
  limit_fisico: 'Tengo una condición de salud que limita el esfuerzo físico',
};

function optsFrom(map: OptMap | Record<string, string>, extra: Option[] = []): Option[] {
  return [
    ...Object.entries(map).map(([id, v]) => ({ id, label: typeof v === 'string' ? v : v.label })),
    ...extra,
  ];
}

function multiEvidence(map: OptMap, answer: unknown): EvidenceDraft[] {
  return asArray(answer).flatMap((id) => map[id]?.ev ?? []);
}

export const STAGE1: Question[] = [
  {
    id: 'q1_situacion', stage: 1, type: 'single',
    title: '¿Cuál es tu situación actual?',
    publicReason: 'Conocer tu punto de partida para adaptar las preguntas.',
    options: [
      { id: 'secundario', label: 'Estoy cursando el secundario' },
      { id: 'egresado', label: 'Terminé el secundario y todavía no empecé una carrera' },
      { id: 'cursando', label: 'Estoy cursando una carrera y dudo si seguirla' },
      { id: 'cambio', label: 'Empecé una carrera, la dejé o quiero cambiar' },
      { id: 'trabajo', label: 'Trabajo y quiero empezar o retomar estudios' },
      { id: 'otra', label: 'Otra situación' },
    ],
    evaluate: () => [],
  },
  {
    id: 'q1_carrera_actual', stage: 1, type: 'open', optional: true,
    title: '¿Qué carrera empezaste y qué es lo que te hace dudar?',
    help: 'Contá qué te gustó, qué no y por qué. Esto no condiciona el resultado: sirve para entender tu experiencia.',
    placeholder: 'Por ejemplo: empecé X; me gustaban las materias de… pero me desmotivaba…',
    publicReason: 'Tu experiencia previa en una carrera es evidencia valiosa sobre lo que te motiva y lo que no.',
    when: (ctx) => ['cursando', 'cambio'].includes(String(ctx.state.answers.q1_situacion?.value)),
    evaluate: (a) => textSignals(a, 'Mencionado al describir tu carrera actual o anterior'),
  },
  {
    id: 'q1_actividades', stage: 1, type: 'multi', minSelect: 1, maxSelect: 6,
    title: '¿Qué actividades hacés —o harías con gusto— en tu tiempo libre, aunque nadie te lo pida?',
    help: 'Elegí hasta 6. Pensá en lo que realmente hacés, no en lo que te parece valioso.',
    publicReason: 'Las actividades que elegís libremente suelen indicar intereses genuinos.',
    options: optsFrom(ACTIVITIES),
    evaluate: (a) => multiEvidence(ACTIVITIES, a),
  },
  {
    id: 'q1_curiosidad', stage: 1, type: 'open', optional: true,
    title: '¿Sobre qué temas buscás información por tu cuenta, sin que nadie te lo pida?',
    help: 'Contá uno o dos ejemplos concretos y qué es lo que te atrapa de ellos.',
    placeholder: 'Por ejemplo: miro videos sobre cómo se construyen los rascacielos porque me intriga cómo calculan…',
    publicReason: 'La curiosidad espontánea es una de las señales más confiables de interés.',
    evaluate: (a) => textSignals(a, 'Mencionado como tema de curiosidad espontánea'),
  },
  {
    id: 'q1_problemas', stage: 1, type: 'multi', minSelect: 1, maxSelect: 3,
    title: '¿Qué tipo de problemas te gusta resolver?',
    help: 'Elegí hasta 3.',
    publicReason: 'El tipo de problema que te atrae dice más que el tema en sí.',
    options: optsFrom(PROBLEMS),
    evaluate: (a) => multiEvidence(PROBLEMS, a),
  },
  {
    id: 'q1_materias', stage: 1, type: 'multi', minSelect: 1, maxSelect: 4,
    title: '¿Qué materias del secundario te resultaron más interesantes?',
    help: 'Elegí hasta 4. Después te voy a preguntar qué era exactamente lo que te gustaba de cada una.',
    publicReason: 'Una materia favorita no indica por sí sola una carrera; por eso después vamos a profundizar en el porqué.',
    options: Object.entries(SUBJECTS).map(([id, s]) => ({ id, label: s.label })),
    // Peso bajo a propósito: la preferencia por una materia puede deberse al docente, a la facilidad, etc.
    evaluate: (a) => asArray(a).flatMap((id) => (SUBJECTS[id]?.domains ?? []).map((d) => ev('domain', d, 0.7, 'declarada', 0.3, `Materia preferida: ${SUBJECTS[id].label}`))),
  },
  {
    id: 'q1_materias_dificiles', stage: 1, type: 'multi', minSelect: 0, maxSelect: 4, optional: true,
    title: '¿Qué materias te costaron más o te aburrieron?',
    help: 'Elegí hasta 4. Después vamos a distinguir si fue falta de interés, de base o algo del contexto.',
    publicReason: 'Una dificultad pasada puede deberse a muchas causas; conviene distinguirlas antes de sacar conclusiones.',
    options: Object.entries(SUBJECTS).map(([id, s]) => ({ id, label: s.label })),
    evaluate: () => [],
  },
  {
    id: 'q1_tedioso', stage: 1, type: 'multi', minSelect: 0, maxSelect: 5,
    title: '¿Cuáles de estas actividades te resultan tediosas o frustrantes?',
    help: 'Elegí hasta 5. No hay respuestas mejores ni peores: todas las profesiones tienen tareas así.',
    publicReason: 'Lo que te desgasta es tan importante como lo que te atrae.',
    options: optsFrom(TEDIOUS, [{ id: 'ninguna', label: 'Ninguna me resulta especialmente tediosa', special: 'ninguna' }]),
    evaluate: (a) => multiEvidence(TEDIOUS, a),
  },
  {
    id: 'q1_espera', stage: 1, type: 'multi', minSelect: 1, maxSelect: 4,
    title: '¿Qué esperás obtener de tu futura profesión?',
    help: 'Elegí hasta 4. Más adelante vas a tener que priorizar entre ellas.',
    publicReason: 'Tus expectativas orientan la dimensión de futuro profesional.',
    options: optsFrom(EXPECT),
    evaluate: (a) => multiEvidence(EXPECT, a),
  },
  {
    id: 'q1_capaz', stage: 1, type: 'open', optional: true,
    title: 'Contá una experiencia en la que te sentiste capaz, motivado/a o satisfecho/a.',
    help: 'Puede ser de la escuela, un trabajo, un hobby, un deporte o un proyecto. ¿Qué hacías exactamente?',
    placeholder: 'Por ejemplo: organicé con dos compañeros una feria de ciencias; yo me encargué de…',
    publicReason: 'Las experiencias concretas permiten distinguir confianza personal de capacidad demostrada.',
    evaluate: (a) => textSignals(a, 'Mencionado en una experiencia de satisfacción'),
  },
  {
    id: 'q1_limitaciones', stage: 1, type: 'multi', minSelect: 0, maxSelect: 8,
    title: '¿Qué condiciones prácticas debería tener en cuenta?',
    help: 'Estas condiciones NO cambian tu afinidad con una carrera: se analizan por separado, como viabilidad práctica.',
    publicReason: 'Separar la afinidad vocacional de las restricciones prácticas.',
    options: optsFrom(CONSTRAINTS, [{ id: 'ninguna', label: 'Ninguna de estas', special: 'ninguna' }]),
    evaluate: (a) => asArray(a).filter((x) => x in CONSTRAINTS).map((k) => ev('constraint', k, 1, 'externo')),
  },
  {
    id: 'q1_anios', stage: 1, type: 'single',
    title: '¿Cuántos años estarías dispuesto/a a dedicarle a la carrera de grado?',
    publicReason: 'La duración es un factor práctico que se informa por separado de la afinidad.',
    options: [
      { id: '3', label: 'Hasta 3 años' },
      { id: '5', label: 'Hasta 5 años' },
      { id: '6', label: 'Hasta 6 años' },
      { id: '9', label: 'Más de 6 si vale la pena' },
      { id: 'ns', label: 'No lo sé', special: 'no_se' },
    ],
    evaluate: (a) => (a && a !== 'ns' ? [ev('constraint', `anios_${a}`, 1, 'externo')] : []),
  },
];

// ===========================================================================
// ETAPA 2 — Intereses
// ===========================================================================

export const RIASEC_ITEMS: Record<string, { label: string; type: RiasecKey }> = {
  r1: { label: 'Reparar un electrodoméstico o una bicicleta', type: 'R' },
  r2: { label: 'Construir algo con herramientas (un mueble, una maqueta)', type: 'R' },
  r3: { label: 'Trabajar al aire libre con plantas, animales o el terreno', type: 'R' },
  r4: { label: 'Manejar equipos o instrumentos técnicos', type: 'R' },
  r5: { label: 'Armar y ajustar un circuito o un mecanismo', type: 'R' },
  i1: { label: 'Investigar por qué ocurre un fenómeno natural', type: 'I' },
  i2: { label: 'Analizar datos para descubrir un patrón', type: 'I' },
  i3: { label: 'Leer en profundidad un artículo de ciencia', type: 'I' },
  i4: { label: 'Resolver un problema complejo que nadie de tu grupo pudo resolver', type: 'I' },
  i5: { label: 'Diseñar un experimento para comprobar una idea', type: 'I' },
  a1: { label: 'Crear una pieza propia: visual, sonora o escrita', type: 'A' },
  a2: { label: 'Inventar una historia, un personaje o un mundo', type: 'A' },
  a3: { label: 'Interpretar música, actuar o bailar frente a otros', type: 'A' },
  a4: { label: 'Definir la estética de un espacio, un objeto o una publicación', type: 'A' },
  a5: { label: 'Explorar ideas sin reglas fijas para ver qué sale', type: 'A' },
  s1: { label: 'Explicarle un tema difícil a alguien hasta que lo entienda', type: 'S' },
  s2: { label: 'Acompañar a una persona que está pasando un mal momento', type: 'S' },
  s3: { label: 'Coordinar actividades para un grupo de chicos o adolescentes', type: 'S' },
  s4: { label: 'Participar en un proyecto solidario o comunitario', type: 'S' },
  s5: { label: 'Escuchar a alguien y ayudarlo a tomar una decisión', type: 'S' },
  e1: { label: 'Convencer a un grupo de que apoye una idea', type: 'E' },
  e2: { label: 'Liderar un equipo para cumplir un objetivo', type: 'E' },
  e3: { label: 'Iniciar un emprendimiento propio', type: 'E' },
  e4: { label: 'Negociar un acuerdo o un precio', type: 'E' },
  e5: { label: 'Tomar decisiones rápidas cuando hay mucho en juego', type: 'E' },
  c1: { label: 'Ordenar información en planillas o bases de datos', type: 'C' },
  c2: { label: 'Revisar un documento para encontrar errores', type: 'C' },
  c3: { label: 'Llevar el control de un presupuesto o un inventario', type: 'C' },
  c4: { label: 'Seguir un procedimiento paso a paso con precisión', type: 'C' },
  c5: { label: 'Organizar archivos, fechas y trámites', type: 'C' },
};

/** Bloques de 6 ítems (uno por tipo), en orden mezclado para evitar patrones de respuesta. */
export const RIASEC_BLOCKS: string[][] = [
  ['i1', 'a1', 'r1', 'e1', 's1', 'c1'],
  ['s2', 'c2', 'i2', 'r2', 'a2', 'e2'],
  ['e3', 'r3', 's3', 'c3', 'i3', 'a3'],
  ['a4', 'i4', 'c4', 's4', 'e4', 'r4'],
  ['c5', 'e5', 'a5', 'r5', 's5', 'i5'],
];

export function riasecBlockQuestion(i: number): Question {
  const items = RIASEC_BLOCKS[i];
  return {
    id: `q2_riasec_${i + 1}`, stage: 2, type: 'matrix',
    title: '¿Cuánto te gustaría hacer cada una de estas actividades?',
    help: 'Respondé por el gusto de hacerlas, sin pensar si sabrías hacerlas bien, cuánto se gana o qué carrera estudiarías.',
    publicReason: i < 2 ? 'Explorar tus intereses por tipos de actividad (modelo RIASEC de Holland).' : 'Tus respuestas anteriores dejaron tipos de interés muy parejos o con señales mezcladas; este bloque ayuda a precisarlos.',
    rows: items.map((id) => ({ id, label: RIASEC_ITEMS[id].label })),
    scale: INTEREST_SCALE,
    evaluate: (a) => matrixEvidence(a, INTEREST_SCALE, Object.fromEntries(items.map((id) => [id, [{ kind: 'riasec' as const, key: RIASEC_ITEMS[id].type }]])), 'declarada'),
  };
}

export const DOMAIN_ACTIVITY: Record<DomainKey, string> = {
  tecnologia: 'Aprender cómo funciona por dentro una aplicación o un programa',
  matematica: 'Resolver problemas con números, fórmulas o datos',
  fisica: 'Entender fenómenos físicos: el movimiento, la luz, la energía, el universo',
  quimica_bio: 'Experimentar con sustancias o estudiar cómo funcionan los seres vivos',
  tierra_ambiente: 'Estudiar o cuidar el ambiente, el suelo, las plantas o los paisajes',
  ingenieria: 'Pensar cómo se construyen máquinas, estructuras o instalaciones',
  economia: 'Entender cómo funcionan los negocios, el dinero y los mercados',
  derecho: 'Analizar leyes, derechos y cómo se resuelven los conflictos',
  diseno: 'Diseñar objetos, espacios o piezas gráficas que otros van a usar',
  artes_visuales: 'Crear o analizar imágenes, fotografía, cine o artes plásticas',
  musica: 'Hacer, estudiar o analizar música',
  comunicacion: 'Producir contenidos o informar a otros a través de medios',
  lenguas: 'Leer, escribir y trabajar con el lenguaje y los idiomas',
  humanidades: 'Reflexionar sobre la historia, las ideas y la cultura',
  sociedad: 'Entender por qué las personas y los grupos actúan como actúan',
  educacion: 'Enseñar y pensar cómo aprenden las personas',
  salud: 'Cuidar la salud de las personas y entender el cuerpo humano',
  animales: 'Trabajar con animales, su salud o su crianza',
  deporte: 'Entrenar, practicar o enseñar actividad física',
  organizacion: 'Organizar, planificar y tomar decisiones que guían a un grupo',
};

export const DOMAIN_BLOCKS: DomainKey[][] = [
  ['tecnologia', 'artes_visuales', 'sociedad', 'economia', 'tierra_ambiente'],
  ['matematica', 'musica', 'salud', 'derecho', 'ingenieria'],
  ['fisica', 'lenguas', 'educacion', 'diseno', 'animales'],
  ['quimica_bio', 'comunicacion', 'humanidades', 'deporte', 'organizacion'],
];

export function domainBlockQuestion(i: number): Question {
  const doms = DOMAIN_BLOCKS[i];
  return {
    id: `q2_dom_${i + 1}`, stage: 2, type: 'matrix',
    title: '¿Cuánto te interesaría dedicar buena parte de tu tiempo a esto?',
    help: 'Pensá en hacerlo de verdad, varias horas por semana, no solo en lo atractivo de la idea.',
    publicReason: 'Explorar tu interés por grandes áreas de conocimiento y trabajo.',
    rows: doms.map((d) => ({ id: d, label: DOMAIN_ACTIVITY[d] })),
    scale: INTEREST_SCALE,
    evaluate: (a) => matrixEvidence(a, INTEREST_SCALE, Object.fromEntries(doms.map((d) => [d, [{ kind: 'domain' as const, key: d }]])), 'declarada'),
  };
}

export const STAGE2_STATIC: Question[] = [
  {
    id: 'q2_combinacion', stage: 2, type: 'open', optional: true,
    title: '¿Hay alguna combinación de temas que te atraiga especialmente?',
    help: 'Por ejemplo: tecnología y música, biología y dibujo, deporte y salud. Las combinaciones poco habituales también cuentan.',
    publicReason: 'Muchas personas no encajan en una sola categoría; las combinaciones ayudan a encontrar caminos intermedios.',
    evaluate: (a) => textSignals(a, 'Mencionado como combinación de intereses'),
  },
];

// ===========================================================================
// ETAPA 3 — Autoevaluación (los ejercicios están en exercises.ts)
// ===========================================================================

const SELF_ROWS_A: [string, string][] = [
  ['logico', 'Razonar lógicamente y detectar si una conclusión se sigue o no'],
  ['cuantitativo', 'Trabajar con números, proporciones y porcentajes'],
  ['verbal', 'Comprender textos y expresar ideas con claridad'],
  ['espacial', 'Imaginar objetos en 3D, girarlos mentalmente, leer planos o mapas'],
  ['creatividad', 'Generar ideas originales y alternativas'],
  ['planificacion', 'Planificar y organizar tiempos y tareas'],
  ['sistemas', 'Entender cómo se relacionan las partes de un sistema'],
  ['aprendizaje', 'Aprender cosas nuevas rápido y aplicarlas en otro contexto'],
];
const SELF_ROWS_B: [string, string][] = [
  ['interpersonal', 'Entender a otras personas y vincularme con ellas'],
  ['manual', 'Hacer trabajos manuales precisos (dibujo detallado, armado, costura, soldadura…)'],
  ['auditivo', 'Distinguir sonidos, afinación y ritmo'],
  ['fisico', 'Rendimiento físico y coordinación'],
  ['idiomas', 'Aprender y usar otros idiomas'],
  ['critico', 'Detectar errores o supuestos en un argumento'],
  ['interpretacion', 'Interpretar gráficos, tablas e información compleja'],
];

function selfQuestion(id: string, rows: [string, string][]): Question {
  return {
    id, stage: 3, type: 'matrix',
    title: 'Comparándote con personas de tu edad, ¿cómo te va en…?',
    help: 'Esta es tu percepción, no una medición: más adelante la vamos a contrastar con ejercicios y experiencias concretas. Si nunca tuviste ocasión de comprobarlo, elegí esa opción: no se considera una debilidad.',
    publicReason: 'Registrar tu autopercepción para compararla luego con evidencia observada.',
    rows: rows.map(([k, label]) => ({ id: k, label })),
    scale: SELF_SCALE,
    evaluate: (a) => {
      const out = matrixEvidence(a, SELF_SCALE, Object.fromEntries(rows.map(([k]) => [k, [{ kind: 'aptitude' as const, key: k }]])), 'autoevaluacion');
      return out;
    },
  };
}

export const STAGE3_SELF: Question[] = [selfQuestion('q3_auto_a', SELF_ROWS_A), selfQuestion('q3_auto_b', SELF_ROWS_B)];

// ===========================================================================
// ETAPA 4 — Estilo de trabajo
// ===========================================================================

const STYLE_ITEMS: { id: string; axis: StyleKey; title: string; left: string; right: string; invert?: boolean }[] = [
  { id: 'q4_autonomia', axis: 'autonomia', title: 'En un trabajo nuevo, ¿qué preferís?', left: 'Que me indiquen con claridad qué hacer y me acompañen', right: 'Que me den un objetivo y decidir yo cómo alcanzarlo' },
  { id: 'q4_colaboracion', axis: 'colaboracion', title: 'Para un proyecto importante, preferirías…', left: 'Trabajar solo/a, a mi ritmo', right: 'Trabajar en equipo, intercambiando todo el tiempo' },
  { id: 'q4_estructura', axis: 'estructura', title: 'Ante una tarea nueva, te sentís mejor cuando…', left: 'Tengo libertad total para encararla a mi manera', right: 'Hay pasos, criterios y procedimientos claros' },
  { id: 'q4_variedad', axis: 'variedad', title: '¿Cómo preferís que sean tus días de trabajo?', left: 'Previsibles: hacer bien algo que ya domino', right: 'Distintos cada día, aunque sean imprevisibles' },
  { id: 'q4_practica', axis: 'practica', title: 'Al aprender algo, ¿qué te atrae más?', left: 'Comprender la teoría y los porqués', right: 'Aplicarlo a problemas concretos' },
  { id: 'q4_ejecucion', axis: 'ejecucion', title: 'En un proyecto, ¿qué etapa disfrutás más?', left: 'Investigar y entender el problema a fondo', right: 'Producir y ver el resultado terminado' },
  { id: 'q4_incertidumbre', axis: 'incertidumbre', title: 'Cuando una situación no tiene una respuesta clara…', left: 'Me incomoda; prefiero certezas antes de avanzar', right: 'Me estimula; puedo avanzar igual y ajustar en el camino' },
  { id: 'q4_paciencia', axis: 'paciencia', title: '¿Qué tipo de problemas te atraen más?', left: 'Los que se resuelven en minutos u horas', right: 'Los que requieren semanas o meses de trabajo sostenido' },
  { id: 'q4_responsabilidad', axis: 'responsabilidad', title: 'Si una decisión tuya afectara mucho a otras personas (su salud, su dinero, su futuro)…', left: 'Preferiría no cargar con ese peso', right: 'Me sentiría cómodo/a asumiendo esa responsabilidad' },
  { id: 'q4_exterior', axis: 'exterior', title: '¿Dónde te imaginás trabajando la mayor parte del tiempo?', left: 'En un escritorio, laboratorio, estudio o consultorio', right: 'En movimiento, al aire libre o en distintos lugares' },
  // Ítems de consistencia (formulados de otra manera)
  { id: 'q4_colaboracion_b', axis: 'colaboracion', title: 'Pensá en tus mejores experiencias de estudio, trabajo o hobby. ¿Cómo fueron?', left: 'Momentos de concentración individual', right: 'Momentos compartidos con otros' },
  { id: 'q4_estructura_b', axis: 'estructura', title: '¿Qué te resulta más incómodo?', left: 'Que no se sepa exactamente qué se espera de mí', right: 'Tener reglas estrictas que no puedo cambiar', invert: true },
];

export const STYLE_CONSISTENCY_PAIRS: [string, string][] = [['q4_colaboracion', 'q4_colaboracion_b'], ['q4_estructura', 'q4_estructura_b']];

function styleQuestion(it: (typeof STYLE_ITEMS)[number]): Question {
  const scale = bipolarScale(it.left, it.right);
  return {
    id: it.id, stage: 4, type: 'scale',
    title: it.title,
    help: 'Pensá en lo que te sale naturalmente, no en lo que creés que se espera.',
    publicReason: 'Identificar ambientes de trabajo que podrían favorecer tu desempeño y satisfacción.',
    scale,
    evaluate: (a) => {
      const v = scaleValue(scale, a);
      if (v == null) return [];
      return [ev('style', it.axis, it.invert ? 1 - v : v, 'declarada')];
    },
  };
}

export const STYLE_DEPENDS_FOLLOWUP = (id: string): Question => ({
  id: `${id}__depende`, stage: 4, type: 'open', optional: true,
  title: 'Dijiste que depende del contexto. ¿De qué depende?',
  help: 'Por ejemplo: del tipo de tarea, de las personas, del momento. Esto ayuda a no forzarte en una etiqueta.',
  publicReason: 'Las preferencias contextuales son información valiosa: evitan etiquetas rígidas.',
  evaluate: () => [],
});

const WORKWITH_ROWS: [StyleKey, string][] = [
  ['personas', 'Personas: atender, enseñar, acompañar, coordinar'],
  ['datos', 'Datos e información: números, registros, análisis'],
  ['cosas', 'Objetos: herramientas, materiales, máquinas, instrumentos'],
  ['ideas', 'Ideas: conceptos, teorías, creaciones'],
];

const MODES: OptMap = {
  crear: { label: 'Crear', ev: [ev('riasec', 'A', 0.85, 'declarada', 0.8)] },
  analizar: { label: 'Analizar', ev: [ev('riasec', 'I', 0.85, 'declarada', 0.8)] },
  investigar: { label: 'Investigar', ev: [ev('riasec', 'I', 0.85, 'declarada', 0.6), ev('style', 'ejecucion', 0.3, 'declarada', 0.4)] },
  organizar: { label: 'Organizar', ev: [ev('riasec', 'C', 0.85, 'declarada', 0.8)] },
  comunicar: { label: 'Comunicar', ev: [ev('riasec', 'S', 0.7, 'declarada', 0.5), ev('riasec', 'E', 0.7, 'declarada', 0.4), ev('domain', 'comunicacion', 0.7, 'declarada', 0.4)] },
  coordinar: { label: 'Coordinar o liderar', ev: [ev('riasec', 'E', 0.85, 'declarada', 0.8)] },
  cuidar: { label: 'Cuidar o acompañar', ev: [ev('riasec', 'S', 0.85, 'declarada', 0.8)] },
  ensenar: { label: 'Enseñar', ev: [ev('riasec', 'S', 0.8, 'declarada', 0.6), ev('domain', 'educacion', 0.8, 'declarada', 0.5)] },
  construir: { label: 'Construir o reparar', ev: [ev('riasec', 'R', 0.85, 'declarada', 0.8)] },
};

export const STAGE4: Question[] = [
  ...STYLE_ITEMS.map(styleQuestion),
  {
    id: 'q4_trabajacon', stage: 4, type: 'matrix',
    title: '¿Cuánto te gustaría que tu trabajo diario involucre…?',
    publicReason: 'Explorar si preferís trabajar con personas, datos, objetos o ideas.',
    rows: WORKWITH_ROWS.map(([k, label]) => ({ id: k, label })),
    scale: INTEREST_SCALE,
    evaluate: (a) => matrixEvidence(a, INTEREST_SCALE, Object.fromEntries(WORKWITH_ROWS.map(([k]) => [k, [{ kind: 'style' as const, key: k }]])), 'declarada'),
  },
  {
    id: 'q4_modos', stage: 4, type: 'multi', minSelect: 1, maxSelect: 2,
    title: '¿Qué verbos describen mejor lo que te gustaría hacer la mayor parte del tiempo?',
    help: 'Elegí 1 o 2.',
    publicReason: 'Identificar tu modo preferido de trabajo: crear, analizar, organizar, comunicar, coordinar…',
    options: optsFrom(MODES),
    evaluate: (a) => multiEvidence(MODES, a),
  },
];

// ===========================================================================
// ETAPA 5 — Motivaciones y valores
// ===========================================================================

const VALUE_ROWS_A: ValueKey[] = ['ingresos', 'estabilidad', 'autonomia_v', 'emprender', 'creatividad_v', 'crecimiento', 'reconocimiento', 'impacto'];
const VALUE_ROWS_B: ValueKey[] = ['desafio', 'flexibilidad', 'remoto', 'movilidad', 'equilibrio', 'especializacion', 'variedad_v'];

function valuesMatrix(id: string, rows: ValueKey[]): Question {
  return {
    id, stage: 5, type: 'matrix',
    title: '¿Qué importancia tiene cada aspecto para tu futuro trabajo?',
    help: 'Después vas a tener que elegir entre ellos, porque ninguna profesión maximiza todo a la vez.',
    publicReason: 'Registrar tus prioridades declaradas antes de contrastarlas con elecciones forzadas.',
    rows: rows.map((k) => ({ id: k, label: VALUES[k] })),
    scale: IMPORTANCE_SCALE,
    evaluate: (a) => matrixEvidence(a, IMPORTANCE_SCALE, Object.fromEntries(rows.map((k) => [k, [{ kind: 'value' as const, key: k }]])), 'declarada'),
  };
}

function dilemma(id: string, title: string, left: string, right: string, map: Record<string, [number, number, number]>, publicReason: string): Question {
  const scale = bipolarScale(left, right);
  return {
    id, stage: 5, type: 'scale', title, scale, publicReason,
    help: 'No hay respuesta correcta. Elegí lo que harías realmente.',
    evaluate: (a) => {
      const m = map[String(a)];
      if (!m) return [];
      return [ev('weight', 'A', m[0], 'escenario', 0.7), ev('weight', 'B', m[1], 'escenario', 0.7), ev('weight', 'C', m[2], 'escenario', 0.7)];
    },
  };
}

export const STAGE5_STATIC: Question[] = [
  valuesMatrix('q5_valores_a', VALUE_ROWS_A),
  valuesMatrix('q5_valores_b', VALUE_ROWS_B),
  dilemma('q5_pasion', 'Imaginá dos caminos. ¿Cuál elegirías?',
    'Una carrera que me apasiona, con salida laboral incierta e ingresos modestos',
    'Una carrera que me interesa moderadamente, con muy buena salida laboral e ingresos altos',
    { L2: [0.3, 0.47, 0.23], L1: [0.32, 0.4, 0.28], R1: [0.32, 0.3, 0.38], R2: [0.3, 0.25, 0.45] },
    'Ver cómo equilibrás intereses y futuro profesional cuando no se pueden maximizar ambos.'),
  dilemma('q5_facil', 'Y entre estos dos, ¿cuál elegirías?',
    'Algo que me sale muy fácil, pero que no me entusiasma',
    'Algo que me entusiasma, pero que me va a costar bastante',
    { L2: [0.47, 0.25, 0.28], L1: [0.4, 0.3, 0.3], R1: [0.3, 0.4, 0.3], R2: [0.25, 0.47, 0.28] },
    'Ver cómo equilibrás aptitudes e intereses.'),
  {
    id: 'q5_pesos', stage: 5, type: 'allocate', optional: true,
    title: 'Si tuvieras que repartir 100 puntos según cuánto pesa cada aspecto en tu decisión, ¿cómo los repartirías?',
    help: 'Por defecto el análisis usa un equilibrio (33 / 33 / 34). Solo cambialo si realmente sentís que un aspecto pesa más. Ninguna dimensión podrá pesar menos del 20 % ni más del 50 %.',
    publicReason: 'Permitirte ajustar el peso de cada dimensión solo si tenés una prioridad explícita.',
    allocate: [
      { key: 'A', label: 'Aptitudes', hint: 'Lo que me sale bien o podría aprender con facilidad' },
      { key: 'B', label: 'Intereses', hint: 'Lo que disfrutaría hacer día a día' },
      { key: 'C', label: 'Futuro profesional', hint: 'Salida laboral, ingresos y condiciones de vida' },
    ],
    evaluate: (a) => {
      const r = asRecord(a);
      const vals = ['A', 'B', 'C'].map((k) => Number(r[k] ?? 0));
      const sum = vals.reduce((s, x) => s + x, 0);
      if (!sum || r.equilibrio === true) return [];
      return ['A', 'B', 'C'].map((k, i) => ev('weight', k, vals[i] / sum, 'declarada', 1.5, 'Reparto explícito de puntos'));
    },
  },
];

// ===========================================================================
// ETAPA 6 — Experiencias y evidencia (estáticas; las dinámicas están en generators.ts)
// ===========================================================================

export const EVIDENCE_CHECKS: Option[] = [
  { id: 'resultado', label: 'Obtuve un resultado concreto (algo terminado, una nota, un premio, algo que otros usaron)' },
  { id: 'reconocido', label: 'Otra persona lo reconoció o lo valoró' },
  { id: 'sostenido', label: 'Lo sostuve durante más de 3 meses' },
  { id: 'obstaculos', label: 'Fue difícil y tuve que superar obstáculos' },
  { id: 'iniciativa', label: 'Lo hice por iniciativa propia' },
];

export function evidenceStrength(answer: unknown): { value: number; weight: number; words: number; checks: string[] } {
  const r = asRecord(answer);
  const words = wordCount(r.text);
  const checks = asArray(r.checks);
  const value = Math.min(0.95, 0.55 + 0.07 * checks.length + (words >= 80 ? 0.1 : words >= 40 ? 0.05 : 0));
  const weight = words < 8 ? 0 : 0.4 + 0.15 * checks.length + (words >= 40 ? 0.2 : 0);
  return { value, weight, words, checks };
}

export const STAGE6_STATIC: Question[] = [
  {
    id: 'q6_sostenido', stage: 6, type: 'evidence', optional: true,
    title: '¿Hay alguna actividad que hayas mantenido por iniciativa propia durante más de seis meses?',
    help: 'Describí qué hacías, con qué frecuencia y por qué la sostuviste. Después marcá a qué áreas se relaciona.',
    placeholder: 'Por ejemplo: durante un año edité videos para un canal de un amigo, dos o tres veces por semana…',
    publicReason: 'El interés sostenido en el tiempo es mejor evidencia que el entusiasmo inicial.',
    checks: EVIDENCE_CHECKS,
    options: (Object.keys(DOMAIN_ACTIVITY) as DomainKey[]).map((d) => ({ id: d, label: DOMAIN_ACTIVITY[d] })),
    evaluate: (a) => {
      const s = evidenceStrength(a);
      const doms = asArray(asRecord(a).domains);
      if (!s.weight) return [];
      return [
        ...doms.map((d) => ev('domain', d, Math.max(0.75, s.value), 'conducta', s.weight, 'Actividad sostenida por iniciativa propia')),
        ...textSignals(asRecord(a).text, 'Mencionado al describir una actividad sostenida'),
      ];
    },
  },
  {
    id: 'q6_aprendizaje', stage: 6, type: 'evidence', optional: true,
    title: 'Contá algo que hayas aprendido rápido por tu cuenta y luego aplicado en otra situación.',
    help: 'Puede ser una herramienta, un juego, un idioma, una técnica. ¿Cómo lo aprendiste? ¿Dónde lo aplicaste?',
    placeholder: 'Por ejemplo: aprendí a usar planillas con tutoriales y después armé el control de gastos de mi casa…',
    publicReason: 'La facilidad para aprender y transferir es clave para estimar tu potencial, más allá de tus conocimientos actuales.',
    checks: EVIDENCE_CHECKS,
    evaluate: (a) => {
      const s = evidenceStrength(a);
      if (!s.weight) return [];
      return [ev('aptitude', 'aprendizaje', s.value, 'experiencia', s.weight, 'Aprendizaje autónomo descrito con detalle'), ...textSignals(asRecord(a).text, 'Mencionado al describir un aprendizaje')];
    },
  },
  {
    id: 'q6_capaz_detalle', stage: 6, type: 'multi', minSelect: 1, maxSelect: 3,
    title: 'Volviendo a la experiencia que contaste al principio: ¿qué parte disfrutaste más?',
    help: 'Elegí hasta 3.',
    publicReason: 'Distinguir qué aspecto concreto de una experiencia positiva te motivó.',
    when: (ctx) => typeof ctx.state.answers.q1_capaz?.value === 'string' && (ctx.state.answers.q1_capaz.value as string).trim().length > 10,
    options: [
      { id: 'tecnico', label: 'Resolver la parte técnica o difícil' },
      { id: 'coordinar', label: 'Coordinar a otras personas' },
      { id: 'crear', label: 'Crear o diseñar algo' },
      { id: 'ayudar', label: 'Ayudar a alguien' },
      { id: 'reconocimiento', label: 'El reconocimiento de otros' },
      { id: 'aprender', label: 'Aprender algo nuevo' },
      { id: 'resultado', label: 'Ver el resultado final terminado' },
      { id: 'competir', label: 'Competir o superar un desafío' },
    ],
    evaluate: (a) => {
      const map: Record<string, EvidenceDraft[]> = {
        tecnico: [ev('riasec', 'I', 0.75, 'experiencia', 0.5), ev('riasec', 'R', 0.7, 'experiencia', 0.4)],
        coordinar: [ev('riasec', 'E', 0.8, 'experiencia', 0.6), ev('domain', 'organizacion', 0.75, 'experiencia', 0.4)],
        crear: [ev('riasec', 'A', 0.8, 'experiencia', 0.6)],
        ayudar: [ev('riasec', 'S', 0.8, 'experiencia', 0.6), ev('value', 'impacto', 0.75, 'experiencia', 0.4)],
        reconocimiento: [ev('value', 'reconocimiento', 0.8, 'experiencia', 0.5)],
        aprender: [ev('value', 'desafio', 0.75, 'experiencia', 0.5)],
        resultado: [ev('style', 'ejecucion', 0.75, 'experiencia', 0.5)],
        competir: [ev('riasec', 'E', 0.7, 'experiencia', 0.4), ev('value', 'desafio', 0.7, 'experiencia', 0.3)],
      };
      return asArray(a).flatMap((id) => map[id] ?? []);
    },
  },
];

// ===========================================================================
// ETAPA 8 — Preguntas discriminantes de nivel de formación (se formulan solo si hacen falta)
// ===========================================================================

export const STAGE8_STATIC: Question[] = [
  {
    ...dilemma('q8_nivel', '¿Qué tipo de formación preferirías?',
      'Una formación corta (2-3 años) y aplicada, para trabajar pronto',
      'Una carrera larga (5 años o más) con fundamentos teóricos profundos',
      {}, 'Entre tus opciones cercanas hay formaciones cortas y largas del mismo campo; esta preferencia ayuda a distinguirlas.'),
    stage: 8,
    evaluate: (a) => {
      const v = scaleValue(bipolarScale('', ''), a);
      if (v == null) return [];
      return [
        ev('demand', 'carrera_larga', 0.1 + 0.75 * v, 'escenario', 1),
        ev('demand', 'investigacion_lenta', 0.25 + 0.5 * v, 'escenario', 0.6),
        ev('demand', 'abstraccion_formal', 0.3 + 0.45 * v, 'escenario', 0.5),
        ev('style', 'practica', 0.85 - 0.5 * v, 'escenario', 0.5),
      ];
    },
  },
  {
    id: 'q8_docencia', stage: 8, type: 'scale',
    title: 'Pensando en el campo que más te atrae: ¿te imaginás enseñándolo?',
    help: 'Entre tus opciones cercanas hay licenciaturas y profesorados del mismo campo.',
    publicReason: 'Distinguir entre un camino de ejercicio o investigación y uno de docencia en la misma disciplina.',
    scale: bipolarScale('Prefiero ejercer o investigar, no enseñar', 'Me entusiasma enseñarlo'),
    evaluate: (a) => {
      const v = scaleValue(bipolarScale('', ''), a);
      if (v == null) return [];
      return [ev('demand', 'frente_aula', v, 'escenario', 1), ev('domain', 'educacion', 0.2 + 0.7 * v, 'escenario', 0.7)];
    },
  },
];

export const STATIC_QUESTIONS: Question[] = [
  ...STAGE1, ...STAGE2_STATIC, ...STAGE3_SELF, ...STAGE4, ...STAGE5_STATIC, ...STAGE6_STATIC, ...STAGE8_STATIC,
  ...RIASEC_BLOCKS.map((_, i) => riasecBlockQuestion(i)),
  ...DOMAIN_BLOCKS.map((_, i) => domainBlockQuestion(i)),
];
