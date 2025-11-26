#!/bin/bash

# Script de mise à jour rapide pour le serveur
# Usage: ./update-production.sh user@ip_serveur

set -e

# Configuration
SERVER=$1
PROJECT_NAME="scrapping-web"
REMOTE_PATH="/var/www/$PROJECT_NAME"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$SERVER" ]; then
    echo -e "${YELLOW}Usage: $0 user@ip_serveur${NC}"
    echo -e "Exemple: $0 root@123.45.67.89"
    exit 1
fi

echo -e "${BLUE}🔄 Mise à jour de l'application...${NC}"

# Créer l'archive
echo -e "${YELLOW}→ Création de l'archive...${NC}"
tar -czf /tmp/${PROJECT_NAME}.tar.gz \
    --exclude="venv" \
    --exclude="__pycache__" \
    --exclude="*.pyc" \
    --exclude=".git" \
    --exclude=".env" \
    --exclude="uploads/*" \
    -C "$(dirname "$PWD")" "$(basename "$PWD")"

# Envoyer sur le serveur
echo -e "${YELLOW}→ Transfert des fichiers...${NC}"
scp /tmp/${PROJECT_NAME}.tar.gz "$SERVER:/tmp/"
rm /tmp/${PROJECT_NAME}.tar.gz

# Mettre à jour sur le serveur
echo -e "${YELLOW}→ Mise à jour sur le serveur...${NC}"
ssh "$SERVER" bash << 'ENDSSH'
set -e

PROJECT_NAME="scrapping-web"
REMOTE_PATH="/var/www/$PROJECT_NAME"

# Sauvegarder .env et uploads
cp "$REMOTE_PATH/.env" /tmp/.env.backup 2>/dev/null || true
cp -r "$REMOTE_PATH/uploads" /tmp/uploads.backup 2>/dev/null || true
cp "$REMOTE_PATH/data.json" /tmp/data.json.backup 2>/dev/null || true

# Extraire la nouvelle version
cd "$REMOTE_PATH"
tar -xzf /tmp/scrapping-web.tar.gz --strip-components=1
rm /tmp/scrapping-web.tar.gz

# Restaurer .env, uploads et data.json
cp /tmp/.env.backup .env 2>/dev/null || true
cp -r /tmp/uploads.backup/* uploads/ 2>/dev/null || true
cp /tmp/data.json.backup data.json 2>/dev/null || true

# Mettre à jour les dépendances
source venv/bin/activate
pip install -r requirements.txt -q

# Permissions
chown -R www-data:www-data "$REMOTE_PATH"
chmod -R 755 "$REMOTE_PATH"

# Redémarrer
supervisorctl restart scrapping-web

echo "✅ Mise à jour terminée!"
ENDSSH

echo -e "${GREEN}✅ Application mise à jour avec succès!${NC}"
echo -e "${BLUE}Vérifier les logs: ssh $SERVER 'tail -f /var/www/scrapping-web/logs/error.log'${NC}"
