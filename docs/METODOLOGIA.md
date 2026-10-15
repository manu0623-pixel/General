# Metodología de evaluación

Este documento explica qué mide la herramienta, cómo combina la información y cuáles son sus límites.
**No es un diagnóstico psicológico ni una prueba psicométrica validada.** Es una herramienta de exploración
estructurada que reúne evidencia de distinto tipo y la compara, de forma transparente, con perfiles de
referencia de las carreras de la lista provista.

## 1. Marcos de referencia y qué aporta cada uno

| Marco | Qué aporta | Dónde se usa |
|---|---|---|
| **Modelo RIASEC de Holland** (Realista, Investigador, Artístico, Social, Emprendedor, Convencional) | Tipología de intereses por *tipo de actividad*. La congruencia persona–entorno se asocia con desempeño y permanencia (meta-análisis de Nye, Su, Rounds y Drasgow, 2012, *Perspectives on Psychological Science* 7(4); revisión de 2017 en *Journal of Vocational Behavior* 98). | Etapa 2 (bloques de actividades), parte de la dimensión B. |
| **Intereses básicos por áreas** | RIASEC es amplio: dentro de cada tipo hay intereses más específicos (la literatura reciente propone escalas de intereses básicos anidadas en RIASEC). | 20 áreas de interés (tecnología, salud, música, derecho…), dimensión B. |
| **Teoría Social Cognitiva de la Carrera** (Lent, Brown y Hackett, 1994) | Los intereses se apoyan en la autoeficacia y en las expectativas de resultado; ambos pueden desarrollarse. | Se separa autoeficacia (autoevaluación) de capacidad observada, y se estima el *potencial* con la facilidad para aprender + interés. |
| **Ajuste persona–entorno** | El ajuste se evalúa también con las *condiciones y tareas reales* del trabajo, no solo con los temas. | Etapa 4 (estilo de trabajo) y etapa 7 (exigencias reales). |
| **Valores y preferencias laborales** | Qué se busca de una profesión (ingresos, estabilidad, impacto, autonomía…). Las prioridades se revelan mejor con elecciones forzadas que con escalas. | Etapa 5: importancia declarada + elecciones forzadas entre valores. |
| **Toma de decisiones vocacionales** | Verificar hipótesis antes de decidir; sostener la decisión con experiencias concretas. | Etapa 9 (verificación) y experiencias prácticas posteriores. |

No se combinan modelos “porque sí”: cada uno alimenta una parte distinta de la comparación (ver §4).

## 2. Tipos de evidencia

Cada respuesta se transforma en una o más **evidencias**: un valor 0–1 sobre una dimensión concreta, con un
**tipo** y un **peso de confiabilidad**. Lo observado o demostrado pesa más que lo declarado.

| Tipo | Ejemplo | Peso base |
|---|---|---|
| Preferencia declarada | “Me interesa resolver problemas con números” | 1,0 |
| Autoevaluación | “Comparado con otros, me va bien en lógica” | 0,6 |
| Aptitud observada en ejercicio | Ejercicio de razonamiento con respuesta correcta y criterio explícito | 1,2 por ítem |
| Experiencia demostrada | Relato concreto con resultado, reconocimiento, sostenimiento | 1,5 × calidad |
| Elección en escenario | Elección forzada entre dos trabajos | 1,3 |
| Conducta real reciente | “En el último año hice un curso de esto” | 1,4 |
| Experiencia práctica de verificación | Registro posterior al informe | 1,8 × 0,6 |
| Señal automática de texto | Palabra clave detectada en una respuesta abierta | 0,3 |
| Corrección en la verificación | Hipótesis marcada como incorrecta | 2,0 |
| Factor práctico externo | “Necesito trabajar mientras estudio” | *no afecta la afinidad* |

También se distinguen:
- **Habilidades no desarrolladas**: la opción “No tuve oportunidad de comprobarlo” no genera evidencia negativa;
  se informa como hipótesis abierta.
- **Hipótesis**: afirmaciones derivadas de la evidencia que la persona confirma o corrige en la etapa 9.

### Estimación
Para cada dimensión: `estimación = (0,5 × 1 + Σ valor·peso) / (1 + Σ peso)`. El término 0,5×1 es un *prior* neutro
que impide que una sola respuesta determine el resultado. La **confianza** es `Σ peso / (Σ peso + 1,5)`.

### Ajustes de contexto (sin cambiar criterios)
- Si después de un ejercicio fallado la persona indica nervios, falta de familiaridad o de conocimientos previos,
  el peso de esos ejercicios se multiplica por 0,6 (dificultad real ≠ nervios ≠ falta de base).
