# 🚀 Instructions : Configuration Cloudinary sur Render

## ✅ Credentials Cloudinary

Vos credentials Cloudinary sont :
- **Cloud name** : `dzuhijqtm`
- **API Key** : `361656381538443`
- **API Secret** : `kcg1ER6F4oN18koAphZztquudZU`

---

## 📋 Étapes sur Render

### 1. Aller dans Render Dashboard

1. Connectez-vous à [Render Dashboard](https://dashboard.render.com/)
2. Sélectionnez votre service **Backend** (fylora-backend)

### 2. Ajouter les Variables d'Environnement

1. **Cliquez sur "Environment"** dans le menu de gauche
2. **Cliquez sur "Add Environment Variable"**
3. **Ajoutez les 3 variables une par une** :

   **Variable 1 :**
   - Key : `CLOUDINARY_CLOUD_NAME`
   - Value : `dzuhijqtm`
   - Cliquez sur "Save Changes"

   **Variable 2 :**
   - Key : `CLOUDINARY_API_KEY`
   - Value : `361656381538443`
   - Cliquez sur "Save Changes"

   **Variable 3 :**
   - Key : `CLOUDINARY_API_SECRET`
   - Value : `kcg1ER6F4oN18koAphZztquudZU`
   - Cliquez sur "Save Changes"

### 3. Redémarrer le Service

1. **Allez dans "Events"** ou **"Logs"**
2. **Cliquez sur "Manual Deploy"** → **"Deploy latest commit"**
   - OU attendez que Render redémarre automatiquement

### 4. Vérifier les Logs

Dans les logs du backend, vous devriez voir :

```
✅ Cloudinary storage service initialized
```

Si vous voyez :
```
⚠️ Cloudinary not configured, using local storage
```

→ Vérifiez que les 3 variables sont bien ajoutées et que le service a redémarré.

---

## 🎯 Prochaines Étapes

Une fois Cloudinary configuré :

1. **Tester un upload** de fichier
2. **Vérifier dans Cloudinary Dashboard** que le fichier apparaît
3. **Vérifier que les fichiers s'affichent** dans la Gallery

---

## 🔒 Sécurité

⚠️ **IMPORTANT** : Ne partagez JAMAIS vos credentials Cloudinary publiquement !

Ces clés permettent d'accéder à votre compte Cloudinary. Gardez-les secrètes.

---

## ✅ Résultat Attendu

Après configuration :
- ✅ Les nouveaux fichiers seront stockés dans Cloudinary
- ✅ Les fichiers persisteront même après redémarrage
- ✅ Plus de fichiers orphelins
- ✅ Images et vidéos optimisées automatiquement
- ✅ CDN global pour livraison rapide

---

## 📞 Support

Si vous avez des problèmes :
1. Vérifiez les logs du backend sur Render
2. Vérifiez que les 3 variables sont bien définies
3. Vérifiez que le service a redémarré après l'ajout des variables

