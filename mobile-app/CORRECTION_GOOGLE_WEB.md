# Correction du problème Google Sign-In sur Web

## Problème identifié

Sur le web, `google_sign_in` ne fournit pas d'`idToken` de manière fiable avec la méthode `signIn()`. Les logs montraient que nous obtenions un `access_token` mais pas d'`idToken`, ce qui empêchait l'authentification de fonctionner.

## Solutions implémentées

### 1. Modification de `OAuthService` (mobile-app/lib/services/oauth_service.dart)

- Ajout de `signInSilently()` pour le web avant d'utiliser `signIn()`
- Ajout du scope `'openid'` pour obtenir un idToken si possible
- Envoi des informations utilisateur (email, display_name, photo_url) même si `idToken` est null
- Envoi de l'`access_token` qui est disponible sur le web

### 2. Modification du backend (backend/controllers/authController.js)

Le backend accepte maintenant deux modes :

**Mode 1 : id_token (mobile)**
- Vérifie l'`id_token` avec Google OAuth2 comme avant
- Extrait les informations utilisateur depuis le payload

**Mode 2 : access_token + user info (web)**
- Si `id_token` n'est pas présent mais `access_token` l'est
- Vérifie l'`access_token` en appelant l'API Google `https://www.googleapis.com/oauth2/v2/userinfo`
- Utilise les informations utilisateur fournies dans la requête (email, display_name, photo_url)

### 3. Modification de `AuthProvider` (mobile-app/lib/providers/auth_provider.dart)

- Modification de la condition pour accepter soit `id_token` soit `access_token`
- Envoi de toutes les informations disponibles (email, display_name, photo_url) avec l'`access_token`

## Tests nécessaires

1. **Tester la connexion Google sur le web :**
   - Lancer l'application : `flutter run -d chrome --dart-define=API_URL=https://fylora-1.onrender.com`
   - Cliquer sur le bouton "Se connecter avec Google"
   - Vérifier que l'authentification fonctionne

2. **Tester la connexion Google sur mobile :**
   - S'assurer que le mode id_token fonctionne toujours (ne devrait pas être affecté)

## Notes importantes

- Le backend doit être redéployé pour que les modifications prennent effet
- L'API Google People doit être activée dans Google Cloud Console (voir `ACTIVER_PEOPLE_API.md`)
- Les warnings sur `signIn()` déprécié sont normaux mais n'empêchent pas le fonctionnement

## Fichiers modifiés

1. `mobile-app/lib/services/oauth_service.dart`
2. `backend/controllers/authController.js`
3. `mobile-app/lib/providers/auth_provider.dart`

