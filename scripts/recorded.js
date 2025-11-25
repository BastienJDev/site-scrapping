require('dotenv').config();
const { chromium } = require('playwright');

const HOST_IP = process.env.HOST_IP || '127.0.0.1';
const LOGIN_URL = process.env.START_URL || `http://${HOST_IP}:5001/login`;

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(LOGIN_URL);
  await page.getByRole('textbox', { name: 'Nom d\'utilisateur' }).click();
  await page.getByRole('textbox', { name: 'Nom d\'utilisateur' }).fill('https://catalogue-bu.u-bourgogne.fr/discovery/dbsearch?vid=33UB_INST:33UB_INST&lang=fr');
  await page.getByRole('textbox', { name: 'Nom d\'utilisateur' }).press('ControlOrMeta+z');
  await page.getByRole('textbox', { name: 'Nom d\'utilisateur' }).fill('h');
  await page.goto('https://catalogue-bu.u-bourgogne.fr/discovery/dbsearch?vid=33UB_INST:33UB_INST&lang=fr');
  await page.getByRole('button', { name: 'S\'inscrire' }).click();
  await page.locator('#username').fill('ep462599');
  await page.locator('#username').press('Tab');
  await page.locator('#password').fill('Enzomatteo12@');
  await page.locator('#password').click();
  await page.getByRole('button', { name: 'CONNEXION' }).click();
  await page.getByRole('combobox', { name: 'Rechercher' }).click();
  await page.getByRole('combobox', { name: 'Rechercher' }).fill('Dall');
  await page.getByRole('option', { name: 'Dalloz', exact: true }).click();
  await page.getByRole('link', { name: 'Dalloz', exact: true }).click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Dalloz - Base de données -' }).click();
  const page1 = await page1Promise;
  await page1.goto('https://www-dalloz-fr.proxy-bu2.ube.fr/etudiants');
  await page1.getByRole('button', { name: 'Accepter & Fermer: Accepter' }).click();

  // ---------------------
})();
