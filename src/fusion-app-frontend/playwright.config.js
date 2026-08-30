import { defineConfig, devices } from '@playwright/test';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}

/**
 * Screenshot camera for Studio Radar (DEV preview, no Internet Identity).
 * First pass is capture + review — do not treat diffs as CI blockers yet.
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: [['list']],
    timeout: 60_000,
    expect: {
        timeout: 15_000,
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.02,
            animations: 'disabled',
        },
    },
    use: {
        baseURL: 'http://127.0.0.1:3000',
        trace: 'off',
        screenshot: 'off',
    },
    webServer: {
        command:
            'PLAYWRIGHT_RADAR=1 npx vite --port 3000 --host 127.0.0.1 --strictPort',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
