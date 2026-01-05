# 💾 Solution pour le Stockage des Fichiers sur Render

## ⚠️ Problème Identifié

Sur le **plan gratuit de Render**, les fichiers uploadés sont stockés dans un système de fichiers **éphémère**. Cela signifie que :

- ❌ Les fichiers sont **perdus** à chaque redéploiement
- ❌ Les fichiers ne persistent **pas** entre les redéploiements
- ⚠️ Les références dans la base de données restent, mais les fichiers physiques disparaissent
- ✅ Le système de nettoyage automatique détecte et nettoie ces fichiers orphelins

## 🔍 Symptômes

Dans les logs, vous verrez :
```
File not found on disk (orphan file)
Orphan file marked as deleted
```

## ✅ Solutions Recommandées

### Solution 1 : Utiliser un Service de Stockage Externe (Recommandé)

#### Option A : AWS S3

**Avantages** :
- ✅ Stockage persistant et fiable
- ✅ Scalable
- ✅ Intégration facile avec Node.js
- ✅ Coût faible pour les petits projets

**Implémentation** :

1. **Installer AWS SDK** :
```bash
npm install @aws-sdk/client-s3
```

2. **Configurer les variables d'environnement** :
```env
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=votre-bucket-name
```

3. **Modifier le contrôleur de fichiers** pour utiliser S3 au lieu du système de fichiers local

#### Option B : Cloudinary (Pour les Images)

**Avantages** :
- ✅ Optimisation automatique des images
- ✅ Transformation d'images à la volée
- ✅ Plan gratuit généreux (25 GB)
- ✅ CDN intégré

**Implémentation** :

1. **Installer Cloudinary** :
```bash
npm install cloudinary
```

2. **Configurer les variables d'environnement** :
```env
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

#### Option C : Google Cloud Storage

**Avantages** :
- ✅ Intégration avec Google Cloud
- ✅ Stockage persistant
- ✅ Scalable

#### Option D : MongoDB GridFS

**Avantages** :
- ✅ Utilise votre base de données MongoDB existante
- ✅ Pas de service externe supplémentaire
- ✅ Bon pour les petits fichiers (< 16 MB par défaut)

**Inconvénients** :
- ⚠️ Peut ralentir MongoDB si beaucoup de fichiers
- ⚠️ Limite de taille par fichier

### Solution 2 : Passer au Plan Payant Render

**Avantages** :
- ✅ Persistance des fichiers
- ✅ Pas de sleep mode
- ✅ Plus de ressources

**Inconvénients** :
- ⚠️ Coût mensuel ($7+ par mois)

### Solution 3 : Utiliser un Volume Persistant (Plan Starter+)

Si vous passez au plan Starter ou supérieur, vous pouvez utiliser un volume persistant pour stocker les fichiers.

## 🚀 Implémentation Recommandée : AWS S3

### Étape 1 : Créer un Bucket S3

1. Allez sur [AWS Console](https://console.aws.amazon.com/s3/)
2. Créez un nouveau bucket
3. Configurez les permissions (CORS si nécessaire)
4. Notez le nom du bucket

### Étape 2 : Créer un Utilisateur IAM

1. Allez dans IAM > Users
2. Créez un nouvel utilisateur avec accès programmatique
3. Attachez la politique `AmazonS3FullAccess` (ou une politique plus restrictive)
4. Notez l'Access Key ID et Secret Access Key

### Étape 3 : Configurer dans Render

Ajoutez ces variables d'environnement dans Render Dashboard :

```env
AWS_ACCESS_KEY_ID=votre_access_key_id
AWS_SECRET_ACCESS_KEY=votre_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=votre-bucket-name
USE_S3_STORAGE=true
```

### Étape 4 : Modifier le Code

Créer un service de stockage qui utilise S3 :

```javascript
// backend/services/storageService.js
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config');

class StorageService {
  constructor() {
    if (process.env.USE_S3_STORAGE === 'true') {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.bucket = process.env.AWS_S3_BUCKET;
      this.useS3 = true;
    } else {
      this.useS3 = false;
    }
  }

  async uploadFile(fileBuffer, fileName, userId) {
    if (this.useS3) {
      const key = `user_${userId}/${fileName}`;
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
      }));
      return key;
    } else {
      // Utiliser le système de fichiers local
      // ... code existant
    }
  }

  async getFile(fileKey) {
    if (this.useS3) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });
      return await this.s3Client.send(command);
    } else {
      // Utiliser le système de fichiers local
      // ... code existant
    }
  }

  async deleteFile(fileKey) {
    if (this.useS3) {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      }));
    } else {
      // Utiliser le système de fichiers local
      // ... code existant
    }
  }
}

module.exports = new StorageService();
```

## 📋 Migration des Fichiers Existants

Si vous avez déjà des fichiers dans la base de données :

1. **Exporter les fichiers** depuis le système actuel
2. **Uploader vers S3** (ou autre service)
3. **Mettre à jour les références** dans la base de données

## ⚠️ Notes Importantes

1. **Coûts** : AWS S3 coûte environ $0.023 par GB/mois (très faible pour les petits projets)
2. **Sécurité** : Ne commitez jamais les clés d'accès AWS dans Git
3. **Backup** : Configurez la versioning S3 pour les backups automatiques
4. **CORS** : Configurez CORS si vous servez les fichiers directement depuis S3

## 🎯 Recommandation

Pour une application en production, **AWS S3** est la solution la plus recommandée car :
- ✅ Fiable et scalable
- ✅ Coût très faible
- ✅ Facile à intégrer
- ✅ Bonne documentation

---

**Date** : 2026-01-05
**Statut** : Documentation créée

