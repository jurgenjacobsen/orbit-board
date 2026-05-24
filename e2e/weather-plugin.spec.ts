import { test, expect, _electron as electron } from '@playwright/test';

let app: Awaited<ReturnType<typeof electron.launch>>;
let page: Awaited<ReturnType<typeof app.firstWindow>>;

test.beforeEach(async () => {
  app = await electron.launch({
    args: ['.'],
    env: { NODE_ENV: 'development' },
    timeout: 30000,
  });

  page = await app.firstWindow();
  await page.waitForLoadState('networkidle');
});

test.afterEach(async () => {
  if (app) await app.close();
});

test.describe('Weather Plugin', () => {
  test('should show weather plugin in plugins page', async () => {
    await page.getByRole('link', { name: /plugins/i }).click();
    await expect(page.locator('text=Weather Plugin')).toBeVisible();
    await expect(page.locator('text=Shows current weather in the calendar page.')).toBeVisible();
  });

  test('should show weather widget in calendar page', async () => {
    // Navigate to Calendar
    await page.getByRole('link', { name: /calendar/i }).click();
    
    // Wait for the weather widget to appear
    const weatherWidget = page.locator('text=22 degrees');
    await expect(weatherWidget).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Sunny')).toBeVisible();
  });
});
