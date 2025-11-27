#!/usr/bin/env node

/**
 * CLI pour créer et exécuter des scripts Playwright pour un site
 * Usage: node create-playwright-script.js <site_id>
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SCRIPTS_FILE = path.join(__dirname, '..', 'playwright_scripts.json');
const CUSTOM_SCRIPTS_DIR = path.join(__dirname, 'custom');
const DATA_FILE = path.join(__dirname, '..', 'data.json');

// Créer le dossier custom s'il n'existe pas
if (!fs.existsSync(CUSTOM_SCRIPTS_DIR)) {
    fs.mkdirSync(CUSTOM_SCRIPTS_DIR, { recursive: true });
}

function loadScripts() {
    if (!fs.existsSync(SCRIPTS_FILE)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(SCRIPTS_FILE, 'utf-8'));
}

function saveScripts(data) {
    fs.writeFileSync(SCRIPTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function loadData() {
    if (!fs.existsSync(DATA_FILE)) {
        return { sites: [] };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function getSiteById(siteId) {
    const data = loadData();
    return data.sites.find(s => s.id === parseInt(siteId));
}

function listSites() {
    const data = loadData();
    console.log('\n📋 Sites disponibles:\n');
    data.sites.forEach(site => {
        console.log(`  ${site.id}. ${site.name}`);
        console.log(`     ${site.url}`);
        console.log('');
    });
}

function createScriptTemplate(site) {
    return `const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false // Mettre true pour exécution en arrière-plan
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🌐 Navigation vers ${site.name}...');
  await page.goto('${site.url}');
  
  // ===============================================
  // VOTRE CODE ICI
  // ===============================================
  
  // Exemple: attendre un élément
  // await page.waitForSelector('.mon-element');
  
  // Exemple: cliquer sur un bouton
  // await page.click('button[type="submit"]');
  
  // Exemple: remplir un formulaire
  // await page.fill('#username', 'mon_user');
  // await page.fill('#password', 'mon_pass');
  
  // Exemple: capturer une capture d'écran
  // await page.screenshot({ path: 'screenshot.png' });
  
  // Exemple: extraire du texte
  // const titre = await page.textContent('h1');
  // console.log('Titre:', titre);
  
  // Attendre un peu avant de fermer
  await page.waitForTimeout(3000);
  
  console.log('✅ Script terminé pour ${site.name}');
  await browser.close();
})().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
`;
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log(`
🎭 Playwright Script Manager

Usage:
  node create-playwright-script.js <site_id>                    Créer/éditer un script pour un site existant
  node create-playwright-script.js <site_id> --run              Exécuter le script d'un site
  node create-playwright-script.js --url <URL> <nom>            Créer un script pour une URL personnalisée
  node create-playwright-script.js --url <URL> <nom> --run      Créer et exécuter un script
  node create-playwright-script.js --list                       Lister tous les sites

Exemples:
  node create-playwright-script.js 134                                    Créer script pour le site #134
  node create-playwright-script.js 134 --run                              Lancer le script du site #134
  node create-playwright-script.js --url https://dalloz.fr dalloz         Créer script pour Dalloz
  node create-playwright-script.js --url https://dalloz.fr dalloz --run   Créer et lancer
  node create-playwright-script.js --list                                 Voir tous les sites
        `);
        return;
    }
    
    if (args[0] === '--list' || args[0] === '-l') {
        listSites();
        return;
    }
    
    // Mode URL personnalisée
    if (args[0] === '--url') {
        if (args.length < 3) {
            console.error('❌ Usage: node create-playwright-script.js --url <URL> <nom> [--run]');
            process.exit(1);
        }
        
        const url = args[1];
        const name = args[2];
        const shouldRun = args[3] === '--run' || args[3] === '-r';
        
        // Créer un ID unique basé sur le nom
        const customId = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const scriptPath = path.join(CUSTOM_SCRIPTS_DIR, `${customId}.js`);
        
        const customSite = {
            id: customId,
            name: name,
            url: url
        };
        
        if (shouldRun) {
            if (!fs.existsSync(scriptPath)) {
                console.log(`\n📝 Création du script pour ${name}...\n`);
                const template = createScriptTemplate(customSite);
                fs.writeFileSync(scriptPath, template, 'utf-8');
            }
            
            console.log(`\n🚀 Exécution du script pour ${name} (${url})...\n`);
            const { spawn } = require('child_process');
            const child = spawn('node', [scriptPath], { stdio: 'inherit' });
            
            child.on('exit', (code) => {
                if (code === 0) {
                    console.log(`\n✅ Script terminé avec succès`);
                } else {
                    console.log(`\n❌ Script terminé avec erreur (code ${code})`);
                }
            });
        } else {
            if (!fs.existsSync(scriptPath)) {
                console.log(`\n📝 Création d'un nouveau script pour ${name} (${url})...\n`);
                const template = createScriptTemplate(customSite);
                fs.writeFileSync(scriptPath, template, 'utf-8');
                
                console.log(`✅ Script créé: ${scriptPath}`);
                console.log(`\n📝 Éditez le script avec votre éditeur préféré:`);
                console.log(`   code ${scriptPath}`);
                console.log(`   nano ${scriptPath}`);
                console.log(`\n▶️  Puis exécutez-le avec:`);
                console.log(`   node create-playwright-script.js --url ${url} ${name} --run`);
            } else {
                console.log(`\n📝 Script existant pour ${name}:`);
                console.log(`   ${scriptPath}`);
                console.log(`\n💡 Actions disponibles:`);
                console.log(`   - Éditez: code ${scriptPath}`);
                console.log(`   - Exécutez: node create-playwright-script.js --url ${url} ${name} --run`);
            }
        }
        return;
    }
    
    // Mode site_id classique
    const siteId = args[0];
    const shouldRun = args[1] === '--run' || args[1] === '-r';
    
    const site = getSiteById(siteId);
    if (!site) {
        console.error(`❌ Site #${siteId} introuvable`);
        console.log('\nUtilisez --list pour voir les sites disponibles');
        console.log('Ou utilisez --url pour une URL personnalisée');
        process.exit(1);
    }
    
    const scripts = loadScripts();
    const scriptPath = path.join(CUSTOM_SCRIPTS_DIR, `site_${siteId}.js`);
    
    if (shouldRun) {
        // Exécuter le script
        if (!fs.existsSync(scriptPath)) {
            console.error(`❌ Aucun script trouvé pour ${site.name}`);
            console.log(`Créez d'abord le script avec: node create-playwright-script.js ${siteId}`);
            process.exit(1);
        }
        
        console.log(`\n🚀 Exécution du script pour ${site.name}...\n`);
        const { spawn } = require('child_process');
        const child = spawn('node', [scriptPath], { stdio: 'inherit' });
        
        child.on('exit', (code) => {
            if (code === 0) {
                console.log(`\n✅ Script terminé avec succès`);
            } else {
                console.log(`\n❌ Script terminé avec erreur (code ${code})`);
            }
        });
        
    } else {
        // Créer ou éditer le script
        if (!fs.existsSync(scriptPath)) {
            console.log(`\n📝 Création d'un nouveau script pour ${site.name}...\n`);
            const template = createScriptTemplate(site);
            fs.writeFileSync(scriptPath, template, 'utf-8');
            
            // Sauvegarder dans la config
            scripts[siteId] = {
                site_id: parseInt(siteId),
                site_name: site.name,
                script: template,
                updated_at: new Date().toISOString()
            };
            saveScripts(scripts);
            
            console.log(`✅ Script créé: ${scriptPath}`);
            console.log(`\n📝 Éditez le script avec votre éditeur préféré:`);
            console.log(`   code ${scriptPath}`);
            console.log(`   nano ${scriptPath}`);
            console.log(`   vim ${scriptPath}`);
            console.log(`\n▶️  Puis exécutez-le avec:`);
            console.log(`   node create-playwright-script.js ${siteId} --run`);
        } else {
            console.log(`\n📝 Script existant pour ${site.name}:`);
            console.log(`   ${scriptPath}`);
            console.log(`\n💡 Actions disponibles:`);
            console.log(`   - Éditez: code ${scriptPath}`);
            console.log(`   - Exécutez: node create-playwright-script.js ${siteId} --run`);
        }
    }
}

main();
