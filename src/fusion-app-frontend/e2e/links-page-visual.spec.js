import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/styles/linksPage.css'), 'utf8');

const PLACEHOLDER =
    'data:image/svg+xml,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#8a6a4a"/></svg>',
    );

/**
 * @param {string} extraClass
 * @param {string} label
 * @param {string} size
 */
function card(extraClass, label, size) {
    return `<a class="links-page__card${extraClass}" data-size="${size}" href="#${size}">
      <img class="links-page__card-img" src="${PLACEHOLDER}" alt="" />
      <span class="links-page__card-copy">
        <span class="links-page__card-eyebrow">Artist residency</span>
        <span class="links-page__card-title">${label}</span>
        <span class="links-page__card-sub">Time. Place. New Perspectives.</span>
        <span class="links-page__card-cta links-page__card-cta--outline">Explore →</span>
      </span>
    </a>`;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ width: number, height: number }} viewport
 */
async function openLinksGrid(page, viewport) {
    await page.setViewportSize(viewport);
    await page.setContent(
        `<!DOCTYPE html>
        <html lang="en">
          <head>
            <style>
              :root {
                --c1: #c41230;
                --c2: #000000;
                --c3: #ffffff;
                --c5: #d9ceb8;
                --bg: #faf3f4;
                --fv-nav-active: "wght" 600;
                --fusion-header-chrome-height: 0px;
              }
              body { margin: 0; background: var(--bg); }
              ${css}
              .links-page {
                padding-top: 1rem !important;
                padding-bottom: 2rem !important;
              }
              .links-page__stack { margin-bottom: 1rem !important; }
            </style>
          </head>
          <body>
            <div class="page-content links-page">
              <div class="links-page__stack" id="publicLinksStack">
                ${card('', 'One by one', '1x1')}
                ${card(' links-page__card--tall', 'One by two', '1x2')}
                ${card(' links-page__card--wide', 'Two by one', '2x1')}
                ${card(' links-page__card--wide links-page__card--tall', 'Two by two', '2x2')}
              </div>
            </div>
          </body>
        </html>`,
        { waitUntil: 'domcontentloaded' },
    );
    await page.locator('[data-size="1x1"]').waitFor({ state: 'visible' });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function cardBoxes(page) {
    return page.evaluate(() => {
        const box = (sel) => {
            const el = document.querySelector(sel);
            const r = el?.getBoundingClientRect();
            return r ? { width: r.width, height: r.height } : { width: 0, height: 0 };
        };
        return {
            stack: box('.links-page__stack'),
            oneByOne: box('[data-size="1x1"]'),
            oneByTwo: box('[data-size="1x2"]'),
            twoByOne: box('[data-size="2x1"]'),
            twoByTwo: box('[data-size="2x2"]'),
        };
    });
}

test.describe('Links page card mosaic', () => {
    test('mobile cards stay square and 2-row tiles are twice as tall', async ({ page }) => {
        await openLinksGrid(page, { width: 390, height: 844 });
        const boxes = await cardBoxes(page);

        expect(boxes.oneByOne.width).toBeGreaterThan(150);
        expect(boxes.oneByOne.height).toBeGreaterThan(150);
        expect(Math.abs(boxes.oneByOne.height - boxes.oneByOne.width)).toBeLessThan(16);

        expect(boxes.oneByTwo.height).toBeGreaterThan(boxes.oneByOne.height * 1.7);
        expect(Math.abs(boxes.oneByTwo.height - (boxes.oneByOne.height * 2 + 12))).toBeLessThan(20);

        expect(boxes.twoByOne.width).toBeGreaterThan(boxes.oneByOne.width * 1.7);
        expect(Math.abs(boxes.twoByOne.height - boxes.oneByOne.height)).toBeLessThan(16);

        expect(Math.abs(boxes.twoByTwo.width - boxes.twoByOne.width)).toBeLessThan(8);
        expect(Math.abs(boxes.twoByTwo.height - boxes.oneByTwo.height)).toBeLessThan(16);

        const bleed = await page.locator('[data-size="1x1"]').evaluate((card) => {
            const img = card.querySelector('.links-page__card-img');
            const cardBox = card.getBoundingClientRect();
            const imgBox = img?.getBoundingClientRect();
            const style = getComputedStyle(card);
            return {
                borderWidth: style.borderWidth,
                radius: style.borderRadius,
                imgW: imgBox?.width || 0,
                imgH: imgBox?.height || 0,
                cardW: cardBox.width,
                cardH: cardBox.height,
            };
        });
        expect(bleed.borderWidth).toBe('0px');
        expect(parseFloat(bleed.radius)).toBeGreaterThanOrEqual(16);
        expect(Math.abs(bleed.imgW - bleed.cardW)).toBeLessThan(2);
        expect(Math.abs(bleed.imgH - bleed.cardH)).toBeLessThan(2);

        const copy = await page.locator('[data-size="2x1"] .links-page__card-copy').evaluate((el) => {
            const style = getComputedStyle(el);
            const title = el.querySelector('.links-page__card-title');
            const cta = el.querySelector('.links-page__card-cta');
            return {
                align: style.alignItems,
                textAlign: style.textAlign,
                titleLeft: title?.getBoundingClientRect().left || 0,
                copyLeft: el.getBoundingClientRect().left,
                hasEyebrow: Boolean(el.querySelector('.links-page__card-eyebrow')?.textContent?.trim()),
                hasSub: Boolean(el.querySelector('.links-page__card-sub')?.textContent?.trim()),
                ctaText: cta?.textContent?.trim() || '',
            };
        });
        expect(copy.align).toBe('flex-start');
        expect(copy.textAlign).toBe('left');
        expect(copy.hasEyebrow).toBe(true);
        expect(copy.hasSub).toBe(true);
        expect(copy.ctaText).toMatch(/explore/i);
        expect(copy.titleLeft - copy.copyLeft).toBeLessThan(24);

        await expect(page.locator('.links-page__stack')).toHaveScreenshot('links-cards-mobile-mosaic.png', {
            animations: 'disabled',
        });
    });

    test('desktop 1-column cards stay near half the stack width', async ({ page }) => {
        await openLinksGrid(page, { width: 1440, height: 900 });
        const boxes = await cardBoxes(page);
        const expectedCell = (boxes.stack.width - 12) / 2;

        expect(boxes.oneByOne.width).toBeGreaterThan(250);
        expect(Math.abs(boxes.oneByOne.width - expectedCell)).toBeLessThan(8);
        expect(Math.abs(boxes.oneByOne.height - expectedCell)).toBeLessThan(8);
        expect(boxes.oneByTwo.height).toBeGreaterThan(expectedCell * 1.7);

        await expect(page.locator('.links-page__stack')).toHaveScreenshot('links-cards-desktop-mosaic.png', {
            animations: 'disabled',
        });
    });
});
