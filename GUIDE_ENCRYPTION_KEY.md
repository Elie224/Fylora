# 🔐 Guide Configuration ENCRYPTION_KEY

## ⚠️ OBLIGATOIRE EN PRODUCTION

Le chiffrement AES-256 est **activé automatiquement** si `ENCRYPTION_KEY` est configuré.

---

## 🔑 Générer la Clé

### Méthode 1 : Node.js (Recommandé)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Exemple de sortie** :
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### Méthode 2 : OpenSSL

```bash
openssl rand -hex 32
```

### Méthode 3 : Python

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## ⚙️ Configuration dans Render

### Étapes

1. **Aller dans Render Dashboard**
2. **Sélectionner votre service backend** (`fylora-backend`)
3. **Onglet "Environment"**
4. **Cliquer sur "Add Environment Variable"**
5. **Remplir** :
   - **Key** : `ENCRYPTION_KEY`
   - **Value** : `<la_clé_générée>`
6. **Sauvegarder**
7. **Redéployer le service**

---

## ✅ Vérification

### 1. Vérifier dans les Logs

Après redéploiement, vérifier les logs backend :

```
✅ Encryption service initialized
```

Si vous voyez :
```
⚠️ ENCRYPTION_KEY not set, encryption disabled
```

→ La clé n'est pas correctement configurée.

### 2. Tester le Chiffrement

1. **Uploader un fichier**
2. **Vérifier dans les logs** :
   ```
   File encrypted before upload
   ```
3. **Télécharger le fichier**
4. **Vérifier que le fichier est déchiffré automatiquement**

---

## 🔒 Sécurité de la Clé

### ⚠️ IMPORTANT

- **NE JAMAIS** commiter la clé dans Git
- **NE JAMAIS** partager la clé publiquement
- **NE JAMAIS** utiliser la même clé en développement et production
- **SAUVEGARDER** la clé dans un gestionnaire de mots de passe sécurisé

### Rotation de Clé

Si la clé est compromise :

1. **Générer une nouvelle clé**
2. **Déchiffrer tous les fichiers existants** (script à créer)
3. **Rechiffrer avec la nouvelle clé**
4. **Mettre à jour `ENCRYPTION_KEY` dans Render**

---

## 🧪 Test Local

### Développement

Pour tester localement, ajouter dans `.env` :

```bash
ENCRYPTION_KEY=<votre_clé_générée>
```

**Note** : En développement, si `ENCRYPTION_KEY` n'est pas défini, une clé temporaire est générée (⚠️ ne pas utiliser en production).

---

## 📊 Impact

### Avec ENCRYPTION_KEY

- ✅ Tous les fichiers sont chiffrés avant stockage
- ✅ Chiffrement AES-256-GCM (niveau bancaire)
- ✅ Déchiffrement automatique transparent
- ✅ Authentification intégrée (GCM)

### Sans ENCRYPTION_KEY

- ⚠️ Fichiers stockés en clair
- ⚠️ Moins sécurisé (mais fonctionnel)

---

## 🎯 Résultat

Une fois `ENCRYPTION_KEY` configuré :

✅ **Fylora chiffre automatiquement tous les fichiers**
✅ **Niveau de sécurité bancaire**
✅ **Conformité RGPD renforcée**
✅ **Argument marketing fort**

---

**🚀 Prochaine étape** : Configurer `ENCRYPTION_KEY` dans Render et tester !


