# 🔗 URIs de redirection OAuth - Configuration complète

Ce document liste **exactement** les URIs à configurer dans Google Cloud Console et GitHub pour que l'OAuth fonctionne.

---

## 🔵 Google OAuth - URIs à configurer

### Dans Google Cloud Console

1. Allez sur [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Sélectionnez ou créez un **OAuth client ID** de type **"Web application"**
3. Configurez les champs suivants :

#### Authorized JavaScript origins (Origines JavaScript autorisées)

Ajoutez ces URLs **exactement** comme indiqué (une par ligne) :

```
http://localhost:5001
http://localhost:3001
```

**Note** : 
- Pas de slash final (`/`)
- Pas d'espace
- Utilisez `http://` (pas `https://`) pour le développement local

#### Authorized redirect URIs (URIs de redirection autorisées)

Ajoutez cette URI **exactement** comme indiqué :

```
http://localhost:5001/api/auth/google/callback
```

**⚠️ IMPORTANT** :
- Pas de slash final (`/`)
- Pas d'espace
- L'URI doit être **EXACTEMENT** : `http://localhost:5001/api/auth/google/callback`
- C'est l'URI que Google utilisera pour rediriger après l'authentification

---

## 🐙 GitHub OAuth - URI à configurer

### Dans GitHub Developer Settings

1. Allez sur [GitHub Developer Settings - OAuth Apps](https://github.com/settings/developers)
2. Sélectionnez ou créez une **OAuth App**
3. Configurez les champs suivants :

#### Homepage URL

```
http://localhost:3001
```

#### Authorization callback URL

```
http://localhost:5001/api/auth/github/callback
```

**⚠️ IMPORTANT** :
- Pas de slash final (`/`)
- Pas d'espace
- L'URI doit être **EXACTEMENT** : `http://localhost:5001/api/auth/github/callback`
- C'est l'URI que GitHub utilisera pour rediriger après l'authentification

---

## 📋 Résumé des URIs

### Pour le développement local :

| Plateforme | Champ | URI à configurer |
|------------|-------|-------------------|
| **Google** | Authorized JavaScript origins | `http://localhost:5001`<br>`http://localhost:3001` |
| **Google** | Authorized redirect URIs | `http://localhost:5001/api/auth/google/callback` |
| **GitHub** | Homepage URL | `http://localhost:3001` |
| **GitHub** | Authorization callback URL | `http://localhost:5001/api/auth/github/callback` |

### Pour la production :

| Plateforme | Champ | URI à configurer |
|------------|-------|-------------------|
| **Google** | Authorized JavaScript origins | `https://votre-domaine.com` |
| **Google** | Authorized redirect URIs | `https://votre-domaine.com/api/auth/google/callback` |
| **GitHub** | Homepage URL | `https://votre-domaine.com` |
| **GitHub** | Authorization callback URL | `https://votre-domaine.com/api/auth/github/callback` |

---

## ✅ Vérification

### Vérifier dans le code

Les URIs configurées dans votre `.env` doivent correspondre :

```env
# Google OAuth
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# GitHub OAuth
GITHUB_REDIRECT_URI=http://localhost:5001/api/auth/github/callback
```

### Vérifier avec le script de diagnostic

```bash
npm run diagnose-oauth
```

Le script affichera les URIs configurées et vérifiera qu'elles correspondent.

---

## 🐛 Erreurs courantes

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URI dans Google Cloud Console / GitHub ne correspond pas exactement à celle dans le code.

**Solution** :
1. Vérifiez qu'il n'y a pas de slash final (`/`)
2. Vérifiez qu'il n'y a pas d'espace
3. Vérifiez que c'est exactement : `http://localhost:5001/api/auth/google/callback`
4. Copiez-collez l'URI depuis ce document pour être sûr

### Erreur : "deleted_client"

**Cause** : Le client OAuth a été supprimé dans Google Cloud Console.

**Solution** :
1. Créez un nouveau client OAuth
2. Configurez les URIs exactement comme indiqué ci-dessus
3. Mettez à jour votre `.env` avec les nouveaux identifiants

---

## 📝 Notes importantes

1. **Pas de slash final** : `http://localhost:5001/api/auth/google/callback` ✅ (pas `/callback/`)
2. **Pas d'espace** : Vérifiez qu'il n'y a pas d'espace avant ou après l'URI
3. **Exactement la même URI** : L'URI dans Google/GitHub doit être **identique** à celle dans le code
4. **Redémarrer le serveur** : Après avoir modifié les URIs, redémarrez toujours le serveur backend

---

## 🔗 Liens utiles

- [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
- [GitHub Developer Settings - OAuth Apps](https://github.com/settings/developers)
- [Documentation Google OAuth](https://developers.google.com/identity/protocols/oauth2)
- [Documentation GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

