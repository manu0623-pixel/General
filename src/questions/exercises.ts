import type { AptitudeKey } from '../domain/types';
import { asRecord, ev } from './helpers';
import type { ExerciseSpec, Option, Question } from './types';

/**
 * EJERCICIOS DE APTITUD
 * Son ejercicios breves y exploratorios: NO constituyen un test de inteligencia ni una medición
 * definitiva. Cada uno tiene una respuesta correcta y un criterio explícito. Se presentan de forma
 * adaptativa (dificultad 2 → 3 si acierta, → 1 si no) y su resultado se combina con otras evidencias.
 */

type Cells = number[][];

// --- utilidades geométricas para ejercicios espaciales ---------------------
const norm = (cells: Cells): Cells => {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};
export const rot90 = (cells: Cells): Cells => norm(cells.map(([x, y]) => [-y, x]));
export const mirror = (cells: Cells): Cells => norm(cells.map(([x, y]) => [-x, y]));
const rot = (cells: Cells, n: number): Cells => { let c = norm(cells); for (let i = 0; i < n; i++) c = rot90(c); return c; };

const L4: Cells = [[0, 0], [0, 1], [0, 2], [1, 2]];
const F5: Cells = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];

interface ExerciseDef {
  id: string;
  aptitude: AptitudeKey;
  difficulty: 1 | 2 | 3;
  title: string;
  help?: string;
  options: Option[];
  correct: string;
  criterion: string;
  explanation: string;
  visual?: ExerciseSpec['visual'];
  open?: boolean;
}

const o = (...labels: [string, string][]): Option[] => labels.map(([id, label]) => ({ id, label }));

