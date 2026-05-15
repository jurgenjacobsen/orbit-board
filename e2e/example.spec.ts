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

  // Wait for preload api to be available
  await page.waitForFunction(() => {
    return !!(window as any).api;
  }, { timeout: 10000 });
});

test.afterEach(async () => {
  if (app) await app.close();
});

test('app launches and shows home page', async () => {
  const title = await page.title();
  expect(title).toBe('Orbit Board');
  
  const homeHeader = await page.getByRole('heading', { name: 'Overview', level: 2 });
  await expect(homeHeader).toBeVisible();
});

test('create and delete a board', async () => {
  // Navigate to Boards page
  await page.getByRole('link', { name: 'Boards', exact: true }).click();

  // Click "Create New Board"
  await page.getByText('Create New Board').click();
  
  // Fill in board details
  const boardName = `E2E Board ${Date.now()}`;
  await page.getByPlaceholder('Board Name').fill(boardName);
  await page.getByPlaceholder('Description (optional)').fill('E2E Description');
  
  // Click Create
  await page.getByRole('button', { name: 'Create' }).click();
  
  // Wait for board to appear in the list
  const boardCard = page.getByText(boardName);
  await boardCard.waitFor({ state: 'visible', timeout: 10000 });
  await expect(boardCard).toBeVisible();
  
  // Click on the board
  await boardCard.click();
  
  // Verify we are on the board page
  await expect(page.getByRole('heading', { name: boardName })).toBeVisible();
  
  // Delete the board
  page.on('dialog', dialog => dialog.accept()); // Handle confirmation dialog
  await page.locator('header').locator('button').filter({ has: page.locator('svg.lucide-trash2') }).first().click();
  
  // Verify we are back on Overview page (since navigate('/') is used in deleteBoard)
  await expect(page.getByRole('heading', { name: 'Overview', level: 2 })).toBeVisible();
  await page.getByRole('link', { name: 'Boards', exact: true }).click();
  await expect(page.getByText(boardName)).not.toBeVisible();
});

test('column and card operations', async () => {
  // Navigate to Boards page
  await page.getByRole('link', { name: 'Boards', exact: true }).click();

  // Create a board first
  await page.getByText('Create New Board').click();
  const boardName = `E2E Task Board ${Date.now()}`;
  await page.getByPlaceholder('Board Name').fill(boardName);
  await page.getByRole('button', { name: 'Create' }).click();
  
  const boardLink = page.getByText(boardName);
  await boardLink.waitFor({ state: 'visible', timeout: 10000 });
  await boardLink.first().click();

  // Add a new column
  await page.getByText('Add column').click();
  const columnName = 'Done';
  await page.getByPlaceholder('Column name').fill(columnName);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText(columnName)).toBeVisible();

  // Add a card to the first column (To Do)
  const todoColumn = page.locator('.w-80').filter({ has: page.getByRole('heading', { name: 'To Do', exact: true }) }).first();
  await todoColumn.getByText('Add card').click();
  const cardTitle = 'E2E Task';
  await page.getByPlaceholder('Card title').fill(cardTitle);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText(cardTitle)).toBeVisible();

  // Edit the card
  await page.getByRole('button', { name: 'Edit card' }).first().click();
  await page.locator('#card-description').fill('E2E Description Update');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('E2E Description Update')).toBeVisible();

  // Cleanup: delete the board
  page.on('dialog', dialog => dialog.accept());
  await page.locator('header').locator('button').filter({ has: page.locator('svg.lucide-trash2') }).first().click();
});

test('markdown support in card description', async () => {
  // Navigate to Boards page
  await page.getByRole('link', { name: 'Boards', exact: true }).click();

  // Create a board
  await page.getByText('Create New Board').click();
  const boardName = `Markdown Board ${Date.now()}`;
  await page.getByPlaceholder('Board Name').fill(boardName);
  await page.getByRole('button', { name: 'Create' }).click();
  
  const boardLink = page.getByText(boardName);
  await boardLink.waitFor({ state: 'visible', timeout: 10000 });
  await boardLink.first().click();

  // Add a card
  const todoColumn = page.locator('.w-80').filter({ has: page.getByRole('heading', { name: 'To Do', exact: true }) }).first();
  await todoColumn.getByText('Add card').click();
  const cardTitle = 'Markdown Task';
  await page.getByPlaceholder('Card title').fill(cardTitle);
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  // Edit the card and add Markdown
  await page.getByRole('button', { name: 'Edit card' }).first().click();
  const markdownText = '# Header\n**Bold** and *Italic*\n- List item';
  await page.locator('#card-description').fill(markdownText);
  
  // Test Preview
  await page.getByRole('button', { name: 'Preview' }).first().click();
  await expect(page.locator('.prose h1')).toHaveText('Header');
  await expect(page.locator('.prose strong')).toHaveText('Bold');
  await expect(page.locator('.prose em')).toHaveText('Italic');
  await expect(page.locator('.prose li')).toHaveText('List item');

  // Save
  await page.getByRole('button', { name: 'Save' }).click();

  // Verify rendered on board
  await expect(page.locator('.prose strong')).toHaveText('Bold');

  // Cleanup
  page.on('dialog', dialog => dialog.accept());
  await page.locator('header').locator('button').filter({ has: page.locator('svg.lucide-trash2') }).first().click();
});

test('search and filtering', async () => {
  // Navigate to Boards page
  await page.getByRole('link', { name: 'Boards', exact: true }).click();

  // Create a board
  await page.getByText('Create New Board').click();
  const boardName = `Filter Board ${Date.now()}`;
  await page.getByPlaceholder('Board Name').fill(boardName);
  await page.getByRole('button', { name: 'Create' }).click();
  
  // Wait for board to appear and click it
  const boardLink = page.getByText(boardName);
  await boardLink.waitFor({ state: 'visible', timeout: 10000 });
  await boardLink.first().click();

  // Add a card with a specific title
  const todoColumn = page.locator('.w-80').filter({ has: page.getByRole('heading', { name: 'To Do', exact: true }) }).first();
  await todoColumn.getByText('Add card').click();
  const searchTitle = 'Find Me Task';
  await page.getByPlaceholder('Card title').fill(searchTitle);
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  // Test Filtering on Board
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByPlaceholder('Filter by title or description...').fill('Task');
  await expect(page.getByText(searchTitle)).toBeVisible();
  
  await page.getByPlaceholder('Filter by title or description...').fill('NothingMatches');
  await expect(page.getByText(searchTitle)).not.toBeVisible();
  
  await page.getByText('Clear all').click();
  await expect(page.getByText(searchTitle)).toBeVisible();

  // Test Global Search on Boards
  await page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).click();
  // Wait for Overview page to load
  await expect(page.getByRole('heading', { name: 'Overview', level: 2 })).toBeVisible();
  
  await page.getByRole('link', { name: 'Boards', exact: true }).click();
  await page.getByPlaceholder('Global search cards...').fill('Find Me');
  await expect(page.locator('section').filter({ hasText: 'Search Results' }).getByText(searchTitle).first()).toBeVisible();

  // Cleanup
  await page.getByText(boardName).first().click(); // Go back to board
  page.on('dialog', dialog => dialog.accept());
  await page.locator('header').locator('button').filter({ has: page.locator('svg.lucide-trash2') }).first().click();
});
