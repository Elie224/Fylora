# 🔧 Correction : Erreur "Failed to obtain access token" GitHub

## ❌ Problème

Erreur lors de la connexion GitHub OAuth :
```
OAuth github error: Error: Failed to obtain access token
```

## 🔍 Causes possibles

1. **Client Secret incorrect** : Le Client Secret dans le `.env` ne correspond pas à celui dans GitHub Settings
2. **Client Secret régénéré** : Le Client Secret a été régénéré dans GitHub mais le `.env` n'a pas été mis à jour
3. **URI de redirection incorrecte** : L'URI dans GitHub Settings ne correspond pas exactement à celle dans le code
4. **Code d'autorisation expiré** : Le code d'autorisation a expiré (redémarrer le serveur peut aider)

## ✅ Solutions

### Solution 1 : Vérifier et régénérer le Client Secret

1. Allez sur [GitHub Developer Settings - OAuth Apps](https://github.com/settings/developers)
2. Cliquez sur votre application OAuth "Fylora"
3. Dans la section **"Client secrets"**, cliquez sur **"Generate a new client secret"**
4. **COPIEZ IMMÉDIATEMENT** le nouveau Client Secret
   - ⚠️ Il ne sera affiché qu'**UNE SEULE FOIS** !
5. Mettez à jour votre fichier `.env` dans `backend/` :
   ```env
   GITHUB_CLIENT_SECRET=votre_nouveau_client_secret
   ```
6. Redémarrez le serveur backend

### Solution 2 : Vérifier l'URI de redirection

1. Allez sur [GitHub Developer Settings - OAuth Apps](https://github.com/settings/developers)
2. Cliquez sur votre application OAuth "Fylora"
3. Vérifiez que **Authorization callback URL** est **EXACTEMENT** :
   ```
   http://localhost:5001/api/auth/github/callback
   ```
4. Pas de slash final, pas d'espace, exactement cette chaîne
5. Si ce n'est pas correct, modifiez et cliquez sur **"Update application"**
6. Redémarrez le serveur backend

### Solution 3 : Vérifier les identifiants dans le .env

Vérifiez que votre fichier `.env` dans `backend/` contient :

```env
GITHUB_CLIENT_ID=Ov23liHlxn1IFFA0hIkJ
GITHUB_CLIENT_SECRET=3b654eb56074e3ada7c1eb1a6c4342a3b7bdfa0a
GITHUB_REDIRECT_URI=http://localhost:5001/api/auth/github/callback
```

**Points à vérifier** :
- Pas d'espace avant ou après les valeurs
- Pas de guillemets autour des valeurs
- Le Client Secret correspond exactement à celui dans GitHub Settings

### Solution 4 : Utiliser le script de mise à jour

Si vous avez régénéré le Client Secret, utilisez le script :

```bash
cd backend
node scripts/update-github-oauth.js Ov23liHlxn1IFFA0hIkJ <NOUVEAU_CLIENT_SECRET>
```

## 🧪 Test après correction

1. Redémarrez le serveur backend
2. Vérifiez les logs au démarrage - vous devriez voir :
   ```
   ✅ GitHub OAuth configured
   ```
3. Testez la connexion GitHub depuis le frontend
4. Si l'erreur persiste, vérifiez les logs détaillés dans la console du serveur

## 📝 Checklist de vérification

- [ ] Client Secret dans `.env` = Client Secret dans GitHub Settings
- [ ] Authorization callback URL dans GitHub = `http://localhost:5001/api/auth/github/callback`
- [ ] Pas d'espace dans les valeurs du `.env`
- [ ] Serveur backend redémarré après les modifications
- [ ] Logs au démarrage montrent `✅ GitHub OAuth configured`

## 🔗 Liens utiles

- [GitHub Developer Settings - OAuth Apps](https://github.com/settings/developers)
- [Documentation GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

