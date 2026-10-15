// Tipos centrales del dominio. Todo el motor trabaja sobre valores normalizados 0..1
// (0.5 = neutro / sin información) para que las puntuaciones sean comparables y auditables.

export type RiasecKey = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export type DomainKey =
  | 'tecnologia' | 'matematica' | 'fisica' | 'quimica_bio' | 'tierra_ambiente' | 'ingenieria'
  | 'economia' | 'derecho' | 'diseno' | 'artes_visuales' | 'musica' | 'comunicacion'
  | 'lenguas' | 'humanidades' | 'sociedad' | 'educacion' | 'salud' | 'animales'
  | 'deporte' | 'organizacion';

export type AptitudeKey =
  | 'logico' | 'verbal' | 'cuantitativo' | 'espacial' | 'patrones' | 'critico'
  | 'creatividad' | 'problemas' | 'sistemas' | 'planificacion' | 'interpretacion'
  | 'aprendizaje' | 'auditivo' | 'manual' | 'interpersonal' | 'fisico' | 'idiomas';

/** Ejes de estilo de trabajo: 0 = polo izquierdo, 1 = polo derecho. */
export type StyleKey =
  | 'autonomia' | 'colaboracion' | 'estructura' | 'variedad' | 'practica' | 'ejecucion'
  | 'incertidumbre' | 'paciencia' | 'responsabilidad' | 'exterior' | 'personas' | 'datos'
  | 'cosas' | 'ideas';

export type ValueKey =
  | 'ingresos' | 'estabilidad' | 'autonomia_v' | 'emprender' | 'creatividad_v' | 'crecimiento'
  | 'reconocimiento' | 'impacto' | 'desafio' | 'flexibilidad' | 'remoto' | 'movilidad'
  | 'equilibrio' | 'especializacion' | 'variedad_v';

export type DemandKey = string; // catálogo en data/demands.json

export type FutureKey = ValueKey | 'demanda';

export type TargetKind =
  | 'riasec' | 'domain' | 'aptitude' | 'style' | 'value' | 'demand' | 'career' | 'weight' | 'constraint';

export interface TargetRef {
  kind: TargetKind;
  key: string;
}

/**
 * Tipo de evidencia. La metodología distingue explícitamente:
 * - declarada: preferencias o intereses declarados por la persona.
 * - autoevaluacion: percepción de la propia habilidad (no es capacidad demostrada).
 * - ejercicio: aptitud observada en un ejercicio con criterio de corrección explícito.
 * - experiencia: experiencia concreta descrita con detalle (habilidad demostrada).
 * - escenario: elección forzada o escenario (prioridades reveladas).
 * - conducta: comportamiento real reciente (interés genuino vs. teórico).
 * - practica: experiencia práctica de verificación realizada después del informe.
 * - texto: señal automática detectada en respuestas abiertas (baja confianza).
 * - verificacion: corrección explícita de una hipótesis en la etapa 9.
 * - externo: factor práctico/externo (no es afinidad vocacional).
 */
export type EvidenceSource =
  | 'declarada' | 'autoevaluacion' | 'ejercicio' | 'experiencia' | 'escenario'
  | 'conducta' | 'practica' | 'texto' | 'verificacion' | 'externo';

export interface Evidence {
  questionId: string;
  target: TargetRef;
  /** 0..1 */
  value: number;
  /** Peso de confiabilidad (ya incluye el factor de la fuente). */
  weight: number;
  source: EvidenceSource;
  note?: string;
}

export interface EvidenceDraft {
  target: TargetRef;
  value: number;
  /** Peso relativo dentro de la pregunta (se multiplica por el peso de la fuente). */
  weight?: number;
  source: EvidenceSource;
  note?: string;
}

// ---------------------------------------------------------------------------
// Carreras

export type DataStatus = 'verificado' | 'estimado' | 'insuficiente';

