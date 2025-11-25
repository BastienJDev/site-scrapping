# 🚀 Déploiement via GitHub - Guide pas à pas

## ✅ Étape 1: Créer un repository sur GitHub

1. Allez sur https://github.com
2. Cliquez sur le bouton **"+"** en haut à droite → **"New repository"**
3. Remplissez:
   - **Repository name:** `site-scrapping` (ou le nom de votre choix)
   - **Description:** "Dashboard de scraping web avec Gemini AI"
   - **Visibilité:** Private (recommandé) ou Public
   - ⚠️ **NE PAS** cocher "Add README" (on a déjà fait le commit)
4. Cliquez sur **"Create repository"**

## ✅ Étape 2: Lier votre projet local à GitHub

GitHub va vous montrer des commandes. Utilisez celles-ci:

```bash
cd "/Users/bastienjund/Desktop/Site Scrapping"

# Ajouter le remote (remplacer par VOTRE URL)
git remote add origin https://github.com/VOTRE_USERNAME/site-scrapping.git

# Vérifier
git remote -v

# Pousser le code
git branch -M main
git push -u origin main
```

**Note:** Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub

## ✅ Étape 3: Sur votre VPS - Cloner le projet

```bash
# Se connecter au VPS
ssh user@IP_VPS

# Installer Git si nécessaire
sudo apt update
sudo apt install git -y

# Cloner le projet
cd /home/user
git clone https://github.com/VOTRE_USERNAME/site-scrapping.git
cd site-scrapping
```

## ✅ Étape 4: Configuration sur le VPS

```bash
# Installer Python 3.10+
sudo apt install python3.10 python3.10-venv python3-pip -y

# Créer environnement virtuel
python3.10 -m venv venv
source venv/bin/activate

# Installer dépendances
pip install --upgrade pip
pip install -r requirements.txt

# Créer le fichier .env (IMPORTANT!)
nano .env
```

Dans `.env`, ajoutez:
```
GEMINI_API_KEY=VOTRE_CLE_API_ICI
```

Sauvegarder avec `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Créer data.json
echo '{"categories": [], "sites": [], "scraping_results": []}' > data.json

# Tester
python3 app.py
```

Si ça fonctionne (Ctrl+C pour arrêter), passez à l'étape 5.

## ✅ Étape 5: Configuration Production (Gunicorn + Systemd)

```bash
# Installer Gunicorn
source venv/bin/activate
pip install gunicorn

# Créer le service systemd
sudo nano /etc/systemd/system/scrapping.service
```

Contenu du fichier:
```ini
[Unit]
Description=Site Scrapping Dashboard
After=network.target

[Service]
User=VOTRE_USER
WorkingDirectory=/home/VOTRE_USER/site-scrapping
Environment="PATH=/home/VOTRE_USER/site-scrapping/venv/bin"
ExecStart=/home/VOTRE_USER/site-scrapping/venv/bin/gunicorn -w 4 -b 0.0.0.0:5001 app:app --timeout 120
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

⚠️ Remplacez `VOTRE_USER` par votre nom d'utilisateur

```bash
# Activer et démarrer le service
sudo systemctl daemon-reload
sudo systemctl enable scrapping
sudo systemctl start scrapping
sudo systemctl status scrapping
```

## ✅ Étape 6: Configuration Firewall

```bash
# Ouvrir le port 5001
sudo ufw allow 5001/tcp

# Ou si vous utilisez Nginx (recommandé):
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## 🔄 Mises à jour futures

### Sur votre Mac (après modifications):
```bash
cd "/Users/bastienjund/Desktop/Site Scrapping"
git add .
git commit -m "Description des changements"
git push
```

### Sur votre VPS:
```bash
cd /home/user/site-scrapping
git pull
source venv/bin/activate
pip install -r requirements.txt  # Si nouvelles dépendances
sudo systemctl restart scrapping
```

## 🌐 Bonus: Nginx + SSL (Production)

### Installer Nginx
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/scrapping
```

Contenu:
```nginx
server {
    listen 80;
    server_name votre-domaine.com;  # ou votre IP

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /static {
        alias /home/VOTRE_USER/site-scrapping/static;
        expires 30d;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/scrapping /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Modifier le service pour écouter seulement en local
sudo nano /etc/systemd/system/scrapping.service
# Changer: -b 0.0.0.0:5001 → -b 127.0.0.1:5001
sudo systemctl daemon-reload
sudo systemctl restart scrapping
```

### SSL avec Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d votre-domaine.com
```

## 📊 Commandes utiles

```bash
# Voir les logs en temps réel
sudo journalctl -u scrapping -f

# Redémarrer l'application
sudo systemctl restart scrapping

# Arrêter l'application
sudo systemctl stop scrapping

# Statut
sudo systemctl status scrapping

# Voir les dernières erreurs
sudo journalctl -u scrapping -n 50 --no-pager
```

## 🔐 Sécurité - Checklist finale

- [ ] `.env` non commité dans Git (vérifié par `.gitignore`)
- [ ] Mots de passe changés dans `app.py`
- [ ] Mode debug désactivé dans `app.py` (mettre `debug=False`)
- [ ] Firewall configuré
- [ ] SSL activé (si domaine)
- [ ] Backup régulier de `data.json`

## ⚠️ IMPORTANT avant le premier push

Avant de faire `git push`, vérifiez que `.env` n'est PAS dans Git:
```bash
git status
# Si vous voyez .env, faites:
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Remove .env from tracking"
```

## 🆘 Dépannage

### Erreur "Permission denied (publickey)"
Configurez une clé SSH ou utilisez HTTPS avec token:
```bash
git remote set-url origin https://VOTRE_TOKEN@github.com/VOTRE_USERNAME/site-scrapping.git
```

### Le service ne démarre pas
```bash
sudo journalctl -u scrapping -n 50
# Vérifier les chemins dans le fichier service
```

### Port 5001 déjà utilisé
```bash
sudo lsof -i :5001
sudo kill -9 PID
```
