# 🔧 Résolution : Erreur "Failed to obtain access token" GitHub

## ❌ Problème

Erreur lors de la connexion GitHub OAuth :
```
OAuth github error: Error: Failed to obtain access token
```

## 🔍 Cause principale

Cette erreur se produit généralement lorsque :
1. **Le Client Secret dans le `.env` ne correspond pas** à celui dans GitHub Settings
2. **Le Client Secret a été régénéré** dans GitHub mais le `.env` n'a pas été mis à jour
3. **L'URI de redirection ne correspond pas exactement** dans GitHub Settings

## ✅ Solution étape par étape

### Étape 1 : Vérifier le Client Secret actuel dans GitHub

1. Allez sur [GitHub Developer Settings - OAuth Apps](https://github.com/settings/developers)
2. Cliquez sur votre application OAuth "Fylora"
3. Dans la section **"Client secrets"**, vous verrez :
   - Si un secret existe : "Client secret (last generated: [date])"
   - ⚠️ **Vous ne pouvez PAS voir l'ancien secret** - il n'est affiché qu'une seule fois lors de la création

### Étape 2 : Régénérer le Client Secret

1. Dans la même page, cliquez sur **"Generate a new client secret"**
2. **COPIEZ IMMÉDIATEMENT** le nouveau Client Secret
   - ⚠️ Il ne sera affiché qu'**UNE SEULE FOIS** !
   - Si vous le perdez, vous devrez en générer un nouveau

### Étape 3 : Mettre à jour le fichier .env

Ouvrez votre fichier `.env` dans le dossier `backend` et mettez à jour :

```env
GITHUB_CLIENT_SECRET=votre_nouveau_client_secret_copié
```

**Exemple** :
```env
GITHUB_CLIENT_ID=VOTRE_CLIENT_ID_GITHUB
GITHUB_CLIENT_SECRET=VOTRE_CLIENT_SECRET_GITHUB
GITHUB_REDIRECT_URI=http://localhost:5001/api/auth/github/callback
```

**Points importants** :
- Pas d'espace avant ou après
- Pas de guillemets
- Le secret doit faire exactement 40 caractères

### Étape 4 : Vérifier l'URI de redirection dans GitHub

1. Toujours dans GitHub Settings > votre application OAuth
2. Vérifiez que **Authorization callback URL** est **EXACTEMENT** :
   ```
   http://localhost:5001/api/auth/github/callback
   ```
3. Pas de slash final, pas d'espace
4. Si ce n'est pas correct, modifiez et cliquez sur **"Update application"**

### Étape 5 : Utiliser le script de mise à jour (optionnel)

Si vous préférez utiliser le script :

```bash
cd backend
node scripts/update-github-oauth.js <VOTRE_CLIENT_ID> <NOUVEAU_CLIENT_SECRET>
```

### Étape 6 : Redémarrer le serveur

**CRITIQUE** : Après avoir modifié le `.env`, redémarrez toujours le serveur :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm start
# ou
npm run dev
```

### Étape 7 : Vérifier les logs au démarrage

Au démarrage, vous devriez voir :

```
🔧 Configuring OAuth strategies...
✅ GitHub OAuth configured
🔧 OAuth strategies configuration completed
```

### Étape 8 : Tester la connexion

1. Ouvrez votre application frontend
2. Allez sur la page de connexion
3. Cliquez sur **"Se connecter avec GitHub"**
4. Autorisez l'application
5. Vous devriez être connecté

## 🐛 Si l'erreur persiste

### Vérification supplémentaire

1. **Vérifiez les logs détaillés** : Les nouveaux logs devraient afficher plus d'informations sur l'erreur
2. **Vérifiez que le Client ID correspond** : Dans GitHub Settings et dans le `.env`
3. **Vérifiez l'URI exacte** : Elle doit être identique dans GitHub ET dans le code
4. **Attendez quelques minutes** : Parfois il y a un délai de propagation

### Erreurs possibles

- **"bad_verification_code"** : Le code a expiré → Redémarrez le serveur et réessayez
- **"redirect_uri_mismatch"** : L'URI ne correspond pas → Vérifiez qu'elle est exactement la même
- **"incorrect_client_credentials"** : Client ID ou Secret incorrect → Vérifiez les identifiants

## 📝 Checklist finale

- [ ] Client Secret régénéré dans GitHub Settings
- [ ] Client Secret mis à jour dans le `.env`
- [ ] Authorization callback URL dans GitHub = `http://localhost:5001/api/auth/github/callback`
- [ ] Pas d'espace dans les valeurs du `.env`
- [ ] Serveur backend redémarré
- [ ] Logs au démarrage montrent `✅ GitHub OAuth configured`
- [ ] Test de connexion GitHub effectué

## 🔗 Liens utiles

- [GitHub Developer Settings - OAuth Apps](https://github.com/settings/developers)
- [Documentation GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

