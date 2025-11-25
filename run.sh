#!/bin/bash

# Script de démarrage pour l'application de scraping

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Démarrage de l'application Site Scrapping ===${NC}"

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python3 n'est pas installé${NC}"
    exit 1
fi

# Vérifier si le port 5001 est utilisé
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Le port 5001 est déjà utilisé. Arrêt du processus...${NC}"
    lsof -ti:5001 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Créer un environnement virtuel s'il n'existe pas
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Création de l'environnement virtuel...${NC}"
    python3 -m venv venv
fi

# Activer l'environnement virtuel
echo -e "${YELLOW}Activation de l'environnement virtuel...${NC}"
source venv/bin/activate

# Installer les dépendances
echo -e "${YELLOW}Installation des dépendances...${NC}"
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Vérifier le fichier .env
if [ ! -f ".env" ]; then
    echo -e "${RED}Fichier .env manquant!${NC}"
    echo "GEMINI_API_KEY=your_api_key_here" > .env
    echo -e "${YELLOW}Fichier .env créé. Veuillez ajouter votre clé API Gemini.${NC}"
fi

# Vérifier le fichier data.json
if [ ! -f "data.json" ]; then
    echo -e "${YELLOW}Création du fichier data.json...${NC}"
    echo '{"categories": [], "sites": [], "scraping_results": []}' > data.json
fi

# Démarrer l'application
echo -e "${GREEN}Démarrage du serveur sur http://127.0.0.1:5001${NC}"
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter${NC}"
python3 app.py
