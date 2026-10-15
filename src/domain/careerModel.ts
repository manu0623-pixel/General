import careersFile from '../data/careers.json';
import familiesFile from '../data/families.json';
import modifiersFile from '../data/modifiers.json';
import demandsFile from '../data/demands.json';
import { APTITUDE_KEYS, DOMAIN_KEYS, RIASEC_KEYS, STYLE_KEYS, VALUE_KEYS } from './dimensions';
import type {
  CareerCatalog, CareerEntry, CareerVariant, DemandDef, FamilyProfile, InstitutionInfo, ModifierDef, ProfileMaps, ResolvedCareer,
} from './types';

export interface CatalogFile {
  version: string;
  institution?: string;
  institutions?: InstitutionInfo[];
  normalization?: { original: string; action: string; note: string }[];
  careers: CareerEntry[];
}

export function defaultCatalog(): CareerCatalog & { institution?: string; normalization?: CatalogFile['normalization'] } {
  const file = careersFile as unknown as CatalogFile;
  return {
    version: file.version,
    institution: file.institution,
    normalization: file.normalization,
    careers: file.careers,
    institutions: file.institutions,
    families: familiesFile as unknown as FamilyProfile[],
    modifiers: modifiersFile as unknown as Record<string, ModifierDef>,
    demands: demandsFile as DemandDef[],
  };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function mergeSet<T extends Record<string, unknown>>(base: T, set?: Partial<T>): T {
  if (!set) return base;
  return { ...base, ...set };
}

function applyShift(base: Record<string, number>, shift?: Record<string, number>): Record<string, number> {
  if (!shift) return base;
  const out = { ...base };
  for (const [k, d] of Object.entries(shift)) {
    const v = clamp01((out[k] ?? 0) + d);
    if (v <= 0) delete out[k];
    else out[k] = v;
  }
  return out;
}

type Maps = ProfileMaps;
const MAP_KEYS: (keyof Maps)[] = ['riasec', 'domains', 'aptitudes', 'style', 'demands', 'future'];

function cloneMaps(f: Maps): Maps {
  return {
    riasec: { ...f.riasec }, domains: { ...f.domains }, aptitudes: { ...f.aptitudes },
    style: { ...f.style }, demands: { ...f.demands }, future: { ...f.future },
  };
}

/** Normaliza los pesos RIASEC para que sumen 1. */
function normalizeRiasec(r: Maps['riasec']): Maps['riasec'] {
  const total = Object.values(r).reduce((a, b) => a + (b ?? 0), 0);
  if (total <= 0) return r;
  const out: Maps['riasec'] = {};
  for (const [k, v] of Object.entries(r)) out[k as keyof typeof r] = (v ?? 0) / total;
  return out;
}

export function resolveCareer(entry: CareerEntry, catalog: CareerCatalog): ResolvedCareer {
  const family = catalog.families.find((f) => f.id === entry.family);
  if (!family) throw new Error(`Familia inexistente "${entry.family}" en carrera ${entry.id}`);
  let maps = cloneMaps(family);
  let tasks = [...family.tasks];
  let study = [...family.study];
  let experiences = [...family.experiences];

  for (const modId of entry.modifiers ?? []) {
    const mod = catalog.modifiers[modId];
    if (!mod) throw new Error(`Modificador inexistente "${modId}" en carrera ${entry.id}`);
    for (const key of MAP_KEYS) {
      const set = mod.set?.[key] as Record<string, never> | undefined;
      if (set) maps = { ...maps, [key]: mergeSet(maps[key] as Record<string, never>, set) };
      if (key !== 'style') {
        const shift = (mod.shift as Record<string, Record<string, number>> | undefined)?.[key];
        if (shift) maps = { ...maps, [key]: applyShift(maps[key] as Record<string, number>, shift) };
      }
    }
    tasks = [...tasks, ...(mod.extraTasks ?? [])];
    study = [...study, ...(mod.extraStudy ?? [])];
    experiences = [...experiences, ...(mod.experiences ?? [])];
  }

  const o = entry.overrides ?? {};
  for (const key of MAP_KEYS) {
    const ov = o[key] as Record<string, never> | undefined;
    if (ov) maps = { ...maps, [key]: mergeSet(maps[key] as Record<string, never>, ov) };
  }
  maps.riasec = normalizeRiasec(maps.riasec);

  const { overrides: _omit, ...rest } = entry;
  void _omit;
  const inst = (id: string) => catalog.institutions?.find((i) => i.id === id);
  const mainInst = entry.institution ?? 'UNLP';
  const offerings = [
    { institution: mainInst, facultad: entry.facultad, title: entry.name, city: inst(mainInst)?.city ?? '' },
    ...(entry.alsoAt ?? []).map((o) => ({ ...o, city: o.city ?? inst(o.institution)?.city ?? '' })),
  ];
  return {
    ...rest,
    institution: mainInst,
    offerings,
    familyLabel: family.label,
    ...maps,
    futureNote: o.futureNote ?? family.futureNote,
    study: [...(o.study ?? study), ...(entry.extraStudy ?? [])],
    tasks: [...(o.tasks ?? tasks), ...(entry.extraTasks ?? [])],
    settings: o.settings ?? family.settings,
    specializations: o.specializations ?? family.specializations ?? [],
    difficulties: o.difficulties ?? family.difficulties,
    experiences,
  };
}

/** Aplica una variante (orientación) sobre una carrera ya resuelta. */
export function applyVariant(career: ResolvedCareer, variant: CareerVariant): ResolvedCareer {
  const ov = variant.overrides ?? {};
  return {
    ...career,
    domains: { ...career.domains, ...ov.domains },
    demands: { ...career.demands, ...ov.demands },
    aptitudes: { ...career.aptitudes, ...ov.aptitudes },
    riasec: ov.riasec ? normalizeRiasec({ ...career.riasec, ...ov.riasec }) : career.riasec,
  };
}

export function resolveAll(catalog: CareerCatalog, excluded: string[] = []): ResolvedCareer[] {
  return catalog.careers
    .filter((c) => c.active !== false && !excluded.includes(c.id))
    .map((c) => resolveCareer(c, catalog));
}

// ---------------------------------------------------------------------------
// Validación (se usa en tests y al importar un catálogo editado)

export function validateCatalog(catalog: CareerCatalog): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const demandKeys = new Set(catalog.demands.map((d) => d.key));
  const famIds = new Set(catalog.families.map((f) => f.id));
  const checkMap = (where: string, map: Record<string, unknown> | undefined, allowed: readonly string[]) => {
    for (const [k, v] of Object.entries(map ?? {})) {
      if (!allowed.includes(k)) errors.push(`${where}: clave desconocida "${k}"`);
      const val = Array.isArray(v) ? v : [v];
      for (const n of val) if (typeof n !== 'number' || n < 0 || n > 1) errors.push(`${where}.${k}: valor fuera de rango 0..1`);
    }
  };
  const checkMaps = (where: string, m: Partial<Maps>) => {
    checkMap(`${where}.riasec`, m.riasec, RIASEC_KEYS);
    checkMap(`${where}.domains`, m.domains, DOMAIN_KEYS);
    checkMap(`${where}.aptitudes`, m.aptitudes, APTITUDE_KEYS);
    checkMap(`${where}.style`, m.style as Record<string, unknown>, STYLE_KEYS);
    checkMap(`${where}.demands`, m.demands, [...demandKeys]);
    checkMap(`${where}.future`, m.future, [...VALUE_KEYS, 'demanda']);
  };
  for (const f of catalog.families) {
    checkMaps(`familia ${f.id}`, f);
    if (!f.experiences?.length) errors.push(`familia ${f.id}: sin experiencias de verificación`);
    for (const e of f.experiences ?? []) for (const d of e.demands ?? []) if (!demandKeys.has(d)) errors.push(`familia ${f.id}: experiencia ${e.id} usa exigencia desconocida ${d}`);
  }
  for (const [id, m] of Object.entries(catalog.modifiers)) {
    if (m.set) checkMaps(`modificador ${id}.set`, m.set);
  }
  for (const c of catalog.careers) {
    if (ids.has(c.id)) errors.push(`carrera duplicada: ${c.id}`);
    ids.add(c.id);
    if (!c.name) errors.push(`carrera ${c.id}: sin nombre`);
    if (!famIds.has(c.family)) errors.push(`carrera ${c.id}: familia inexistente ${c.family}`);
    for (const m of c.modifiers ?? []) if (!catalog.modifiers[m]) errors.push(`carrera ${c.id}: modificador inexistente ${m}`);
    if (c.overrides) checkMaps(`carrera ${c.id}`, c.overrides);
    for (const v of c.variants ?? []) if (v.overrides) checkMaps(`carrera ${c.id} variante ${v.id}`, v.overrides);
    if (!['verificado', 'estimado', 'insuficiente'].includes(c.dataStatus)) errors.push(`carrera ${c.id}: dataStatus inválido`);
    const instIds = new Set((catalog.institutions ?? []).map((i) => i.id));
    if (instIds.size) {
      if (c.institution && !instIds.has(c.institution)) errors.push(`carrera ${c.id}: institución desconocida ${c.institution}`);
      for (const o of c.alsoAt ?? []) {
        if (!instIds.has(o.institution)) errors.push(`carrera ${c.id}: institución desconocida ${o.institution}`);
        if (!o.facultad) errors.push(`carrera ${c.id}: oferta sin facultad`);
      }
    }
  }
  return errors;
}

export function demandLabel(catalog: CareerCatalog, key: string): string {
  return catalog.demands.find((d) => d.key === key)?.label ?? key;
}
