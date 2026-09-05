/** Capture actual prepared-demo screens without changing workflow data. Start pnpm demo first. */
import { chromium, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import type { Workspace } from '../packages/core/src/types.js';

const baseURL = process.env.PROMETHEAN_SHOWCASE_URL || 'http://127.0.0.1:4317';
const output = 'docs/screenshots';
const browser = await chromium.launch({ channel: process.env.PROMETHEAN_BROWSER_CHANNEL });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(baseURL);
  const response = await page.request.get(`${baseURL}/api/workspace`);
  if (!response.ok()) throw new Error('The prepared demo API is unavailable.');
  const workspace = (await response.json()) as Workspace;
  const csv = workspace.workflows.find((workflow) => workflow.exampleId === 'csv-routing');
  if (workspace.workflows.length !== 3 || !csv)
    throw new Error('Use the prepared three-workflow demo, not a workspace with private data.');
  mkdirSync(output, { recursive: true });
  const capture = async (name: string) => {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' });
  };
  await expect(
    page.getByRole('heading', { name: 'What are you trying to improve?' }),
  ).toBeVisible();
  await capture('studio-desktop');
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await capture('studio-dark');
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('studio-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/#/workflow/${csv.id}/tests`);
  await expect(page.locator('.comparison-row')).toHaveCount(2);
  await capture('workflow-comparison');
  await page.getByRole('link', { name: /^Design/ }).click();
  await page.getByRole('button', { name: /Validate and normalize rows/ }).click();
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await capture('workflow-design');
  await page.getByRole('link', { name: /^Runs/ }).click();
  await expect(page.getByRole('button', { name: 'Replay trace' })).toBeVisible();
  const failedRun = page.locator('.run-list button').filter({ hasText: 'Failed' });
  await failedRun.click();
  await expect(page.getByRole('heading', { name: 'A useful failure.' })).toBeVisible();
  await capture('workflow-failure');
  await page.getByRole('button', { name: 'Replay trace' }).click();
  await page.getByRole('button', { name: 'Next event' }).click();
  await page.getByRole('button', { name: 'Next event' }).click();
  await expect(page.getByText('Read-only replay', { exact: true })).toBeVisible();
  await capture('workflow-replay');
  process.stdout.write(`Captured seven actual product screens from the prepared local demo.\n`);
} finally {
  await browser.close();
}
