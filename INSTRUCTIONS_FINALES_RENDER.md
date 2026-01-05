# 🎯 Instructions Finales - Ajouter les Variables dans Render

## ✅ Ce que Vous Avez Maintenant

- ✅ **Secret Key Stripe** : Voir `VARIABLES_RENDER_STRIPE_LOCAL.txt` (fichier local)
- ✅ **Webhook Secret** : `whsec_vDmgczoc2DMA5Z0pczlWFF98mmoFZSzX`
- ✅ **6 Price IDs** : Tous récupérés
- ✅ **Webhook créé** : `we_1SmIp7RdHWsgpzD6MrG6Ce85`

---

## 📋 Étape Finale : Ajouter dans Render Dashboard

### 1. Ouvrir Render Dashboard

1. Allez sur [https://dashboard.render.com](https://dashboard.render.com)
2. Connectez-vous à votre compte
3. **Sélectionnez votre service backend** (fylora-backend)

### 2. Aller dans Environment

1. Dans le menu de gauche, cliquez sur **"Environment"**
2. Vous verrez la liste de vos variables d'environnement actuelles

### 3. Ajouter les 8 Variables

**Pour chaque variable ci-dessous :**
1. Cliquez sur **"Add Environment Variable"** (en haut à droite)
2. **Key** : Collez le nom de la variable
3. **Value** : Collez la valeur correspondante
4. Cliquez sur **"Save Changes"**
5. Répétez pour la variable suivante

---

## 📝 Liste Complète des Variables à Ajouter

### Variable 1 : Secret Key
- **Key:** `STRIPE_SECRET_KEY`
- **Value:** Voir `VARIABLES_RENDER_STRIPE_LOCAL.txt` pour la vraie valeur (fichier local)

### Variable 2 : Webhook Secret
- **Key:** `STRIPE_WEBHOOK_SECRET`
- **Value:** `whsec_vDmgczoc2DMA5Z0pczlWFF98mmoFZSzX`

### Variable 3 : Price ID - Plus Monthly
- **Key:** `STRIPE_PRICE_PLUS_MONTHLY`
- **Value:** `price_1SmHNJRdHWsgpzD61N0x9eWg`

### Variable 4 : Price ID - Plus Yearly
- **Key:** `STRIPE_PRICE_PLUS_YEARLY`
- **Value:** `price_1SmHbLRdHWsgpzD63VCGibqn`

### Variable 5 : Price ID - Pro Monthly
- **Key:** `STRIPE_PRICE_PRO_MONTHLY`
- **Value:** `price_1SmHcyRdHWsgpzD6JfuDVvEc`

### Variable 6 : Price ID - Pro Yearly
- **Key:** `STRIPE_PRICE_PRO_YEARLY`
- **Value:** `price_1SmHe9RdHWsgpzD6EdCnzdVj`

### Variable 7 : Price ID - Team Monthly
- **Key:** `STRIPE_PRICE_TEAM_MONTHLY`
- **Value:** `price_1SmHfwRdHWsgpzD6qRB9UoS0`

### Variable 8 : Price ID - Team Yearly
- **Key:** `STRIPE_PRICE_TEAM_YEARLY`
- **Value:** `price_1SmHijRdHWsgpzD6W2MlI8OL`

---

## ✅ Après Avoir Ajouté Toutes les Variables

### 1. Redéployer le Service

1. Dans Render Dashboard, allez dans votre service backend
2. Cliquez sur **"Manual Deploy"** (en haut à droite)
3. Sélectionnez **"Deploy latest commit"**
4. Attendez que le déploiement se termine (2-3 minutes)

### 2. Vérifier les Logs

1. Dans Render Dashboard, cliquez sur **"Logs"**
2. Vous devriez voir : `✅ Stripe initialized` ou un message similaire
3. Vérifiez qu'il n'y a pas d'erreurs liées à Stripe

### 3. Tester la Page Pricing

1. Allez sur votre site : `https://votre-site.onrender.com/pricing`
2. La page devrait s'afficher correctement
3. Cliquez sur "Upgrade" pour un plan payant
4. Vous devriez être redirigé vers Stripe Checkout

---

## 🧪 Test avec une Carte de Test Stripe

Dans Stripe Checkout, utilisez :
- **Carte:** `4242 4242 4242 4242`
- **Date:** N'importe quelle date future (ex: 12/25)
- **CVC:** N'importe quel 3 chiffres (ex: 123)
- **Code postal:** N'importe quel code postal (ex: 12345)

---

## 📋 Checklist Finale

- [x] ✅ Webhook créé dans Stripe
- [x] ✅ Signing Secret récupéré
- [ ] ⏳ 8 variables ajoutées dans Render
- [ ] ⏳ Service redéployé
- [ ] ⏳ Logs vérifiés
- [ ] ⏳ Page /pricing testée
- [ ] ⏳ Test d'upgrade avec carte de test

---

## 🎉 Une Fois Terminé

Votre système de pricing Stripe sera **complètement opérationnel** !

Vous pourrez :
- ✅ Afficher les plans sur `/pricing`
- ✅ Permettre aux utilisateurs d'upgrader leur plan
- ✅ Recevoir les webhooks Stripe automatiquement
- ✅ Mettre à jour les plans des utilisateurs dans MongoDB

---

**Allez dans Render Dashboard maintenant et ajoutez les 8 variables ! 🚀**

