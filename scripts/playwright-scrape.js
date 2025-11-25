const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5001';
const USERNAME = process.env.APP_USER || 'admin';
const PASSWORD = process.env.APP_PASS || 'admin123';
const TARGET_PAGE = process.env.TARGET_PAGE === 'actualites' ? '/actualites' : '/';

async function ensureLoggedIn(page) {
  await page.goto(TARGET_PAGE);

  if (!page.url().includes('/login')) {
    return;
  }

  await page.fill('#username', USERNAME);
  await page.fill('#password', PASSWORD);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);

  if (TARGET_PAGE !== '/') {
    await page.goto(TARGET_PAGE);
  }
}

async function run() {
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: Number(process.env.SLOWMO || 0),
  });

  const page = await browser.newPage({ baseURL: BASE_URL });

  await ensureLoggedIn(page);

  // Passer en mode catégories et tout cocher
  await page.click('label[for="typeCategory"]');
  await page.waitForSelector('#categorySelection', { state: 'visible' });
  await page.click('#checkAllCategories');

  // Déclencher le scraping
  await page.click('button.btn-launch');

  // Attendre les retours (progression puis résultats)
  await page.waitForSelector('#scrapingProgress', { state: 'visible', timeout: 10_000 }).catch(() => {});
  await page.waitForSelector('#scrapingResults', { state: 'visible', timeout: 120_000 });

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
