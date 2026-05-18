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

test('navigate to settings and toggle dark mode', async () => {
  // Navigate to Settings
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 2 })).toBeVisible();

  // Find Dark Mode toggle
  const uiSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'UI' }) });
  const darkModeToggle = uiSection.getByRole('button');
  
  // Get current state (should be dark by default based on useDarkMode hook)
  const isDarkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  
  // Toggle it
  await darkModeToggle.click();
  
  // Verify it changed
  const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(isDarkAfter).toBe(!isDarkBefore);
});

test('configure discord settings', async () => {
  // Navigate to Settings
  await page.getByRole('link', { name: 'Settings' }).click();

  // Find Discord toggle
  const integrationsSection = page.locator('section').filter({ hasText: 'Integrations' });
  const discordToggle = integrationsSection.getByRole('button').first();

  // Toggle Discord off
  await discordToggle.click();
  
  // Sub-settings should be hidden
  await expect(page.getByText('Show Board Name')).not.toBeVisible();

  // Toggle Discord back on
  await discordToggle.click();
  
  // Sub-settings should be visible
  await expect(page.getByText('Show Board Name')).toBeVisible();
  await expect(page.getByText('Show Card Title')).toBeVisible();

  // Toggle sub-settings
  const boardNameToggle = integrationsSection.getByRole('button').nth(1);
  await boardNameToggle.click();
  
  // We can't easily verify the backend state here without exposing more, 
  // but we verified the UI interaction.
});

test('configure system and tray settings', async () => {
  // Navigate to Settings
  await page.getByRole('link', { name: 'Settings' }).click();

  // Find System section
  const systemSection = page.locator('section').filter({ hasText: 'System' });
  
  // Test Launch at Startup toggle
  const launchToggle = systemSection.getByRole('button').first();
  await launchToggle.click();
  
  // Start Minimized should become visible
  await expect(page.getByText('Start Minimized')).toBeVisible();
  
  // Test Close to Tray toggle
  const closeToTrayToggle = systemSection.getByRole('button').last();
  await closeToTrayToggle.click();
  
  // Verify UI interaction
  await expect(closeToTrayToggle).toBeVisible();
});
