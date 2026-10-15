import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const KEY = 'brujula-vocacional:sesion';

async function answerCurrent(page: Page) {
  const form = page.locator('form').first();
  const radios = form.locator('input[type="radio"]');
  const checks = form.locator('input[type="checkbox"]:not([disabled])');
  const textarea = form.locator('textarea');
  if (await page.locator('table.matrix').count()) {
    const rows = page.locator('table.matrix tbody tr');
    const n = await rows.count();
    for (let i = 0; i < n; i++) await rows.nth(i).locator('input[type="radio"]').nth(3).check();
  } else if (await textarea.count()) {
    await textarea.first().fill('Me gusta programar y armar proyectos con amigos; pasamos meses resolviendo errores hasta que funcionó.');
  } else if (await radios.count()) {
    await radios.first().check();
  } else if (await checks.count()) {
    await checks.first().check();
  }
  await page.locator('form button[type="submit"]').first().click();
}

test('comenzar, responder, recargar y retomar en la misma pregunta', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Comenzar la evaluación' }).click();
  await expect(page.getByText('Etapa 1 de 9')).toBeVisible();
  for (let i = 0; i < 6; i++) await answerCurrent(page);
  const title = await page.locator('.q-title').textContent();
  // Recargar en la misma sección retoma directamente la pregunta pendiente
  await page.reload();
  await expect(page.locator('.q-title')).toHaveText(title!);
  // Volver a abrir la app desde cero muestra el resumen del progreso y permite continuar
  await page.goto('/#inicio');
  await expect(page.getByText('Bienvenido/a de vuelta')).toBeVisible();
  await expect(page.getByText('Hipótesis provisionales')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar donde lo dejaste' }).click();
  await expect(page.locator('.q-title')).toHaveText(title!);
  // Las respuestas siguen ahí
  await page.getByRole('button', { name: 'Respuestas' }).click();
  await expect(page.locator('table.table tbody tr')).toHaveCount(6);
});

test('volver atrás y corregir una respuesta', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Comenzar la evaluación' }).click();
  await answerCurrent(page); // situación: primera opción
  await page.getByRole('button', { name: '← Anterior' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Trabajo y quiero empezar o retomar estudios').check();
  await dialog.getByRole('button', { name: 'Guardar corrección' }).click();
  await page.getByRole('button', { name: 'Respuestas' }).click();
  await expect(page.getByText('Trabajo y quiero empezar o retomar estudios')).toBeVisible();
  await expect(page.getByText('corregida ×1')).toBeVisible();
});

test('una evaluación finalizada muestra el informe, la comparación y las experiencias', async ({ page }) => {
  // Evaluación completa generada con una persona sintética (npm run fixtures)
  const fixture = readFileSync('e2e/fixtures/finalizada.json', 'utf8');
  await page.goto('/');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, fixture]);
  await page.reload();
  await expect(page.getByText('Tu informe está listo')).toBeVisible();
  await page.getByRole('button', { name: 'Ver el informe' }).click();
  await expect(page.getByRole('heading', { name: 'Tu informe vocacional' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Finalistas', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recomendación' })).toBeVisible();
  await page.screenshot({ path: 'test-results/informe.png', fullPage: true });
  await page.getByRole('button', { name: 'Ir a las experiencias prácticas' }).click();
  await page.getByRole('button', { name: 'Registrar cómo me fue' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar y actualizar el análisis' }).click();
  await expect(page.getByText('Registrada').first()).toBeVisible();
  await expect(page.getByText(/Último cambio/)).toBeVisible();
});

test('modo oscuro y vista móvil sin desplazamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.screenshot({ path: 'test-results/inicio-movil-oscuro.png', fullPage: true });
  await page.getByRole('button', { name: 'Comenzar la evaluación' }).click();
  for (let i = 0; i < 3; i++) await answerCurrent(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'test-results/pregunta-movil-oscuro.png', fullPage: true });
});
