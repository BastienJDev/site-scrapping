from flask import Flask, render_template, jsonify, request, redirect, url_for, session, send_from_directory
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import os
import subprocess
import pandas as pd
from werkzeug.utils import secure_filename
import shutil
from dotenv import load_dotenv
import importlib.metadata as importlib_metadata

# Patch importlib.metadata pour ajouter packages_distributions sur Python < 3.10
try:
    if not hasattr(importlib_metadata, "packages_distributions"):
        from importlib_metadata import packages_distributions as _backport_packages_distributions  # type: ignore
        importlib_metadata.packages_distributions = _backport_packages_distributions  # type: ignore
except Exception:
    pass

import google.generativeai as genai

load_dotenv()

app = Flask(__name__)

# Configuration en fonction de l'environnement
FLASK_ENV = os.getenv('FLASK_ENV', 'development')

if FLASK_ENV == 'production':
    # En production, pas de CORS pour plus de sécurité
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', os.urandom(32).hex())
else:
    # En développement, activer CORS
    CORS(app)
    app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
app.config['UPLOAD_FOLDER'] = 'uploads'
PDF_FOLDER = os.path.join(app.config['UPLOAD_FOLDER'], 'pdfs')
os.makedirs(PDF_FOLDER, exist_ok=True)

# Configuration Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if GEMINI_API_KEY and GEMINI_API_KEY != 'your_api_key_here':
    genai.configure(api_key=GEMINI_API_KEY)

host_ip = os.getenv('HOST_IP')




# Utilisateurs (en production, utilisez une vraie base de données avec mots de passe hashés)
USERS = {
    'admin': 'admin123',
    'user': 'password'
}

# Créer le dossier uploads s'il n'existe pas
os.makedirs('uploads', exist_ok=True)
os.makedirs(PDF_FOLDER, exist_ok=True)

DATA_FILE = 'data.json'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv', 'pdf'}
PDF_PROMPTS_FILE = 'pdf_prompts.json'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_pdf_prompts():
    if not os.path.exists(PDF_PROMPTS_FILE):
        return {}
    with open(PDF_PROMPTS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_pdf_prompts(data):
    with open(PDF_PROMPTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Fonctions de gestion du fichier JSON
def load_data():
    if not os.path.exists(DATA_FILE):
        return {
            "categories": [],
            "sites": [],
            "scraping_results": []
        }
    
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
    
    # Si le format est l'ancien (dict de listes), le convertir
    if not isinstance(raw_data, dict) or 'categories' not in raw_data:
        # Convertir le format {category: [urls]} en nouveau format
        categories = []
        sites = []
        category_id = 1
        site_id = 1
        
        # Créer les catégories et sites à partir du format ancien
        for category_name, urls in raw_data.items():
            categories.append({
                "id": category_id,
                "name": category_name,
                "color": f"#{hash(category_name) % 0xFFFFFF:06x}"  # Couleur basée sur le nom
            })
            
            for url in urls:
                if url and isinstance(url, str) and url.startswith('http'):
                    # Extraire le nom du domaine comme nom du site
                    try:
                        from urllib.parse import urlparse
                        domain = urlparse(url).netloc
                        name = domain.replace('www.', '').split('.')[0].capitalize()
                    except:
                        name = url[:50]
                    
                    sites.append({
                        "id": site_id,
                        "name": name,
                        "url": url,
                        "category_id": category_id,
                        "description": "",
                        "last_scraped": None,
                        "created_at": datetime.now().isoformat()
                    })
                    site_id += 1
            
            category_id += 1
        
        converted_data = {
            "categories": categories,
            "sites": sites,
            "scraping_results": []
        }
        
        # Sauvegarder le nouveau format
        save_data(converted_data)
        return converted_data
    
    return raw_data

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def get_next_id(items):
    if not items:
        return 1
    return max(item['id'] for item in items) + 1

# Décorateur pour vérifier l'authentification
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ===== ROUTES D'AUTHENTIFICATION =====

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username in USERS and USERS[username] == password:
            session['username'] = username
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='Identifiants incorrects')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

# ===== ROUTES =====

@app.route('/')
@login_required
def index():
    return render_template('index.html', username=session.get('username'))

@app.route('/actualites')
@login_required
def actualites():
    return render_template('actualites.html', username=session.get('username'))

@app.route('/sites')
@login_required
def sites_manager():
    return render_template('sites.html', username=session.get('username'))

@app.route('/bibliotheque')
@login_required
def bibliotheque():
    return render_template('bibliotheque.html', username=session.get('username'))

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/pdfs', methods=['GET', 'POST'])
@login_required
def manage_pdfs():
    if request.method == 'POST':
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Aucun fichier envoyé'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Nom de fichier vide'}), 400
        if file and allowed_file(file.filename) and file.filename.lower().endswith('.pdf'):
            filename = secure_filename(file.filename)
            filepath = os.path.join(PDF_FOLDER, filename)
            file.save(filepath)
            return jsonify({'success': True, 'filename': filename})
        return jsonify({'success': False, 'error': 'Format non autorisé'}), 400
    
    prompts = load_pdf_prompts()
    files = []
    for fname in os.listdir(PDF_FOLDER):
        if fname.lower().endswith('.pdf'):
            files.append({
                'name': fname,
                'url': url_for('uploaded_file', filename=f'pdfs/{fname}'),
                'prompt': prompts.get(fname, '')
            })
    return jsonify({'success': True, 'files': files})