export const EXERCISES: ExerciseDef[] = [
  // ---------------- Razonamiento lógico
  { id: 'log1', aptitude: 'logico', difficulty: 1, title: 'Todas las personas del club saben nadar. Lucía no sabe nadar. ¿Qué se puede concluir con seguridad?',
    options: o(['a', 'Lucía es del club'], ['b', 'Lucía no es del club'], ['c', 'No se puede saber'], ['d', 'Algunas personas del club no saben nadar']),
    correct: 'b', criterion: 'Respuesta única correcta.', explanation: 'Si fuera del club sabría nadar; como no sabe, no puede ser del club.' },
  { id: 'log2', aptitude: 'logico', difficulty: 2, title: 'Si llueve, el partido se suspende. El partido NO se suspendió. ¿Qué es seguro?',
    options: o(['a', 'Llovió'], ['b', 'No llovió'], ['c', 'Puede haber llovido'], ['d', 'El partido se jugó en otro lugar']),
    correct: 'b', criterion: 'Respuesta única correcta (razonamiento por contraposición).', explanation: 'Si hubiera llovido, se habría suspendido. Como no se suspendió, no llovió.' },
  { id: 'log3', aptitude: 'logico', difficulty: 3, title: 'Ana, Bruno y Carla tienen una mascota cada uno: perro, gato y pez. Ana no tiene perro. Quien tiene el gato es mayor que Bruno. Carla es la menor de los tres. ¿Quién tiene el gato?',
    options: o(['a', 'Ana'], ['b', 'Bruno'], ['c', 'Carla'], ['d', 'No se puede determinar']),
    correct: 'a', criterion: 'Respuesta única correcta.', explanation: 'El gato no puede ser de Bruno (no es mayor que sí mismo) ni de Carla (es la menor, no puede ser mayor que Bruno). Entonces es de Ana.' },
  { id: 'log4', aptitude: 'logico', difficulty: 3, title: 'Cinco personas hacen una fila. Sofía está antes que Tomás pero después de Uriel. Valeria está última. Walter está entre Uriel y Sofía. ¿Quién está primero?',
    options: o(['a', 'Sofía'], ['b', 'Uriel'], ['c', 'Walter'], ['d', 'Tomás']),
    correct: 'b', criterion: 'Respuesta única correcta.', explanation: 'El orden es Uriel, Walter, Sofía, Tomás, Valeria.' },

  // ---------------- Razonamiento cuantitativo
  { id: 'cua1', aptitude: 'cuantitativo', difficulty: 1, title: 'Un libro cuesta $8.000 y tiene un 25 % de descuento. ¿Cuánto se paga?',
    options: o(['a', '$6.000'], ['b', '$6.500'], ['c', '$7.750'], ['d', '$2.000']),
    correct: 'a', criterion: 'Respuesta única correcta.', explanation: '25 % de 8.000 es 2.000; 8.000 − 2.000 = 6.000.' },
  { id: 'cua2', aptitude: 'cuantitativo', difficulty: 2, title: 'Tres personas pintan una pared en 6 horas. Trabajando al mismo ritmo, ¿cuánto tardarían dos personas?',
    options: o(['a', '4 horas'], ['b', '8 horas'], ['c', '9 horas'], ['d', '12 horas']),
    correct: 'c', criterion: 'Respuesta única correcta (proporcionalidad inversa).', explanation: 'El trabajo total es 3 × 6 = 18 horas-persona; 18 / 2 = 9 horas.' },
  { id: 'cua3', aptitude: 'cuantitativo', difficulty: 3, title: 'Un precio sube un 20 % y después baja un 20 %. Comparado con el precio original, el precio final es…',
    options: o(['a', 'Igual'], ['b', '4 % menor'], ['c', '4 % mayor'], ['d', '2 % menor']),
    correct: 'b', criterion: 'Respuesta única correcta.', explanation: '1,2 × 0,8 = 0,96: queda un 4 % por debajo.' },
  { id: 'cua4', aptitude: 'cuantitativo', difficulty: 3, title: 'En un curso, el 60 % son mujeres. Aprobó el 50 % de las mujeres y el 25 % de los varones. ¿Qué porcentaje del curso aprobó?',
    options: o(['a', '37,5 %'], ['b', '40 %'], ['c', '45 %'], ['d', '75 %']),
    correct: 'b', criterion: 'Respuesta única correcta.', explanation: '0,6 × 0,5 + 0,4 × 0,25 = 0,30 + 0,10 = 0,40.' },

  // ---------------- Pensamiento espacial
  { id: 'esp1', aptitude: 'espacial', difficulty: 1, title: '¿Cuál de las figuras es la misma que la de referencia, solo girada (sin darla vuelta como en un espejo)?',
    options: o(['a', 'Figura A'], ['b', 'Figura B'], ['c', 'Figura C'], ['d', 'Figura D']), correct: 'c',
    visual: { kind: 'grid-shapes', ref: norm(L4), options: { a: mirror(L4), b: mirror(rot(L4, 1)), c: rot(L4, 1), d: mirror(rot(L4, 2)) } },
    criterion: 'Respuesta única correcta: las demás son reflejos.', explanation: 'La figura C es la de referencia girada 90°; las otras requieren darla vuelta.' },
  { id: 'esp2', aptitude: 'espacial', difficulty: 2, title: '¿Cuál de las figuras es la misma que la de referencia, solo girada (sin espejarla)?',
    options: o(['a', 'Figura A'], ['b', 'Figura B'], ['c', 'Figura C'], ['d', 'Figura D']), correct: 'd',
    visual: { kind: 'grid-shapes', ref: norm(F5), options: { a: mirror(F5), b: mirror(rot(F5, 2)), c: mirror(rot(F5, 1)), d: rot(F5, 2) } },
    criterion: 'Respuesta única correcta: las demás son reflejos.', explanation: 'La figura D es la de referencia girada 180°.' },
  { id: 'esp3', aptitude: 'espacial', difficulty: 3, title: 'Este es el desarrollo plano de un cubo. Si lo armás, ¿qué cara queda opuesta a la cara A?',
    help: 'Imaginá cómo se pliegan las caras alrededor de la cara C.',
    options: o(['b', 'B'], ['d', 'D'], ['e', 'E'], ['f', 'F']), correct: 'e',
    visual: { kind: 'cube-net', cells: [[1, 0, 'A'], [0, 1, 'B'], [1, 1, 'C'], [2, 1, 'D'], [1, 2, 'E'], [1, 3, 'F']], mark: 'A' },
    criterion: 'Respuesta única correcta.', explanation: 'En la tira vertical A-C-E-F, las caras separadas por una quedan opuestas: A con E, C con F.' },

  // ---------------- Patrones
  { id: 'pat1', aptitude: 'patrones', difficulty: 1, title: '¿Qué número sigue? 2 · 4 · 8 · 16 · ?',
    options: o(['a', '24'], ['b', '30'], ['c', '32'], ['d', '64']), correct: 'c', criterion: 'Respuesta única correcta.', explanation: 'Cada número es el doble del anterior.' },
  { id: 'pat2', aptitude: 'patrones', difficulty: 2, title: '¿Qué número sigue? 3 · 5 · 9 · 17 · 33 · ?',
    options: o(['a', '49'], ['b', '57'], ['c', '65'], ['d', '66']), correct: 'c', criterion: 'Respuesta única correcta.', explanation: 'Las diferencias se duplican: +2, +4, +8, +16, +32.' },
  { id: 'pat3', aptitude: 'patrones', difficulty: 3, title: '¿Qué sigue? A1 · C3 · F6 · J10 · ?',
    options: o(['a', 'N14'], ['b', 'O15'], ['c', 'P16'], ['d', 'O14']), correct: 'b', criterion: 'Respuesta única correcta.', explanation: 'Los números suman 2, 3, 4, 5 (1, 3, 6, 10, 15) y la letra ocupa esa posición en el abecedario (O es la 15.ª).' },

  // ---------------- Verbal
  { id: 'ver1', aptitude: 'verbal', difficulty: 1, title: 'Médico es a hospital como docente es a…',
    options: o(['a', 'alumno'], ['b', 'escuela'], ['c', 'libro'], ['d', 'tiza']), correct: 'b', criterion: 'Respuesta única correcta.', explanation: 'Relación profesión–lugar de trabajo.' },
  { id: 'ver2', aptitude: 'verbal', difficulty: 2, title: '¿Qué palabra tiene el significado más cercano a "efímero"?',
    options: o(['a', 'eterno'], ['b', 'frágil'], ['c', 'pasajero'], ['d', 'delicado']), correct: 'c', criterion: 'Respuesta única correcta.', explanation: 'Efímero: que dura poco.' },
  { id: 'ver3', aptitude: 'verbal', difficulty: 3,
    title: '"Aunque la ciudad duplicó sus bicisendas en cinco años, la proporción de viajes en bicicleta apenas creció. Los especialistas señalan que las nuevas bicisendas conectan barrios entre sí, pero no con los centros de trabajo." ¿Qué afirmación se sigue mejor del texto?',
    options: o(['a', 'Las bicisendas no sirven para aumentar el uso de la bicicleta'], ['b', 'La ubicación de las bicisendas podría explicar el escaso crecimiento'], ['c', 'La gente prefiere el auto'], ['d', 'Hay que dejar de construir bicisendas']),
    correct: 'b', criterion: 'Respuesta única correcta: la única inferencia que el texto respalda.', explanation: 'El texto sugiere una causa posible (la ubicación), sin afirmar que las bicisendas no sirvan.' },

  // ---------------- Pensamiento crítico
  { id: 'cri1', aptitude: 'critico', difficulty: 1, title: '¿Cuál de estas afirmaciones es una opinión y no un hecho comprobable?',
    options: o(['a', 'El agua hierve a 100 °C a nivel del mar'], ['b', 'La Plata fue fundada en 1882'], ['c', 'El fútbol es el mejor deporte'], ['d', '2024 fue un año bisiesto']), correct: 'c', criterion: 'Respuesta única correcta.', explanation: '"Mejor" expresa una valoración personal.' },
  { id: 'cri2', aptitude: 'critico', difficulty: 2, title: 'Un estudio muestra que los estudiantes que desayunan tienen mejores notas. Alguien concluye: "desayunar mejora el rendimiento". ¿Cuál es el principal problema de ese razonamiento?',
    options: o(['a', 'El estudio es demasiado chico'], ['b', 'Otros factores (por ejemplo, hábitos familiares) podrían explicar ambas cosas'], ['c', 'Desayunar es saludable'], ['d', 'Las notas no miden nada']), correct: 'b', criterion: 'Respuesta única correcta.', explanation: 'Una correlación no prueba causalidad: puede haber variables en común.' },
  { id: 'cri3', aptitude: 'critico', difficulty: 3, title: '"Todos los expertos que consulté están de acuerdo, así que no hay dudas sobre el tema." ¿Qué supuesto oculto tiene este argumento?',
    options: o(['a', 'Que los expertos consultados representan a todos los expertos'], ['b', 'Que el tema es importante'], ['c', 'Que los expertos cobran por opinar'], ['d', 'Que hay pocos expertos']), correct: 'a', criterion: 'Respuesta única correcta.', explanation: 'Si eligió a quienes consultar, puede haber sesgo de selección.' },

  // ---------------- Sistemas
  { id: 'sis1', aptitude: 'sistemas', difficulty: 1, title: 'Un tanque recibe agua por una canilla y pierde por un desagüe. Si entra más agua de la que sale, ¿qué pasa con el nivel?',
    options: o(['a', 'Sube'], ['b', 'Baja'], ['c', 'Se mantiene'], ['d', 'Depende del tamaño del tanque']), correct: 'a', criterion: 'Respuesta única correcta.', explanation: 'El nivel cambia según la diferencia entre lo que entra y lo que sale.' },
  { id: 'sis2', aptitude: 'sistemas', difficulty: 2, title: 'En un lago, cuando aumentan los peces pequeños, después aumentan los peces grandes que se los comen. ¿Qué es más probable que pase luego con los peces pequeños?',
    options: o(['a', 'Siguen aumentando sin límite'], ['b', 'Disminuyen'], ['c', 'Desaparecen los peces grandes'], ['d', 'No cambian']), correct: 'b', criterion: 'Respuesta única correcta (retroalimentación negativa).', explanation: 'Más depredadores reducen la población de presas: el sistema se autorregula.' },
  { id: 'sis3', aptitude: 'sistemas', difficulty: 3, title: 'Una aplicación de viajes sube la tarifa cuando hay mucha demanda. ¿Qué efecto es esperable a mediano plazo en esos horarios?',
    options: o(['a', 'Siempre van a faltar conductores'], ['b', 'Se conectan más conductores y algunas personas eligen otro medio, lo que modera la demanda'], ['c', 'La demanda crece por el aumento de precio'], ['d', 'No cambia nada']), correct: 'b', criterion: 'Respuesta única correcta.', explanation: 'El precio actúa sobre la oferta y la demanda a la vez.' },

  // ---------------- Interpretación de información
  { id: 'int1', aptitude: 'interpretacion', difficulty: 1, title: '¿En qué mes hubo la mayor caída de ventas respecto del mes anterior?',
    visual: { kind: 'table', head: ['Mes', 'Ventas (unidades)'], rows: [['Enero', 120], ['Febrero', 90], ['Marzo', 150], ['Abril', 140]] },
    options: o(['a', 'Febrero'], ['b', 'Marzo'], ['c', 'Abril'], ['d', 'Enero']), correct: 'a', criterion: 'Respuesta única correcta.', explanation: 'Febrero cae 30 unidades; abril cae 10.' },
  { id: 'int2', aptitude: 'interpretacion', difficulty: 2, title: '¿Qué escuela tiene mejor tasa de aprobación?',
    visual: { kind: 'table', head: ['Escuela', 'Estudiantes', 'Aprobaron'], rows: [['A', 200, 150], ['B', 80, 64]] },
    options: o(['a', 'La A'], ['b', 'La B'], ['c', 'Son iguales'], ['d', 'No se puede saber']), correct: 'b', criterion: 'Respuesta única correcta.', explanation: 'A: 150/200 = 75 %. B: 64/80 = 80 %.' },
  { id: 'int3', aptitude: 'interpretacion', difficulty: 3, title: '¿Cuál es la conclusión más justificada por estos datos?',
    visual: { kind: 'table', head: ['Semana', 'Temperatura media (°C)', 'Helados vendidos'], rows: [[1, 18, 210], [2, 22, 260], [3, 27, 340], [4, 31, 420]] },
    options: o(['a', 'En estos datos, temperatura y ventas aumentan juntas'], ['b', 'Vender helado hace subir la temperatura'], ['c', 'Las ventas dependen solo de la temperatura'], ['d', 'Las ventas seguirán subiendo siempre']), correct: 'a', criterion: 'Respuesta única correcta: la única que no va más allá de los datos.', explanation: 'Los datos muestran una asociación, no causalidad ni una tendencia garantizada.' },

  // ---------------- Aprendizaje y transferencia (mini lección + aplicación)
  { id: 'apr1', aptitude: 'aprendizaje', difficulty: 1, title: 'En un código secreto, cada letra se reemplaza por la siguiente del abecedario (A→B, B→C…). ¿Cómo se escribe "SOL"?',
    options: o(['a', 'RNK'], ['b', 'TPM'], ['c', 'TOL'], ['d', 'SPM']), correct: 'b', criterion: 'Respuesta única correcta.', explanation: 'S→T, O→P, L→M.' },
  { id: 'apr2', aptitude: 'aprendizaje', difficulty: 2, title: 'En el idioma inventado "Tirk", el plural se forma repitiendo la primera sílaba (ma-lo → ma-ma-lo) y el diminutivo agregando "-ki" al final (malo → maloki). ¿Cómo se dice el plural del diminutivo de "sefu"?',
    options: o(['a', 'sefukiki'], ['b', 'sesefuki'], ['c', 'sefusefuki'], ['d', 'sekisefu']), correct: 'b', criterion: 'Respuesta única correcta: aplicar ambas reglas nuevas.', explanation: 'Diminutivo: sefuki. Plural: se-se-fuki → sesefuki.' },
  { id: 'apr3', aptitude: 'aprendizaje', difficulty: 3, title: 'Se define una operación nueva: a ◇ b = 2a − b. ¿Cuánto vale (3 ◇ 1) ◇ 4?',
    options: o(['a', '2'], ['b', '6'], ['c', '8'], ['d', '10']), correct: 'b', criterion: 'Respuesta única correcta.', explanation: '3 ◇ 1 = 6 − 1 = 5; 5 ◇ 4 = 10 − 4 = 6.' },

  // ---------------- Planificación
  { id: 'pla1', aptitude: 'planificacion', difficulty: 1, title: 'Tenés que entregar un trabajo el viernes. Necesitás 2 días para investigar, 1 para escribir y 1 para revisar, un día por tarea. Es lunes a la mañana. ¿Cuál es el último día en que podés empezar a investigar para llegar?',
    options: o(['a', 'Lunes'], ['b', 'Martes'], ['c', 'Miércoles'], ['d', 'Jueves']), correct: 'a', criterion: 'Respuesta única correcta.', explanation: 'Son 4 días de trabajo (lunes a jueves) para entregar el viernes.' },
  { id: 'pla2', aptitude: 'planificacion', difficulty: 2, title: 'Tenés cuatro tareas: A (2 h), B (1 h), C (3 h), D (1 h). B debe hacerse después de A, y D antes de C. Hacés una tarea a la vez. ¿Qué orden es válido?',
    options: o(['a', 'A, B, D, C'], ['b', 'B, A, D, C'], ['c', 'A, C, D, B'], ['d', 'C, D, A, B']), correct: 'a', criterion: 'Respuesta única correcta: la única que respeta ambas condiciones.', explanation: 'En A-B-D-C, B va después de A y D antes de C.' },
  { id: 'pla3', aptitude: 'planificacion', difficulty: 3, title: 'Para preparar una cena: hervir agua (10 min, no requiere atención), cocinar fideos (10 min, necesita el agua hervida, no requiere atención), preparar la salsa (15 min, requiere atención) y poner la mesa (5 min, requiere atención). Estás solo/a. ¿Cuál es el tiempo mínimo total?',
    options: o(['a', '20 minutos'], ['b', '25 minutos'], ['c', '30 minutos'], ['d', '40 minutos']), correct: 'a', criterion: 'Respuesta única correcta.', explanation: 'Mientras el agua hierve y los fideos se cocinan (20 min), hacés la salsa y ponés la mesa (20 min).' },

  // ---------------- Percepción auditiva (Web Audio; frecuencias en Hz)
  { id: 'aud1', aptitude: 'auditivo', difficulty: 1, title: 'Vas a escuchar dos sonidos. ¿Cuál es más agudo?',
    help: 'Usá auriculares si podés. Podés repetir el audio.',
    visual: { kind: 'audio', sequences: { 'Sonido 1': [440], 'Sonido 2': [494] } },
    options: o(['a', 'El primero'], ['b', 'El segundo'], ['c', 'Son iguales']), correct: 'b', criterion: 'Respuesta única correcta.', explanation: 'El segundo (494 Hz) es más agudo que el primero (440 Hz).' },
  { id: 'aud2', aptitude: 'auditivo', difficulty: 2, title: 'Vas a escuchar dos melodías cortas. ¿Son iguales o hay una nota diferente?',
    help: 'Usá auriculares si podés. Podés repetir el audio.',
    visual: { kind: 'audio', sequences: { 'Melodía 1': [523, 587, 659, 523], 'Melodía 2': [523, 587, 622, 523] } },
    options: o(['a', 'Son iguales'], ['b', 'Hay una nota diferente']), correct: 'b', criterion: 'Respuesta única correcta.', explanation: 'La tercera nota cambia medio tono (659 → 622 Hz).' },
  { id: 'aud3', aptitude: 'auditivo', difficulty: 3, title: 'Dos sonidos muy parecidos. ¿Cuál es más agudo?',
    help: 'La diferencia es menor a medio tono. Usá auriculares si podés.',
    visual: { kind: 'audio', sequences: { 'Sonido 1': [448], 'Sonido 2': [440] } },
    options: o(['a', 'El primero'], ['b', 'El segundo'], ['c', 'Son iguales']), correct: 'a', criterion: 'Respuesta única correcta.', explanation: 'El primero (448 Hz) es levemente más agudo que el segundo (440 Hz).' },

  // ---------------- Creatividad (fluidez)
  { id: 'cre2', aptitude: 'creatividad', difficulty: 2, open: true, title: 'Escribí todos los usos posibles que se te ocurran para un ladrillo, además de construir. Uno por línea.',
    help: 'Tomate unos 2 o 3 minutos. Vale todo: usos raros, graciosos o poco prácticos.', options: [], correct: '',
    criterion: 'Fluidez: cantidad de ideas distintas (se cuentan líneas no repetidas). No mide calidad ni originalidad, por eso pesa poco.', explanation: 'Este ejercicio estima la fluidez para generar alternativas, una parte de la creatividad.' },
  { id: 'cre3', aptitude: 'creatividad', difficulty: 3, open: true, title: 'Pensá un problema de tu barrio o escuela y escribí soluciones lo más distintas posible entre sí. Una por línea.',
    help: 'Intentá que cada solución use un enfoque diferente (tecnológico, social, económico, artístico…).', options: [], correct: '',
    criterion: 'Fluidez: cantidad de ideas distintas. Peso bajo: es una medición muy limitada.', explanation: 'Generar alternativas variadas es una parte de la creatividad aplicada.' },
];

