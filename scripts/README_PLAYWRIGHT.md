# 🎭 Scripts Playwright CLI

Ce dossier contient l'outil en ligne de commande pour créer et gérer des scripts Playwright personnalisés par site.

## 📋 Utilisation

### 1. Voir tous les sites disponibles
```bash
node create-playwright-script.js --list
```

### 2. Créer un script pour un site
```bash
node create-playwright-script.js <site_id>
```

Exemple:
```bash
node create-playwright-script.js 134
```

Cela va créer un fichier `custom/site_134.js` avec un template de base.

### 3. Éditer le script
Ouvrez le fichier créé avec votre éditeur préféré:

```bash
code scripts/custom/site_134.js
# ou
nano scripts/custom/site_134.js
```

### 4. Exécuter le script
```bash
node create-playwright-script.js <site_id> --run
```

Exemple:
```bash
node create-playwright-script.js 134 --run
```

## 📝 Structure d'un script

Chaque script est un fichier Node.js indépendant qui utilise Playwright:

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false // false = avec interface, true = sans interface
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Votre logique ici
  await page.goto('https://example.com');
  await page.click('button');
  
  await browser.close();
})();
```

## 💡 Exemples courants

### Se connecter à un site
```javascript
await page.goto('https://site.com/login');
await page.fill('#username', 'mon_user');
await page.fill('#password', 'mon_pass');
await page.click('button[type="submit"]');
await page.waitForNavigation();
```

### Extraire du contenu
```javascript
const titre = await page.textContent('h1');
const liens = await page.$$eval('a', links => 
  links.map(l => ({ text: l.textContent, url: l.href }))
);
console.log('Titre:', titre);
console.log('Liens:', liens);
```

### Attendre un élément
```javascript
await page.waitForSelector('.content-loaded');
```

### Capturer une capture d'écran
```javascript
await page.screenshot({ path: 'screenshot.png' });
```

### Gérer les popups
```javascript
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  page.click('a[target="_blank"]')
]);
await popup.waitForLoadState();
console.log(await popup.title());
```

## 📂 Organisation des fichiers

```
scripts/
├── create-playwright-script.js    # Outil CLI principal
├── custom/                         # Scripts personnalisés par site
│   ├── site_134.js                # Script pour le site #134
│   ├── site_135.js                # Script pour le site #135
│   └── ...
└── recorded.js                     # Exemple de script Dalloz
```

## 🔄 Workflow recommandé

1. **Lister les sites** pour trouver l'ID du site à automatiser
   ```bash
   node create-playwright-script.js --list
   ```

2. **Créer le template** pour ce site
   ```bash
   node create-playwright-script.js 134
   ```

3. **Éditer le script** selon vos besoins
   ```bash
   code scripts/custom/site_134.js
   ```

4. **Tester le script**
   ```bash
   node create-playwright-script.js 134 --run
   ```

5. **Ajuster et répéter** jusqu'à ce que ça fonctionne parfaitement

## 🎯 Intégration avec l'interface web

Les scripts créés via le CLI sont automatiquement disponibles dans l'interface web:
- Les boutons 🎭 dans la page Sites permettent d'éditer et exécuter ces scripts
- Les scripts sont sauvegardés dans `playwright_scripts.json`
- Vous pouvez utiliser soit le CLI soit l'interface web, les deux sont synchronisés

## 🐛 Débogage

Pour voir les logs détaillés de Playwright:
```bash
DEBUG=pw:api node create-playwright-script.js 134 --run
```

Pour exécuter en mode headless (sans interface):
Éditez votre script et changez:
```javascript
const browser = await chromium.launch({
  headless: true  // Pas d'interface graphique
});
```
