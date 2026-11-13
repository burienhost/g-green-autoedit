import { test, expect } from '@playwright/test';

async function loadApp(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.cullDraw === 'function' && typeof window.cullBridge === 'function' && !!window.cullBridge(), { timeout: 20000 });
  return errors;
}
async function seed(page) {
  await page.evaluate(() => {
    const rows = Array.from({ length: 240 }, (_, i) => ({
      photo: { file: { name: 'photo-' + i + '.jpg' } },
      keep: true, manualKeep: false, rating: 0, group: null,
      metrics: { brightness: 110 }, defects: i < 103 ? ['needs inspection'] : [],
      reason: 'Pending review', status: 'review'
    }));
    window.cullRows = rows;
    window.cullScanned = true;
    window.cullBusy = false;
    window.cullUndoStack = [];
    window.cullPage = 0;
    window.cullApplyState(window.cullBridge().hydrateLegacy(rows, 'balanced'));
    // Thumbnail loading is irrelevant to selection semantics and uses synthetic File records.
    window.cullThumbObserve = () => {};
    document.getElementById('cullFilter').value = 'all';
    document.getElementById('cullRatingFilter').value = '0';
    window.cullDraw();
  });
}
test('real interface renders 240 selections and 103 review recommendations', async ({ page }) => {
  const errors = await loadApp(page);
  await seed(page);
  await expect(page.locator('#cullSummary')).toContainText('240 selected for editing');
  await expect(page.locator('#cullSummary')).toContainText('103 need review');
  await page.locator('#cullFilter').selectOption('review');
  await expect(page.locator('#cullRenderStatus')).toContainText('103 results');
  await expect(page.locator('#cullReview .cull-tile')).toHaveCount(48);
  await page.screenshot({ path: 'test-results/review-filter.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('bulk exclusion is one undo transaction and preserves recommendations', async ({ page }) => {
  await loadApp(page);
  await seed(page);
  await page.locator('#cullFilter').selectOption('review');
  await page.locator('#cullRejectVisible').click();
  await expect(page.locator('#cullSummary')).toContainText('137 selected for editing');
  await expect(page.locator('#cullSummary')).toContainText('103 need review');
  await page.locator('#cullUndo').click();
  await expect(page.locator('#cullSummary')).toContainText('240 selected for editing');
  await page.screenshot({ path: 'test-results/bulk-undo.png', fullPage: true });
});
test('manual checkbox decision undo restores manual override', async ({ page }) => {
  await loadApp(page);
  await seed(page);
  await page.locator('#cullReview input[type="checkbox"]').first().uncheck();
  expect(await page.evaluate(() => [cullRows[0].keep, cullRows[0].manualKeep])).toEqual([false, true]);
  await page.locator('#cullUndo').click();
  expect(await page.evaluate(() => [cullRows[0].keep, cullRows[0].manualKeep])).toEqual([true, false]);
});
test('recommended exclude filter does not invent exclusions from legacy evidence', async ({ page }) => {
  await loadApp(page);
  await seed(page);
  await page.locator('#cullFilter').selectOption('excluded');
  await expect(page.locator('#cullRenderStatus')).toContainText('0 results');
  await expect(page.locator('#cullSummary')).toContainText('0 recommended exclude');
});