@app.route('/api/pdfs/<path:filename>/prompt', methods=['POST'])
@login_required
def update_pdf_prompt(filename):
    data = request.get_json() or {}
    prompt = data.get('prompt', '')
    prompts = load_pdf_prompts()
    prompts[filename] = prompt
    save_pdf_prompts(prompts)
    return jsonify({'success': True, 'prompt': prompt})

@app.route('/run-dalloz-script', methods=['POST'])
@login_required
def run_dalloz_script():
    script_path = os.path.join(os.path.dirname(__file__), 'scripts', 'recorded.js')
    
    if not os.path.exists(script_path):
        return jsonify({'success': False, 'error': 'Script introuvable'}), 404
    
    try:
        env = os.environ.copy()
        # Si xvfb n'est pas disponible, basculer en headless pour éviter l'échec
        env['HEADLESS'] = 'false' if shutil.which('xvfb-run') else 'true'
        xvfb = shutil.which('xvfb-run')
        cmd = ['node', script_path] if not xvfb else [xvfb, '-a', 'node', script_path]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=180,
            env=env,
            encoding="utf-8"
        )
        return jsonify({
            'success': True,
            'message': 'Script Dalloz exécuté',
            'output': result.stdout.strip()
        })
    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Timeout lors de l’exécution du script'}), 504
    except subprocess.CalledProcessError as e:
        print(e)
        return jsonify({
            'success': False,
            'error': 'Erreur pendant l’exécution du script',
            'details': e.stderr
        }), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== CATEGORIES =====

@app.route('/api/categories', methods=['GET'])
def get_categories():
    data = load_data()
    return jsonify(sorted(data['categories'], key=lambda x: x['name']))

@app.route('/api/categories', methods=['POST'])
def create_category():
    req_data = request.get_json()
    name = req_data.get('name')
    color = req_data.get('color', '#6366f1')
    
    if not name:
        return jsonify({'error': 'Category name is required'}), 400
    
    data = load_data()
    
    # Vérifier si la catégorie existe déjà
    if any(cat['name'].lower() == name.lower() for cat in data['categories']):
        return jsonify({'error': 'Category already exists'}), 400
    
    new_category = {
        'id': get_next_id(data['categories']),
        'name': name,
        'color': color
    }
    
    data['categories'].append(new_category)
    save_data(data)
    
    return jsonify(new_category), 201

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    data = load_data()
    data['categories'] = [cat for cat in data['categories'] if cat['id'] != category_id]
    save_data(data)
    return jsonify({'success': True})

