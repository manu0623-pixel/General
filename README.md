# Brújula Vocacional UNLP

Aplicación web de orientación vocacional **profunda, adaptativa y personalizada** para elegir entre las carreras
de la Universidad Nacional de La Plata provistas en la lista original.

- Evaluación en 9 etapas que se adapta a cada respuesta (intereses, aptitudes con ejercicios, estilo de trabajo,
  valores con elecciones forzadas, evidencia concreta, exigencias reales de cada carrera, profundización y
  verificación de hipótesis).
- Puntuación transparente en tres dimensiones equilibradas —**aptitudes**, **intereses** y **futuro profesional**—
  con incertidumbre, empates técnicos y viabilidad práctica informada por separado.
- Informe con perfil, ranking, comparación de finalistas, fortalezas, áreas de desarrollo, alternativas menos
  compatibles, recomendación (o empate) y plan de verificación.
- Experiencias prácticas para las finalistas que actualizan el análisis y muestran qué cambió.
- Varias sesiones: guardado automático local, reanudación en la misma pregunta, historial y corrección de
  respuestas, respaldo y exportación/importación.
- Sin servicios externos ni IA de pago: todo funciona con reglas explícitas en el navegador.

La metodología completa está en [`docs/METODOLOGIA.md`](docs/METODOLOGIA.md).

## Uso

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # versión estática en dist/
```

## Pruebas

```bash
npm test                          # pruebas unitarias y de flujo completo (Vitest)
GEN_FIXTURES=1 npx vitest run src/test/fixtures.test.ts   # regenera el estado usado por e2e
npm run test:e2e                  # pruebas en navegador (Playwright)
```

Las pruebas verifican, entre otras cosas: guardado y recuperación tras cerrar la app, adaptación según respuestas
reales, puntuaciones reproducibles y monótonas, que no se recomienden carreras fuera de la lista, representación de
la incertidumbre y empates, que el informe refleje la evidencia, y que las carreras sin información suficiente no
reciban conclusiones.

## Estructura

| Módulo | Archivo(s) |
|---|---|
| Perfiles de referencia de carreras (editables) | `src/data/*.json` |
| Modelo de carreras y validación | `src/domain/careerModel.ts` |
| Banco de preguntas y ejercicios | `src/questions/bank.ts`, `exercises.ts`, `generators.ts` |
| Motor de adaptación | `src/engine/adaptive.ts` |
| Registro de evidencias y perfil | `src/engine/profile.ts`, `context.ts`, `contradictions.ts` |
| Sistema de puntuación | `src/engine/scoring.ts` |
| Informe e hipótesis | `src/engine/report.ts`, `hypotheses.ts` |
| Experiencias prácticas | `src/engine/experiences.ts`, `actions.ts` |
| Gestión de sesiones y persistencia | `src/engine/session.ts`, `src/storage/persistence.ts` |
| Interfaz | `src/ui/` |

## Editar la lista de carreras

Desde la sección **Carreras** podés excluir opciones o importar un JSON editado (se valida antes de usarse).
También podés editar directamente `src/data/careers.json`: cada carrera referencia una familia de
`families.json` y puede sobrescribir cualquier valor. La lógica de evaluación no depende de qué carreras haya.
