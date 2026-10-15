import type { DomainKey, EvidenceDraft } from '../domain/types';

/**
 * Análisis de respuestas abiertas basado en reglas explícitas (sin IA).
 * Detecta menciones de temas mediante raíces de palabras. Produce evidencia de
 * MUY BAJA confianza (fuente "texto") y siempre visible en el registro,
 * para que la persona pueda ver qué se interpretó.
 */
export const LEXICON: Record<DomainKey, string[]> = {
  tecnologia: ['program', 'codig', 'código', 'compu', 'software', 'app', 'aplicaci', 'videojueg', 'robot', 'intelig', 'internet', 'hardware', 'python', 'web', 'tecnolog', 'informát', 'informat', 'algoritm'],
  matematica: ['matem', 'número', 'numer', 'cálculo', 'calcul', 'estadíst', 'estadist', 'ecuaci', 'geometr', 'lógic', 'logic', 'acertij', 'dato'],
  fisica: ['físic', 'fisic', 'univers', 'espacio', 'planeta', 'estrell', 'astro', 'cuántic', 'energ', 'galaxi', 'agujero negro', 'clima', 'tormenta'],
  quimica_bio: ['químic', 'quimic', 'biolog', 'célula', 'celul', 'adn', 'genétic', 'genet', 'laborator', 'experiment', 'molécul', 'virus', 'bacteria'],
  tierra_ambiente: ['naturalez', 'ambient', 'planta', 'árbol', 'arbol', 'bosque', 'campo', 'ecolog', 'volcán', 'volcan', 'roca', 'montañ', 'suelo', 'cultiv', 'huerta', 'cambio climático'],
  ingenieria: ['máquina', 'maquina', 'motor', 'construc', 'puente', 'edifici', 'mecán', 'mecan', 'electric', 'electrón', 'electron', 'avion', 'avión', 'auto', 'arregl', 'herramient'],
  economia: ['econom', 'negoci', 'empresa', 'emprend', 'dinero', 'inversi', 'finanz', 'mercado', 'vender', 'venta', 'marketing', 'cripto', 'bolsa'],
  derecho: ['derecho', 'ley', 'leyes', 'justici', 'juicio', 'abogad', 'polític', 'politic', 'constituc', 'injustic'],
  diseno: ['diseñ', 'disen', 'logo', 'tipograf', 'interfaz', 'moda', 'ropa', 'decorac', 'arquitect', 'mueble', 'objeto'],
  artes_visuales: ['dibuj', 'pint', 'arte', 'ilustr', 'fotograf', 'cine', 'película', 'pelicul', 'video', 'escultur', 'museo', 'anim'],
  musica: ['músic', 'music', 'guitarr', 'piano', 'cantar', 'canto', 'banda', 'compon', 'canción', 'cancion', 'instrument', 'produc musical', 'batería'],
  comunicacion: ['comunic', 'periodis', 'noticia', 'redes', 'instagram', 'tiktok', 'youtube', 'podcast', 'radio', 'contenido', 'stream'],
  lenguas: ['leer', 'lectura', 'libro', 'novela', 'escrib', 'poesía', 'poesia', 'idioma', 'inglés', 'ingles', 'francés', 'frances', 'portugu', 'literatur', 'palabra'],
  humanidades: ['histori', 'filosof', 'mitolog', 'antigu', 'guerra', 'civilizac', 'religi', 'ética', 'etica', 'pensamiento'],
  sociedad: ['psicolog', 'mente', 'conduct', 'persona', 'socied', 'social', 'cultura', 'gente', 'comportamiento', 'emocion', 'desigualdad', 'comunidad'],
  educacion: ['enseñ', 'ensen', 'explicar', 'profesor', 'docent', 'clase', 'alumno', 'educa', 'apoyo escolar'],
  salud: ['salud', 'medicin', 'enfermedad', 'cuerpo humano', 'anatom', 'hospital', 'médic', 'medic', 'nutrici', 'paciente', 'primeros auxilios'],
  animales: ['animal', 'perro', 'gato', 'caball', 'veterinar', 'mascota', 'fauna', 'dinosaur', 'insect', 'pájaro', 'pajaro'],
  deporte: ['deport', 'fútbol', 'futbol', 'entren', 'gimnas', 'correr', 'básquet', 'basquet', 'vóley', 'voley', 'natación', 'natacion', 'hockey', 'rugby', 'tenis'],
  organizacion: ['organiz', 'liderar', 'líder', 'lider', 'coordin', 'planific', 'gestion', 'gestión', 'equipo', 'evento'],
};

export function detectDomains(text: string): DomainKey[] {
  const t = ` ${text.toLowerCase()} `;
  const hits: DomainKey[] = [];
  for (const [d, stems] of Object.entries(LEXICON) as [DomainKey, string[]][]) {
    if (stems.some((s) => t.includes(s))) hits.push(d);
  }
  return hits;
}

export function textSignals(text: unknown, note: string): EvidenceDraft[] {
  if (typeof text !== 'string' || text.trim().length < 3) return [];
  return detectDomains(text).map((d) => ({
    target: { kind: 'domain', key: d },
    value: 0.8,
    weight: 1,
    source: 'texto' as const,
    note,
  }));
}

export function wordCount(text: unknown): number {
  return typeof text === 'string' ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}
