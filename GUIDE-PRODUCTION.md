# 🚀 Guide de déploiement sur serveur dédié

Ce guide vous accompagne pour déployer votre application de scraping web sur un serveur dédié avec Nginx, Gunicorn et Supervisor.

## 📋 Prérequis

- Un serveur dédié avec Ubuntu 20.04+ ou Debian 11+
- Accès SSH root ou sudo
- Python 3.10+ installé (le script l'installera si nécessaire)
- Votre clé API Gemini

## 🎯 Méthode 1: Déploiement automatique (Recommandé)

### Étape 1: Lancer le script de déploiement

```bash
./deploy-production.sh user@votre-ip-serveur
```

**Exemple:**
```bash
./deploy-production.sh root@123.45.67.89
```

Le script va automatiquement:
1. ✅ Tester la connexion SSH
2. 📦 Créer une archive du projet
3. ⬆️ Transférer l'archive sur le serveur
4. 🔧 Installer les dépendances système (Python, Nginx, Supervisor)
5. ⚙️ Configurer Gunicorn avec Supervisor
6. 🌐 Configurer Nginx comme reverse proxy
7. 🔐 Configurer les variables d'environnement

### Étape 2: Configuration du domaine (Optionnel)

Si vous avez un nom de domaine:

```bash
ssh user@votre-ip-serveur

# Éditer la configuration Nginx
nano /etc/nginx/sites-available/scrapping-web

# Remplacer la ligne:
server_name _;
# Par:
server_name votre-domaine.com www.votre-domaine.com;

# Recharger Nginx
systemctl reload nginx
```

### Étape 3: Activer HTTPS avec Let's Encrypt (Recommandé)

```bash
ssh user@votre-ip-serveur

# Installer certbot
apt install certbot python3-certbot-nginx -y

# Obtenir un certificat SSL
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Le renouvellement est automatique!
```

## 🛠️ Méthode 2: Déploiement manuel

### Sur votre machine locale:

```bash
# 1. Créer l'archive
tar -czf scrapping-web.tar.gz \
    --exclude="venv" \
    --exclude="__pycache__" \
    --exclude=".git" \
    --exclude=".env" \
    .

# 2. Envoyer sur le serveur
scp scrapping-web.tar.gz user@votre-ip:/tmp/
```

### Sur votre serveur:

```bash
# 1. Installer les dépendances
apt update
apt install -y python3.10 python3.10-venv python3-pip nginx supervisor

# 2. Créer le répertoire
mkdir -p /var/www/scrapping-web
cd /var/www/scrapping-web

# 3. Extraire l'archive
tar -xzf /tmp/scrapping-web.tar.gz

# 4. Créer l'environnement virtuel
python3.10 -m venv venv
source venv/bin/activate

# 5. Installer les dépendances Python
pip install -r requirements.txt
pip install gunicorn

# 6. Créer les répertoires
mkdir -p uploads logs

# 7. Configuration .env
nano .env
```

Contenu du `.env`:
```
GEMINI_API_KEY=votre_cle_api_gemini
FLASK_ENV=production
SECRET_KEY=une_cle_secrete_aleatoire_longue
```

```bash
# 8. Configuration Gunicorn
nano gunicorn_config.py
```

Contenu de `gunicorn_config.py`:
```python
import multiprocessing

bind = "127.0.0.1:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
timeout = 120

accesslog = "/var/www/scrapping-web/logs/access.log"
errorlog = "/var/www/scrapping-web/logs/error.log"
loglevel = "info"
```

```bash
# 9. Configuration Supervisor
nano /etc/supervisor/conf.d/scrapping-web.conf
```

Contenu:
```ini
[program:scrapping-web]
command=/var/www/scrapping-web/venv/bin/gunicorn -c /var/www/scrapping-web/gunicorn_config.py app:app
directory=/var/www/scrapping-web
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/www/scrapping-web/logs/supervisor_error.log
stdout_logfile=/var/www/scrapping-web/logs/supervisor_access.log
environment=PATH="/var/www/scrapping-web/venv/bin"
```

```bash
# 10. Configuration Nginx
nano /etc/nginx/sites-available/scrapping-web
```

Contenu:
```nginx
server {
    listen 80;
    server_name votre-domaine.com;  # ou _ pour toute IP

    client_max_body_size 16M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/scrapping-web/static;
        expires 30d;
    }
}
```

```bash
# 11. Activer et démarrer
ln -s /etc/nginx/sites-available/scrapping-web /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

chown -R www-data:www-data /var/www/scrapping-web
chmod -R 755 /var/www/scrapping-web

supervisorctl reread
supervisorctl update
supervisorctl start scrapping-web

nginx -t
systemctl reload nginx
```

## 📊 Gestion de l'application

### Vérifier le statut
```bash
supervisorctl status scrapping-web
systemctl status nginx
```

### Redémarrer l'application
```bash
supervisorctl restart scrapping-web
```

### Consulter les logs
```bash
# Logs de l'application
tail -f /var/www/scrapping-web/logs/error.log
tail -f /var/www/scrapping-web/logs/access.log

# Logs Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Mettre à jour l'application
```bash
# Sur votre machine locale
./deploy-production.sh user@votre-ip-serveur

# Ou manuellement:
cd /var/www/scrapping-web
git pull  # si vous utilisez Git
source venv/bin/activate
pip install -r requirements.txt
supervisorctl restart scrapping-web
```

## 🔒 Sécurité

### Configurer le firewall (UFW)
```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### Créer un utilisateur non-root
```bash
adduser deployer
usermod -aG sudo deployer
su - deployer
```

### Désactiver l'authentification root par SSH
```bash
nano /etc/ssh/sshd_config
# Modifier: PermitRootLogin no
systemctl restart sshd
```

## 🐛 Dépannage

### L'application ne démarre pas
```bash
# Vérifier les logs
tail -50 /var/www/scrapping-web/logs/error.log

# Vérifier la configuration
cd /var/www/scrapping-web
source venv/bin/activate
python app.py  # Test manuel
```

### Erreur 502 Bad Gateway
```bash
# Vérifier que Gunicorn tourne
supervisorctl status scrapping-web

# Redémarrer si nécessaire
supervisorctl restart scrapping-web
```

### Port 8000 déjà utilisé
```bash
# Trouver le processus
lsof -i :8000

# Tuer le processus
kill -9 PID
supervisorctl restart scrapping-web
```

## 📈 Performance

### Ajuster le nombre de workers Gunicorn
```bash
nano /var/www/scrapping-web/gunicorn_config.py
# Modifier: workers = 4  # Selon votre CPU
supervisorctl restart scrapping-web
```

### Activer la compression Nginx
Ajouter dans `/etc/nginx/nginx.conf`:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1000;
```

## 📞 Support

En cas de problème:
1. Vérifiez les logs en premier
2. Testez la connexion: `curl http://localhost:8000`
3. Vérifiez les permissions: `ls -la /var/www/scrapping-web`
4. Redémarrez les services: `supervisorctl restart scrapping-web && systemctl reload nginx`

---

**🎉 Votre application est maintenant déployée !**

Accédez-y via: `http://votre-ip-serveur` ou `http://votre-domaine.com`
