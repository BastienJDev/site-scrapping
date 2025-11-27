# 🍎 Guide de démarrage sur Mac

## 📥 1. Récupérer le code depuis GitHub

```bash
# Cloner le repository (si pas encore fait)
git clone https://github.com/BastienJDev/site-scrapping.git
cd site-scrapping

# OU si déjà cloné, mettre à jour
git pull origin main
```

## 🐍 2. Configuration Python

### Installer Python (si nécessaire)
```bash
# Vérifier si Python est installé
python3 --version

# Si pas installé, utiliser Homebrew
brew install python3
```

### Créer un environnement virtuel
```bash
# Créer l'environnement virtuel
python3 -m venv venv

# Activer l'environnement virtuel
source venv/bin/activate
```

### Installer les dépendances
```bash
pip install -r requirements.txt
```

## 🔧 3. Configuration de l'environnement

### Créer votre fichier .env
```bash
# Copier le template
cp .env.example .env

# Éditer avec votre éditeur préféré
nano .env
# OU
code .env
```

### Remplir les variables dans .env
```env
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-change-this-in-production

# Clé API Google Gemini
GEMINI_API_KEY=VOTRE_NOUVELLE_CLE_ICI

# Configuration serveur
HOST_IP=127.0.0.1
PORT=5001

# Identifiants (si nécessaire)
CLIENT_USER=votre_user
CLIENT_PASS=votre_pass
START_URL=https://votre-url.com
```

## 📦 4. Configuration Node.js (pour le scraping Playwright)

### Installer Node.js
```bash
# Vérifier si Node.js est installé
node --version

# Si pas installé
brew install node
```

### Installer les dépendances Node.js
```bash
# À la racine du projet
npm install

# Dans le dossier scripts
cd scripts
npm install
cd ..
```

## 🚀 5. Lancer l'application

### Option 1 : Lancer avec Python directement
```bash
# S'assurer que l'environnement virtuel est activé
source venv/bin/activate

# Lancer l'application
python3 app.py
```

### Option 2 : Utiliser Flask CLI
```bash
source venv/bin/activate
flask run --host=127.0.0.1 --port=5001
```

### Option 3 : Utiliser le script run.sh
```bash
chmod +x run.sh
./run.sh
```

## 🌐 6. Accéder à l'application

Ouvrez votre navigateur et allez sur :
```
http://127.0.0.1:5001
```

**Identifiants par défaut :**
- Username: `admin`
- Password: `admin123`

## 🔄 7. Workflow quotidien Mac ↔ Windows

### Sur Mac (récupérer les changements de Windows)
```bash
git pull origin main
```

### Sur Mac (après vos modifications)
```bash
git add .
git commit -m "Description de vos changements"
git push origin main
```

### Sur Windows (pour récupérer les changements du Mac)
```powershell
git pull origin main
```

## 🛠️ Commandes utiles

### Arrêter le serveur
```
Ctrl + C
```

### Désactiver l'environnement virtuel
```bash
deactivate
```

### Réinstaller les dépendances après un pull
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Voir les logs en direct
```bash
tail -f logs/app.log  # si vous avez des logs
```

## 🐛 Résolution de problèmes

### Erreur "module not found"
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Port déjà utilisé
```bash
# Trouver le processus utilisant le port 5001
lsof -i :5001

# Tuer le processus
kill -9 <PID>
```

### Problème de permissions
```bash
chmod +x run.sh
chmod +x deploy.sh
```

### Gemini ne fonctionne pas
1. Vérifiez votre clé API dans `.env`
2. Testez avec : `python3 test_gemini_quick.py`
3. Créez une nouvelle clé sur https://aistudio.google.com/app/apikey

## 📱 Accès depuis d'autres appareils

Pour accéder depuis un autre appareil sur le même réseau :

```bash
# Modifier HOST_IP dans .env
HOST_IP=0.0.0.0

# Trouver votre IP locale Mac
ifconfig | grep "inet " | grep -v 127.0.0.1

# Accéder depuis l'autre appareil
http://VOTRE_IP_MAC:5001
```

## 🔐 Sécurité

- ⚠️ Ne jamais committer le fichier `.env`
- ⚠️ Changer le `SECRET_KEY` en production
- ⚠️ Créer votre propre clé API Gemini
- ⚠️ Ne pas partager vos identifiants

## 📝 Résumé rapide

```bash
# Setup initial (une seule fois)
git clone https://github.com/BastienJDev/site-scrapping.git
cd site-scrapping
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Éditer .env avec vos vraies clés

# Démarrage quotidien
cd site-scrapping
git pull origin main
source venv/bin/activate
python3 app.py
```

Votre application sera disponible sur **http://127.0.0.1:5001** 🎉
