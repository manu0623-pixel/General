// Convierte el HTML autocontenido al formato de página publicable: sin <html>/<head>/<body> propios,
// con el título y los estilos al comienzo del archivo.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-artifact/index.html', 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n');
const fonts = [...html.matchAll(/<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/g)].map((m) => m[0]).join('\n');
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0].replace('<script type="module" crossorigin>', '<script type="module">'));
const out = [
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  fonts,
  styles,
  '<div id="root"></div>',
  ...scripts,
].join('\n');
writeFileSync('dist-artifact/brujula-vocacional.html', out);
console.log('dist-artifact/brujula-vocacional.html', (out.length / 1024).toFixed(0), 'KB');
