const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://catalogue-bu.u-bourgogne.fr/discovery/dbsearch?vid=33UB_INST:33UB_INST&lang=fr');
  await page.getByRole('button', { name: 'S\'inscrire' }).click();
  await page.locator('#usernameSection').click();
  await page.locator('#username').fill('ep462599');
  await page.locator('#username').press('Tab');
  await page.locator('#password').fill('Enzomatteo12@');
  await page.getByRole('button', { name: 'CONNEXION' }).click();
  await page.getByRole('combobox', { name: 'Rechercher' }).click();
  await page.getByRole('combobox', { name: 'Rechercher' }).click();
  await page.getByRole('combobox', { name: 'Rechercher' }).fill('Lexis');
  await page.getByRole('option', { name: 'Lexis 360 Intelligence' }).click();
  await page.getByRole('link', { name: 'Lexis 360 Intelligence' }).click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Lexis 360 Intelligence - Base de données - Abonnement - LIEN 2' }).click();
  const page1 = await page1Promise;
  await page1.goto('https://www-lexis360intelligence-fr.proxy-bu2.ube.fr/home');
  await page1.getByRole('button', { name: 'J\'accepte' }).click();

  // ---------------------
  await context.close();
  await browser.close();
})();