- Las aclaraciones de contradicciones reajustan el peso de las evidencias en conflicto (ver §5).

## 3. Etapas del cuestionario adaptativo

1. **Exploración inicial**: situación, actividades espontáneas, curiosidad, tipos de problema, materias (con
   seguimiento del *porqué*: tema, facilidad, docente, grupo…), materias difíciles (*por qué costó*), tareas
   tediosas, expectativas, experiencias de satisfacción y condiciones prácticas.
2. **Intereses**: 2 bloques RIASEC fijos y hasta 2 adicionales solo si el perfil es ambiguo; 4 bloques de áreas;
   verificación de *interés genuino vs. teórico* (conducta en el último año) para las áreas más altas; elecciones
   forzadas entre áreas casi empatadas.
3. **Aptitudes**: autoevaluación y luego ejercicios breves. Aptitudes de base (lógica, cuantitativa, verbal,
   espacial, aprendizaje) + las más relevantes para las carreras plausibles (patrones, pensamiento crítico,
   sistemas, interpretación, planificación, creatividad; percepción auditiva solo si la música es plausible).
   Dificultad adaptativa (2 → 3 si acierta, → 1 si no; tercer ítem si los resultados discrepan). Capacidades no
   evaluables en pantalla (manual, física, interpersonal, idiomas, formación musical) se exploran con experiencias.
4. **Estilo de trabajo**: escenarios bipolares (autonomía, colaboración, estructura, variedad, teoría/práctica,
   investigar/ejecutar, incertidumbre, paciencia, responsabilidad, interior/exterior), con ítems de consistencia,
   “depende del contexto” con pregunta de seguimiento, y preferencia por personas/datos/objetos/ideas.
5. **Valores**: importancia declarada + elecciones forzadas fijas y adaptativas + dos dilemas que informan el peso
   de las dimensiones + reparto opcional de 100 puntos.
6. **Evidencia**: ejemplos concretos de las fortalezas declaradas (con pedido de más detalle si la respuesta es
   general), actividad sostenida y aprendizaje autónomo.
7. **Exigencias reales**: escenarios neutrales (no nombran carreras) sobre tareas cotidianas. Se eligen por
   **valor de información**: `(0,6·relevancia + 0,4·poder de discriminación) × (1 − confianza)` sobre las 20
   carreras más plausibles (pesos *softmax*). Mínimo 6, máximo 14.
8. **Profundización**: comparación de “semanas de trabajo” entre opciones empatadas, exigencias que más las
   diferencian, ejercicios faltantes para aptitudes centrales, interés genuino en el área principal, nivel de
   formación (corta/larga) y docencia cuando corresponde, y orientaciones internas. Máximo 16 preguntas.
9. **Verificación**: hipótesis con su base de evidencia. Si alguna se marca como incorrecta, se reabre la
   profundización y se verifica de nuevo (máximo 2 rondas).

Las **contradicciones** (§5) pueden aparecer en cualquier momento y hacen volver sobre dimensiones anteriores.
Cada pregunta guarda una razón pública (sin nombres de carreras) y una razón técnica, visible en el registro.

## 4. Puntuación

Todas las subpuntuaciones están en 0–1 (0,5 = neutro/sin información).

**A. Aptitudes y potencial** = promedio ponderado de las estimaciones de aptitud según los pesos de la carrera.
- *Preparación actual*: igual, usando solo evidencia observada (ejercicios, experiencias, prácticas).
- *Potencial*: A + 0,25·(aprendizaje − 0,5) + 0,2·(B − 0,5).

**B. Intereses y compatibilidad personal** = 0,22·RIASEC + 0,28·áreas + 0,28·exigencias + 0,12·estilo + 0,10·valores
intrínsecos (creatividad, impacto, desafío, variedad, especialización, autonomía, reconocimiento) + ajuste por
evidencia específica de la carrera (comparaciones y experiencias; acotado a ±0,12, con encogimiento).

**C. Futuro profesional** = 0,6·valores extrínsecos (ingresos, estabilidad, emprender, crecimiento, flexibilidad,
remoto, movilidad, equilibrio) + 0,4·inserción laboral estimada. Solo cuentan los valores que la persona considera
importantes: no valorar algo no vuelve peor a una carrera que lo ofrece.

