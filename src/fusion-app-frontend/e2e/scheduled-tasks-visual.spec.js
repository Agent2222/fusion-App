import { expect, test } from '@playwright/test';

const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
];

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ width: number, height: number }} opts
 */
async function openScheduledTasksPreview(page, opts) {
    await page.setViewportSize({ width: opts.width, height: opts.height });
    await page.goto('/studio?scheduledTasksPreview=1#scheduled-tasks', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-scheduled-tasks-root][data-scheduled-tasks-ready="1"]').waitFor({ state: 'visible' });
    await page.locator('#studioAuthGate').waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts?.ready);
}

test.describe('Scheduled Tasks visual camera', () => {
    for (const vp of VIEWPORTS) {
        test(`${vp.name} list`, async ({ page }) => {
            await openScheduledTasksPreview(page, { width: vp.width, height: vp.height });
            await expect(page.locator('.schedule-hero__title')).toHaveText('Scheduled Tasks');
            await expect(page.locator('.st-card__name').first()).toHaveText('Kaga arrival reminder');
            await expect(page.locator('.st-card__kind').first()).toHaveText('Remind artists to add arrival time');
            await expect(page.getByText('Coming up')).toBeVisible();
            await expect(page.getByText('Needs a look')).toBeVisible();
            const html = await page.locator('[data-scheduled-tasks-root]').innerHTML();
            expect(html).not.toMatch(/cron/i);
            expect(html).not.toMatch(/\btick\b/i);
            expect(html).not.toMatch(/\bAPI\b/);
            await expect(page.locator('[data-studio-section="scheduled-tasks"] img')).toBeVisible();
            await expect(page.locator('[data-studio-section="videos"] .studio-nav-item__icon-fallback')).toHaveCount(0);
            await expect(page.locator('[data-studio-section="user-studio"] .studio-nav-item__icon-fallback')).toHaveCount(0);
            await expect(page.locator('[data-studio-section="profile-images"] .studio-nav-item__icon-fallback')).toHaveCount(0);
            await expect(page.locator('[data-studio-section="broadcasts"] .studio-nav-item__icon-fallback')).toHaveCount(0);
            await expect(page.locator('.studio-nav-group[aria-label="Moderation"] .studio-nav-group__icon-fallback')).toHaveCount(0);
            await expect(page.locator('.studio-app')).toHaveScreenshot(`scheduled-tasks-${vp.name}-list.png`, {
                animations: 'disabled',
            });
        });
    }

    test('desktop create modal', async ({ page }) => {
        await openScheduledTasksPreview(page, { width: 1440, height: 900 });
        await page.getByRole('button', { name: 'New task' }).click();
        await expect(page.getByRole('heading', { name: 'New scheduled task' })).toBeVisible();
        await expect(page.locator('.studio-st-modal select[name="kind"]')).toHaveValue('flight_followup');
        await expect(page.locator('.studio-st-modal select[name="kind"] option[value="announce_day"]')).toHaveCount(1);
        await expect(page.getByText('Skip people who already did this')).toBeVisible();
        await expect(page.getByText(/Will go to/)).toBeVisible();
        const layout = await page.locator('.studio-st-modal').evaluate((panel) => {
            const form = panel.querySelector('[data-st-form]');
            const grid = panel.querySelector('.st-modal-grid');
            const cols = [...panel.querySelectorAll('.st-modal-col')];
            const formBox = form?.getBoundingClientRect();
            const panelBox = panel.getBoundingClientRect();
            const colBoxes = cols.map((col) => col.getBoundingClientRect());
            return {
                formWidth: formBox?.width || 0,
                panelWidth: panelBox.width,
                colCount: cols.length,
                sideBySide: colBoxes.length === 2 && Math.abs(colBoxes[0].top - colBoxes[1].top) < 8,
            };
        });
        expect(layout.colCount).toBe(2);
        expect(layout.sideBySide).toBe(true);
        expect(layout.formWidth / layout.panelWidth).toBeGreaterThan(0.85);
        const modalHtml = await page.locator('.studio-st-modal').innerHTML();
        expect(modalHtml).not.toMatch(/cron/i);
        expect(modalHtml).not.toMatch(/\btick\b/i);
        expect(modalHtml).not.toMatch(/\bAPI\b/);
        await expect(page.locator('.studio-st-modal')).toHaveScreenshot('scheduled-tasks-desktop-create-modal.png', {
            animations: 'disabled',
        });
    });
});
