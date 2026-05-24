import { test, expect, _electron as electron } from '@playwright/test';

let app: Awaited<ReturnType<typeof electron.launch>>;
let page: Awaited<ReturnType<typeof app.firstWindow>>;

interface Window extends globalThis.Window {
    api: unknown
}

test.beforeEach(async () => {
  app = await electron.launch({
    args: ['.'],
    env: { NODE_ENV: 'development' },
    timeout: 30000,
  });

  page = await app.firstWindow();
  await page.waitForLoadState('networkidle');

  // Wait for preload api to be available
  await page.waitForFunction(() => {
    return !!(window as unknown as Window).api;
  }, { timeout: 10000 });
});

test.afterEach(async () => {
  if (app) await app.close();
});

test.describe('Plugins Page', () => {
  test('should navigate to plugins page', async () => {
    // Click on Plugins link in sidebar
    await page.getByRole('link', { name: /plugins/i }).click();
    
    // Check if header is correct
    await expect(page.locator('h2')).toHaveText(/plugins/i);
    
    // We now have a sample plugin by default in development
    await expect(page.locator('text=Weather Plugin')).toBeVisible();
  });

  test('should have g l keyboard shortcut', async () => {
    await page.keyboard.press('g');
    await page.keyboard.press('l');
    
    await expect(page.locator('h2')).toHaveText(/plugins/i);
  });
});