# ===== SITES =====

@app.route('/api/sites', methods=['GET'])
def get_sites():
    category_id = request.args.get('category_id', type=int)
    data = load_data()
    
    sites = data['sites']
    
    # Enrichir avec les infos de catégorie
    for site in sites:
        if site.get('category_id'):
            category = next((cat for cat in data['categories'] if cat['id'] == site['category_id']), None)
            if category:
                site['category_name'] = category['name']
                site['category_color'] = category['color']
    
    # Filtrer par catégorie si demandé
    if category_id:
        sites = [site for site in sites if site.get('category_id') == category_id]
    
    return jsonify(sorted(sites, key=lambda x: x['name']))

@app.route('/api/sites', methods=['POST'])
def create_site():
    req_data = request.get_json()
    name = req_data.get('name')
    url = req_data.get('url')
    category_id = req_data.get('category_id')
    description = req_data.get('description', '')
    
    if not name or not url:
        return jsonify({'error': 'Name and URL are required'}), 400
    
    data = load_data()
    
    new_site = {
        'id': get_next_id(data['sites']),
        'name': name,
        'url': url,
        'category_id': category_id,
        'description': description,
        'last_scraped': None,
        'created_at': datetime.now().isoformat()
    }
    
    data['sites'].append(new_site)
    save_data(data)
    
    return jsonify(new_site), 201

@app.route('/api/sites/<int:site_id>', methods=['PUT'])
def update_site(site_id):
    req_data = request.get_json()
    
    data = load_data()
    site = next((s for s in data['sites'] if s['id'] == site_id), None)
    
    if not site:
        return jsonify({'error': 'Site not found'}), 404
    
    site['name'] = req_data.get('name', site['name'])
    site['url'] = req_data.get('url', site['url'])
    site['category_id'] = req_data.get('category_id', site['category_id'])
    site['description'] = req_data.get('description', site['description'])
    
    save_data(data)
    return jsonify({'success': True})

@app.route('/api/sites/<int:site_id>', methods=['DELETE'])
def delete_site(site_id):
    data = load_data()
    data['sites'] = [site for site in data['sites'] if site['id'] != site_id]
    save_data(data)
    return jsonify({'success': True})

# ===== SCRAPING =====

def get_gemini_summary(all_contents, prompt=None):
    """Génère un résumé global humanisé avec Gemini"""
    try:
        if not GEMINI_API_KEY or GEMINI_API_KEY == 'your_api_key_here':
            return None
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Construire le prompt humanisé
        if prompt:
            full_prompt = f"""{prompt}

Contenu des sites scrapés:
{all_contents}

Fournis un résumé global humanisé et naturel qui synthétise les informations trouvées sur tous ces sites en un paragraphe cohérent."""
        else:
            full_prompt = f"""Tu es un analyste web expert. Voici le contenu de plusieurs sites web que j'ai scrapés.

Contenu des sites:
{all_contents}

Rédige un résumé humanisé et naturel en français qui synthétise les principales informations trouvées. Le résumé doit être rédigé comme un paragraphe cohérent, fluide et agréable à lire, comme si tu expliquais à quelqu'un ce que tu as découvert. Évite les listes à puces et privilégie un style narratif."""
        
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        print(f"Erreur Gemini: {str(e)}")
        return None

