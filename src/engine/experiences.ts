import type { Evidence, ExperienceTemplate, ResolvedCareer } from '../domain/types';
import { toEvidence } from './profile';
import type { ExperienceLog } from './session';

/**
 * EXPERIENCIAS PRÁCTICAS DE VERIFICACIÓN
 * Después del informe, cada carrera finalista propone pequeñas experiencias que ponen a prueba
 * una hipótesis concreta. Lo registrado se convierte en evidencia de tipo "practica":
 *  - sobre la carrera (afinidad), con encogimiento: una sola experiencia mueve poco el resultado
 *    y varias experiencias consistentes lo mueven más (se buscan patrones, no episodios aislados);
 *  - sobre las exigencias que la experiencia involucra, lo que afecta a TODAS las carreras que las comparten.
 */

export const LOG_WEIGHT = 0.6;

export function genericExperiences(c: ResolvedCareer): ExperienceTemplate[] {
  return [
    {
      id: `plan-${c.id}`, type: 'plan', duration: '1 a 2 horas',
      title: 'Revisar el plan de estudios oficial',
      hypothesis: 'Las materias de los primeros años te resultan aceptables o atractivas (no solo el título final).',
      steps: [
        `Buscá el plan de estudios vigente de «${c.name}» en el sitio de ${c.offerings.map((o) => `${o.facultad} (${o.institution})`).join(' o de ')}.`,
        'Marcá en verde las materias que te entusiasman, en amarillo las que tolerarías y en rojo las que te preocupan.',
        'Contá cuántas hay de cada color en los dos primeros años.',
      ],
    },
    {
      id: `charla-${c.id}`, type: 'conversacion', duration: '1 hora',
      title: 'Conversar con un estudiante avanzado o un graduado',
      hypothesis: 'La experiencia real de estudiar y trabajar en este campo coincide con lo que imaginás.',
      steps: [
        'Contactá a alguien que estudie o haya estudiado esta carrera (centros de estudiantes, redes, conocidos).',
        'Preguntá: ¿qué es lo más difícil?, ¿qué te sorprendió?, ¿cómo es una semana típica?, ¿qué harías distinto?',
        'Anotá qué respuestas te entusiasmaron y cuáles te desanimaron.',
      ],
    },
  ];
}

export function experiencesFor(c: ResolvedCareer): ExperienceTemplate[] {
  const seen = new Set<string>();
  return [...c.experiences, ...genericExperiences(c)].filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

const CONT: Record<ExperienceLog['continueLearning'], number> = { si: 0.9, quizas: 0.55, no: 0.15 };

export function logValue(log: ExperienceLog): number {
  return ((log.interest - 1) / 4 + (log.satisfaction - 1) / 4 + CONT[log.continueLearning]) / 3;
}

export function experienceEvidence(logs: ExperienceLog[], careers: ResolvedCareer[]): Evidence[] {
  const out: Evidence[] = [];
  for (const log of logs) {
    const career = careers.find((c) => c.id === log.careerId);
    const tpl = career ? experiencesFor(career).find((e) => e.id === log.experienceId) : undefined;
    const qid = `exp:${log.id}`;
    out.push(...toEvidence(qid, [{
      target: { kind: 'career', key: log.careerId }, value: logValue(log), weight: LOG_WEIGHT, source: 'practica',
      note: `Experiencia «${tpl?.title ?? log.experienceId}»: interés ${log.interest}/5, satisfacción ${log.satisfaction}/5`,
    }]));
    for (const d of tpl?.demands ?? []) {
      const v = ((log.satisfaction - 1) / 4) * 0.7 + (1 - (log.difficulty - 1) / 4) * 0.3;
      out.push(...toEvidence(qid, [{ target: { kind: 'demand', key: d }, value: v, weight: LOG_WEIGHT, source: 'practica', note: `Experiencia práctica «${tpl?.title}»` }]));
    }
  }
  return out;
}
