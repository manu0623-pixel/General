# MN HQ: cómo leer y escribir la base

MN HQ es el panel de Malu: https://claude.ai/artifact/UCcwSxsqafoTpzR5c5TbGr
Su base tiene tres colecciones: `brands`, `tasks` y `posts`. Lo que el equipo escribe ahí aparece
en vivo en el panel (Oficina, Tareas y Studio). Si no lo escribís ahí, Malu no lo ve.

## Herramienta
Usá la herramienta de base de datos del artifact (`ArtifactData`, a veces llamada `read_db` /
`write_db`) con `url` = el link de arriba.

- Leer: `list` sobre la colección, o `get` con `doc_id`. Cada documento trae su `version`.
- Crear: `set` con un `doc_id` nuevo y sin `if_version`.
- Modificar: `update` con `if_version` = la versión que leíste. Si falla porque cambió, volvé a
  leer y rehacé el cambio (nunca pises lo que editó Malu).
- Varias escrituras juntas: `batch` (una sola aprobación).
- Sin esa herramienta: entregá el JSON del documento en la conversación y avisá que falta cargarlo.

**Antes de escribir, leé el documento actual** (Malu edita desde el panel), pero una sola vez.

### Lecturas baratas
- Marca: `get` `brands/<id>`. Una vez por conversación.
- Pendientes: `query` sobre `tasks` con `where: [["status","!=","hecho"]]` y `limit: 20`.
- Cambios pedidos: `query` sobre `tasks` y `posts` con `where: [["feedback","!=",""]]`.
- Un post: `get` por id. **No listes `posts` completos**: cada uno trae sus slides.
- Escrituras de un mismo pedido: un solo `batch`.

## `brands/<id>` (libro de marca resumido)
| Campo | Tipo | Uso |
|---|---|---|
| `name`, `handle` (sin @), `bio` | texto | Lo que se ve en el perfil simulado |
| `palette` | lista de HEX `#RRGGBB` | El primero es el fondo base, el segundo el acento |
| `headFont`, `accentFont`, `bodyFont` | una de: Inter, Montserrat, Space Grotesk, Archivo Black, Bebas Neue, Cinzel, Playfair Display, DM Serif Display, Yellowtail, Dancing Script, Caveat, JetBrains Mono | Tipografías del Studio |
| `voice` | texto | Tono de voz: cómo habla la marca, con ejemplos |
| `audience` | texto | A quién le habla |
| `pillars` | texto | Pilares de contenido (uno por línea) |
| `offer` | texto | Productos/servicios y precios confirmados |
| `avoid` | texto | Lo que nunca hay que decir o mostrar |
| `website`, `instagram` | URL | Fuentes |
| `memory` | texto | Memoria del equipo: preferencias y aprendizajes de Malu, una línea cada uno («sin emojis», «ganchos con pregunta»). Leela siempre; sumá líneas cortas, no la reescribas |
| `order` | número | Orden en el panel |

Si un campo de libro de marca (`voice`, `audience`, `pillars`, `offer`) está vacío, la marca **no
tiene libro de marca**: el primer paso es la Estratega.

## `tasks/<id>` (tablero)
| Campo | Tipo | Uso |
|---|---|---|
| `title` | texto ≤120 | Qué hay que lograr, en una frase |
| `brand` | id de marca | |
| `status` | `pendiente` · `en-curso` · `para-aprobar` · `hecho` | Columna del tablero |
| `agents` | lista de ids de área | Quién trabaja (ver abajo) |
| `route` | texto | Recorrido anunciado: `Redes → Creativo → Studio` |
| `detail` | texto | El brief: objetivo, contexto, datos, criterio de terminado |
| `due` | `AAAA-MM-DD` o vacío | |
| `by` | id | Quién la creó (`ceo` si la pidió Malu desde el panel) |
| `destino` | `claude-code` o vacío | Si necesita código (sitios, reels en Remotion) |
| `prompt` | texto | Frase exacta para pegar en Claude Code (si `destino` = `claude-code`) |
| `result` | texto | Resumen de lo entregado y dónde quedó |
| `links` | lista de `{label, url}` | Canva, Drive, sitio, PR, etc. |
| `feedback` | texto | Cambios que pidió Malu. **Leelo y resolvelo antes que nada.** |
| `log` | lista de `{at, by, text}` | Bitácora: una línea corta por área que trabajó (no borres las anteriores) |
| `createdAt`, `updatedAt` | ISO 8601 | Siempre actualizá `updatedAt` |