@app.route('/api/scrape-batch', methods=['POST'])
def scrape_batch():
    """Scrape plusieurs sites et génère un résumé global avec Gemini"""
    req_data = request.get_json()
    sites = req_data.get('sites', [])
    depth = req_data.get('depth', 0)
    use_gemini = req_data.get('use_gemini', False)
    user_prompt = req_data.get('prompt', '')
    
    if not sites:
        return jsonify({'error': 'Sites list is required'}), 400
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    results = []
    all_contents = []
    
    for site in sites:
        url = site.get('url')
        site_id = site.get('id')
        site_name = site.get('name', 'Site inconnu')
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            title = soup.find('title')
            title_text = title.get_text().strip() if title else 'No title'
            
            links = []
            for link in soup.find_all('a', href=True):
                href = link.get('href', '')
                text = link.get_text().strip()
                
                if href.startswith('/'):
                    from urllib.parse import urlparse
                    parsed_url = urlparse(url)
                    href = f"{parsed_url.scheme}://{parsed_url.netloc}{href}"
                elif href.startswith('#') or href.startswith('javascript:'):
                    continue
                
                if href and text:
                    links.append({'url': href, 'text': text[:100]})
            
            headings = []
            for tag in ['h1', 'h2', 'h3']:
                for heading in soup.find_all(tag):
                    text = heading.get_text().strip()
                    if text:
                        headings.append({'tag': tag, 'text': text})
            
            meta_description = ''
            meta_tag = soup.find('meta', attrs={'name': 'description'})
            if meta_tag:
                meta_description = meta_tag.get('content', '')
            
            if site_id:
                data = load_data()
                site_obj = next((s for s in data['sites'] if s['id'] == site_id), None)
                if site_obj:
                    site_obj['last_scraped'] = datetime.now().isoformat()
                    save_data(data)
            
            # Collecter le contenu pour Gemini
            if use_gemini:
                content = f"""
=== {site_name} ({url}) ===
Titre: {title_text}
Description: {meta_description}

Titres trouvés:
{chr(10).join([f"- {h['text']}" for h in headings[:10]])}

Extrait du contenu: {soup.get_text()[:2000]}
"""
                all_contents.append(content)
            
            results.append({
                'success': True,
                'site': site_name,
                'url': url,
                'title': title_text,
                'meta_description': meta_description,
                'links_found': len(links),
                'links': links[:50],
                'headings': headings[:30],
                'scraped_at': datetime.now().isoformat()
            })
            
        except Exception as e:
            results.append({
                'success': False,
                'site': site_name,
                'url': url,
                'error': str(e)
            })
    
    # Générer le résumé global avec Gemini
    gemini_summary = None
    if use_gemini and all_contents:
        combined_content = "\n\n".join(all_contents)
        gemini_summary = get_gemini_summary(combined_content, user_prompt)
    
    return jsonify({
        'success': True,
        'results': results,
        'gemini_summary': gemini_summary,
        'total_scraped': len([r for r in results if r.get('success')]),
        'total_failed': len([r for r in results if not r.get('success')])
    })

