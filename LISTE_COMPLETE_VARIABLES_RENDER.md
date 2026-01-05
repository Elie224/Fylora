# 📋 Liste Complète des 8 Variables à Ajouter dans Render

## ✅ Instructions Détaillées

Pour chaque variable ci-dessous :
1. Allez dans **Render Dashboard** > Votre service backend > **Environment**
2. Cliquez sur **"Add Environment Variable"**
3. Collez le **Key** et le **Value** exactement comme indiqué
4. Cliquez sur **"Save Changes"**
5. Répétez pour la variable suivante

---

## 📝 Les 8 Variables (Une par Une)

### Variable 1 : Secret Key Stripe
- **Key:** `STRIPE_SECRET_KEY`
- **Value:** Voir `VARIABLES_RENDER_STRIPE_LOCAL.txt` (fichier local) pour la vraie valeur
- **⚠️ Note:** La Secret Key est dans le fichier local `VARIABLES_RENDER_STRIPE_LOCAL.txt` (non commité)

---

### Variable 2 : Webhook Secret
- **Key:** `STRIPE_WEBHOOK_SECRET`
- **Value:** `whsec_vDmgczoc2DMA5Z0pczlWFF98mmoFZSzX`

---

### Variable 3 : Price ID - Fylora Plus (Monthly)
- **Key:** `STRIPE_PRICE_PLUS_MONTHLY`
- **Value:** `price_1SmHNJRdHWsgpzD61N0x9eWg`

---

### Variable 4 : Price ID - Fylora Plus (Yearly)
- **Key:** `STRIPE_PRICE_PLUS_YEARLY`
- **Value:** `price_1SmHbLRdHWsgpzD63VCGibqn`

---

### Variable 5 : Price ID - Fylora Pro (Monthly)
- **Key:** `STRIPE_PRICE_PRO_MONTHLY`
- **Value:** `price_1SmHcyRdHWsgpzD6JfuDVvEc`

---

### Variable 6 : Price ID - Fylora Pro (Yearly)
- **Key:** `STRIPE_PRICE_PRO_YEARLY`
- **Value:** `price_1SmHe9RdHWsgpzD6EdCnzdVj`

---

### Variable 7 : Price ID - Fylora Team (Monthly)
- **Key:** `STRIPE_PRICE_TEAM_MONTHLY`
- **Value:** `price_1SmHfwRdHWsgpzD6qRB9UoS0`

---

### Variable 8 : Price ID - Fylora Team (Yearly)
- **Key:** `STRIPE_PRICE_TEAM_YEARLY`
- **Value:** `price_1SmHijRdHWsgpzD6W2MlI8OL`

---

## 📋 Résumé Rapide (Pour Copier-Coller)

```
STRIPE_SECRET_KEY=[VOTRE_SECRET_KEY] (voir VARIABLES_RENDER_STRIPE_LOCAL.txt)
STRIPE_WEBHOOK_SECRET=whsec_vDmgczoc2DMA5Z0pczlWFF98mmoFZSzX
STRIPE_PRICE_PLUS_MONTHLY=price_1SmHNJRdHWsgpzD61N0x9eWg
STRIPE_PRICE_PLUS_YEARLY=price_1SmHbLRdHWsgpzD63VCGibqn
STRIPE_PRICE_PRO_MONTHLY=price_1SmHcyRdHWsgpzD6JfuDVvEc
STRIPE_PRICE_PRO_YEARLY=price_1SmHe9RdHWsgpzD6EdCnzdVj
STRIPE_PRICE_TEAM_MONTHLY=price_1SmHfwRdHWsgpzD6qRB9UoS0
STRIPE_PRICE_TEAM_YEARLY=price_1SmHijRdHWsgpzD6W2MlI8OL
```

---

## 🎯 Étapes dans Render Dashboard

1. **Ouvrez Render Dashboard** : [https://dashboard.render.com](https://dashboard.render.com)
2. **Sélectionnez votre service backend** (fylora-backend)
3. **Cliquez sur "Environment"** dans le menu de gauche
4. **Pour chaque variable** (une par une) :
   - Cliquez sur **"Add Environment Variable"**
   - **Key** : Collez le nom (ex: `STRIPE_SECRET_KEY`)
   - **Value** : Collez la valeur (ex: `sk_test_51SmHDyRdHWsgpzD6...`)
   - Cliquez sur **"Save Changes"**
5. **Répétez** pour les 7 autres variables
6. **Redéployez** : Cliquez sur "Manual Deploy" > "Deploy latest commit"

---

## ✅ Vérification

Après avoir ajouté toutes les variables, vous devriez voir dans Render :
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`
- ✅ `STRIPE_PRICE_PLUS_MONTHLY`
- ✅ `STRIPE_PRICE_PLUS_YEARLY`
- ✅ `STRIPE_PRICE_PRO_MONTHLY`
- ✅ `STRIPE_PRICE_PRO_YEARLY`
- ✅ `STRIPE_PRICE_TEAM_MONTHLY`
- ✅ `STRIPE_PRICE_TEAM_YEARLY`

**Total : 8 variables** ✅

---

**Copiez-collez chaque variable une par une dans Render Dashboard ! 🚀**

