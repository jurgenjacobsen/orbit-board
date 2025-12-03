import { test, expect, _electron as electron } from '@playwright/test';

let app: Awaited<ReturnType<typeof electron.launch>>;
let page: Awaited<ReturnType<typeof app.firstWindow>>;

test.beforeEach(async () => {
  app = await electron.launch({
    args: ['.'],
    env: { NODE_ENV: 'development' }
  });

  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  // Wait for preload to be available (safe version)
  await page.waitForFunction(() => {
    return !!(window as any).electron;
  });
});

test.afterEach(async () => {
  if (app) await app.close();
});

test('app launches', async () => {
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});

test('preload bridge exists', async () => {
  const hasBridge = await page.evaluate(() => {
    return !!(window as any).electron;
  });

  expect(hasBridge).toBe(true);
});
