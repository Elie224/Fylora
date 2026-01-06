# Guide de Configuration TeamCity pour Fylora

## Problème Identifié

TeamCity essaie d'exécuter des scripts PowerShell qui sont destinés au développement local, pas au CI/CD.

## Solution

Les scripts PowerShell ont été modifiés pour détecter automatiquement l'environnement CI/CD et sortir avec succès. Cependant, si TeamCity continue d'échouer, voici les solutions :

### Option 1 : Désactiver les étapes PowerShell inutiles

Dans la configuration TeamCity :

1. Allez dans **Build Configuration** → **Build Steps**
2. Pour chaque étape PowerShell qui exécute `start_backend.ps1`, `start_frontend.ps1`, etc. :
   - Soit **désactivez** l'étape
   - Soit configurez-la pour qu'elle ne s'exécute que si nécessaire

### Option 2 : Utiliser la version bash des scripts

Si vous êtes sur Linux (Ubuntu), utilisez les versions bash :
- `diagnostic-frontend-backend.sh` au lieu de `diagnostic-frontend-backend.ps1`

### Option 3 : Scripts CI/CD dédiés

Créez des scripts spécifiques pour CI/CD qui ne font que des vérifications :

```bash
#!/bin/bash
# ci-check.sh - Script de vérification pour CI/CD
echo "✅ Vérification des dépendances..."
cd backend && npm install --production=false
cd ../frontend-web && npm install
echo "✅ Dépendances installées"
```

## Configuration Recommandée pour TeamCity

### Étapes de Build Essentielles

1. **Checkout** (automatique)
2. **Installation dépendances backend**
   ```bash
   cd backend && npm install
   ```
3. **Installation dépendances frontend**
   ```bash
   cd frontend-web && npm install
   ```
4. **Build frontend**
   ```bash
   cd frontend-web && npm run build
   ```
5. **Tests (optionnel)**
   ```bash
   cd backend && npm test
   ```

### Scripts PowerShell - Comportement en CI/CD

Tous les scripts PowerShell suivants détectent automatiquement l'environnement CI/CD et sortent avec succès :

- ✅ `start_backend.ps1` - Détecte CI/CD, exit 0
- ✅ `start_frontend.ps1` - Détecte CI/CD, exit 0
- ✅ `start_mongodb.ps1` - Détecte CI/CD, exit 0
- ✅ `demarrer.ps1` - Détecte CI/CD, exit 0
- ✅ `diagnostic-frontend-backend.ps1` - Détecte CI/CD, utilise version bash si disponible

### Variables d'Environnement Détectées

Les scripts détectent automatiquement ces variables :
- `CI`
- `TEAMCITY_VERSION`
- `JENKINS_URL`
- `GITHUB_ACTIONS`
- `GITLAB_CI`

## Vérification

Pour vérifier que les scripts fonctionnent en CI/CD :

```bash
# Simuler un environnement CI/CD
export TEAMCITY_VERSION=1.0
./start_backend.ps1
# Devrait afficher un message et sortir avec exit 0
```

## Notes

- Les scripts PowerShell sont destinés au **développement local Windows**
- En CI/CD, utilisez les commandes npm directement
- Les scripts ne doivent pas être exécutés en CI/CD car ils démarrent des serveurs

