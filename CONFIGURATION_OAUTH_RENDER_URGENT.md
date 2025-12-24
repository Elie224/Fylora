# ⚠️ URGENT : Configuration OAuth sur Render

## 🔴 IMPORTANT - SÉCURITÉ

**NE JAMAIS PARTAGER VOS CLÉS OAuth PUBLIQUEMENT !**

Si vous avez partagé vos clés par erreur :
1. **Régénérez-les immédiatement** dans Google Cloud Console
2. **Mettez à jour les variables sur Render**
3. **Ne les partagez plus jamais**

---

## 🔵 Configuration Google OAuth sur Render

### Étape 1 : Ajouter les variables d'environnement sur Render

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Sélectionnez votre service backend (fylora-backend ou fylora-1)
3. Allez dans **Environment** (Variables d'environnement)
4. Cliquez sur **Add Environment Variable**

### Étape 2 : Ajouter les variables Google OAuth

Ajoutez ces **3 variables** une par une :

**Variable 1 :**
- **Key** : `GOOGLE_CLIENT_ID`
- **Value** : `votre_client_id_google` (remplacez par votre vrai Client ID)
- Cliquez sur **Save**

**Variable 2 :**
- **Key** : `GOOGLE_CLIENT_SECRET`
- **Value** : `votre_client_secret_google` (remplacez par votre vrai secret)
- Cliquez sur **Save**

**Variable 3 :**
- **Key** : `GOOGLE_REDIRECT_URI`
- **Value** : `https://fylora-1.onrender.com/api/auth/google/callback`
- Cliquez sur **Save**

### Étape 3 : Vérifier dans Google Cloud Console

1. Allez sur [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Trouvez votre client OAuth avec votre Client ID
3. Cliquez dessus pour l'éditer
4. Vérifiez que **Authorized redirect URIs** contient :
   ```
   https://fylora-1.onrender.com/api/auth/google/callback
   ```
5. Si ce n'est pas le cas, ajoutez-le et cliquez sur **Save**

### Étape 4 : Vérifier le déploiement

1. Après avoir ajouté les variables, Render va redémarrer automatiquement
2. Allez dans **Logs** de votre service
3. Recherchez ces messages :
   ```
   ✅ Google OAuth configured
   ```

---

## 🐙 Configuration GitHub OAuth sur Render

### Étape 1 : Obtenir les identifiants GitHub

1. Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Cliquez sur **OAuth Apps**
3. Si vous n'avez pas d'app, créez-en une :
   - **Application name** : Fylora
   - **Homepage URL** : `https://fylora-1.onrender.com`
   - **Authorization callback URL** : `https://fylora-1.onrender.com/api/auth/github/callback`
4. Copiez le **Client ID**
5. Cliquez sur **Generate a new client secret** et copiez-le immédiatement

### Étape 2 : Ajouter les variables GitHub sur Render

Ajoutez ces **3 variables** sur Render :

**Variable 1 :**
- **Key** : `GITHUB_CLIENT_ID`
- **Value** : `votre_client_id_github`

**Variable 2 :**
- **Key** : `GITHUB_CLIENT_SECRET`
- **Value** : `votre_client_secret_github`

**Variable 3 :**
- **Key** : `GITHUB_REDIRECT_URI`
- **Value** : `https://fylora-1.onrender.com/api/auth/github/callback`

---

## ✅ Checklist de configuration

### Google OAuth
- [ ] `GOOGLE_CLIENT_ID` ajouté sur Render
- [ ] `GOOGLE_CLIENT_SECRET` ajouté sur Render
- [ ] `GOOGLE_REDIRECT_URI` ajouté sur Render
- [ ] Redirect URI configuré dans Google Cloud Console
- [ ] Logs Render montrent `✅ Google OAuth configured`

### GitHub OAuth
- [ ] `GITHUB_CLIENT_ID` ajouté sur Render
- [ ] `GITHUB_CLIENT_SECRET` ajouté sur Render
- [ ] `GITHUB_REDIRECT_URI` ajouté sur Render
- [ ] Callback URL configuré dans GitHub Settings
- [ ] Logs Render montrent `✅ GitHub OAuth configured`

---

## 🔒 Sécurité - Règles importantes

1. **NE JAMAIS** partager vos clés OAuth publiquement
2. **NE JAMAIS** les mettre dans le code source
3. **NE JAMAIS** les commiter dans Git
4. **UNIQUEMENT** dans :
   - Fichier `.env` local (non commité)
   - Variables d'environnement Render (privées)
5. Si vous avez partagé vos clés par erreur, **régénérez-les immédiatement**

---

## 🚨 Si vous avez partagé vos clés publiquement

1. **Régénérez le Client Secret** dans Google Cloud Console :
   - Allez dans Credentials
   - Sélectionnez votre client OAuth
   - Cliquez sur "Reset Secret" ou créez un nouveau client
2. **Mettez à jour sur Render** avec les nouvelles clés
3. **Supprimez les anciennes clés** de tous les endroits où vous les avez partagées

---

## 📝 Variables complètes sur Render

Voici toutes les variables OAuth à configurer :

```env
# Google OAuth
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
GOOGLE_REDIRECT_URI=https://fylora-1.onrender.com/api/auth/google/callback

# GitHub OAuth (à remplir)
GITHUB_CLIENT_ID=votre_client_id_github
GITHUB_CLIENT_SECRET=votre_client_secret_github
GITHUB_REDIRECT_URI=https://fylora-1.onrender.com/api/auth/github/callback
```

---

## 🧪 Test après configuration

1. Attendez que Render redémarre (quelques minutes)
2. Vérifiez les logs - vous devriez voir :
   ```
   ✅ Google OAuth configured
   ✅ GitHub OAuth configured
   ```
3. Testez la connexion depuis l'application web ou mobile

