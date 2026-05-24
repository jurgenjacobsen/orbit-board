import { test, expect } from '@playwright/test';

test.describe('Calendar Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to calendar page
    await page.click('a[href="#/calendar"]');
  });

  test('should switch between view modes', async ({ page }) => {
    // Default is month
    await expect(page.locator('.grid-rows-6')).toBeVisible();

    // Switch to week (hourly view)
    await page.click('button:has-text("week")');
    // Check for the presence of the time column
    await expect(page.locator('text=00:00')).toBeVisible();
    await expect(page.locator('text=23:00')).toBeVisible();

    // Switch to 10 days
    await page.click('button:has-text("10 Days")');
    await expect(page.locator('.grid-cols-2, .grid-cols-5')).toBeVisible();
    // Header should be hidden in forward view as it uses different layout
    await expect(page.locator('text=SunMonTue')).not.toBeVisible();
  });

  test('should navigate correctly in different views', async ({ page }) => {
    const monthDisplay = page.locator('header .text-center');
    
    // Month navigation
    await page.click('button:has-text("month")');
    const initialMonth = await monthDisplay.textContent();
    await page.locator('button:has(svg.lucide-chevron-right)').click();
    await expect(monthDisplay).not.toHaveText(initialMonth || '');

    // Week navigation
    await page.click('button:has-text("week")');
    const initialWeek = await monthDisplay.textContent();
    await page.locator('button:has(svg.lucide-chevron-right)').click();
    await expect(monthDisplay).not.toHaveText(initialWeek || '');

    // Forward navigation
    await page.click('button:has-text("10 Days")');
    const initialForward = await monthDisplay.textContent();
    await page.locator('button:has(svg.lucide-chevron-right)').click();
    await expect(monthDisplay).not.toHaveText(initialForward || '');
  });

  test('should show cards with due dates', async ({ page }) => {
    // Wait for the calendar grid to be visible
    await expect(page.locator('.grid-rows-6')).toBeVisible();
    // The mock data has 'Call bank' with a due date of today
    await expect(page.locator('.grid-rows-6 >> text=Call bank').first()).toBeVisible();
  });

  test('should navigate to board on card click', async ({ page }) => {
    await page.locator('.grid-rows-6 >> text=Call bank').first().click();
    await expect(page).toHaveURL(/.*#\/board\/.*/);
  });

  test('should support drag and drop (visual check)', async ({ page }) => {
    const card = page.locator('.bg-white.p-2.flex.flex-col >> text=Call bank').first();
    const targetDay = page.locator('.bg-white.p-2.flex.flex-col').nth(20); 

    await card.dragTo(targetDay);
    await expect(card).toBeVisible();
  });
});
