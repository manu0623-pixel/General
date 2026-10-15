import { APTITUDES, DOMAINS, RIASEC, RIASEC_KEYS, STYLES, VALUES } from '../domain/dimensions';
import { demandLabel } from '../domain/careerModel';
import type { EvidenceSource } from '../domain/types';
import type { HypothesisItem } from '../questions/generators';
import type { EngineContext } from './context';
import { SOURCE_LABEL, type Estimate } from './profile';

function basis(e: Estimate): string {
  const parts = Object.entries(e.bySource)
    .sort((a, b) => (b[1]?.w ?? 0) - (a[1]?.w ?? 0))
    .map(([s, x]) => `${SOURCE_LABEL[s as EvidenceSource].toLowerCase()} (${x?.n})`);
  return `Basado en ${e.n} evidencia${e.n === 1 ? '' : 's'}: ${parts.join(', ')}.`;
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

function entries(ctx: EngineContext, kind: string) {
  return Object.entries(ctx.profile)
    .filter(([k]) => k.startsWith(`${kind}:`))
    .map(([k, e]) => ({ key: k.slice(kind.length + 1), e }));
}

/** Genera hipótesis verificables a partir de la evidencia acumulada (sin mencionar carreras). */
export function generateHypotheses(ctx: EngineContext): HypothesisItem[] {
  const out: HypothesisItem[] = [];
  const r = RIASEC_KEYS.map((k) => ({ k, e: ctx.profile[`riasec:${k}`] })).filter((x) => x.e && x.e.conf >= 0.3).sort((a, b) => b.e.est - a.e.est);
  if (r.length >= 2 && r[0].e.est >= 0.6) {
    const top = r.slice(0, r[1].e.est >= 0.58 ? 2 : 1);
    out.push({
      id: 'h:riasec_top',
      text: `Tus intereses se orientan sobre todo a actividades de tipo ${list(top.map((x) => `${RIASEC[x.k].label.toLowerCase()} (${RIASEC[x.k].desc.charAt(0).toLowerCase()}${RIASEC[x.k].desc.slice(1, 60)}…)`))}.`,
      basis: top.map((x) => basis(x.e)).join(' '),
      targets: top.map((x) => ({ kind: 'riasec', key: x.k, value: x.e.est })),
    });
    const low = r[r.length - 1];
    if (low.e.est <= 0.35) out.push({ id: 'h:riasec_low', text: `Las actividades de tipo ${RIASEC[low.k].label.toLowerCase()} te atraen poco.`, basis: basis(low.e), targets: [{ kind: 'riasec', key: low.k, value: low.e.est }] });
  }

  const doms = entries(ctx, 'domain').filter((x) => x.e.est >= 0.68 && x.e.conf >= 0.35).sort((a, b) => b.e.est - a.e.est).slice(0, 3);
  if (doms.length) out.push({
    id: 'h:dom_top', text: `Las áreas que más te atraen son: ${list(doms.map((d) => `«${DOMAINS[d.key as keyof typeof DOMAINS]}»`))}.`,
    basis: doms.map((d) => basis(d.e)).join(' '), targets: doms.map((d) => ({ kind: 'domain', key: d.key, value: d.e.est })),
  });
  const theoretical = Object.entries(ctx.state.answers).filter(([id, a]) => id.startsWith('behav:') && a.value === 'gustaria').map(([id]) => id.split(':')[1]);
  if (theoretical.length) out.push({
    id: 'h:dom_teorico', text: `Tu interés por ${list(theoretical.map((d) => `«${DOMAINS[d as keyof typeof DOMAINS]}»`))} parece, por ahora, más teórico que práctico: todavía no lo llevaste a la práctica.`,
    basis: 'Basado en tus respuestas sobre actividades realizadas en el último año.', targets: [],
  });

  const apts = entries(ctx, 'aptitude').filter((x) => x.e.conf >= 0.35);
  const strong = apts.filter((x) => x.e.est >= 0.66).sort((a, b) => b.e.est - a.e.est).slice(0, 3);
  if (strong.length) out.push({
    id: 'h:apt_strong', text: `Fortalezas que aparecen de forma consistente: ${list(strong.map((x) => APTITUDES[x.key as keyof typeof APTITUDES].toLowerCase()))}.`,
    basis: strong.map((x) => basis(x.e)).join(' '), targets: strong.map((x) => ({ kind: 'aptitude', key: x.key, value: x.e.est })),
  });
  const weak = apts.filter((x) => x.e.est <= 0.38).sort((a, b) => a.e.est - b.e.est).slice(0, 2);
  if (weak.length) out.push({
    id: 'h:apt_weak', text: `Por ahora, ${list(weak.map((x) => APTITUDES[x.key as keyof typeof APTITUDES].toLowerCase()))} parece${weak.length > 1 ? 'n' : ''} costarte más (no implica una limitación permanente).`,
    basis: weak.map((x) => basis(x.e)).join(' '), targets: weak.map((x) => ({ kind: 'aptitude', key: x.key, value: x.e.est })),
  });

  const styles = entries(ctx, 'style').filter((x) => x.e.conf >= 0.3 && Math.abs(x.e.est - 0.5) >= 0.25).sort((a, b) => Math.abs(b.e.est - 0.5) - Math.abs(a.e.est - 0.5)).slice(0, 3);
  if (styles.length) out.push({
    id: 'h:style', text: `Tu forma de trabajo preferida: ${list(styles.map((x) => STYLES[x.key as keyof typeof STYLES][x.e.est > 0.5 ? 1 : 0].toLowerCase()))}.`,
    basis: styles.map((x) => basis(x.e)).join(' '), targets: styles.map((x) => ({ kind: 'style', key: x.key, value: x.e.est })),
  });

  const vals = entries(ctx, 'value').filter((x) => x.e.conf >= 0.3).sort((a, b) => b.e.est - a.e.est).slice(0, 3);
  if (vals.length) out.push({
    id: 'h:values', text: `Lo que más priorizás de una profesión: ${list(vals.map((x) => VALUES[x.key as keyof typeof VALUES].toLowerCase()))}.`,
    basis: vals.map((x) => basis(x.e)).join(' '), targets: vals.map((x) => ({ kind: 'value', key: x.key, value: x.e.est })),
  });

  const dem = entries(ctx, 'demand').filter((x) => x.e.conf >= 0.3);
  const likes = dem.filter((x) => x.e.est >= 0.72).sort((a, b) => b.e.est - a.e.est).slice(0, 3);
  const dislikes = dem.filter((x) => x.e.est <= 0.28).sort((a, b) => a.e.est - b.e.est).slice(0, 3);
  if (likes.length) out.push({ id: 'h:dem_like', text: `Tareas exigentes que disfrutarías o tolerarías bien: ${list(likes.map((x) => demandLabel(ctx.catalog, x.key).toLowerCase()))}.`, basis: likes.map((x) => basis(x.e)).join(' '), targets: likes.map((x) => ({ kind: 'demand', key: x.key, value: x.e.est })) });
  if (dislikes.length) out.push({ id: 'h:dem_dislike', text: `Tareas que probablemente te desmotivarían: ${list(dislikes.map((x) => demandLabel(ctx.catalog, x.key).toLowerCase()))}.`, basis: dislikes.map((x) => basis(x.e)).join(' '), targets: dislikes.map((x) => ({ kind: 'demand', key: x.key, value: x.e.est })) });

  if (ctx.dw.explicit) {
    const names = { A: 'tus aptitudes', B: 'tus intereses', C: 'tu futuro profesional' };
    const top = (['A', 'B', 'C'] as const).slice().sort((a, b) => ctx.dw[b] - ctx.dw[a])[0];
    if (ctx.dw[top] > 0.37) out.push({ id: 'h:weights', text: `En tu decisión pesan algo más ${names[top]}.`, basis: 'Basado en tus dilemas y en el reparto de puntos.', targets: [] });
  }
  return out;
}
