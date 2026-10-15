import { mkdirSync, writeFileSync } from 'node:fs';
import { defaultCatalog } from '../domain/careerModel';
import { finalize } from '../engine/actions';
import { TECH_PERSONA, runPersona } from './persona';

// Genera los estados usados por las pruebas de navegador (e2e). Solo escribe con GEN_FIXTURES=1.
describe('fixtures e2e', () => {
  it.runIf(process.env.GEN_FIXTURES === '1')('genera una evaluación finalizada', () => {
    const catalog = defaultCatalog();
    const r = runPersona(catalog, TECH_PERSONA);
    const f = finalize(r.state, catalog, '2026-01-01T02:00:00.000Z');
    expect(f.ok).toBe(true);
    mkdirSync('e2e/fixtures', { recursive: true });
    writeFileSync('e2e/fixtures/finalizada.json', JSON.stringify({ app: 'brujula-vocacional', schemaVersion: 1, savedAt: '2026-01-01T02:00:00.000Z', state: f.state }));
  });
});
