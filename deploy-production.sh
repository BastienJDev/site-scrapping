#!/bin/bash

# Script de déploiement sur serveur dédié
# Usage: ./deploy-production.sh [user@ip_serveur]

set -e  # Arrêter en cas d'erreur

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER=$1
PROJECT_NAME="scrapping-web"
REMOTE_PATH="/var/www/$PROJECT_NAME"

if [ -z "$SERVER" ]; then
    echo -e "${RED}Usage: $0 user@ip_serveur${NC}"
    echo -e "Exemple: $0 root@123.45.67.89"
    exit 1
fi

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Déploiement sur serveur dédié           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# 1. Vérifier la connexion SSH
echo -e "${YELLOW}[1/6] Test de connexion SSH...${NC}"
if ! ssh -o ConnectTimeout=10 "$SERVER" "echo 'Connexion réussie'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Impossible de se connecter à $SERVER${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Connexion SSH réussie${NC}"
echo ""

# 2. Créer l'archive du projet
echo -e "${YELLOW}[2/6] Création de l'archive du projet...${NC}"
tar -czf /tmp/${PROJECT_NAME}.tar.gz \
    --exclude="venv" \
    --exclude="__pycache__" \
    --exclude="*.pyc" \
    --exclude=".git" \
    --exclude=".env" \
    --exclude="uploads/*" \
    -C "$(dirname "$PWD")" "$(basename "$PWD")"
echo -e "${GREEN}✓ Archive créée${NC}"
echo ""

# 3. Envoyer l'archive sur le serveur
echo -e "${YELLOW}[3/6] Transfert de l'archive vers le serveur...${NC}"
scp /tmp/${PROJECT_NAME}.tar.gz "$SERVER:/tmp/"
rm /tmp/${PROJECT_NAME}.tar.gz
echo -e "${GREEN}✓ Transfert terminé${NC}"
echo ""

# 4. Installation sur le serveur
echo -e "${YELLOW}[4/6] Installation sur le serveur...${NC}"
ssh "$SERVER" bash << 'ENDSSH'
set -e

# Variables
PROJECT_NAME="scrapping-web"
REMOTE_PATH="/var/www/$PROJECT_NAME"
PYTHON_VERSION="3.10"

echo "→ Installation des dépendances système..."
apt-get update -qq
apt-get install -y -qq python3.10 python3.10-venv python3-pip nginx supervisor > /dev/null

echo "→ Création du répertoire d'application..."
mkdir -p "$REMOTE_PATH"
cd "$REMOTE_PATH"

echo "→ Extraction de l'archive..."
tar -xzf /tmp/scrapping-web.tar.gz --strip-components=1
rm /tmp/scrapping-web.tar.gz

echo "→ Création de l'environnement virtuel..."
python3.10 -m venv venv

echo "→ Installation des dépendances Python..."
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
pip install gunicorn -q

echo "→ Création des répertoires nécessaires..."
mkdir -p uploads logs

echo "→ Configuration des permissions..."
chown -R www-data:www-data "$REMOTE_PATH"
chmod -R 755 "$REMOTE_PATH"

ENDSSH
echo -e "${GREEN}✓ Installation terminée${NC}"
echo ""

# 5. Configuration de Gunicorn avec Supervisor
echo -e "${YELLOW}[5/6] Configuration de Gunicorn et Supervisor...${NC}"
ssh "$SERVER" bash << 'ENDSSH'
set -e

PROJECT_NAME="scrapping-web"
REMOTE_PATH="/var/www/$PROJECT_NAME"

# Configuration Gunicorn
cat > "$REMOTE_PATH/gunicorn_config.py" << 'EOF'
import multiprocessing

bind = "127.0.0.1:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
accesslog = "/var/www/scrapping-web/logs/access.log"
errorlog = "/var/www/scrapping-web/logs/error.log"
loglevel = "info"

# Process naming
proc_name = "scrapping-web"

# Daemon mode
daemon = False
EOF

# Configuration Supervisor
cat > /etc/supervisor/conf.d/scrapping-web.conf << EOF
[program:scrapping-web]
command=/var/www/scrapping-web/venv/bin/gunicorn -c /var/www/scrapping-web/gunicorn_config.py app:app
directory=/var/www/scrapping-web
user=www-data
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/www/scrapping-web/logs/supervisor_error.log
stdout_logfile=/var/www/scrapping-web/logs/supervisor_access.log
environment=PATH="/var/www/scrapping-web/venv/bin"
EOF

# Configuration Nginx
cat > /etc/nginx/sites-available/scrapping-web << 'EOF'
server {
    listen 80;
    server_name _;  # Remplacer par votre domaine

    client_max_body_size 16M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }

    location /static {
        alias /var/www/scrapping-web/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /uploads {
        alias /var/www/scrapping-web/uploads;
        expires 1d;
    }
}
EOF

# Activer le site Nginx
ln -sf /etc/nginx/sites-available/scrapping-web /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Recharger les services
supervisorctl reread
supervisorctl update
supervisorctl restart scrapping-web
nginx -t && systemctl reload nginx

ENDSSH
echo -e "${GREEN}✓ Configuration terminée${NC}"
echo ""

# 6. Configuration du fichier .env
echo -e "${YELLOW}[6/6] Configuration des variables d'environnement...${NC}"
echo -e "${BLUE}Veuillez entrer votre clé API Gemini:${NC}"
read -s GEMINI_KEY

ssh "$SERVER" bash << ENDSSH
cat > /var/www/scrapping-web/.env << EOF
GEMINI_API_KEY=$GEMINI_KEY
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)
EOF
chown www-data:www-data /var/www/scrapping-web/.env
chmod 600 /var/www/scrapping-web/.env

# Redémarrer l'application
supervisorctl restart scrapping-web
ENDSSH

echo -e "${GREEN}✓ Variables d'environnement configurées${NC}"
echo ""

# Afficher le statut
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Déploiement terminé avec succès! 🎉     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Application déployée sur: http://$(echo $SERVER | cut -d'@' -f2)${NC}"
echo ""
echo -e "${YELLOW}Commandes utiles:${NC}"
echo -e "  • Vérifier les logs:      ${BLUE}ssh $SERVER 'tail -f /var/www/scrapping-web/logs/error.log'${NC}"
echo -e "  • Redémarrer l'app:       ${BLUE}ssh $SERVER 'supervisorctl restart scrapping-web'${NC}"
echo -e "  • Statut de l'app:        ${BLUE}ssh $SERVER 'supervisorctl status scrapping-web'${NC}"
echo -e "  • Recharger Nginx:        ${BLUE}ssh $SERVER 'systemctl reload nginx'${NC}"
echo ""
