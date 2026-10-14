# MN HQ — equipo de agentes de MN Implementaciones

| Carpeta | Qué es |
|---|---|
| `app/mn-hq.html` | Código del panel MN HQ (Oficina · Tareas · Studio) publicado en claude.ai |
| `skill/equipo-mn/` | Skill del Director + una ficha por área + referencia de la base de MN HQ |
| `equipo-mn.zip` | La misma skill lista para subir a claude.ai |

## Por qué los agentes trabajaban mal
1. **Las fichas de cada área solo existían en la compu** (`MN/equipo/agentes/`). En la app o en la
   nube el Director tenía una tabla de una línea por área y trabajaba a ciegas.
2. **La skill mandaba a guardar en Supabase**, pero MN HQ usa la base del artifact. Lo que hacía el
   equipo no aparecía en el panel.
3. **No había formato de datos**: aunque escribieran, no sabían qué campos lleva un post o una tarea.
4. **No había ida y vuelta**: Malu no podía pedir cambios desde el panel.
5. **Las marcas no tenían libro de marca en la base**, así que cada pieza salía genérica.
6. Video y Asistente estaban en la skill pero no en el panel.

## Qué cambió
- **Skill nueva** con protocolo fijo: entender → anunciar recorrido → crear tarea → ejecutar cada área
  con su ficha → control de calidad → presentar. Las 7 fichas vienen dentro de la skill.
- **Fichas por área** con pasos, plantillas, checklist y traspaso. Sirven también como subagentes de
  Claude Code (copiar `skill/equipo-mn/agentes/*.md` a `.claude/agents/`).
- **`referencia/mn-hq-datos.md`**: cómo leer y escribir marcas, tareas y posts en MN HQ.
- **Panel MN HQ**:
  - «Pedile al equipo»: pedidos desde el panel que el Director después deriva.
  - «Pedir cambios» en tareas y posts (queda en `feedback` + bitácora) y «Aprobar» tareas.
  - Detalle de tarea: brief, recorrido, resultado, links, frase para Claude Code y bitácora.
  - Actividad reciente, contadores de pedidos sin derivar y cambios pedidos.
  - Libro de marca editable (tono, público, pilares, servicios, evitar) y aviso si falta.
  - Áreas Video y Asistente, Metricool marcado como conectado, estado «En cola» vs «Trabajando».
  - Arreglos: nombre de marca equivocado en la bandeja y contraste mal calculado en el editor.

## Ahorro de tokens (ideas tomadas de Gentle-AI)
No se instaló Gentle-AI: es un entorno para agentes que programan (binario, hooks, revisiones) y
sumaría contexto en cada sesión. Se copiaron sus reglas de ahorro en la skill:
- **Tamaño primero:** lo chico (un post, un copy) se hace en línea, sin tarea ni traspasos.
- **Subagentes solo con motivo** (investigación pesada o piezas en paralelo), nunca uno por área.
- **Brief por referencia:** el `detail` de la tarea es el único brief; nadie lo reescribe.
- **Memoria:** la marca en MN HQ (`memory` + libro) evita volver a analizar y a corregir lo mismo.
- **Lecturas y escrituras mínimas:** `get` por id, `query` filtrada y un solo `batch` por pedido.
- **Salida corta:** una versión, cierre de 3 líneas, nada repetido en el chat.
- Asistente corre con un modelo más chico (`model: haiku`) cuando se usa como subagente.

Gentle-AI sí puede valer la pena **solo para Desarrollo en Claude Code** (memoria Engram entre
sesiones de programación). Es opcional.

## Cómo instalar la skill nueva
1. claude.ai → Configuración → Capacidades → Skills → reemplazá `equipo-mn` subiendo `equipo-mn.zip`.
2. En la compu (opcional): copiá `skill/equipo-mn/agentes/*.md` a `MN/.claude/agents/`.
3. Probá: «Usá la skill equipo-mn. Revisá MN HQ: derivá los pedidos nuevos y avanzá las tareas en curso.»
