# 🔍 Diagnostic Erreur 500 lors de l'Upload

## ⚠️ Problème

L'upload de fichiers retourne une erreur 500 (Internal Server Error).

## ✅ Corrections Appliquées

1. **Amélioration du logging** : Ajout de logs détaillés pour identifier l'erreur exacte
2. **Gestion d'erreurs déduplication** : La déduplication ne bloque plus l'upload si elle échoue
3. **Gestion d'erreurs création DB** : Meilleure gestion des erreurs lors de la création du fichier en base

## 🔍 Comment Diagnostiquer

### 1. Vérifier les Logs Render (Backend)

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Cliquez sur votre service backend **`Fylora-1`**
3. Allez dans l'onglet **"Logs"**
4. Cherchez les erreurs récentes avec :
   - `context: 'uploadFile'`
   - `context: 'file_creation_db'`
   - `context: 'deduplication_check'`
   - `context: 'create_symlink'`

### 2. Erreurs Possibles et Solutions

#### Erreur : "Failed to create file record in database"

**Cause** : Problème avec MongoDB ou le modèle FileModel

**Solution** :
1. Vérifiez que MongoDB est accessible
2. Vérifiez les logs MongoDB dans Render
3. Vérifiez que le modèle FileModel est correctement configuré

#### Erreur : "Deduplication check error"

**Cause** : Problème avec le calcul du hash ou la recherche de doublons

**Solution** :
- L'upload continue même si la déduplication échoue
- Vérifiez les logs pour plus de détails

#### Erreur : "Uploaded file not accessible"

**Cause** : Le fichier n'a pas été correctement sauvegardé par multer

**Solution** :
1. Vérifiez les permissions du dossier d'upload
2. Vérifiez que le dossier existe et est accessible
3. Vérifiez les logs multer

#### Erreur : "User not authenticated"

**Cause** : Problème avec l'authentification

**Solution** :
1. Vérifiez que le token JWT est valide
2. Vérifiez que `req.user` est bien défini

## 🐛 Actions de Dépannage

### 1. Vérifier les Permissions du Dossier d'Upload

Le backend doit avoir les permissions d'écriture sur le dossier d'upload. Sur Render, cela devrait être automatique.

### 2. Vérifier MongoDB

1. Vérifiez que MongoDB est accessible depuis Render
2. Vérifiez la variable `MONGODB_URI` dans Render
3. Vérifiez les logs MongoDB pour les erreurs de connexion

### 3. Vérifier les Variables d'Environnement

Assurez-vous que ces variables sont configurées dans Render :
- `MONGODB_URI`
- `UPLOAD_DIR` (optionnel, par défaut `./uploads`)
- `MAX_FILE_SIZE` (optionnel, par défaut 1 TO)

### 4. Tester avec un Petit Fichier

Essayez d'uploader un petit fichier (moins de 1 MB) pour voir si le problème est lié à la taille.

## 📝 Logs à Vérifier

Dans les logs Render, cherchez :
```
[ERROR] Upload error details: { message: ..., stack: ..., userId: ..., fileName: ... }
[ERROR] context: 'uploadFile'
[ERROR] context: 'file_creation_db'
[ERROR] context: 'deduplication_check'
```

## ✅ Résultat Attendu

Après les corrections :
- Les erreurs sont mieux loggées
- L'upload continue même si la déduplication échoue
- Les erreurs de création DB sont mieux gérées

**Prochaine étape** : Vérifiez les logs Render pour identifier l'erreur exacte et partagez-les pour un diagnostic plus précis.

