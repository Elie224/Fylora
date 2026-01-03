# Configuration S3 sur Render

## Où configurer les variables d'environnement sur Render

### 1. Accéder au Dashboard Render

1. Connectez-vous à [Render Dashboard](https://dashboard.render.com)
2. Sélectionnez votre service backend (fylora-1 ou similaire)
3. Allez dans l'onglet **"Environment"** (Environnement)

### 2. Ajouter les variables d'environnement

Cliquez sur **"Add Environment Variable"** et ajoutez les variables suivantes :

#### Variables requises pour S3 :

```
STORAGE_TYPE = s3
```

```
AWS_ACCESS_KEY_ID = votre_access_key_id
```

```
AWS_SECRET_ACCESS_KEY = votre_secret_access_key
```

```
AWS_REGION = us-east-1
```
*(ou la région de votre choix : eu-west-1, eu-central-1, etc.)*

```
AWS_S3_BUCKET = nom-de-votre-bucket
```

#### Variables optionnelles (pour DigitalOcean Spaces ou autres services compatibles S3) :

```
AWS_ENDPOINT = https://nyc3.digitaloceanspaces.com
```

```
AWS_S3_FORCE_PATH_STYLE = true
```

### 3. Où obtenir les clés AWS S3

#### Option A : AWS S3

1. Connectez-vous à [AWS Console](https://console.aws.amazon.com)
2. Allez dans **IAM** (Identity and Access Management)
3. Créez un utilisateur avec les permissions suivantes :
   - `AmazonS3FullAccess` (ou des permissions plus restrictives)
4. Créez des **Access Keys** pour cet utilisateur
5. Copiez l'**Access Key ID** et le **Secret Access Key**

#### Option B : DigitalOcean Spaces (Recommandé - Plus simple et moins cher)

1. Connectez-vous à [DigitalOcean](https://cloud.digitalocean.com)
2. Allez dans **Spaces** (Object Storage)
3. Créez un nouveau Space
4. Allez dans **Settings** > **Spaces Access Keys**
5. Créez une nouvelle clé d'accès
6. Copiez l'**Access Key** et le **Secret Key**

**Note** : Pour DigitalOcean Spaces, vous aurez aussi besoin de :
- `AWS_ENDPOINT` : L'endpoint de votre région (ex: `https://nyc3.digitaloceanspaces.com`)
- `AWS_S3_FORCE_PATH_STYLE` : `true`

### 4. Créer un bucket S3

#### AWS S3 :
1. Allez dans **S3** dans AWS Console
2. Cliquez sur **"Create bucket"**
3. Choisissez un nom unique (ex: `fylora-files`)
4. Choisissez une région
5. Configurez les permissions (publique ou privée selon vos besoins)

#### DigitalOcean Spaces :
1. Allez dans **Spaces** dans DigitalOcean
2. Cliquez sur **"Create a Space"**
3. Choisissez un nom unique (ex: `fylora-files`)
4. Choisissez une région
5. Configurez les permissions

### 5. Installer aws-sdk

**Important** : Vous devez ajouter `aws-sdk` au fichier `package.json` du backend.

Le package sera installé automatiquement lors du prochain déploiement sur Render.

Pour l'ajouter localement (si vous avez Node.js installé) :
```bash
cd backend
npm install aws-sdk
```

Puis commitez et poussez les changements :
```bash
git add backend/package.json backend/package-lock.json
git commit -m "Add aws-sdk dependency"
git push origin main
```

### 6. Redémarrer le service

Après avoir ajouté les variables d'environnement sur Render :
1. Allez dans l'onglet **"Events"** de votre service
2. Cliquez sur **"Manual Deploy"** > **"Deploy latest commit"**
3. Ou attendez le prochain déploiement automatique

### 7. Vérifier que S3 est activé

Après le redémarrage, vérifiez les logs du service. Vous devriez voir :
```
S3 storage initialized { bucket: 'nom-de-votre-bucket' }
```

Si vous voyez :
```
S3 bucket not configured, falling back to local storage
```
Cela signifie qu'une variable d'environnement est manquante ou incorrecte.

## Configuration recommandée pour la production

Pour éviter la perte de fichiers sur Render (système de fichiers éphémère), il est **fortement recommandé** d'utiliser S3 ou un service similaire.

### Coûts approximatifs

- **AWS S3** : ~$0.023/GB/mois + transfert
- **DigitalOcean Spaces** : ~$5/mois pour 250GB + transfert
- **Render (stockage local)** : Gratuit mais fichiers perdus au redémarrage

## Dépannage

### Le service ne démarre pas
- Vérifiez que toutes les variables d'environnement sont correctement configurées
- Vérifiez que les clés AWS sont valides
- Vérifiez que le bucket existe et est accessible

### Les fichiers ne sont pas sauvegardés sur S3
- Vérifiez les logs du service pour les erreurs
- Vérifiez que `STORAGE_TYPE=s3` est bien configuré
- Vérifiez que `aws-sdk` est installé (dans package.json)

### Erreur "Access Denied"
- Vérifiez que les clés AWS ont les bonnes permissions
- Pour AWS S3, vérifiez les politiques IAM
- Pour DigitalOcean Spaces, vérifiez les permissions du Space

