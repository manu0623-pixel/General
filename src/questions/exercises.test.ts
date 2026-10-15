import { EXERCISES, mirror, rot90 } from './exercises';

const key = (c: number[][]) => JSON.stringify(c);
function rotations(c: number[][]) {
  const out = [c];
  for (let i = 0; i < 3; i++) out.push(rot90(out[out.length - 1]));
  return new Set(out.map(key));
}

describe('ejercicios', () => {
  it('cada ejercicio cerrado tiene una respuesta correcta entre sus opciones y un criterio explícito', () => {
    for (const e of EXERCISES) {
      expect(e.criterion.length).toBeGreaterThan(5);
      if (!e.open) expect(e.options.map((o) => o.id)).toContain(e.correct);
    }
  });

  it('en los ejercicios espaciales solo la opción correcta es una rotación (las demás son reflejos)', () => {
    for (const e of EXERCISES.filter((x) => x.visual?.kind === 'grid-shapes')) {
      const v = e.visual as { ref: number[][]; options: Record<string, number[][]> };
      const rots = rotations(v.ref);
      const rotating = Object.entries(v.options).filter(([, cells]) => rots.has(key(cells))).map(([id]) => id);
      expect(rotating).toEqual([e.correct]);
      // y los reflejos no coinciden con ninguna rotación (figura quiral)
      expect(rots.has(key(mirror(v.ref)))).toBe(false);
    }
  });
});