export interface StyleTarget {
  /** valor objetivo 0..1 */
  t: number;
  /** importancia 0..1 */
  w: number;
}

export interface ExperienceTemplate {
  id: string;
  title: string;
  hypothesis: string;
  type: 'ejercicio' | 'problema' | 'caso' | 'proyecto' | 'creativa' | 'clase' | 'plan' | 'conversacion';
  steps: string[];
  duration: string;
  demands?: DemandKey[];
}

export interface FamilyProfile {
  id: string;
  label: string;
  riasec: Partial<Record<RiasecKey, number>>;
  domains: Partial<Record<DomainKey, number>>;
  aptitudes: Partial<Record<AptitudeKey, number>>;
  style: Partial<Record<StyleKey, [number, number]>>;
  demands: Record<DemandKey, number>;
  future: Partial<Record<FutureKey, number>>;
  futureNote?: string;
  study: string[];
  tasks: string[];
  settings: string[];
  specializations?: string[];
  difficulties: string[];
  experiences: ExperienceTemplate[];
}

export interface CareerVariant {
  id: string;
  name: string;
  description?: string;
  overrides?: Partial<Pick<FamilyProfile, 'domains' | 'demands' | 'aptitudes' | 'riasec'>>;
}

export type Restriction =
  | 'solo_nodocentes'
  | 'requiere_titulo_previo'
  | 'formacion_musical_previa'
  | 'aptitud_fisica'
  | 'materiales_costosos'
  | 'carga_horaria_alta'
  | 'verificar_oferta';

export interface CareerEntry {
  id: string;
  name: string;
  /** Nombre tal como figura en la lista provista por la persona usuaria. */
  originalName?: string;
  facultad: string;
  facultadStatus?: DataStatus;
  family: string;
  level: 'licenciatura' | 'profesorado' | 'lic_y_prof' | 'tecnicatura' | 'ingenieria' | 'titulo_profesional' | 'ciclo_complementacion';
  modifiers?: string[];
  durationYears?: number;
  durationStatus?: DataStatus;
  dataStatus: DataStatus;
  restrictions?: Restriction[];
  overrides?: Partial<Omit<FamilyProfile, 'id' | 'label' | 'experiences'>>;
  extraTasks?: string[];
  extraStudy?: string[];
  variants?: CareerVariant[];
  notes?: string[];
  sources?: { label: string; url: string }[];
  active?: boolean;
}

export interface ResolvedCareer extends Omit<CareerEntry, 'overrides'> {
  familyLabel: string;
  riasec: Partial<Record<RiasecKey, number>>;
  domains: Partial<Record<DomainKey, number>>;
  aptitudes: Partial<Record<AptitudeKey, number>>;
  style: Partial<Record<StyleKey, [number, number]>>;
  demands: Record<DemandKey, number>;
  future: Partial<Record<FutureKey, number>>;
  futureNote?: string;
  study: string[];
  tasks: string[];
  settings: string[];
  specializations: string[];
  difficulties: string[];
  experiences: ExperienceTemplate[];
}

export type ProfileMaps = Pick<FamilyProfile, 'riasec' | 'domains' | 'aptitudes' | 'style' | 'demands' | 'future'>;

export interface ModifierDef {
  label: string;
  /** Reemplaza valores. */
  set?: Partial<ProfileMaps>;
  /** Suma deltas (se recorta a 0..1). No aplica a `style`. */
  shift?: Partial<Omit<ProfileMaps, 'style'>>;
  extraTasks?: string[];
  extraStudy?: string[];
  experiences?: ExperienceTemplate[];
}

export interface DemandDef {
  key: DemandKey;
  label: string;
  /** Escenario neutral (no revela carrera). */
  scenario: string;
}

export interface CareerCatalog {
  version: string;
  careers: CareerEntry[];
  families: FamilyProfile[];
  modifiers: Record<string, ModifierDef>;
  demands: DemandDef[];
}
