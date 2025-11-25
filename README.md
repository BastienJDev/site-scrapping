# Site Scrapping Dashboard

Application web de scraping avec intégration Gemini AI.

## 📋 Prérequis

- Python 3.9 ou supérieur (recommandé: Python 3.10+)
- pip (gestionnaire de paquets Python)

## 🚀 Installation & Démarrage

### Méthode 1: Script automatique (Recommandé)

```bash
./run.sh
```

### Méthode 2: Installation manuelle

1. **Créer un environnement virtuel** (recommandé)
```bash
python3 -m venv venv
source venv/bin/activate  # Sur macOS/Linux
```

2. **Installer les dépendances**
```bash
pip install -r requirements.txt
```

3. **Configurer la clé API Gemini**
Éditer le fichier `.env` et ajouter votre clé:
```
GEMINI_API_KEY=votre_clé_api_ici
```

4. **Lancer l'application**
```bash
python3 app.py
```

5. **Accéder à l'application**
Ouvrir votre navigateur sur: http://127.0.0.1:5001

## 🔑 Connexion

**Administrateur:**
- Identifiant: `admin`
- Mot de passe: `admin123`

**Utilisateur:**
- Identifiant: `user`
- Mot de passe: `password`

## 🎯 Fonctionnalités

### Page d'accueil (Scraping)
- **Scraping par site:** Sélectionner des sites individuels
- **Scraping par catégorie:** Scraper tous les sites d'une ou plusieurs catégories
- **Sans sélection en mode catégorie:** Scrape TOUS les sites
- **Profondeur de scraping:** 0 à 3 niveaux
- **Résumé Gemini AI:** Génère un résumé humanisé de tous les sites scrapés
- **Prompt personnalisé:** Donner des instructions spécifiques à Gemini

### Page Actualités
- Même fonctionnalités que l'accueil
- **Filtre par date:** Rechercher dans une plage de dates

### Gestion des sites
- Ajouter/modifier/supprimer des sites
- Ajouter/modifier/supprimer des catégories
- Importer des sites depuis Excel

## 📊 Format Excel

Colonnes requises:
- `Nom`: Nom du site
- `URL`: URL complète
- `Catégorie`: Nom de la catégorie
- `Description`: (optionnel)

## 🛠️ Dépannage

### Port 5001 déjà utilisé
```bash
lsof -ti:5001 | xargs kill -9
```

### Module manquant
```bash
pip install -r requirements.txt
```

### Gemini ne fonctionne pas
Vérifier la clé API dans `.env`

## 🔒 Sécurité Production

⚠️ Avant déploiement:
1. Changer les mots de passe dans `app.py`
2. Désactiver le mode debug
3. Utiliser un serveur WSGI (gunicorn)
4. Ne pas commit `.env` dans Git
