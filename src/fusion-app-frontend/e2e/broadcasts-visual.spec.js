import { expect, test } from '@playwright/test';

const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
];

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ width: number, height: number, filter?: string }} opts
 */
async function openBroadcastsPreview(page, opts) {
    await page.setViewportSize({ width: opts.width, height: opts.height });
    await page.goto('/studio?broadcastsPreview=1#broadcasts', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-broadcasts-root][data-broadcasts-ready="1"]').waitFor({ state: 'visible' });
    await page.locator('#studioAuthGate').waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts?.ready);
    if (opts.filter) {
        await page.getByRole('tab', { name: opts.filter, exact: true }).click();
    }
}

test.describe('Broadcasts visual camera', () => {
    for (const vp of VIEWPORTS) {
        test(`${vp.name} pending`, async ({ page }) => {
            await openBroadcastsPreview(page, { width: vp.width, height: vp.height });
            await expect(page.getByText('Maya Fujita')).toBeVisible();
            await expect(page.getByRole('link', { name: 'maya@example.com' })).toBeVisible();
            await expect(page.getByText('Rin Takahashi')).toBeVisible();
            await expect(page.locator('.studio-app')).toHaveScreenshot(`broadcasts-${vp.name}-pending.png`, {
                animations: 'disabled',
            });
        });
    }

    test('desktop fulfilled tab', async ({ page }) => {
        await openBroadcastsPreview(page, { width: 1440, height: 900, filter: 'Fulfilled' });
        await expect(page.getByText('Studio Kumo')).toBeVisible();
        await expect(page.getByRole('link', { name: 'hello@studiokumo.example' })).toBeVisible();
        await expect(page.locator('.studio-app')).toHaveScreenshot('broadcasts-desktop-fulfilled.png', {
            animations: 'disabled',
        });
    });

    test('desktop email composer', async ({ page }) => {
        await openBroadcastsPreview(page, { width: 1440, height: 900 });
        await page.locator('[data-bc-email]').first().click();
        await expect(page.locator('#bc-compose-to')).toBeVisible();
        await expect(page.locator('#bc-compose-to')).toHaveValue(/@/);
        await expect(page.locator('.studio-modal-panel')).toHaveScreenshot('broadcasts-desktop-email-modal.png', {
            animations: 'disabled',
        });
    });
});
