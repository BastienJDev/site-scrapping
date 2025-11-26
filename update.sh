#!/bin/bash

# Script de mise à jour rapide pour 31.56.58.90
# Usage: ./update.sh

set -e

SERVER="root@31.56.58.90"
PROJECT_NAME="scrapping-web"
REMOTE_PATH="/var/www/$PROJECT_NAME"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Mise à jour de l'application sur 31.56.58.90${NC}"
echo ""

# Créer l'archive
echo -e "${YELLOW}→ Création de l'archive...${NC}"
tar -czf /tmp/${PROJECT_NAME}.tar.gz \
    --exclude="venv" \
    --exclude="__pycache__" \
    --exclude="*.pyc" \
    --exclude=".git" \
    --exclude=".env" \
    --exclude="uploads/*" \
    .

# Transfert
echo -e "${YELLOW}→ Transfert...${NC}"
scp /tmp/${PROJECT_NAME}.tar.gz "$SERVER:/tmp/"
rm /tmp/${PROJECT_NAME}.tar.gz

# Mise à jour
echo -e "${YELLOW}→ Mise à jour sur le serveur...${NC}"
ssh "$SERVER" bash << 'ENDSSH'
set -e

PROJECT_NAME="scrapping-web"
REMOTE_PATH="/var/www/$PROJECT_NAME"

# Sauvegardes
cp "$REMOTE_PATH/.env" /tmp/.env.backup 2>/dev/null || true
cp -r "$REMOTE_PATH/uploads" /tmp/uploads.backup 2>/dev/null || true
cp "$REMOTE_PATH/data.json" /tmp/data.json.backup 2>/dev/null || true

# Extraire
cd "$REMOTE_PATH"
tar -xzf /tmp/scrapping-web.tar.gz
rm /tmp/scrapping-web.tar.gz

# Restaurer
cp /tmp/.env.backup .env 2>/dev/null || true
cp -r /tmp/uploads.backup/* uploads/ 2>/dev/null || true
cp /tmp/data.json.backup data.json 2>/dev/null || true

# Mettre à jour
source venv/bin/activate
pip install -r requirements.txt -q

# Permissions
chown -R www-data:www-data "$REMOTE_PATH"
chmod -R 755 "$REMOTE_PATH"

# Redémarrer
supervisorctl restart scrapping-web

echo "✅ Mise à jour terminée!"
ENDSSH

echo ""
echo -e "${GREEN}✅ Application mise à jour avec succès!${NC}"
echo -e "${BLUE}URL: http://31.56.58.90${NC}"