@app.route('/api/scrape', methods=['POST'])
def scrape():
    req_data = request.get_json()
    url = req_data.get('url')
    site_id = req_data.get('site_id')
    depth = req_data.get('depth', 0)
    use_gemini = req_data.get('use_gemini', False)
    user_prompt = req_data.get('prompt', '')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    try:
        # Headers pour éviter les blocages
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Scraper la page
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parser avec BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extraire les informations
        title = soup.find('title')
        title_text = title.get_text().strip() if title else 'No title'
        
        # Extraire tous les liens avec détails
        links = []
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            text = link.get_text().strip()
            
            # Convertir les liens relatifs en absolus
            if href.startswith('/'):
                from urllib.parse import urlparse
                parsed_url = urlparse(url)
                href = f"{parsed_url.scheme}://{parsed_url.netloc}{href}"
            elif href.startswith('#') or href.startswith('javascript:'):
                continue  # Ignorer les ancres et javascript
            
            if href and text:
                links.append({
                    'url': href,
                    'text': text[:100]  # Limiter la longueur du texte
                })
        
        # Extraire les headings
        headings = []
        for tag in ['h1', 'h2', 'h3']:
            for heading in soup.find_all(tag):
                text = heading.get_text().strip()
                if text:
                    headings.append({'tag': tag, 'text': text})
        
        # Extraire les métadonnées
        meta_description = ''
        meta_tag = soup.find('meta', attrs={'name': 'description'})
        if meta_tag:
            meta_description = meta_tag.get('content', '')
        
        # Mettre à jour la date de scraping si site_id fourni
        if site_id:
            data = load_data()
            site = next((s for s in data['sites'] if s['id'] == site_id), None)
            if site:
                site['last_scraped'] = datetime.now().isoformat()
                save_data(data)
        
        # Préparer le contenu pour Gemini si demandé
        gemini_summary = None
        if use_gemini:
            # Créer un contenu structuré pour Gemini
            content_for_gemini = f"""
Title: {title_text}
Description: {meta_description}

Headings:
{chr(10).join([f"{h['tag'].upper()}: {h['text']}" for h in headings[:20]])}

Main content summary: {soup.get_text()[:3000]}
"""
            gemini_summary = get_gemini_summary(content_for_gemini, user_prompt)
        
        result = {
            'success': True,
            'url': url,
            'title': title_text,
            'meta_description': meta_description,
            'links_found': len(links),
            'links': links[:50],  # Limiter à 50 liens
            'headings': headings[:30],  # Limiter à 30 headings
            'scraped_at': datetime.now().isoformat(),
            'gemini_summary': gemini_summary
        }
        
        return jsonify(result)
        
    except requests.RequestException as e:
        return jsonify({
            'success': False,
            'error': f'Failed to scrape: {str(e)}',
            'url': url
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'url': url
        }), 500

# ===== IMPORT EXCEL =====

@app.route('/api/import-excel', methods=['POST'])
def import_excel():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only .xlsx, .xls, .csv allowed'}), 400
    
    try:
        # Lire le fichier Excel
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
        
        # Vérifier les colonnes requises
        required_columns = ['name', 'url']
        if not all(col in df.columns for col in required_columns):
            return jsonify({
                'error': f'Excel must contain columns: {", ".join(required_columns)}. Optional: categories, description'
            }), 400
        
        data = load_data()
        imported_count = 0
        errors = []
        
        # Importer chaque ligne
        for index, row in df.iterrows():
            try:
                name = str(row['name']).strip()
                url = str(row['url']).strip()
                
                if pd.isna(name) or pd.isna(url) or not name or not url:
                    errors.append(f"Row {index + 2}: Missing name or URL")
                    continue
                
                # Vérifier si le site existe déjà
                if any(site['url'] == url for site in data['sites']):
                    errors.append(f"Row {index + 2}: Site with URL '{url}' already exists")
                    continue
                
                category_id = None
                if 'categories' in df.columns and not pd.isna(row['categories']):
                    category_name = str(row['categories']).strip()
                    # Trouver la catégorie par nom
                    category = next((cat for cat in data['categories'] if cat['name'].lower() == category_name.lower()), None)
                    if category:
                        category_id = category['id']
                
                description = ''
                if 'description' in df.columns and not pd.isna(row['description']):
                    description = str(row['description'])
                
                new_site = {
                    'id': get_next_id(data['sites']),
                    'name': name,
                    'url': url,
                    'category_id': category_id,
                    'description': description,
                    'last_scraped': None,
                    'created_at': datetime.now().isoformat()
                }
                
                data['sites'].append(new_site)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        save_data(data)
        
        return jsonify({
            'success': True,
            'imported': imported_count,
            'errors': errors,
            'total_rows': len(df)
        })
    
    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500

if __name__ == '__main__':
    # Configuration basée sur l'environnement
    debug_mode = FLASK_ENV != 'production'
    host = host_ip if FLASK_ENV == 'production' else '127.0.0.1'
    port = int(os.getenv('PORT', 5001))
    
    app.run(debug=debug_mode, host=host, port=port)
