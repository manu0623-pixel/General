# Agregar el Chat del equipo a la app de escritorio MN HQ

Pegá todo este texto en Claude Code, abierto en la carpeta de la app de escritorio MN HQ.

---

Quiero agregar una sección **Chat** a esta app (MN HQ). Antes de escribir código, revisá cómo está
hecha la app (tecnología, dónde guarda marcas, tareas y posts, cómo se navega entre secciones) y
contame en pocas líneas cómo lo vas a integrar. Esperá mi OK.

## Qué tiene que hacer
Una pestaña **Chat** igual a la que ya existe en la versión web de MN HQ. El código de referencia
(pestaña Chat, objeto `MODES`, funciones `chatInput`, `sendChat`, `renderChat*`) está en:
https://raw.githubusercontent.com/manu0623-pixel/General/claude/admiring-dijkstra-hcxeby/mn-hq/app/mn-hq.html
Copiá de ahí **textualmente** las instrucciones de cada modo (`rules` y `starter`).

- Selector de **marca** (las marcas que ya tiene la app) y de **modo**:
  1. **Analizar estética** (Estratega): adjunta capturas del Instagram (perfil, feed, logo) y
     devuelve el documento de estética y criterios.
  2. **Prompt de web** (Desarrollo): arma conmigo el prompt para Claude Code, con la estética de la
     marca completa adentro.
  3. **Director**: cualquier otra cosa.
- Cada mensaje se manda así: primero un turno con las instrucciones del modo + los datos de la marca
  + su documento de estética, después **solo los últimos 14 mensajes** de la conversación (para
  gastar menos).
- **Modelo fijo: `claude-opus-5-5`.**
- Respuesta en vivo (streaming), botón Detener e indicador «Pensando…».
- Adjuntar imágenes (JPG, PNG, WebP; hasta 5 por mensaje) en el modo Analizar estética.
- Debajo de cada respuesta:
  - **Copiar**.
  - **Guardar como estética de la marca** (modo estética): guarda el contenido del bloque
    ```md``` de la respuesta (o toda la respuesta si no hay bloque) en el campo `estetica` de la
    marca.
  - **Guardar prompt para Claude Code** (modo web): crea o actualiza una tarea «Sitio de <marca>»
    con `destino: "claude-code"`, `agents: ["desarrollo-web"]` y el prompt en `prompt`, y lo copia
    al portapapeles.
- Las conversaciones se guardan por marca (`brand`, `mode`, `title`, `turns`) y se pueden retomar o
  borrar.
- Agregá el campo `estetica` a la edición de marca para poder verlo y corregirlo.

## Cómo llamar a Claude (importante por el costo)
Mostrame las opciones que haya para esta app y recomendame una antes de implementar:
1. **Claude Code instalado en la compu** (`claude -p --model claude-opus-5-5 --output-format stream-json`):
   usa mi plan de Claude, sin costo aparte. Es la opción preferida si la app puede ejecutar
   comandos locales.
2. **API de Anthropic** con una API key: se paga aparte, por uso. La key nunca va en el código ni en
   el repo: en variables de entorno o en el llavero del sistema.

## Al terminar
Probalo de punta a punta: mandá un mensaje en cada modo, adjuntá una imagen, guardá una estética y
un prompt, y mostrame capturas. No borres ni cambies datos existentes de marcas, tareas o posts.
