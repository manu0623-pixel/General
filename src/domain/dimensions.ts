import type { AptitudeKey, DomainKey, RiasecKey, StyleKey, ValueKey } from './types';

export const RIASEC: Record<RiasecKey, { label: string; desc: string }> = {
  R: { label: 'Realista', desc: 'Actividades concretas con objetos, herramientas, máquinas, materiales, animales o el entorno físico.' },
  I: { label: 'Investigador', desc: 'Observar, analizar, comprender fenómenos y resolver problemas intelectuales.' },
  A: { label: 'Artístico', desc: 'Crear, expresar, interpretar; ambientes poco estructurados y con margen para la originalidad.' },
  S: { label: 'Social', desc: 'Enseñar, acompañar, cuidar, orientar o ayudar a otras personas.' },
  E: { label: 'Emprendedor', desc: 'Persuadir, liderar, gestionar, asumir riesgos y tomar decisiones con impacto.' },
  C: { label: 'Convencional', desc: 'Ordenar, registrar, controlar, seguir procedimientos y trabajar con precisión y detalle.' },
};
export const RIASEC_KEYS = Object.keys(RIASEC) as RiasecKey[];
export const RIASEC_SHORT: Record<RiasecKey, string> = {
  R: 'trabajar con objetos, herramientas y el entorno físico',
  I: 'analizar y comprender cómo funcionan las cosas',
  A: 'crear y expresar ideas propias',
  S: 'enseñar, ayudar y acompañar a otras personas',
  E: 'liderar, persuadir y emprender',
  C: 'organizar y controlar con precisión',
};

export const DOMAINS: Record<DomainKey, string> = {
  tecnologia: 'Tecnología, software y sistemas',
  matematica: 'Matemática, datos y análisis cuantitativo',
  fisica: 'Física, astronomía y fenómenos naturales',
  quimica_bio: 'Química, biología y laboratorio',
  tierra_ambiente: 'Tierra, ambiente, campo y naturaleza',
  ingenieria: 'Máquinas, estructuras, energía y construcción',
  economia: 'Economía, negocios y gestión',
  derecho: 'Normas, derecho e instituciones',
  diseno: 'Diseño de comunicación, objetos y espacios',
  artes_visuales: 'Artes visuales y audiovisuales',
  musica: 'Música',
  comunicacion: 'Comunicación, medios y periodismo',
  lenguas: 'Lenguas, literatura y escritura',
  humanidades: 'Historia, filosofía y pensamiento',
  sociedad: 'Comportamiento humano y sociedad',
  educacion: 'Educación y enseñanza',
  salud: 'Salud y cuidado de personas',
  animales: 'Animales y producción animal',
  deporte: 'Actividad física y deporte',
  organizacion: 'Organización, liderazgo y toma de decisiones',
};
export const DOMAIN_KEYS = Object.keys(DOMAINS) as DomainKey[];

export const APTITUDES: Record<AptitudeKey, string> = {
  logico: 'Razonamiento lógico y abstracto',
  verbal: 'Comprensión verbal y argumentación',
  cuantitativo: 'Razonamiento cuantitativo',
  espacial: 'Pensamiento espacial y visual',
  patrones: 'Identificación de patrones',
  critico: 'Pensamiento crítico',
  creatividad: 'Creatividad y generación de alternativas',
  problemas: 'Resolución de problemas complejos',
  sistemas: 'Comprensión de sistemas',
  planificacion: 'Planificación y organización',
  interpretacion: 'Interpretación de información',
  aprendizaje: 'Aprendizaje y transferencia de conceptos',
  auditivo: 'Percepción auditiva y musical',
  manual: 'Destreza manual fina',
  interpersonal: 'Comprensión y vínculo con otras personas',
  fisico: 'Capacidad física y coordinación motriz',
  idiomas: 'Facilidad para lenguas extranjeras',
};
export const APTITUDE_KEYS = Object.keys(APTITUDES) as AptitudeKey[];

