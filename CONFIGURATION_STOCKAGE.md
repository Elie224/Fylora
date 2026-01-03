# Configuration du Stockage Persistant

## Vue d'ensemble

L'application Fylora supporte maintenant deux types de stockage :
1. **Stockage local** (par défaut) - Fichiers stockés sur le système de fichiers du serveur
2. **Stockage S3** - Fichiers stockés sur AWS S3, DigitalOcean Spaces, ou autres services compatibles S3

## Solutions Implémentées

### 1. ✅ Validation lors de l'upload

Le système vérifie maintenant que :
- Le fichier existe physiquement après l'upload
- Le fichier a une taille > 0
- Le fichier existe toujours après la création de l'entrée en base de données
- Si le fichier disparaît, l'entrée en base est automatiquement supprimée

### 2. ✅ Nettoyage automatique des fichiers orphelins

Un service de nettoyage automatique a été implémenté :
- **Nettoyage quotidien** : Tous les jours à 3h du matin
- **Nettoyage périodique** : Toutes les 6 heures (limité à 200 fichiers par exécution)
- Les fichiers orphelins sont marqués comme supprimés (soft delete) pour permettre une récupération si nécessaire

#### Routes Admin pour le nettoyage

- `POST /api/admin/cleanup-orphans` - Lancer un nettoyage manuel
  - Paramètres optionnels :
    - `dryRun=true` - Simuler le nettoyage sans supprimer
    - `userId=<id>` - Nettoyer pour un utilisateur spécifique
  
- `GET /api/admin/cleanup-stats` - Obtenir les statistiques du dernier nettoyage

### 3. ✅ Service de stockage abstrait avec support S3

Un service de stockage abstrait a été créé pour faciliter la migration vers S3.

## Configuration S3

### Variables d'environnement requises

Pour activer le stockage S3, ajoutez ces variables dans votre fichier `.env` :

```env
# Type de stockage : 'local' ou 's3'
STORAGE_TYPE=s3

# Configuration AWS S3
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Optionnel : Pour DigitalOcean Spaces ou autres services compatibles S3
AWS_ENDPOINT=https://nyc3.digitaloceanspaces.com
AWS_S3_FORCE_PATH_STYLE=true
```

### Installation de aws-sdk

Pour utiliser S3, vous devez installer le package `aws-sdk` :

```bash
cd backend
npm install aws-sdk
```

### Migration vers S3

Le service de stockage abstrait permet de basculer facilement entre le stockage local et S3. Il suffit de changer la variable `STORAGE_TYPE` dans le fichier `.env`.

**Note importante** : Les fichiers existants en stockage local ne seront pas automatiquement migrés vers S3. Une migration manuelle sera nécessaire.

## Utilisation du Service de Stockage

Le service `storageService` peut être utilisé dans les contrôleurs :

```javascript
const storageService = require('../services/storageService');

// Sauvegarder un fichier
const result = await storageService.saveFile(sourcePath, destinationPath, userId);

// Vérifier qu'un fichier existe
const exists = await storageService.fileExists(filePath, userId);

// Supprimer un fichier
await storageService.deleteFile(filePath, userId);

// Obtenir un stream pour lecture
const stream = await storageService.getFileStream(filePath, userId);

// Obtenir l'URL du fichier (pour S3, retourne une URL signée)
const url = storageService.getFileUrl(filePath, userId, 3600); // expiresIn en secondes
```

## Avantages du Stockage S3

1. **Persistance** : Les fichiers ne sont pas perdus lors d'un redémarrage du serveur
2. **Scalabilité** : Pas de limite de stockage (selon votre plan S3)
3. **Performance** : CDN intégré pour une distribution rapide
4. **Fiabilité** : Redondance automatique des données
5. **Sécurité** : URLs signées avec expiration pour un accès sécurisé

## Recommandations

1. **Pour la production** : Utilisez S3 ou un service similaire pour éviter la perte de fichiers
2. **Pour le développement** : Le stockage local est suffisant
3. **Migration** : Planifiez une migration progressive des fichiers existants vers S3

## Prochaines Étapes

Pour activer complètement S3 :
1. Créer un bucket S3 (AWS, DigitalOcean Spaces, etc.)
2. Configurer les variables d'environnement
3. Installer `aws-sdk` : `npm install aws-sdk`
4. Redémarrer le serveur
5. Tester avec un upload de fichier

Le système basculera automatiquement vers S3 si `STORAGE_TYPE=s3` est configuré.