export const EXERCISES_BY_APT: Partial<Record<AptitudeKey, ExerciseDef[]>> = {};
for (const e of EXERCISES) (EXERCISES_BY_APT[e.aptitude] ??= []).push(e);

/** Aptitudes que se evalúan con ejercicios. */
export const EXERCISABLE: AptitudeKey[] = Object.keys(EXERCISES_BY_APT) as AptitudeKey[];

const VALUE_CORRECT = { 1: 0.62, 2: 0.76, 3: 0.9 } as const;
const VALUE_WRONG = { 1: 0.2, 2: 0.33, 3: 0.45 } as const;

export function exerciseValue(def: ExerciseDef, answer: unknown): { value: number; weight: number; correct: boolean | null } | null {
  const r = asRecord(answer);
  if (r.skip === 'audio' || r.skip === true) return null;
  if (def.open) {
    const lines = String(r.text ?? '').split('\n').map((l) => l.trim().toLowerCase()).filter((l) => l.length > 1);
    const n = new Set(lines).size;
    return { value: Math.min(0.9, 0.2 + 0.07 * n), weight: 0.6, correct: null };
  }
  if (r.choice === 'ns') return { value: 0.3, weight: 0.4, correct: false };
  const ok = r.choice === def.correct;
  return { value: ok ? VALUE_CORRECT[def.difficulty] : VALUE_WRONG[def.difficulty], weight: 1, correct: ok };
}

