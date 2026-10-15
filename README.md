# Brújula Vocacional

Aplicación web de orientación vocacional **profunda, adaptativa y personalizada** para elegir entre carreras de la
**Universidad Nacional de La Plata (UNLP)** y la **Universidad de Buenos Aires (UBA)**. El informe indica, para cada
carrera, en qué universidad, ciudad y facultad se puede estudiar.

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

## Publicar en Vercel

El proyecto ya incluye `vercel.json` (Vite, salida en `dist/`). Una sola vez:

1. Entrá a <https://vercel.com/new> e iniciá sesión con GitHub.
2. Importá el repositorio `manu0623-pixel/General`.
3. Tocá **Deploy** sin cambiar ninguna opción. Vercel publica la rama principal (`main`) en
   `https://<nombre>.vercel.app`; por eso, antes, fusioná esta rama (`claude/great-turing-wiwudw`) en `main`.
   Las demás ramas reciben enlaces de vista previa automáticos.
4. Desde ahí, cada `git push` a `main` vuelve a publicar la página.

Alternativa por línea de comandos: `npx vercel --prod` (pide iniciar sesión la primera vez).

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
