import { expect, test } from '@playwright/test';

const MOBILE = { width: 390, height: 844 };

const FIXTURE_LINKS = [
    {
        id: 'pl-kaga',
        label: 'Kaga Fall 2026 Cohort',
        href: '/programs',
        enabled: true,
        sortOrder: 0,
        display: 'card',
        cardSpan: 2,
        cardRows: 2,
        imageUrl: 'https://picsum.photos/id/1015/1200/1600',
        eyebrow: 'Artist residency',
        subtext: 'Time. Place. New Perspectives.',
        ctaLabel: 'Explore program',
        ctaStyle: 'outline',
        meta: 'Kaga Ishikawa Japan',
    },
    {
        id: 'pl-join',
        label: 'Join Fusion Global Network',
        href: '/join-network',
        enabled: true,
        sortOrder: 1,
        display: 'card',
        cardSpan: 2,
        cardRows: 1,
        imageUrl: 'https://picsum.photos/id/1016/1600/900',
        eyebrow: 'A global network',
        subtext: 'For artists, curators, galleries, and collectors shaping what is next.',
        ctaLabel: 'Become a member',
        ctaStyle: 'solid',
    },
    {
        id: 'pl-artists',
        label: 'Artists',
        href: '/artists',
        enabled: true,
        sortOrder: 2,
        display: 'button',
        colorToken: 'c5',
    },
];

/**
 * @param {import('@playwright/test').Page} page
 */
async function openMobileLinks(page) {
    await page.setViewportSize(MOBILE);
    await page.addInitScript((payload) => {
        window.localStorage.setItem('fusion-data-source', 'test');
        window.localStorage.setItem('fusion-test-public-links', JSON.stringify(payload));
    }, FIXTURE_LINKS);
    await page.goto('/links', { waitUntil: 'domcontentloaded' });
    await page.locator('.links-page__card').first().waitFor({ state: 'visible', timeout: 20_000 });
    await page.evaluate(() => document.fonts?.ready);
}

