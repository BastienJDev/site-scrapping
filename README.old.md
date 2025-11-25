# POLLINA - Web Scraping Project

## Installation

1. Créer un environnement virtuel :
```bash
python3 -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
```

2. Installer les dépendances :
```bash
pip install -r requirements.txt
```

## Lancement

```bash
python app.py
```

L'application sera accessible sur : http://localhost:5000

## Structure du projet

```
Site Scrapping/
├── app.py              # Application Flask principale
├── requirements.txt    # Dépendances Python
├── .env               # Variables d'environnement
├── templates/         # Templates HTML (Flask)
│   └── index.html
├── static/           # Fichiers statiques
│   └── style.css
└── README.md
```

## API Endpoints

- `GET /` - Page principale
- `POST /api/scrape` - Scrapper une URL
- `GET /api/legal-sites` - Liste des sites juridiques
- `GET /api/news` - Liste des actualités

## Exemple d'utilisation de l'API

```javascript
// Scrapper un site
fetch('http://localhost:5000/api/scrape', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        url: 'https://example.com'
    })
})
.then(response => response.json())
.then(data => console.log(data));
```
