import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';

test('desktop and mobile usability, accessibility, dark mode and keyboard dialog', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'What are you trying to improve?' }),
  ).toBeVisible();
  mkdirSync('test-results/captures', { recursive: true });
  await page.screenshot({
    path: 'test-results/captures/studio-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  const desktop = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(desktop.violations).toEqual([]);
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await page.screenshot({
    path: 'test-results/captures/studio-dark.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/captures/studio-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await expect(page.getByRole('link', { name: 'Library', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'Library', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Library', exact: true })).toHaveCount(0);
});

test('diagnose, compare, inspect provenance, correct failure, replay and export', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'What are you trying to improve?' }),
  ).toBeVisible();
  await page
    .getByLabel('Describe your workflow')
    .fill('Validate and clean a CSV of amount and region fields, then route valid rows.');
  await page.getByRole('button', { name: 'Find the simplest solution' }).click();
  await expect(page.getByRole('heading', { name: 'CSV workflow', exact: true })).toBeVisible();
  await expect(page.getByText('A few things to clarify')).toBeVisible();
  // Use a known synthetic recipe for this operational journey; custom intake was not assigned fake proof.
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page
    .locator('article')
    .filter({ hasText: 'Clean and route a CSV' })
    .getByRole('button', { name: 'Use workflow' })
    .click();
  await page.getByRole('link', { name: 'Tests', exact: true }).click();
  await page.getByRole('button', { name: 'Compare approaches' }).click();
  await expect(page.getByText('Measured results', { exact: false })).toBeVisible();
  await expect(page.locator('.comparison-row')).toHaveCount(2);
  await expect(
    page.locator('.comparison-row').filter({ hasText: 'Normalized rules' }),
  ).toContainText('3');
  await page.getByRole('link', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: /Validate and normalize rows/ }).click();
  await expect(page.getByRole('heading', { name: 'Recorded evaluation' })).toBeVisible();
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page.screenshot({
    path: 'test-results/captures/workflow-design.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Steps', exact: true }).click();
  await page.getByRole('button', { name: /Check the input/ }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page
    .getByLabel('Configuration')
    .fill(JSON.stringify({ requiredFields: ['csv'], maxLength: 5 }));
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await page.getByRole('button', { name: 'Save revision', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run a test', exact: true }).click();
  await page.getByRole('button', { name: 'Start test run' }).click();
  await expect(page.getByRole('heading', { name: 'A useful failure.' })).toBeVisible();
  await page.screenshot({
    path: 'test-results/captures/workflow-failure.png',
    fullPage: true,
    animations: 'disabled',
  });
  const trace = await page.locator('.event-timeline').innerText();
  let mutations = 0;
  page.on('request', (req) => {
    if (req.url().includes('/api/') && req.method() !== 'GET') mutations++;
  });
  const before = mutations;
  await page.getByRole('button', { name: 'Replay trace' }).click();
  await page.getByRole('button', { name: 'Next event' }).click();
  await expect(page.getByText('Read-only replay', { exact: true })).toBeVisible();
  expect(mutations).toBe(before);
  await page.getByRole('button', { name: 'Exit replay' }).click();
  expect(await page.locator('.event-timeline').innerText()).toBe(trace);
  await page.getByRole('link', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page
    .getByLabel('Configuration')
    .fill(JSON.stringify({ requiredFields: ['csv'], maxLength: 16000 }));
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await page.getByRole('button', { name: 'Save revision', exact: true }).click();
  await page.getByRole('link', { name: /^Runs/ }).click();
  await page.getByRole('button', { name: 'Retry as a new run' }).click();
  await expect(page.getByRole('heading', { name: 'Work, accounted for.' })).toBeVisible();
  await page.getByRole('link', { name: /^Tests/ }).click();
  await page.getByRole('button', { name: 'Compare approaches' }).click();
  await expect(page.getByText('Comparison completed on the same test cases.')).toBeVisible();
  await page.screenshot({
    path: 'test-results/captures/workflow-comparison.png',
    fullPage: true,
    animations: 'disabled',
  });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/promethean.json$/);
  expect(errors).toEqual([]);
});

test('custom acceptance cases and brief can progress to tested; approvals can be denied', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByLabel('Describe your workflow')
    .fill('Validate a CSV with amount and region fields and route each valid order.');
  await page.getByRole('button', { name: 'Find the simplest solution' }).click();
  await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await page
    .getByLabel('Available inputs')
    .fill('CSV string with id, amount, and region; allowed regions north, south, east, west.');
  await page.getByLabel('Required outputs').fill('Normalized valid rows and ready/review routing.');
  await page.getByLabel('Unanswered questions', { exact: false }).fill('');
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await page.getByRole('button', { name: 'Save revision', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Tests', exact: true }).click();
  await page.getByRole('button', { name: 'Edit acceptance cases' }).click();
  await page.getByRole('button', { name: 'Add case' }).click();
  await page.getByLabel('Case name').fill('A normalized order');
  await page
    .getByLabel('What this case checks')
    .fill('Currency and whitespace should be normalized.');
  await page
    .getByLabel('Input JSON', { exact: true })
    .fill(JSON.stringify({ csv: 'id,amount,region\nC1,$20, North ' }));
  await page
    .getByLabel('Expected output JSON')
    .fill(JSON.stringify({ valid: true, route: 'ready' }));
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await page.getByRole('button', { name: 'Save revision', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Compare approaches' }).click();
  await expect(page.getByText('Comparison completed on the same test cases.')).toBeVisible();
  await page.getByLabel('Workflow state').selectOption('tested');
  await expect(page.getByLabel('Workflow state')).toHaveValue('tested');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page
    .locator('article')
    .filter({ hasText: 'Triage incoming requests' })
    .getByRole('button', { name: 'Use workflow' })
    .click();
  await page.getByRole('button', { name: 'Run a test', exact: true }).click();
  await page.getByRole('button', { name: 'Start test run' }).click();
  await expect(page.getByRole('heading', { name: 'A decision is needed.' })).toBeVisible();
  await page.getByRole('button', { name: 'Deny action', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The action was denied.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve this action' })).toHaveCount(0);
});
