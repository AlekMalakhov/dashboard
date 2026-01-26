import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Live (non-mocked) smoke check for the dashboard.
 *
 * This test runs against the real backend/API without mocks.
 * It captures runtime evidence:
 * - What UI renders
 * - Whether data loads correctly
 * - Console errors
 * - Failed network requests
 *
 * The dashboard auto-selects the default board ("ImaGenAItion Labs")
 * and displays it as "My Project".
 *
 * Run:
 *   npm run test:e2e -- --project=chromium e2e/live-dashboard.spec.ts
 */
test('live: dashboard loads and displays metrics', async ({ page }) => {
  const artifactsDir = path.join(
    process.cwd(),
    'playwright-artifacts',
    'live-dashboard'
  );
  fs.mkdirSync(artifactsDir, { recursive: true });

  const consoleEvents: Array<{ type: string; text: string }> = [];
  const requestFailed: Array<{ url: string; method: string; failure: string | null }> = [];
  const apiResponses: Array<{ url: string; status: number }> = [];

  // Collect console logs
  page.on('console', (msg) => {
    consoleEvents.push({ type: msg.type(), text: msg.text().slice(0, 2000) });
  });

  // Collect failed requests
  page.on('requestfailed', (req) => {
    requestFailed.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText ?? null,
    });
  });

  // Collect API responses
  page.on('response', (resp) => {
    const url = resp.url();
    if (url.includes('/api/')) {
      apiResponses.push({ url, status: resp.status() });
    }
  });

  // Setup response listener for rework metrics
  let reworkData: Record<string, unknown> | null = null;
  const reworkResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/rework') &&
      !response.url().includes('/trend') &&
      response.status() === 200,
    { timeout: 30000 }
  );

  // Navigate to dashboard
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await page.screenshot({
    path: path.join(artifactsDir, '01-dashboard-initial.png'),
    fullPage: true,
  });

  // Wait for dashboard heading
  await page.getByRole('heading', { name: 'Rework Dashboard' }).waitFor({ timeout: 10000 });

  // Wait for auto-selected board to show (displayed as "My Project")
  await expect(page.getByText('My Project')).toBeVisible({ timeout: 10000 });

  await page.screenshot({
    path: path.join(artifactsDir, '02-board-loaded.png'),
    fullPage: true,
  });

  // Wait for the rework metrics API response
  console.log('Waiting for rework metrics API response...');
  try {
    const reworkResponse = await reworkResponsePromise;
    reworkData = await reworkResponse.json();
    console.log('Captured rework data:', JSON.stringify(reworkData, null, 2));
  } catch (e) {
    console.log('Failed to capture rework response:', e);
  }

  // Give UI time to render
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(artifactsDir, '03-metrics-loaded.png'),
    fullPage: true,
  });

  // Verify metrics are displayed (if data was captured)
  if (reworkData) {
    // Verify defect rate widget - ratio can be decimal like 34.7
    const ratio = reworkData.rework_ratio;
    if (typeof ratio === 'number') {
      console.log(`Verifying Defect Rate: ${ratio}`);
      // The aria-label uses the exact value (e.g., "Defect rate: 34.7 percent")
      await expect(
        page.getByRole('status', { name: new RegExp(`defect rate:\\s*${ratio}\\s*percent`, 'i') })
      ).toBeVisible({ timeout: 5000 });
    }

    // Verify context widgets with current labels
    const stories = reworkData.stories_analyzed;
    if (typeof stories === 'number') {
      console.log(`Verifying Completed: ${stories}`);
      await expect(
        page.getByRole('status', { name: new RegExp(`completed:\\s*${stories}`, 'i') })
      ).toBeVisible({ timeout: 5000 });
    }

    const bugs = reworkData.bugs_linked;
    if (typeof bugs === 'number') {
      console.log(`Verifying Bugs Fixed: ${bugs}`);
      await expect(
        page.getByRole('status', { name: new RegExp(`bugs fixed:\\s*${bugs}`, 'i') })
      ).toBeVisible({ timeout: 5000 });
    }

    const spDelivered = reworkData.story_points_delivered;
    if (typeof spDelivered === 'number') {
      console.log(`Verifying Delivered: ${spDelivered}`);
      await expect(
        page.getByRole('status', { name: new RegExp(`delivered:\\s*${spDelivered}`, 'i') })
      ).toBeVisible({ timeout: 5000 });
    }

    const reworkPoints = reworkData.rework_points;
    if (typeof reworkPoints === 'number') {
      console.log(`Verifying Rework: ${reworkPoints}`);
      await expect(
        page.getByRole('status', { name: new RegExp(`^rework:\\s*${reworkPoints}`, 'i') })
      ).toBeVisible({ timeout: 5000 });
    }
  }

  // Verify trend chart is visible
  await expect(page.getByRole('region', { name: /work breakdown trend/i })).toBeVisible({ timeout: 5000 });

  // Verify time range selector is visible (slider-based UI)
  await expect(page.locator('input[type="range"]')).toBeVisible();

  await page.screenshot({
    path: path.join(artifactsDir, '04-final-state.png'),
    fullPage: true,
  });

  // Collect final state
  const state = {
    url: page.url(),
    hasHeading: await page.getByRole('heading', { name: 'Rework Dashboard' }).isVisible(),
    hasBoardName: await page.getByText('My Project').isVisible(),
    hasTimeRange: await page.getByText('Time Range').isVisible().catch(() => false),
    hasDefectRate: await page
      .getByRole('status', { name: /defect rate:\s*\d+(\.\d+)?\s*percent/i })
      .isVisible()
      .catch(() => false),
    hasTrendChart: await page
      .getByRole('region', { name: /work breakdown trend/i })
      .isVisible()
      .catch(() => false),
    metricsCaptured: reworkData,
  };

  // Write artifacts
  fs.writeFileSync(
    path.join(artifactsDir, 'state.json'),
    JSON.stringify(state, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(artifactsDir, 'console.json'),
    JSON.stringify(consoleEvents, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(artifactsDir, 'requestfailed.json'),
    JSON.stringify(requestFailed, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(artifactsDir, 'apiResponses.json'),
    JSON.stringify(apiResponses, null, 2),
    'utf8'
  );

  // Assert no critical failures
  const criticalFailures = requestFailed.filter(
    (r) => r.url.includes('/api/') && !r.url.includes('favicon')
  );
  expect(criticalFailures).toHaveLength(0);
});
