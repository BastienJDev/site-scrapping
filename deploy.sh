#!/bin/bash

# Script de déploiement rapide pour 31.56.58.90
# Usage: ./deploy.sh

set -e

# Configuration
SERVER="root@31.56.58.90"
PROJECT_NAME="scrapping-web"
REMOTE_PATH="/var/www/$PROJECT_NAME"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Déploiement sur 31.56.58.90            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# 1. Test connexion
echo -e "${YELLOW}[1/6] Test de connexion SSH...${NC}"
if ! ssh -o ConnectTimeout=10 "$SERVER" "echo 'OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Impossible de se connecter à $SERVER${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Connexion SSH réussie${NC}"
echo ""

# 2. Créer l'archive
echo -e "${YELLOW}[2/6] Création de l'archive...${NC}"
tar -czf /tmp/${PROJECT_NAME}.tar.gz \
    --exclude="venv" \
    --exclude="__pycache__" \
    --exclude="*.pyc" \
    --exclude=".git" \
    --exclude=".env" \
    --exclude="uploads/*" \
    .
echo -e "${GREEN}✓ Archive créée${NC}"
echo ""

# 3. Transfert
echo -e "${YELLOW}[3/6] Transfert vers le serveur...${NC}"
scp /tmp/${PROJECT_NAME}.tar.gz "$SERVER:/tmp/"
rm /tmp/${PROJECT_NAME}.tar.gz
echo -e "${GREEN}✓ Transfert terminé${NC}"
echo ""

# 4. Installation
echo -e "${YELLOW}[4/6] Installation sur le serveur...${NC}"
ssh "$SERVER" bash << 'ENDSSH'
set -e

PROJECT_NAME="scrapping-web"
REMOTE_PATH="/var/www/$PROJECT_NAME"

echo "→ Mise à jour du système..."
apt-get update -qq

echo "→ Installation des dépendances..."
apt-get install -y -qq python3.10 python3.10-venv python3-pip nginx supervisor

echo "→ Création du répertoire..."
mkdir -p "$REMOTE_PATH"
cd "$REMOTE_PATH"

echo "→ Extraction..."
tar -xzf /tmp/scrapping-web.tar.gz
rm /tmp/scrapping-web.tar.gz

echo "→ Environnement virtuel..."
python3.10 -m venv venv
source venv/bin/activate

echo "→ Installation des dépendances Python..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

echo "→ Création des répertoires..."
mkdir -p uploads logs

echo "→ Permissions..."
chown -R www-data:www-data "$REMOTE_PATH"
chmod -R 755 "$REMOTE_PATH"

ENDSSH
echo -e "${GREEN}✓ Installation terminée${NC}"
echo ""

# 5. Configuration
echo -e "${YELLOW}[5/6] Configuration de Gunicorn et Nginx...${NC}"
ssh "$SERVER" bash << 'ENDSSH'
set -e

PROJECT_NAME="scrapping-web"
REMOTE_PATH="/var/www/$PROJECT_NAME"

# Gunicorn config
cat > "$REMOTE_PATH/gunicorn_config.py" << 'EOF'
import multiprocessing

bind = "127.0.0.1:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
timeout = 120
keepalive = 5

accesslog = "/var/www/scrapping-web/logs/access.log"
errorlog = "/var/www/scrapping-web/logs/error.log"
loglevel = "info"
proc_name = "scrapping-web"
EOF

# Supervisor
cat > /etc/supervisor/conf.d/scrapping-web.conf << 'EOF'
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

# Nginx
cat > /etc/nginx/sites-available/scrapping-web << 'EOF'
server {
    listen 80 default_server;
    server_name 31.56.58.90;

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

# Activer Nginx
ln -sf /etc/nginx/sites-available/scrapping-web /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Démarrer les services
supervisorctl reread
supervisorctl update
nginx -t && systemctl reload nginx

ENDSSH
echo -e "${GREEN}✓ Configuration terminée${NC}"
echo ""

# 6. Variables d'environnement
echo -e "${YELLOW}[6/6] Configuration .env...${NC}"
echo -e "${BLUE}Entrez votre clé API Gemini (entrée vide pour ignorer):${NC}"
read -s GEMINI_KEY

if [ ! -z "$GEMINI_KEY" ]; then
    ssh "$SERVER" bash << ENDSSH
cat > /var/www/scrapping-web/.env << EOF
GEMINI_API_KEY=$GEMINI_KEY
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)
EOF
chown www-data:www-data /var/www/scrapping-web/.env
chmod 600 /var/www/scrapping-web/.env
supervisorctl restart scrapping-web
ENDSSH
    echo -e "${GREEN}✓ Variables configurées et application redémarrée${NC}"
else
    ssh "$SERVER" bash << 'ENDSSH'
cat > /var/www/scrapping-web/.env << EOF
GEMINI_API_KEY=your_api_key_here
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)
EOF
chown www-data:www-data /var/www/scrapping-web/.env
chmod 600 /var/www/scrapping-web/.env
supervisorctl restart scrapping-web
ENDSSH
    echo -e "${YELLOW}⚠ Clé API ignorée, pensez à la configurer plus tard${NC}"
fi
echo ""

# Vérifier le statut
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🎉 Déploiement terminé avec succès!     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🌐 Application accessible sur: ${BLUE}http://31.56.58.90${NC}"
echo ""
echo -e "${YELLOW}📋 Commandes utiles:${NC}"
echo -e "  • Logs:           ${BLUE}ssh $SERVER 'tail -f /var/www/scrapping-web/logs/error.log'${NC}"
echo -e "  • Redémarrer:     ${BLUE}ssh $SERVER 'supervisorctl restart scrapping-web'${NC}"
echo -e "  • Statut:         ${BLUE}ssh $SERVER 'supervisorctl status scrapping-web'${NC}"
echo ""