**Global** = wA·A + wB·B + wC·C′ − penalización, con:
- pesos iguales por defecto; se ajustan solo con prioridades explícitas (dilemas y reparto de puntos), acotados
  a 20 %–50 %;
- C′: el futuro profesional se atenúa cuando min(A, B) es bajo (una carrera no queda primera por sus ingresos si
  sus actividades centrales no coinciden con tus intereses o capacidades);
- penalización 0,6·max(0, 0,45 − min(A, B)): un gran entusiasmo no compensa del todo una aptitud central muy baja,
  ni viceversa.

**Incertidumbre**: semiancho por dimensión `0,02 + 0,16·(1 − cobertura)` (C suma la incertidumbre de los datos de la
carrera); el global combina las tres. Confianza alta < 0,07, media < 0,11, baja en otro caso.
Dos carreras están en **empate técnico** si su diferencia es < 0,025 o < 0,3·(suma de semianchos).
Los valores se muestran redondeados a múltiplos de 5 %.

**Viabilidad práctica** (separada de la afinidad): requisitos (nodocentes, título previo, formación musical previa),
costos de materiales, carga horaria vs. trabajo, guardias, exigencia física, duración vs. años disponibles,
traslado a La Plata y oferta no confirmada.

**Datos insuficientes**: una carrera con `dataStatus: "insuficiente"` no recibe puntuación ni conclusiones.

## 5. Contradicciones

Se detectan comparando evidencias de distinto tipo sobre la misma dimensión:
autoevaluación alta vs. ejercicios bajos (y al revés), interés alto por un área vs. rechazo de sus tareas
centrales, valor declarado vs. elecciones forzadas, ítems de estilo opuestos, exigencia declarada como tediosa
vs. reacción al escenario. Cada una genera una pregunta de aclaración cuya respuesta ajusta pesos de evidencia
(por ejemplo, “me puse nervioso/a” reduce el peso de esos ejercicios; “quizás me sobreestimé” reduce el de la
autoevaluación). Nunca se cambian los criterios de puntuación.

## 6. Experiencias prácticas

Tras el informe, cada finalista propone experiencias (de su familia de carreras + revisión del plan oficial +
conversación con estudiantes o graduados), cada una con una hipótesis. El registro (interés, satisfacción,
dificultad, deseo de seguir, aprendizajes) produce evidencia sobre la carrera (con encogimiento: una experiencia
mueve ≈ 0,05; dos consistentes ≈ 0,1) y sobre las exigencias involucradas, que afectan a todas las carreras que las
comparten. Cada registro guarda una foto del ranking y se muestra qué cambió y por qué.

## 7. Perfiles de referencia de las carreras

Están en `src/data/` (JSON editable, separado de la lógica):
- `families.json`: perfiles por familia (RIASEC, áreas, aptitudes, estilo, exigencias, futuro, materias típicas,
  tareas, entornos, dificultades, experiencias).
- `modifiers.json`: ajustes por tipo de título (profesorado, licenciatura y profesorado, tecnicatura).
- `careers.json`: cada carrera de la lista con facultad, familia, nivel, duración, estado de los datos,
  restricciones, ajustes propios, orientaciones, notas y fuentes.
- `demands.json`: catálogo de exigencias reales con escenarios neutrales.

**Estado de la información**: la mayoría de los perfiles son **estimados** a partir de conocimiento general de cada
disciplina. Duraciones, materias y perspectivas laborales deben verificarse en los planes oficiales. Los atributos de
futuro son **estimaciones cualitativas relativas** (no salarios). Se verificó con fuentes públicas: facultad y
destinatarios de la Lic./Tec. en Gestión de Recursos para Instituciones Universitarias (Fac. de Cs. Jurídicas y
Sociales), la Licenciatura en Fonoaudiología y la Tecnicatura en Gestión Comunitaria del Riesgo (Facultad de Trabajo
Social). No se pudo confirmar la oferta vigente de la Tecnicatura Superior Universitaria en Producción Agropecuaria.
No se encontró un informe oficial argentino reciente con inserción e ingresos por carrera; fuentes recomendadas para
verificar: planes de estudio de cada facultad, EPH (INDEC) y observatorios/encuestas de graduados universitarios.

## 8. Límites

- Pocos ejercicios, breves: aportan indicios, no mediciones.
- Las ponderaciones son decisiones metodológicas explícitas, no parámetros validados empíricamente.
- El resultado depende de la sinceridad y del momento; se recomienda revisarlo con experiencias prácticas.
- La herramienta puede concluir que dos o más carreras son igualmente compatibles; eso no es una falla.
