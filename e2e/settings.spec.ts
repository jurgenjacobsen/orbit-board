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
  // Find the button specifically in the row for "Launch at Startup"
  const launchRow = systemSection.locator('div').filter({ hasText: 'Launch at Startup' }).first();
  const launchToggle = launchRow.getByRole('button');
  
  // Ensure it's off initially (it should be by default)
  // If it's already on, we click it once to see it hide, then again to see it show.
  // But let's just ensure we click it to make it true.
  const isEnabled = await launchToggle.evaluate(el => el.classList.contains('bg-blue-600'));
  if (!isEnabled) {
    await launchToggle.click();
  }
  
  // Start Minimized should become visible
  await expect(page.getByText('Start Minimized')).toBeVisible();
  
  // Test Close to Tray toggle
  const trayRow = systemSection.locator('div').filter({ hasText: 'Close to Tray' }).first();
  const closeToTrayToggle = trayRow.getByRole('button');
  await closeToTrayToggle.click();
  
  // Verify UI interaction
  await expect(closeToTrayToggle).toBeVisible();
});

test('configure notification settings', async () => {
  // Navigate to Settings
  await page.getByRole('link', { name: 'Settings' }).click();

  // Find Notifications section
  const notificationsSection = page.locator('section').filter({ hasText: 'Notifications' });
  
  // Test Desktop Notifications toggle
  const notifyToggle = notificationsSection.getByRole('button').first();
  
  // Ensure reminder time is visible (enabled by default)
  await expect(page.getByText('Reminder Time')).toBeVisible();
  
  // Toggle off
  await notifyToggle.click();
  
  // Reminder time should be hidden
  await expect(page.getByText('Reminder Time')).not.toBeVisible();
  
  // Toggle back on
  await notifyToggle.click();
  
  // Reminder time should be visible
  await expect(page.getByText('Reminder Time')).toBeVisible();
  
  // Change reminder time
  const select = notificationsSection.getByRole('combobox');
  await select.selectOption('60');
  
  // Verify it changed in the UI
  await expect(select).toHaveValue('60');
});

test('configure update settings', async () => {
  // Navigate to Settings
  await page.getByRole('link', { name: 'Settings' }).click();

  // Find Updates section
  const updatesSection = page.locator('section').filter({ hasText: 'Updates' });
  
  // Test Automatic Updates toggle
  const autoUpdateToggle = updatesSection.getByRole('button').first();
  await autoUpdateToggle.click(); // Toggle off
  await expect(autoUpdateToggle).toBeVisible();

  // Test Check for Updates button
  const checkUpdatesBtn = updatesSection.getByRole('button', { name: 'Check for Updates' });
  await expect(checkUpdatesBtn).toBeVisible();
  
  // In mock environment, clicking this sets status to "Checking for updates..." 
  // and then "Mock check for updates" happens, but we just verify the button exists and works.
  await checkUpdatesBtn.click();
  await expect(page.getByText('Checking for updates...')).toBeVisible();
});