export function exerciseQuestion(def: ExerciseDef): Question {
  return {
    id: `ex:${def.id}`, stage: 3, type: 'exercise',
    title: def.title,
    help: def.help ?? (def.open ? undefined : 'Elegí una opción. Si no estás seguro/a, podés indicar "No lo sé". No hay límite de tiempo.'),
    options: def.open ? [] : [...def.options, { id: 'ns', label: 'No lo sé', special: 'no_se' }],
    exercise: {
      aptitude: def.aptitude, difficulty: def.difficulty, correct: def.correct, criterion: def.criterion,
      explanation: def.explanation, visual: def.visual, openScoring: def.open ? 'fluency' : undefined,
    },
    publicReason: 'Ejercicio breve para observar cómo resolvés este tipo de problema (no es un examen ni una medición definitiva).',
    evaluate: (a) => {
      const v = exerciseValue(def, a);
      if (!v) return [];
      return [ev('aptitude', def.aptitude, v.value, 'ejercicio', v.weight, `Ejercicio ${def.id} (dificultad ${def.difficulty}): ${v.correct === null ? 'respuesta abierta' : v.correct ? 'correcto' : 'incorrecto'}`)];
    },
  };
}

export function exerciseById(id: string): ExerciseDef | undefined {
  return EXERCISES.find((e) => e.id === id);
}
