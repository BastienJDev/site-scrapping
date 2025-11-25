# Guide de déploiement sur VPS

## 📦 Méthode 1: SCP (Simple)

### Sur votre Mac:
```bash
# 1. Compresser le projet
cd ~/Desktop
tar -czf site-scrapping.tar.gz "Site Scrapping" \
  --exclude="venv" \
  --exclude="__pycache__" \
  --exclude="*.pyc"

# 2. Envoyer sur le VPS
scp site-scrapping.tar.gz user@IP_VPS:/home/user/

# 3. Se connecter au VPS
ssh user@IP_VPS
```

### Sur votre VPS:
```bash
# 4. Décompresser
cd /home/user
tar -xzf site-scrapping.tar.gz
cd "Site Scrapping"

# 5. Installer Python 3.10+ si nécessaire
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip -y

# 6. Créer l'environnement virtuel
python3.10 -m venv venv
source venv/bin/activate

# 7. Installer les dépendances
pip install -r requirements.txt

# 8. Configurer la clé Gemini
nano .env
# Ajouter: GEMINI_API_KEY=votre_clé

# 9. Tester
python3 app.py
```

## 🔄 Méthode 2: rsync (Synchronisation)

```bash
# Depuis votre Mac - sync automatique
rsync -avz --progress \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.env' \
  ~/Desktop/"Site Scrapping"/ \
  user@IP_VPS:/home/user/site-scrapping/
```

## 🐙 Méthode 3: Git (Recommandé)

### Configuration initiale:
```bash
cd "/Users/bastienjund/Desktop/Site Scrapping"

# Initialiser Git
git init
git add .
git commit -m "Initial commit"

# Ajouter un remote (GitHub/GitLab)
git remote add origin https://github.com/votre-username/site-scrapping.git
git push -u origin main
```

### Sur le VPS:
```bash
cd /home/user
git clone https://github.com/votre-username/site-scrapping.git
cd site-scrapping

# Configuration
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
nano .env  # Ajouter GEMINI_API_KEY
```

### Mises à jour ultérieures:
```bash
# Sur Mac
git add .
git commit -m "Update"
git push

# Sur VPS
cd /home/user/site-scrapping
git pull
source venv/bin/activate
pip install -r requirements.txt  # Si nouvelles dépendances
sudo systemctl restart scrapping  # Si service configuré
```

## 🚀 Production: Utiliser Gunicorn + Nginx

### 1. Installer Gunicorn
```bash
source venv/bin/activate
pip install gunicorn
```

### 2. Tester Gunicorn
```bash
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

### 3. Créer un service systemd
```bash
sudo nano /etc/systemd/system/scrapping.service
```

Contenu:
```ini
[Unit]
Description=Site Scrapping Application
After=network.target

[Service]
User=votre_user
WorkingDirectory=/home/user/site-scrapping
Environment="PATH=/home/user/site-scrapping/venv/bin"
ExecStart=/home/user/site-scrapping/venv/bin/gunicorn -w 4 -b 127.0.0.1:5001 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

### 4. Activer le service
```bash
sudo systemctl daemon-reload
sudo systemctl enable scrapping
sudo systemctl start scrapping
sudo systemctl status scrapping
```

### 5. Configurer Nginx
```bash
sudo nano /etc/nginx/sites-available/scrapping
```

Contenu:
```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /static {
        alias /home/user/site-scrapping/static;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/scrapping /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL avec Let's Encrypt (optionnel)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d votre-domaine.com
```

## 🔧 Commandes utiles

```bash
# Voir les logs
sudo journalctl -u scrapping -f

# Redémarrer l'application
sudo systemctl restart scrapping

# Arrêter l'application
sudo systemctl stop scrapping

# Vérifier le statut
sudo systemctl status scrapping
```

## ⚠️ Checklist avant déploiement

- [ ] Changer les mots de passe dans `app.py`
- [ ] Désactiver le mode debug dans `app.py`
- [ ] Configurer `.env` avec la vraie clé API
- [ ] Vérifier que le port 5001 est libre
- [ ] Configurer le firewall pour autoriser HTTP/HTTPS
- [ ] Backup de `data.json` régulièrement

## 🔒 Sécurité

```bash
# Firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# Permissions
chmod 600 .env
chmod 644 data.json
```
