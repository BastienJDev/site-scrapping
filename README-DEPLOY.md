# 🚀 Déploiement Express sur 31.56.58.90

## ⚡ Déploiement en une commande

```bash
./deploy.sh
```

Le script va :
1. ✅ Tester la connexion SSH vers **31.56.58.90**
2. 📦 Créer l'archive du projet
3. ⬆️ Transférer sur le serveur
4. 🔧 Installer Python 3.10, Nginx, Supervisor
5. ⚙️ Configurer Gunicorn + Nginx
6. 🔐 Configurer les variables d'environnement
7. 🚀 Démarrer l'application

**Votre application sera accessible sur:** `http://31.56.58.90`

## 🔄 Mises à jour futures

```bash
./update.sh
```

Met à jour le code tout en préservant:
- ✅ Votre fichier `.env` (clé Gemini)
- ✅ Vos uploads
- ✅ Votre base de données `data.json`

## 📊 Gestion de l'application

### Commandes SSH utiles

```bash
# Voir les logs en temps réel
ssh root@31.56.58.90 'tail -f /var/www/scrapping-web/logs/error.log'

# Redémarrer l'application
ssh root@31.56.58.90 'supervisorctl restart scrapping-web'

# Vérifier le statut
ssh root@31.56.58.90 'supervisorctl status scrapping-web'

# Voir les logs Nginx
ssh root@31.56.58.90 'tail -f /var/log/nginx/error.log'
```

### Modifier la clé API Gemini

```bash
ssh root@31.56.58.90
nano /var/www/scrapping-web/.env
# Modifier GEMINI_API_KEY=votre_nouvelle_cle
supervisorctl restart scrapping-web
```

## 🔒 Sécurité (À faire après déploiement)

### 1. Configurer le Firewall

```bash
ssh root@31.56.58.90

ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS (pour plus tard)
ufw enable
```

### 2. Changer les mots de passe par défaut

L'application a des mots de passe codés en dur. Connectez-vous et changez-les dans l'interface.

**Comptes par défaut:**
- `admin` / `admin123`
- `user` / `password`

### 3. Ajouter HTTPS (Optionnel mais recommandé)

Si vous avez un nom de domaine pointant vers `31.56.58.90`:

```bash
ssh root@31.56.58.90

# Installer certbot
apt install certbot python3-certbot-nginx -y

# Obtenir un certificat SSL
certbot --nginx -d votre-domaine.com

# Le renouvellement est automatique!
```

## 🐛 Dépannage

### L'application ne répond pas

```bash
# Vérifier le statut
ssh root@31.56.58.90 'supervisorctl status scrapping-web'

# Redémarrer
ssh root@31.56.58.90 'supervisorctl restart scrapping-web'

# Vérifier les logs
ssh root@31.56.58.90 'tail -50 /var/www/scrapping-web/logs/error.log'
```

### Erreur 502 Bad Gateway

```bash
# Gunicorn ne tourne probablement pas
ssh root@31.56.58.90 'supervisorctl restart scrapping-web'
```

### Erreur lors du scraping

Vérifiez que la clé Gemini est bien configurée:
```bash
ssh root@31.56.58.90 'cat /var/www/scrapping-web/.env'
```

## 📈 Architecture

```
Internet (Port 80)
    ↓
Nginx (Reverse Proxy)
    ↓
Gunicorn (WSGI Server - Port 8000)
    ↓
Flask Application
```

**Supervisor** gère Gunicorn et le redémarre automatiquement en cas de crash.

## 🎯 Prochaines étapes

1. ✅ Déployer avec `./deploy.sh`
2. 🔐 Configurer le firewall
3. 🔑 Changer les mots de passe par défaut
4. 🌐 (Optionnel) Configurer un nom de domaine
5. 🔒 (Optionnel) Activer HTTPS avec Let's Encrypt

---

**🎉 C'est tout ! Votre application est prête à être déployée.**
