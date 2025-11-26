const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://catalogue-bu.u-bourgogne.fr/discovery/dbsearch?vid=33UB_INST:33UB_INST&lang=fr');
  await page.getByRole('button', { name: 'S\'inscrire' }).click();
  await page.locator('#username').fill('E');
  await page.locator('#password').click({
    modifiers: ['Shift']
  });
  await page.locator('#username').click();
  await page.locator('#username').fill('');
  await page.locator('#password').click();
  await page.locator('#password').fill('Enzomatteo12@ep462599');
  await page.locator('#password').press('ControlOrMeta+z');
  await page.locator('#password').fill('Enzomatteo12@');
  await page.locator('#username').click();
  await page.locator('#username').fill('ep462599');
  await page.getByRole('button', { name: 'CONNEXION' }).click();
  await page.getByRole('combobox', { name: 'Rechercher' }).click();
  await page.getByRole('combobox', { name: 'Rechercher' }).fill('dalloz');
  await page.getByRole('option', { name: 'Dalloz', exact: true }).click();
  await page.getByRole('link', { name: 'Dalloz', exact: true }).click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Dalloz - Base de données -' }).click();
  const page1 = await page1Promise;
  await page1.goto('https://www-dalloz-fr.proxy-bu2.ube.fr/etudiants');

  // ---------------------
})();