/** [polo 0, polo 1] */
export const STYLES: Record<StyleKey, [string, string]> = {
  autonomia: ['Con guía y supervisión', 'Con autonomía'],
  colaboracion: ['Trabajo individual', 'Trabajo en equipo'],
  estructura: ['Libertad creativa', 'Estructura y procedimientos'],
  variedad: ['Rutina previsible', 'Variedad constante'],
  practica: ['Teoría y conceptos', 'Aplicación práctica'],
  ejecucion: ['Investigar y comprender', 'Ejecutar y producir'],
  incertidumbre: ['Baja tolerancia a la incertidumbre', 'Alta tolerancia a la incertidumbre'],
  paciencia: ['Problemas breves y resultados rápidos', 'Problemas prolongados'],
  responsabilidad: ['Responsabilidad acotada', 'Decisiones de alta responsabilidad'],
  exterior: ['Interior / escritorio', 'Exterior / campo / movimiento'],
  personas: ['Poco contacto con personas', 'Mucho contacto con personas'],
  datos: ['Poco trabajo con datos', 'Mucho trabajo con datos e información'],
  cosas: ['Poco trabajo con objetos', 'Mucho trabajo con herramientas, materiales y objetos'],
  ideas: ['Poco trabajo con ideas abstractas', 'Mucho trabajo con ideas y conceptos'],
};
export const STYLE_KEYS = Object.keys(STYLES) as StyleKey[];

export const VALUES: Record<ValueKey, string> = {
  ingresos: 'Ingresos potenciales',
  estabilidad: 'Estabilidad laboral',
  autonomia_v: 'Autonomía',
  emprender: 'Posibilidad de emprender',
  creatividad_v: 'Creatividad',
  crecimiento: 'Crecimiento profesional',
  reconocimiento: 'Reconocimiento',
  impacto: 'Impacto social',
  desafio: 'Desafío intelectual',
  flexibilidad: 'Flexibilidad horaria',
  remoto: 'Trabajo remoto',
  movilidad: 'Movilidad geográfica / internacional',
  equilibrio: 'Equilibrio vida personal–trabajo',
  especializacion: 'Posibilidad de especializarse',
  variedad_v: 'Variedad de proyectos y tareas',
};
export const VALUE_KEYS = Object.keys(VALUES) as ValueKey[];

/** Valores intrínsecos (se relacionan con la actividad misma → dimensión B). */
export const INTRINSIC_VALUES: ValueKey[] = ['creatividad_v', 'impacto', 'desafio', 'variedad_v', 'especializacion', 'autonomia_v', 'reconocimiento'];
/** Valores de condiciones y proyecto de vida (→ dimensión C). */
export const EXTRINSIC_VALUES: ValueKey[] = ['ingresos', 'estabilidad', 'emprender', 'crecimiento', 'flexibilidad', 'remoto', 'movilidad', 'equilibrio'];

export const STAGES = [
  { n: 1, key: 'inicial', title: 'Exploración inicial', desc: 'Intereses, experiencias, expectativas y situación actual.' },
  { n: 2, key: 'intereses', title: 'Intereses', desc: 'Qué actividades te generan interés genuino y cuáles solo en teoría.' },
  { n: 3, key: 'aptitudes', title: 'Aptitudes', desc: 'Ejercicios breves de razonamiento y resolución de problemas.' },
  { n: 4, key: 'estilo', title: 'Estilo de trabajo', desc: 'Ambientes académicos y profesionales que favorecen tu desempeño.' },
  { n: 5, key: 'valores', title: 'Motivaciones y valores', desc: 'Prioridades cuando no se puede maximizar todo a la vez.' },
  { n: 6, key: 'evidencia', title: 'Experiencias y evidencia', desc: 'Situaciones concretas en las que demostraste habilidades.' },
  { n: 7, key: 'exigencias', title: 'Exigencias reales', desc: 'Disposición frente a la vida cotidiana de cada camino.' },
  { n: 8, key: 'profundizacion', title: 'Profundización', desc: 'Preguntas para distinguir opciones cercanas y aclarar contradicciones.' },
  { n: 9, key: 'verificacion', title: 'Verificación', desc: 'Revisión de las hipótesis antes de cerrar la evaluación.' },
] as const;
export type StageNumber = (typeof STAGES)[number]['n'];

export function labelForTarget(kind: string, key: string, demandLabel?: (k: string) => string): string {
  switch (kind) {
    case 'riasec': return `Interés ${RIASEC[key as RiasecKey]?.label ?? key}`;
    case 'domain': return DOMAINS[key as DomainKey] ?? key;
    case 'aptitude': return APTITUDES[key as AptitudeKey] ?? key;
    case 'style': { const s = STYLES[key as StyleKey]; return s ? `${s[0]} ↔ ${s[1]}` : key; }
    case 'value': return VALUES[key as ValueKey] ?? key;
    case 'demand': return demandLabel ? demandLabel(key) : key;
    case 'weight': return `Peso de la dimensión ${key}`;
    case 'constraint': return `Condición práctica: ${key}`;
    default: return key;
  }
}
