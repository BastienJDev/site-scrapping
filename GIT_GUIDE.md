# Guide Git Multi-Machines

## 🔄 Comment Git synchronise entre Mac et Windows

Lorsque vous travaillez sur plusieurs machines, Git garde tout synchronisé via le dépôt distant (GitHub).

### Workflow recommandé

#### Sur Mac (avant de commencer à travailler) :
```bash
git pull origin main
# Puis travaillez sur vos modifications
```

#### Sur Mac (après vos modifications) :
```bash
git add .
git commit -m "Description de vos changements"
git push origin main
```

#### Sur Windows (pour récupérer les changements du Mac) :
```powershell
git pull origin main
```

## 📋 Commandes essentielles

### Sauvegarder vos modifications locales
```bash
# Voir l'état actuel
git status

# Ajouter tous les fichiers modifiés
git add .

# OU ajouter des fichiers spécifiques
git add app.py requirements.txt

# Créer un commit avec un message descriptif
git commit -m "Ajout de la fonctionnalité X"

# Envoyer sur GitHub
git push origin main
```

### Récupérer les modifications de l'autre machine
```bash
# Télécharger et fusionner les changements
git pull origin main

# OU en 2 étapes (plus sûr)
git fetch origin
git merge origin/main
```

### En cas de conflit
Si vous avez modifié le même fichier sur les 2 machines :
```bash
# Git vous indiquera les conflits
git status

# Ouvrez les fichiers en conflit et choisissez les bonnes versions
# Puis :
git add <fichiers-résolus>
git commit -m "Résolution des conflits"
git push origin main
```

## 🛡️ Bonnes pratiques

1. **Toujours pull avant de travailler**
   ```bash
   git pull origin main
   ```

2. **Commit régulièrement**
   - Faites des petits commits avec des messages clairs
   - `git commit -m "Fix: correction du bug X"`
   - `git commit -m "Feature: ajout de la fonctionnalité Y"`

3. **Push souvent**
   - Après chaque session de travail
   - Avant de changer de machine

4. **Vérifier avant de push**
   ```bash
   git status  # Voir ce qui va être envoyé
   git diff    # Voir les modifications en détail
   ```

## 🚫 Fichiers à ne pas versionner

Déjà configurés dans `.gitignore` :
- `node_modules/` - Dépendances Node.js (réinstallables)
- `venv/`, `env/` - Environnements virtuels Python
- `data.json` - Données locales qui changent souvent
- `.env` - Clés API et secrets
- `uploads/` - Fichiers uploadés par les utilisateurs
- `*.exe` - Binaires compilés

## 💡 Commandes utiles

```bash
# Voir l'historique des commits
git log --oneline

# Annuler les modifications locales non commitées
git restore <fichier>

# Créer une branche pour tester quelque chose
git checkout -b ma-nouvelle-feature
git push origin ma-nouvelle-feature

# Revenir à main
git checkout main

# Voir les différences avec le dépôt distant
git diff origin/main

# Voir tous les fichiers trackés
git ls-files
```

## 🔧 Configuration initiale (si pas encore fait)

```bash
# Configurer votre identité
git config --global user.name "Votre Nom"
git config --global user.email "votre@email.com"

# Configurer l'éditeur par défaut
git config --global core.editor "code --wait"
```

## 📱 Résumé du workflow quotidien

**Début de journée (sur n'importe quelle machine) :**
```bash
git pull origin main
```

**Fin de session :**
```bash
git add .
git commit -m "Description des changements"
git push origin main
```

**C'est tout !** 🎉
