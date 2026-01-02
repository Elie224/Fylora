# 🔧 Corrections Google Sign-In et CORS

## Problèmes Identifiés

1. **Google Sign-In Web** : Client ID manquant
2. **CORS** : Le backend bloque les requêtes depuis localhost en production

---

## ✅ Corrections Appliquées

### 1. Configuration Google Sign-In pour le Web

**Fichier modifié** : `web/index.html`

Ajout de la balise meta pour le Client ID Google :

```html
<meta name="google-signin-client_id" content="YOUR_GOOGLE_CLIENT_ID_HERE">
```

**⚠️ IMPORTANT** : Vous devez remplacer `YOUR_GOOGLE_CLIENT_ID_HERE` par votre vrai Client ID Google.

**Pour obtenir le Client ID Google** :
1. Aller sur https://console.cloud.google.com/
2. Créer ou sélectionner un projet
3. Activer l'API Google Sign-In
4. Créer des identifiants OAuth 2.0
5. Ajouter `http://localhost` comme origine autorisée
6. Copier le Client ID

### 2. Correction CORS Backend

**Fichier modifié** : `backend/config.js`

Le backend autorise maintenant **toujours** les requêtes depuis localhost, même en production, pour permettre les tests locaux.

---

## 🚀 Actions Requises

### Étape 1 : Configurer le Client ID Google

1. **Ouvrir** `mobile-app/web/index.html`
2. **Remplacer** `YOUR_GOOGLE_CLIENT_ID_HERE` par votre Client ID Google
3. **Sauvegarder**

### Étape 2 : Redémarrer l'Application

Dans votre terminal :

```powershell
# Arrêter l'application (appuyer sur 'q' dans le terminal Flutter)
# Puis relancer
flutter run -d chrome --dart-define=API_URL=https://fylora-1.onrender.com
```

---

## 🧪 Test Après Correction

Une fois le Client ID configuré :

1. **Test de connexion email/password** : Devrait fonctionner maintenant
2. **Test d'inscription** : Devrait fonctionner maintenant
3. **Test Google Sign-In** : Devrait fonctionner après configuration du Client ID

---

## 📝 Note sur CORS

Le backend autorise maintenant localhost même en production. Si vous déployez en production, vous pouvez restreindre cela en modifiant `backend/config.js` pour n'autoriser que les origines spécifiques.

---

## ⚠️ Si le Problème Persiste

### Pour CORS :
- Vérifier que le backend est bien redémarré
- Vérifier les logs du backend pour voir les origines bloquées

### Pour Google Sign-In :
- Vérifier que le Client ID est correct dans `web/index.html`
- Vérifier que `http://localhost` est autorisé dans la console Google Cloud
- Vérifier la console du navigateur pour d'autres erreurs

---

**Configurez le Client ID Google et redémarrez l'application !** 🚀