Ids de área: `director`, `estratega-marketing`, `creativo`, `video`, `redes-sociales`,
`desarrollo-web`, `legal`, `asistente`.

Tareas con `by: "ceo"` y `agents` vacío son **pedidos nuevos de Malu desde el panel**: el Director
las deriva (completa `agents`, `route`, `detail` y pasa a `en-curso`).

## `posts/<id>` (Studio)
| Campo | Tipo | Uso |
|---|---|---|
| `brand` | id de marca | |
| `title` | texto | Nombre interno |
| `format` | `post45` · `post11` · `historia` | Carrusel/post 4:5, cuadrado o historia 9:16 |
| `status` | `borrador` · `para-aprobar` · `aprobado` · `programado` · `publicado` | El equipo deja todo en `para-aprobar` |
| `caption` | texto ≤2200 | Copy. La primera línea (≤125 caracteres) es el gancho |
| `hashtags` | texto | 5 a 15, separados por espacio |
| `date` | `AAAA-MM-DDTHH:MM` o vacío | Fecha y hora sugerida |
| `slides` | lista (1 a 10) | Cada imagen o pantalla, ver abajo |
| `by` | id de área | Quién lo armó |
| `note` | texto | Nota del equipo para Malu: qué decidieron y por qué (1–3 frases) |
| `taskId` | id de tarea | Tarea de origen |
| `feedback` | texto | Cambios que pidió Malu. **Resolvelos y vaciá el campo** |
| `log` | lista de `{at, by, text}` | Bitácora |
| `sample` | bool | Solo para ejemplos; el equipo lo deja en `false` |
| `createdAt`, `updatedAt` | ISO 8601 | |

Cada `slide`:
`{kicker, headline, sub, align: "top"|"center"|"bottom", bg, fg, ac, headFont?, accentFont?, sign: true, imageUrl?, overlay?}`

- `headline` ≤ 60 caracteres ideal (máx. 140). Una palabra entre `*asteriscos*` se destaca con el
  color y la fuente de acento. Una sola palabra o dos por slide.
- `kicker` ≤ 30 caracteres, `sub` ≤ 120.
- `bg`, `fg`, `ac` son HEX de la paleta de la marca. **Contraste `fg` sobre `bg` ≥ 4.5:1.**
- Historias: dejá libre el 13 % de arriba y de abajo (zonas seguras).
- Si Creativo hizo la pieza en Canva, poné el PNG exportado en `imageUrl` (o subilo como asset) y el
  texto en el slide solo si no está ya en la imagen.

## Ejemplo de escritura (pedido de post)
```json
{"op":"set","collection":"tasks","doc_id":"t-2026-10-14-promo-primavera","data":{
 "title":"Post promo de primavera para Artesian","brand":"artesian-helados","status":"en-curso",
 "agents":["redes-sociales","creativo"],"route":"Redes → Creativo → Studio",
 "detail":"Objetivo: que vengan a probar los sabores frutales. 3 slides 4:5. Terminado = post en Studio para aprobar.",
 "by":"director","createdAt":"2026-10-14T10:00:00Z","updatedAt":"2026-10-14T10:00:00Z",
 "log":[{"at":"2026-10-14T10:00:00Z","by":"director","text":"Derivado a Redes y Creativo"}]}}
```
Al terminar: el post en `posts/` con `status: "para-aprobar"` y `taskId`, y la tarea en
`para-aprobar` con `result` y una línea más en `log`.
