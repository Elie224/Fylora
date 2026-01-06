# 🗄️ Guide Complet : Migration vers Stockage Externe (S3)

## 📋 Problème Actuel

Sur Render (plan gratuit), le stockage local n'est **pas persistant**. Les fichiers sont perdus à chaque redémarrage du serveur, créant des "fichiers orphelins" (présents en base mais absents du disque).

## ✅ Solution : Stockage Externe S3

Votre application a déjà un service S3 complet ! Il suffit de le configurer.

---

## 🎯 Option 1 : AWS S3 (Recommandé pour Production)

### Étape 1 : Créer un compte AWS S3

1. **Aller sur [AWS Console](https://console.aws.amazon.com/)**
2. **Créer un compte** (gratuit pendant 12 mois avec 5 GB de stockage)
3. **Aller dans S3** → **Créer un bucket**

### Étape 2 : Créer un Bucket S3

1. **Nom du bucket** : `fylora-files` (ou votre nom)
2. **Région** : `eu-west-3` (Paris) ou `us-east-1` (Virginie)
3. **Bloquer l'accès public** : ✅ Oui (sécurité)
4. **Versioning** : ✅ Activé (recommandé)
5. **Chiffrement** : ✅ Activé (SSE-S3)

### Étape 3 : Créer des Clés d'Accès (IAM)

1. **Aller dans IAM** → **Users** → **Add user**
2. **Nom** : `fylora-s3-user`
3. **Type d'accès** : ✅ Programmatic access
4. **Permissions** : Attacher la politique `AmazonS3FullAccess` (ou créer une politique personnalisée)
5. **Copier** :
   - `Access Key ID`
   - `Secret Access Key` (⚠️ **Afficher une seule fois !**)

### Étape 4 : Configurer les Variables sur Render

**Dans Render Dashboard** → **Backend Service** → **Environment** :

```bash
# AWS S3 Configuration
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_REGION=eu-west-3
S3_BUCKET=fylora-files
```

⚠️ **IMPORTANT** : Ne pas définir `S3_ENDPOINT` pour AWS S3 (seulement pour MinIO)

### Étape 5 : Redémarrer le Backend

Après avoir ajouté les variables, **redémarrer le service backend** sur Render.

---

## 🎯 Option 2 : Cloudinary (Alternative Simple)

Cloudinary est plus simple à configurer et offre un plan gratuit généreux.

### Étape 1 : Créer un compte Cloudinary

1. **Aller sur [Cloudinary](https://cloudinary.com/)**
2. **Créer un compte gratuit** (25 GB de stockage, 25 GB de bande passante/mois)
3. **Récupérer les credentials** dans le Dashboard

### Étape 2 : Installer le Package Cloudinary

```bash
cd backend
npm install cloudinary
```

### Étape 3 : Créer un Service Cloudinary

Créer `backend/services/cloudinaryService.js` :

```javascript
const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadFile(fileBuffer, fileName, userId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `fylora/users/${userId}`,
        resource_type: 'auto', // Détecte automatiquement image/video/raw
        public_id: fileName.replace(/\.[^/.]+$/, ''), // Sans extension
      },
      (error, result) => {
        if (error) {
          logger.logError(error, { context: 'cloudinary_upload', fileName });
          reject(error);
        } else {
          resolve({
            fileKey: result.public_id,
            url: result.secure_url,
            size: result.bytes,
            format: result.format,
          });
        }
      }
    );
    
    uploadStream.end(fileBuffer);
  });
}

async function deleteFile(fileKey) {
  try {
    await cloudinary.uploader.destroy(fileKey);
    return true;
  } catch (error) {
    logger.logError(error, { context: 'cloudinary_delete', fileKey });
    throw error;
  }
}

async function generatePreviewUrl(fileKey) {
  // Cloudinary génère automatiquement des URLs optimisées
  return cloudinary.url(fileKey, {
    secure: true,
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ]
  });
}

module.exports = {
  uploadFile,
  deleteFile,
  generatePreviewUrl,
};
```

### Étape 4 : Variables Render

```bash
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

---

## 🎯 Option 3 : MinIO (Self-Hosted, Gratuit)

MinIO est un serveur S3-compatible que vous pouvez héberger vous-même.

### Étape 1 : Installer MinIO

**Option A : Docker (Recommandé)**

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin123 \
  minio/minio server /data --console-address ":9001"
```

**Option B : Render (Nouveau Service)**

1. **Créer un nouveau service** sur Render
2. **Type** : Web Service
3. **Image Docker** : `minio/minio:latest`
4. **Command** : `server /data --console-address ":9001"`
5. **Environment Variables** :
   ```
   MINIO_ROOT_USER=minioadmin
   MINIO_ROOT_PASSWORD=votre_mot_de_passe_securise
   ```

### Étape 2 : Créer un Bucket

1. **Aller sur** `http://votre-minio:9001`
2. **Se connecter** avec `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
3. **Créer un bucket** : `fylora-files`

### Étape 3 : Variables Render (Backend)

```bash
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=votre_mot_de_passe_securise
S3_ENDPOINT=http://votre-minio-service.onrender.com:9000
S3_BUCKET=fylora-files
S3_REGION=us-east-1
```

---

## 🔄 Migration des Fichiers Existants

### Script de Migration Automatique

Un script existe déjà : `backend/scripts/migrateToS3.js`

**Exécuter en local** :

```bash
# 1. Configurer les variables d'environnement
export MONGODB_URI="votre_mongodb_uri"
export S3_ACCESS_KEY_ID="votre_access_key"
export S3_SECRET_ACCESS_KEY="votre_secret_key"
export S3_REGION="eu-west-3"
export S3_BUCKET="fylora-files"

# 2. Dry-run (simulation)
node backend/scripts/migrateToS3.js --dry-run

# 3. Migration réelle
node backend/scripts/migrateToS3.js

# 4. Migration pour un utilisateur spécifique
node backend/scripts/migrateToS3.js --user-id=USER_ID
```

**Exécuter sur Render** (via SSH ou script) :

1. **Aller dans Render Dashboard** → **Backend** → **Shell**
2. **Exécuter** :
```bash
cd backend
node scripts/migrateToS3.js
```

---

## ✅ Vérification

### Vérifier que S3 est Actif

**Logs du backend** (après redémarrage) :

```
✅ Storage service initialized
   type: s3
   bucket: fylora-files
   endpoint: default
```

Si vous voyez :
```
⚠️ S3 not configured, using local storage
```

→ Les variables d'environnement ne sont pas correctement configurées.

### Tester un Upload

1. **Uploader un fichier** via l'interface
2. **Vérifier dans S3** que le fichier apparaît dans le bucket
3. **Vérifier que le fichier s'affiche** dans la Gallery

---

## 💰 Coûts Estimés

### AWS S3 (Standard Storage)

- **Stockage** : $0.023/GB/mois (premiers 50 TB)
- **Requêtes PUT** : $0.005/1000 requêtes
- **Requêtes GET** : $0.0004/1000 requêtes
- **Transfert sortant** : $0.09/GB (premiers 10 TB)

**Exemple** : 100 GB stockage + 10 GB transfert/mois = **~$3.20/mois**

### Cloudinary (Plan Free)

- **25 GB stockage** : Gratuit
- **25 GB bande passante/mois** : Gratuit
- **Au-delà** : Payant

### MinIO (Self-Hosted)

- **Gratuit** (hébergement à votre charge)
- **Coût** : Serveur Render (~$7/mois pour plan Starter)

---

## 🔒 Sécurité

### Bonnes Pratiques

1. **Ne jamais commiter** les clés d'accès dans Git
2. **Utiliser des politiques IAM restrictives** (pas `FullAccess`)
3. **Activer le chiffrement** sur le bucket
4. **Bloquer l'accès public** sauf si nécessaire
5. **Activer le versioning** pour les backups

### Politique IAM Restrictive (AWS)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::fylora-files/*",
        "arn:aws:s3:::fylora-files"
      ]
    }
  ]
}
```

---

## 🚀 Activation Immédiate

### Checklist Rapide

- [ ] Créer un compte AWS S3 (ou Cloudinary/MinIO)
- [ ] Créer un bucket
- [ ] Créer des clés d'accès
- [ ] Ajouter les variables dans Render
- [ ] Redémarrer le backend
- [ ] Vérifier les logs (S3 initialisé)
- [ ] Tester un upload
- [ ] Migrer les fichiers existants (optionnel)

---

## 📞 Support

Si vous avez des questions ou des problèmes :

1. **Vérifier les logs** du backend sur Render
2. **Vérifier les variables** d'environnement
3. **Tester la connexion S3** avec AWS CLI :
   ```bash
   aws s3 ls s3://fylora-files --region eu-west-3
   ```

---

## 🎉 Résultat

Une fois configuré, **tous les nouveaux fichiers** seront stockés dans S3 et **persisteront** même après un redémarrage du serveur. Plus de fichiers orphelins ! 🎊

