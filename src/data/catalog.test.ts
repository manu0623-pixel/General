import { defaultCatalog, resolveAll, validateCatalog } from '../domain/careerModel';

import { ORIGINAL_LIST } from './originalList';

describe('catálogo de carreras', () => {
  const catalog = defaultCatalog();

  it('no tiene errores de estructura ni claves desconocidas', () => {
    expect(validateCatalog(catalog)).toEqual([]);
  });

  it('todas las carreras se resuelven con perfiles completos', () => {
    const resolved = resolveAll(catalog);
    expect(resolved.length).toBe(catalog.careers.length);
    for (const c of resolved) {
      const sum = Object.values(c.riasec).reduce((a, b) => a + (b ?? 0), 0);
      expect(sum).toBeCloseTo(1, 5);
      expect(Object.keys(c.domains).length).toBeGreaterThan(0);
      expect(Object.keys(c.aptitudes).length).toBeGreaterThan(0);
      expect(Object.keys(c.demands).length).toBeGreaterThan(0);
      expect(c.experiences.length).toBeGreaterThan(0);
    }
  });

  it('los profesorados incorporan la exigencia de enseñar frente a grupos', () => {
    const resolved = resolveAll(catalog);
    for (const c of resolved.filter((r) => r.level === 'profesorado')) {
      expect(c.demands.frente_aula).toBe(1);
      expect(c.domains.educacion).toBe(1);
    }
  });

  it('cubre la lista provista (con las normalizaciones documentadas)', () => {
    const mapped = new Set(ORIGINAL_LIST.flatMap(([, ids]) => ids));
    const catalogIds = new Set(catalog.careers.map((c) => c.id));
    // Todo lo de la lista está en el catálogo…
    for (const id of mapped) expect(catalogIds.has(id), id).toBe(true);
    // …y el catálogo no agrega carreras que no estaban en la lista.
    for (const id of catalogIds) expect(mapped.has(id), id).toBe(true);
    const names = catalog.careers.map((c) => c.name.toLowerCase());
    for (const must of ['arquitectura', 'medicina', 'abogacía', 'licenciatura en informática', 'ingeniería en telecomunicaciones', 'licenciatura en fonoaudiología', 'bioquímica', 'farmacia']) {
      expect(names).toContain(must);
    }
    expect(names).not.toContain('facultad de ciencias veterinarias');
  });
});