test.describe('Links page mobile review', () => {
    test.use({
        viewport: MOBILE,
        isMobile: true,
        hasTouch: true,
    });

    test('cards, half-screen gap, and footer pull-down', async ({ page }) => {
        await openMobileLinks(page);

        const cards = page.locator('a.links-page__card');
        const buttons = page.locator('a.links-page__btn');
        await expect(cards).toHaveCount(2);
        await expect(buttons).toHaveCount(1);
        await expect(page.locator('.links-page__card-eyebrow').first()).toHaveText(/artist residency/i);
        await expect(page.locator('.links-page__card-title').first()).toHaveText(/kaga fall 2026/i);
        await expect(page.locator('.links-page__card-sub').first()).toHaveText(/time\. place/i);
        await expect(page.locator('.links-page__card-cta').first()).toHaveText(/explore program/i);
        await expect(page.locator('.links-page__card-cta--solid')).toHaveText(/become a member/i);

        const layout = await page.evaluate(() => {
            const stack = document.querySelector('.links-page__stack');
            const last = stack?.lastElementChild;
            const card = document.querySelector('.links-page__card');
            const img = card?.querySelector('.links-page__card-img');
            const copy = card?.querySelector('.links-page__card-copy');
            const stackBox = stack?.getBoundingClientRect();
            const lastBox = last?.getBoundingClientRect();
            const cardBox = card?.getBoundingClientRect();
            const imgBox = img?.getBoundingClientRect();
            const copyStyle = copy ? getComputedStyle(copy) : null;
            const cardStyle = card ? getComputedStyle(card) : null;
            const tail = document.querySelector('.links-page__tail');
            const tailStyle = tail ? getComputedStyle(tail) : null;
            const main = document.getElementById('mainContent');
            const lastOffset =
                last && main
                    ? last.getBoundingClientRect().bottom - main.getBoundingClientRect().top + main.scrollTop
                    : 0;
            const remainingAfterLast = main ? main.scrollHeight - lastOffset : 0;
            return {
                viewportH: window.innerHeight,
                tailH: parseFloat(tailStyle?.height || '0'),
                remainingAfterLast,
                cardBorder: cardStyle?.borderWidth || '',
                imgW: imgBox?.width || 0,
                imgH: imgBox?.height || 0,
                cardW: cardBox?.width || 0,
                cardH: cardBox?.height || 0,
                copyAlign: copyStyle?.alignItems || '',
                copyTextAlign: copyStyle?.textAlign || '',
                mainScrollH: main?.scrollHeight || 0,
                mainClientH: main?.clientHeight || 0,
                pageH: document.querySelector('.links-page')?.getBoundingClientRect().height || 0,
            };
        });

        expect(layout.cardBorder).toBe('0px');
        expect(Math.abs(layout.imgW - layout.cardW)).toBeLessThan(2);
        expect(Math.abs(layout.imgH - layout.cardH)).toBeLessThan(2);
        expect(layout.copyAlign).toBe('flex-start');
        expect(layout.copyTextAlign).toBe('left');
        expect(layout.tailH).toBeGreaterThan(layout.viewportH * 0.45);
        expect(layout.remainingAfterLast).toBeGreaterThan(layout.viewportH * 0.45);
        expect(layout.mainScrollH).toBeGreaterThan(layout.mainClientH + layout.viewportH * 0.4);
        expect(layout.pageH).toBeGreaterThan(layout.viewportH);

        const lastLink = page.locator('.links-page__stack > a').last();
        await lastLink.evaluate((el) => {
            const main = document.getElementById('mainContent');
            if (!main) return;
            const lastBottom = el.getBoundingClientRect().bottom - main.getBoundingClientRect().top + main.scrollTop;
            main.scrollTop = Math.max(0, lastBottom - main.clientHeight);
        });
        await page.waitForTimeout(350);
        const remainingAtLastLink = await page.evaluate(() => {
            const main = document.getElementById('mainContent');
            if (!main) return 0;
            return main.scrollHeight - main.scrollTop - main.clientHeight;
        });
        expect(remainingAtLastLink).toBeGreaterThan(MOBILE.height * 0.4);

        const footerAtLastLink = await page.evaluate(() => {
            const host = document.getElementById('footer');
            const el = host?.shadowRoot?.querySelector('footer');
            if (!el) return { visible: false, opacity: 0 };
            const style = getComputedStyle(el);
            return {
                visible: style.opacity !== '0' && style.pointerEvents !== 'none',
                opacity: Number(style.opacity),
            };
        });
        expect(footerAtLastLink.opacity).toBeLessThan(0.2);

        const main = page.locator('#mainContent');
        await main.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
        });
        await page.waitForTimeout(450);

        const footerAtBottom = await page.evaluate(() => {
            const host = document.getElementById('footer');
            return {
                visible: Boolean(host?._footerScrollVisible),
                opacity: Number(getComputedStyle(host?.shadowRoot?.querySelector('footer')).opacity || 0),
            };
        });
        expect(footerAtBottom.visible || footerAtBottom.opacity > 0.5).toBe(true);

        await page.evaluate(() => {
            const host = document.getElementById('footer');
            const el = host?.shadowRoot?.querySelector('footer');
            if (!el || !host) return;
            const startY = 520;
            const endY = startY + 80;
            const fire = (type, y) => {
                const touch = new Touch({
                    identifier: 1,
                    target: el,
                    clientX: 180,
                    clientY: y,
                    pageX: 180,
                    pageY: y,
                });
                el.dispatchEvent(
                    new TouchEvent(type, {
                        bubbles: true,
                        cancelable: true,
                        touches: type === 'touchend' ? [] : [touch],
                        changedTouches: [touch],
                    }),
                );
            };
            fire('touchstart', startY);
            fire('touchmove', endY);
        });
        await page.waitForTimeout(400);

        const footerAfterPull = await page.evaluate(() => {
            const host = document.getElementById('footer');
            const el = host?.shadowRoot?.querySelector('footer');
            return {
                visible: Boolean(host?._footerScrollVisible),
                opacity: Number(getComputedStyle(el).opacity || 0),
                pointerEvents: getComputedStyle(el).pointerEvents,
                focusedMain: document.activeElement?.id === 'mainContent',
            };
        });
        expect(footerAfterPull.visible).toBe(false);
        expect(footerAfterPull.pointerEvents).toBe('none');
        expect(footerAfterPull.focusedMain).toBe(true);

        await main.evaluate((el) => {
            el.scrollTop = 0;
        });
        await page.waitForTimeout(200);
        await expect(page).toHaveScreenshot('links-mobile-viewport.png', {
            animations: 'disabled',
            maxDiffPixelRatio: 0.04,
            fullPage: false,
        });
    });
});
