# Configuration S3 pour Stockage Persistant

## Pourquoi S3 ?

Le stockage local sur Render (plan gratuit) est **éphémère** : les fichiers sont perdus lors des redémarrages du serveur. Pour une solution **stable et professionnelle**, nous utilisons AWS S3 (ou compatible S3 comme MinIO).

## Avantages de S3

✅ **Stockage persistant** - Les fichiers ne sont jamais perdus  
✅ **Haute disponibilité** - 99.99% de disponibilité garantie  
✅ **Scalabilité** - Gère des millions de fichiers sans problème  
✅ **Sécurité** - Chiffrement automatique (AES-256)  
✅ **Performance** - CDN intégré pour accès rapide  
✅ **Coût** - Très économique (quelques centimes par Go/mois)

## Configuration Requise

### Variables d'environnement à configurer sur Render :

```bash
# AWS S3 Configuration
S3_ACCESS_KEY_ID=votre_access_key_id
S3_SECRET_ACCESS_KEY=votre_secret_access_key
S3_REGION=us-east-1  # ou votre région préférée
S3_BUCKET=fylora-files  # nom de votre bucket S3

# Optionnel : Pour MinIO ou autres services S3-compatibles
S3_ENDPOINT=https://votre-endpoint.com  # Laissez vide pour AWS S3 standard
```

## Étapes de Configuration

### 1. Créer un bucket S3 sur AWS

1. Connectez-vous à [AWS Console](https://console.aws.amazon.com/)
2. Allez dans **S3** → **Create bucket**
3. Choisissez un nom unique (ex: `fylora-files`)
4. Sélectionnez une région (ex: `us-east-1`)
5. Désactivez **Block all public access** (ou configurez selon vos besoins)
6. Créez le bucket

### 2. Créer un utilisateur IAM avec accès S3

1. Allez dans **IAM** → **Users** → **Create user**
2. Nommez l'utilisateur (ex: `fylora-s3-user`)
3. Attachez la politique `AmazonS3FullAccess` (ou créez une politique personnalisée plus restrictive)
4. Créez l'utilisateur
5. **Important** : Notez l'**Access Key ID** et le **Secret Access Key** (affichés une seule fois)

### 3. Configurer les variables sur Render

1. Allez dans votre service Render
2. **Environment** → **Add Environment Variable**
3. Ajoutez les variables suivantes :
   - `S3_ACCESS_KEY_ID` = votre Access Key ID
   - `S3_SECRET_ACCESS_KEY` = votre Secret Access Key
   - `S3_REGION` = votre région (ex: `us-east-1`)
   - `S3_BUCKET` = nom de votre bucket (ex: `fylora-files`)

### 4. Redémarrer le service

Après avoir ajouté les variables, redémarrez votre service Render pour que les changements prennent effet.

## Vérification

Une fois configuré, vous devriez voir dans les logs :

```
✅ Storage service initialized
  type: s3
  bucket: fylora-files
```

## Migration des Fichiers Existants

Les nouveaux fichiers seront automatiquement uploadés vers S3. Pour migrer les fichiers existants (stockage local), vous pouvez utiliser le script de migration :

```bash
node backend/scripts/migrateToS3.js
```

## Coûts AWS S3

- **Stockage** : ~$0.023 par Go/mois (premier 50 Go)
- **Requêtes** : ~$0.0004 par 1000 requêtes GET
- **Transfert sortant** : Premier 100 Go/mois gratuit, puis ~$0.09/Go

**Exemple** : Pour 10 Go de fichiers et 100,000 requêtes/mois = **~$0.50/mois**

## Alternative : MinIO (Self-hosted)

Si vous préférez héberger votre propre stockage S3-compatible :

1. Installez MinIO sur un serveur
2. Configurez `S3_ENDPOINT` avec l'URL de votre serveur MinIO
3. Configurez `S3_ACCESS_KEY_ID` et `S3_SECRET_ACCESS_KEY` de MinIO

## Support

En cas de problème, vérifiez :
1. Les variables d'environnement sont bien configurées
2. Les credentials IAM ont les bonnes permissions
3. Le bucket existe et est accessible
4. Les logs du serveur pour les erreurs S3

