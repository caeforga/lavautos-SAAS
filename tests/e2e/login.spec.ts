import { expect, test } from '@playwright/test';

test('el acceso se adapta a teléfonos angostos sin recortar controles', async ({ page }) => {
  for (const width of [320, 393]) {
    await page.setViewportSize({ width, height: 852 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tu negocio empieza aquí' })).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    const geometry = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      email: document.querySelector<HTMLInputElement>('input[type=email]')?.getBoundingClientRect().toJSON(),
      demo: document.querySelector<HTMLButtonElement>('.login-demo')?.getBoundingClientRect().toJSON(),
    }));
    expect(geometry.content).toBeLessThanOrEqual(geometry.viewport);
    for (const control of [geometry.email, geometry.demo]) {
      expect(control).toBeDefined();
      expect(control!.left).toBeGreaterThanOrEqual(0);
      expect(control!.right).toBeLessThanOrEqual(width);
    }
    await expect(page.getByRole('button', { name: 'Explorar demostración' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Explorar demostración' }).click();
  await expect(page.getByRole('heading', { name: 'Todo en orden.' })).toBeVisible();
});

test('en escritorio mantiene separadas la portada y el formulario', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tu negocio empieza aquí' })).toBeVisible();
  const layout = await page.evaluate(() => ({
    story: document.querySelector('.login-story')!.getBoundingClientRect().toJSON(),
    form: document.querySelector('.login-card')!.getBoundingClientRect().toJSON(),
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(layout.story.right).toBeLessThanOrEqual(layout.form.left);
  expect(layout.form.right).toBeLessThanOrEqual(layout.viewport);
  expect(layout.content).toBeLessThanOrEqual(layout.viewport);
});

test('explica un fallo de red al ingresar sin mostrar Failed to fetch', async ({ page }) => {
  await page.route('**/auth/v1/token?grant_type=password', route => route.abort('failed'));
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill('usuario@ejemplo.com');
  await page.getByLabel('Contraseña').fill('contraseña-de-prueba');
  await page.getByRole('button', { name: 'Ingresar a mi lavadero' }).click();

  const alert = page.getByRole('alert').filter({ hasText: 'No pudimos comunicarnos' });
  await expect(alert).toContainText('No pudimos comunicarnos con el servicio de acceso');
  await expect(alert).not.toContainText('Failed to fetch');
});
