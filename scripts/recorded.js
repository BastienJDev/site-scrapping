require('dotenv').config();
const { chromium } = require('playwright');

// Params (env-overridable)
const HEADLESS = (process.env.HEADLESS || 'true').toLowerCase() === 'true';
const START_URL = process.env.START_URL || 'https://catalogue-bu.u-bourgogne.fr/discovery/dbsearch?vid=33UB_INST:33UB_INST&lang=fr';
const USER_SELECTOR = process.env.USER_SELECTOR || '#username';
const PASS_SELECTOR = process.env.PASS_SELECTOR || '#password';
const LOGIN_BUTTON_NAME = process.env.LOGIN_BUTTON_NAME || 'CONNEXION';
const SEARCH_LABEL = process.env.SEARCH_LABEL || 'Rechercher';
const SEARCH_TERM = process.env.SEARCH_TERM || 'dalloz';
const SEARCH_OPTION = process.env.SEARCH_OPTION || 'Dalloz';
const RESULT_LINK = process.env.RESULT_LINK || 'Dalloz - Base de données -';
const FINAL_URL = process.env.FINAL_URL || 'https://www-dalloz-fr.proxy-bu2.ube.fr/etudiants';

const USERNAME = process.env.CLIENT_USER;
const PASSWORD = process.env.CLIENT_PASS;

async function run() {
  if (!USERNAME || !PASSWORD) {
    throw new Error('CLIENT_USER et CLIENT_PASS sont requis dans .env');
  }

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);

  // Login
  await page.goto(START_URL);
  await page.fill(USER_SELECTOR, USERNAME);
  await page.fill(PASS_SELECTOR, PASSWORD);
  await page.getByRole('button', { name: LOGIN_BUTTON_NAME }).click();

  // Recherche
  const searchBox = page.getByRole('combobox', { name: SEARCH_LABEL });
  await searchBox.fill(SEARCH_TERM);
  await page.getByRole('option', { name: SEARCH_OPTION, exact: true }).click();
  await page.getByRole('link', { name: SEARCH_OPTION, exact: true }).click();

  // Ressource (popup)
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: RESULT_LINK }).click();
  const resourcePage = await popupPromise;

  if (FINAL_URL) {
    await resourcePage.goto(FINAL_URL);
  }

  await context.close();
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
