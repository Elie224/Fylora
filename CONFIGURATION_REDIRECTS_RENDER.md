# ✅ Configuration Redirects/Rewrites dans Render

## 📋 Étapes à Suivre

### 1. Accéder à la Section Redirects/Rewrites

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Cliquez sur votre service **`fylor-frontend`**
3. Dans le menu de gauche, cliquez sur **"Redirects/Rewrites"**

### 2. Ajouter une Règle de Rewrite

1. Cliquez sur **"Add Redirect/Rewrite"** ou **"New Rule"**
2. Configurez la règle :
   - **Type** : Sélectionnez **"Rewrite"** (pas "Redirect")
   - **Source** : `/*`
   - **Destination** : `/index.html`
3. Cliquez sur **"Save"** ou **"Add"**

### 3. Vérifier la Configuration

Vous devriez voir une règle comme celle-ci :
- **Type** : Rewrite
- **Source** : `/*`
- **Destination** : `/index.html`

### 4. Redéployer (si nécessaire)

Après avoir ajouté la règle, Render devrait automatiquement redéployer le service. Si ce n'est pas le cas :
1. Allez dans l'onglet **"Events"**
2. Cliquez sur **"Manual Deploy"** → **"Deploy latest commit"**

---

## ✅ Résultat Attendu

Après la configuration :

1. ✅ Toutes les routes (ex: `/auth/callback`, `/login`, `/dashboard`) seront réécrites vers `/index.html`
2. ✅ React Router pourra gérer le routing côté client
3. ✅ Plus d'erreur 404 sur `/auth/callback`

---

## 🧪 Test

1. Allez sur `https://fylor-frontend.onrender.com`
2. Cliquez sur **"Se connecter avec Google"**
3. Après l'authentification Google, vous devriez être redirigé vers `/auth/callback`
4. ✅ La page devrait se charger correctement (plus de 404)
5. ✅ Vous devriez être redirigé vers le dashboard

---

## 📝 Note Importante

**Différence entre Redirect et Rewrite** :
- **Redirect** : Change l'URL dans la barre d'adresse (ex: `/login` → `/index.html`)
- **Rewrite** : Garde l'URL originale mais sert le contenu de `/index.html` (ce qu'on veut pour SPA)

Pour une SPA React, utilisez toujours **"Rewrite"** !

---

## 🐛 Si le Problème Persiste

1. Vérifiez que la règle est bien de type **"Rewrite"** (pas "Redirect")
2. Vérifiez que **Source** = `/*` (avec l'astérisque)
3. Vérifiez que **Destination** = `/index.html` (avec le slash initial)
4. Redéployez le service après modification

Une fois configuré, le routing SPA devrait fonctionner ! 🚀

