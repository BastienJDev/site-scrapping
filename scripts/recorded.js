require('dotenv').config();
const { chromium } = require('playwright');

// Paramètres avec fallback
const HEADLESS = (process.env.HEADLESS || 'true').toLowerCase() === 'true';
const START_URL = process.env.START_URL || 'https://catalogue-bu.u-bourgogne.fr/discovery/dbsearch?vid=33UB_INST:33UB_INST&lang=fr';
const USERNAME = process.env.CLIENT_USER || 'ep462599';
const PASSWORD = process.env.CLIENT_PASS || 'Enzomatteo12@';
const LOGIN_BUTTON = process.env.LOGIN_BUTTON_NAME || 'CONNEXION';
const SEARCH_LABEL = process.env.SEARCH_LABEL || 'Rechercher';
const SEARCH_TERM = process.env.SEARCH_TERM || 'dalloz';
const SEARCH_OPTION = process.env.SEARCH_OPTION || 'Dalloz';
const RESULT_LINK = process.env.RESULT_LINK || 'Dalloz - Base de données -';
const FINAL_URL = process.env.FINAL_URL || 'https://www-dalloz-fr.proxy-bu2.ube.fr/etudiants';

(async () => {
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto(START_URL);
  await page.getByRole('button', { name: 'S\'inscrire' }).click();
  await page.fill('#username', USERNAME);
  await page.fill('#password', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
    page.getByRole('button', { name: LOGIN_BUTTON }).click()
  ]);

  // Recherche
  const searchBox = page.getByRole('combobox', { name: SEARCH_LABEL });
  await searchBox.click();
  await searchBox.fill(SEARCH_TERM);
  await page.getByRole('option', { name: SEARCH_OPTION, exact: true }).click().catch(() => {});
  await page.getByRole('link', { name: SEARCH_OPTION, exact: true }).click().catch(() => {});

  // Ressource
  const popupPromise = page.waitForEvent('popup').catch(() => null);
  await page.getByRole('link', { name: RESULT_LINK }).click();
  const resourcePage = await popupPromise || page;

  if (FINAL_URL && resourcePage) {
    await resourcePage.goto(FINAL_URL).catch(() => {});
  }

  // Navigateur laissé ouvert
})();
