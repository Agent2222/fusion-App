import { expect, test } from '@playwright/test';

/** `tab=leads` opens Pipeline List; `tab=discover` opens Pipeline Board. */

const TABS = ['discover', 'leads', 'relationships', 'outreach', 'invites', 'sources', 'analytics'];
const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
];

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ tab?: string, empty?: boolean, leadId?: string, width: number, height: number }} opts
 */
async function openRadarPreview(page, opts) {
    await page.setViewportSize({ width: opts.width, height: opts.height });
    const q = new URLSearchParams({ radarPreview: '1' });
    if (opts.tab) q.set('tab', opts.tab);
    if (opts.empty) q.set('radarEmpty', '1');
    if (opts.leadId) q.set('radarLead', opts.leadId);
    await page.goto(`/studio?${q.toString()}#radar`, { waitUntil: 'domcontentloaded' });
    await page.locator('#studio-radar-root[data-radar-ready="1"]').waitFor({ state: 'visible' });
    await page.locator('#studioAuthGate').waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts?.ready);
}

test.describe('Radar visual camera', () => {
    for (const vp of VIEWPORTS) {
        for (const tab of TABS) {
            test(`${vp.name} ${tab}`, async ({ page }) => {
                await openRadarPreview(page, { tab, width: vp.width, height: vp.height });
                await expect(page.locator('.studio-app')).toHaveScreenshot(`radar-${vp.name}-${tab}.png`, {
                    animations: 'disabled',
                });
            });
        }

        test(`${vp.name} empty discover`, async ({ page }) => {
            await openRadarPreview(page, {
                tab: 'discover',
                empty: true,
                width: vp.width,
                height: vp.height,
            });
            await page.locator('[data-radar-empty]').waitFor({ state: 'visible' });
            await expect(page.locator('.studio-app')).toHaveScreenshot(`radar-${vp.name}-discover-empty.png`, {
                animations: 'disabled',
            });
        });

        test(`${vp.name} lead modal`, async ({ page }) => {
            await openRadarPreview(page, {
                tab: 'discover',
                leadId: 'rl-maya',
                width: vp.width,
                height: vp.height,
            });
            await page.locator('.studio-radar-lead-modal').waitFor({ state: 'visible' });
            await expect(page.locator('.studio-modal-panel')).toHaveScreenshot(
                `radar-${vp.name}-lead-modal.png`,
                { animations: 'disabled' },
            );
        });
    }
});

test.describe('Radar sheet upload', () => {
    test('Upload leads is visible on Pipeline board and empty', async ({ page }) => {
        await openRadarPreview(page, { tab: 'discover', width: 1440, height: 900 });
        await expect(page.getByRole('button', { name: 'Upload leads' })).toBeVisible();

        await openRadarPreview(page, { tab: 'discover', empty: true, width: 1440, height: 900 });
        await page.locator('[data-radar-empty]').waitFor({ state: 'visible' });
        await expect(page.getByRole('button', { name: 'Upload leads' })).toBeVisible();
    });

    test('CSV confirm modal classifies new, merge, and invalid rows', async ({ page }) => {
        await openRadarPreview(page, { tab: 'discover', width: 1440, height: 900 });
        const csv = [
            'name,email,instagram,website,medium,location,fit_score,status,discount_code,why_fit,source_url,public_contact,red_flags,date_added,notes',
            'Maya Fujita,maya@example.com,@maya.fujita,,,,,,,Kaga fit,,,,,From sheet',
            'New Import,new.import@example.com,@new.import,https://new.example,Print,"Osaka, Japan",70,new,CODE1,Fit,,,,2026-08-01,note',
            ',nobody@example.com,,,,,,,,,,,,,',
        ].join('\n');
        await page.locator('#radarLeadCsvInput').setInputFiles({
            name: 'artist-leads.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csv),
        });
        await expect(page.getByRole('heading', { name: 'Import leads' })).toBeVisible();
        await expect(page.locator('.studio-radar-import')).toContainText('New');
        await expect(page.locator('.studio-radar-import')).toContainText('merge');
        await expect(page.getByRole('button', { name: 'Download template' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Import' })).toBeEnabled();
        await page.getByRole('button', { name: 'Import' }).click();
        await expect(page.locator('#radarDiscoverStatus')).toContainText('Imported');
        await expect(page.getByText('New Import')).toBeVisible();
    });
});

test.describe('Radar discount invites', () => {
    test('Invites tab lists campaign codes and a create row', async ({ page }) => {
        await openRadarPreview(page, { tab: 'invites', width: 1440, height: 900 });
        await expect(page.locator('.studio-promo-codes')).toBeVisible();
        await expect(page.getByText('RADAR-KAGA26')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create code' })).toBeVisible();
        await expect(page.locator('#studioPromoDuration')).toBeVisible();
        await expect(page.locator('.studio-app')).toHaveScreenshot('radar-desktop-invites-panel.png', {
            animations: 'disabled',
        });
    });

    test('Outreach composer applies full HTML and a duration picker', async ({ page }) => {
        await openRadarPreview(page, { tab: 'outreach', width: 1440, height: 900 });
        await page.getByRole('button', { name: 'Open' }).first().click();
        await expect(page.locator('#radarOutDuration')).toBeVisible();
        await expect(page.locator('#radarOutTpl')).toBeVisible();
        await expect(page.locator('#radarOutHero')).toBeVisible();
        await expect(page.locator('#radarOutBody')).toHaveValue(/JOIN FUSION|join-network|DISCOUNT_CODE/i);
        await expect(page.getByRole('button', { name: 'Save as default' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Send test email' })).toBeVisible();
        await expect(page.locator('.studio-modal-panel')).toHaveScreenshot(
            'radar-desktop-outreach-composer.png',
            { animations: 'disabled' },
        );
    });

    test('Batch confirm shows remaining uses versus recipient count', async ({ page }) => {
        await openRadarPreview(page, { tab: 'outreach', width: 1440, height: 900 });
        await page.getByRole('button', { name: 'Select ready' }).click();
        await page.getByRole('button', { name: /Send selected/ }).click();
        await expect(page.getByRole('heading', { name: 'Send selected outreach' })).toBeVisible();
        await expect(page.locator('#radarBatchCode')).toBeVisible();
        await expect(page.locator('#radarBatchBudget')).toContainText(/remaining|sending/i);
        await expect(page.locator('.studio-modal-panel')).toHaveScreenshot(
            'radar-desktop-outreach-batch.png',
            { animations: 'disabled' },
        );
    });
});
