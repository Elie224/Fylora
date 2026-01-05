# 📋 Liste Complète des 3 Variables PayPal à Ajouter dans Render

## ✅ Ce que Vous Avez Maintenant

- ✅ **Client ID PayPal** : `AeZBAUftpnsQ28xsgSBhFVILFSMb960cxZooQtmNo5R-vgEjtH3Kw-Fnu7mPuXaBD3ivD6XGZXV7UO4v`
- ✅ **Secret PayPal** : `EA9WTGNvEIEx1N0OdG_rOjJQ7_I5OOW3yUf2k0mFQ2_zRobszYSd1ZgS9bHZYWgjnYDy-Ml8BKIMvNSr`

---

## 📝 Les 3 Variables à Ajouter dans Render

### Variable 1 : Client ID PayPal
- **Key:** `PAYPAL_CLIENT_ID`
- **Value:** `AeZBAUftpnsQ28xsgSBhFVILFSMb960cxZooQtmNo5R-vgEjtH3Kw-Fnu7mPuXaBD3ivD6XGZXV7UO4v`

---

### Variable 2 : Secret PayPal
- **Key:** `PAYPAL_CLIENT_SECRET`
- **Value:** `EA9WTGNvEIEx1N0OdG_rOjJQ7_I5OOW3yUf2k0mFQ2_zRobszYSd1ZgS9bHZYWgjnYDy-Ml8BKIMvNSr`

---

### Variable 3 : Environnement PayPal
- **Key:** `PAYPAL_ENVIRONMENT`
- **Value:** `sandbox`
- **Note:** Utilisez `sandbox` pour les tests, `production` pour la production

---

## 🎯 Instructions dans Render Dashboard

1. **Allez dans Render Dashboard** : [https://dashboard.render.com](https://dashboard.render.com)
2. **Sélectionnez votre service backend** (fylora-backend)
3. **Cliquez sur "Environment"** dans le menu de gauche
4. **Pour chaque variable** (une par une) :
   - Cliquez sur **"Add Environment Variable"**
   - **Key** : Collez le nom (ex: `PAYPAL_CLIENT_ID`)
   - **Value** : Collez la valeur (ex: `AeZBAUftpnsQ28xsgSBhFVILFSMb960cxZooQtmNo5R-vgEjtH3Kw-Fnu7mPuXaBD3ivD6XGZXV7UO4v`)
   - Cliquez sur **"Save Changes"**
5. **Répétez** pour les 2 autres variables
6. **Redéployez** : Cliquez sur "Manual Deploy" > "Deploy latest commit"

---

## ✅ Vérification

Après avoir ajouté toutes les variables, vous devriez voir dans Render :
- ✅ `PAYPAL_CLIENT_ID`
- ✅ `PAYPAL_CLIENT_SECRET`
- ✅ `PAYPAL_ENVIRONMENT`

**Total : 3 variables** ✅

---

## 📋 Résumé Rapide (Pour Copier-Coller)

```
PAYPAL_CLIENT_ID=AeZBAUftpnsQ28xsgSBhFVILFSMb960cxZooQtmNo5R-vgEjtH3Kw-Fnu7mPuXaBD3ivD6XGZXV7UO4v
PAYPAL_CLIENT_SECRET=EA9WTGNvEIEx1N0OdG_rOjJQ7_I5OOW3yUf2k0mFQ2_zRobszYSd1ZgS9bHZYWgjnYDy-Ml8BKIMvNSr
PAYPAL_ENVIRONMENT=sandbox
```

---

## 🧪 Tester PayPal

Une fois les variables ajoutées et le service redéployé :

1. **Allez sur votre site** : `/pricing`
2. **Cliquez sur "Upgrade"** pour un plan
3. **Choisissez PayPal** (au lieu de Stripe)
4. **Vous serez redirigé vers PayPal Sandbox**
5. **Connectez-vous** avec un compte de test PayPal
6. **Approuvez le paiement**

---

## 📋 Checklist Finale PayPal

- [x] ✅ Application PayPal créée
- [x] ✅ Client ID récupéré
- [x] ✅ Secret récupéré
- [ ] ⏳ 3 variables ajoutées dans Render
- [ ] ⏳ Service redéployé
- [ ] ⏳ Test de la page /pricing avec PayPal

---

**Allez dans Render Dashboard maintenant et ajoutez les 3 variables PayPal ! 🚀**

