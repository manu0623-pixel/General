import type { CareerCatalog } from '../domain/types';
import { nextStep, type StepResult } from '../engine/adaptive';
import { newSession, recordAnswer, type SessionState } from '../engine/session';
import type { Question } from '../questions/types';

/**
 * Persona sintética para pruebas: define el valor "verdadero" (0..1) de cada objetivo.
 * Un respondedor genérico elige, en cada pregunta, la respuesta cuya evidencia se acerca
 * más a esos valores. Así se pueden simular evaluaciones completas sin escribir cada respuesta.
 */
export interface Persona {
  values: Record<string, number>; // `${kind}:${key}` → 0..1
  exerciseAccuracy: number;       // probabilidad de acertar (determinística por id)
  verifyVerdict?: 'si' | 'no' | 'mixed';
  text?: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function errorOf(q: Question, answer: unknown, p: Persona): number | null {
  const evs = q.evaluate(answer);
  if (!evs.length) return null;
  let s = 0;
  for (const e of evs) {
    const pv = p.values[`${e.target.kind}:${e.target.key}`] ?? 0.5;
    s += Math.abs(e.value - pv);
  }
  return s / evs.length;
}

export function personaAnswer(q: Question, p: Persona): unknown {
  switch (q.type) {
    case 'matrix': {
      const out: Record<string, string> = {};
      for (const row of q.rows ?? []) {
        let best = 'ns', bestErr = Infinity;
        for (const pt of q.scale ?? []) {
          if (pt.value == null) continue;
          const err = errorOf(q, { [row.id]: pt.id }, p);
          if (err != null && err < bestErr) { bestErr = err; best = pt.id; }
        }
        out[row.id] = best;
      }
      return out;
    }
    case 'scale': {
      const isDemand = q.id.startsWith('demand:');
      let best: string | null = null, bestErr = Infinity;
      for (const pt of q.scale ?? []) {
        if (pt.value == null) continue;
        const ans = isDemand ? { level: pt.id, checks: [] } : pt.id;
        const err = errorOf(q, ans, p);
        if (err != null && err < bestErr) { bestErr = err; best = pt.id; }
      }
      const pick = best ?? q.scale?.[0].id;
      return isDemand ? { level: pick, checks: hash(q.id) > 0.7 ? ['vivido'] : [] } : pick;
    }
    case 'single': {
      let best: string | null = null, bestErr = Infinity;
      for (const o of q.options ?? []) {
        const err = errorOf(q, o.id, p);
        if (err != null && err < bestErr) { bestErr = err; best = o.id; }
      }
      return best ?? q.options?.find((o) => !o.special)?.id ?? q.options?.[0]?.id;
    }
    case 'multi': {
      const scored = (q.options ?? []).filter((o) => !o.special).map((o) => ({ id: o.id, err: errorOf(q, [o.id], p) }));
      const good = scored.filter((s) => s.err != null && s.err < 0.2).sort((a, b) => a.err! - b.err!).map((s) => s.id);
      const max = q.maxSelect ?? 3;
      const min = q.minSelect ?? 0;
      let pick = good.slice(0, max);
      if (pick.length < min) pick = [...pick, ...scored.map((s) => s.id).filter((id) => !pick.includes(id))].slice(0, Math.max(min, 1));
      return pick;
    }
    case 'exercise': {
      if (q.exercise?.openScoring) return { text: Array.from({ length: Math.round(3 + 8 * p.exerciseAccuracy) }, (_, i) => `idea ${i}`).join('\n') };
      const ok = hash(q.id) < p.exerciseAccuracy;
      const wrong = q.options?.find((o) => o.id !== q.exercise?.correct && !o.special)?.id;
      return { choice: ok ? q.exercise?.correct : wrong, ms: 20000 };
    }
    case 'open': return p.text ?? 'Me gusta programar videojuegos y entender cómo funcionan las computadoras.';
    case 'evidence': return { text: `${p.text ?? 'Programé un juego'} durante varios meses con amigos; tuvimos problemas con errores difíciles y los resolvimos buscando documentación y probando alternativas paso a paso hasta que funcionó y otras personas lo usaron.`, checks: ['resultado', 'sostenido', 'iniciativa'], domains: [] };
    case 'allocate': return { A: 33, B: 34, C: 33, equilibrio: true };
    case 'hypotheses': return { items: [] };
    case 'final': return { text: '' };
    default: return null;
  }
}

export function runPersona(catalog: CareerCatalog, p: Persona, opts: { maxSteps?: number; start?: SessionState; onStep?: (r: StepResult) => void } = {}) {
  let state = opts.start ?? newSession('2026-01-01T00:00:00.000Z');
  const asked: string[] = [];
  let r = nextStep(state, catalog);
  let steps = 0;
  while (!r.done && steps < (opts.maxSteps ?? 400)) {
    const q = r.question!;
    let answer = personaAnswer(q, p);
    if (q.type === 'hypotheses') {
      answer = {
        items: (r.hypotheses ?? []).map((h, i) => ({ ...h, verdict: p.verifyVerdict === 'no' || (p.verifyVerdict === 'mixed' && i === 0) ? 'no' : 'si', comment: '' })),
      };
    }
    asked.push(q.id);
    opts.onStep?.(r);
    state = recordAnswer(r.state, r.pending!, answer, { now: `2026-01-01T00:${String(Math.floor(steps / 60)).padStart(2, '0')}:${String(steps % 60).padStart(2, '0')}.000Z` });
    r = nextStep(state, catalog);
    steps++;
  }
  return { state: r.state, ctx: r.ctx, asked, done: r.done };
}

// Personas de referencia --------------------------------------------------------------

export const TECH_PERSONA: Persona = {
  exerciseAccuracy: 0.85,
  text: 'Me encanta programar, armar computadoras y resolver problemas de lógica.',
  values: {
    'riasec:I': 0.9, 'riasec:R': 0.7, 'riasec:C': 0.55, 'riasec:A': 0.3, 'riasec:S': 0.2, 'riasec:E': 0.35,
    'domain:tecnologia': 0.95, 'domain:matematica': 0.8, 'domain:fisica': 0.6, 'domain:ingenieria': 0.6,
    'domain:salud': 0.1, 'domain:sociedad': 0.2, 'domain:musica': 0.3, 'domain:artes_visuales': 0.2, 'domain:derecho': 0.1,
    'domain:educacion': 0.25, 'domain:animales': 0.2, 'domain:deporte': 0.3, 'domain:lenguas': 0.3, 'domain:humanidades': 0.2,
    'domain:economia': 0.4, 'domain:comunicacion': 0.2, 'domain:diseno': 0.35, 'domain:quimica_bio': 0.3, 'domain:tierra_ambiente': 0.25, 'domain:organizacion': 0.35,
    'demand:depurar': 0.9, 'demand:programacion_larga': 0.9, 'demand:abstraccion_formal': 0.7, 'demand:calculo_intensivo': 0.7,
    'demand:contacto_clinico': 0.05, 'demand:guardias': 0.1, 'demand:vulnerabilidad': 0.15, 'demand:frente_aula': 0.2,
    'demand:campo': 0.2, 'demand:memoria_volumen': 0.25, 'demand:lectura_teorica': 0.3, 'demand:escucha_prolongada': 0.15,
    'demand:atencion_publico': 0.2, 'demand:exposicion_publica': 0.35, 'demand:critica_iterativa': 0.5, 'demand:animales_manejo': 0.2,
    'value:ingresos': 0.85, 'value:remoto': 0.85, 'value:desafio': 0.9, 'value:flexibilidad': 0.8, 'value:impacto': 0.4,
    'style:practica': 0.6, 'style:personas': 0.2, 'style:datos': 0.85, 'style:cosas': 0.6, 'style:ideas': 0.7, 'style:exterior': 0.2,
    'aptitude:logico': 0.85, 'aptitude:cuantitativo': 0.8, 'aptitude:sistemas': 0.85,
  },
};

export const CARE_PERSONA: Persona = {
  exerciseAccuracy: 0.55,
  text: 'Me gusta ayudar a otras personas, acompañar a mis amigos y aprender sobre el cuerpo humano.',
  values: {
    'riasec:S': 0.92, 'riasec:I': 0.6, 'riasec:A': 0.4, 'riasec:R': 0.35, 'riasec:E': 0.35, 'riasec:C': 0.4,
    'domain:salud': 0.92, 'domain:sociedad': 0.85, 'domain:educacion': 0.7, 'domain:quimica_bio': 0.6,
    'domain:tecnologia': 0.15, 'domain:matematica': 0.25, 'domain:ingenieria': 0.1, 'domain:fisica': 0.2, 'domain:economia': 0.2,
    'domain:musica': 0.3, 'domain:artes_visuales': 0.3, 'domain:derecho': 0.3, 'domain:animales': 0.4, 'domain:deporte': 0.4,
    'domain:lenguas': 0.4, 'domain:humanidades': 0.4, 'domain:comunicacion': 0.35, 'domain:diseno': 0.2, 'domain:tierra_ambiente': 0.3, 'domain:organizacion': 0.4,
    'demand:contacto_clinico': 0.85, 'demand:atencion_publico': 0.85, 'demand:escucha_prolongada': 0.8, 'demand:vulnerabilidad': 0.75,
    'demand:guardias': 0.6, 'demand:memoria_volumen': 0.6, 'demand:depurar': 0.1, 'demand:programacion_larga': 0.1, 'demand:calculo_intensivo': 0.2,
    'demand:abstraccion_formal': 0.15, 'demand:obra': 0.1,
    'value:impacto': 0.95, 'value:estabilidad': 0.8, 'value:ingresos': 0.5, 'value:remoto': 0.2,
    'style:personas': 0.95, 'style:practica': 0.75, 'style:datos': 0.3, 'style:cosas': 0.3, 'style:responsabilidad': 0.8,
    'aptitude:interpersonal': 0.85,
  },
};
