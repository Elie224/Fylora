# 🎯 Guide Stripe - Étape par Étape

## 📋 Étape 1: Créer les Produits dans Stripe

### Produit 1: Fylora Plus - Monthly

1. **Dans l'interface "Créer un produit"** que vous avez ouverte:

   **Nom (obligatoire):**
   ```
   Fylora Plus - Monthly
   ```
   - Cliquez dans le champ "Nom"
   - Tapez: `Fylora Plus - Monthly`
   - ✅ L'erreur rouge disparaîtra

   **Description:**
   ```
   500 GB storage plan - Monthly subscription
   ```
   - Cliquez dans le champ "Description"
   - Tapez: `500 GB storage plan - Monthly subscription`

   **Image:**
   - Optionnel pour l'instant (vous pouvez l'ajouter plus tard)

2. **Tarifs:**
   - ✅ Cliquez sur **"Récurrent"** (pas "Ponctuel")
   - Une nouvelle section apparaîtra

3. **Configuration du Prix Récurrent:**
   - **Période:** Sélectionnez **"Mensuel"** (Monthly)
   - **Montant:** `4.99`
   - **Devise:** `USD` (ou EUR selon votre choix)
   - **Facturation:** `À chaque période` (par défaut)

4. **Cliquez sur "Ajouter le produit"**
   - ✅ Le produit est créé
   - 📋 **IMPORTANT:** Copiez le **Price ID** (commence par `price_...`)
   
   **OÙ TROUVER LE PRICE ID:**
   - Après création, vous serez sur la page du produit
   - Cherchez la section **"Tarifs"** ou **"Pricing"**
   - Le Price ID est affiché là (commence par `price_...`)
   - Cliquez dessus ou utilisez l'icône de copie
   - Notez-le: `STRIPE_PRICE_PLUS_MONTHLY = price_xxxxxxxxxxxxx`
   
   **Si vous ne le voyez pas:**
   - Allez dans "Catalogue de produits" (menu de gauche)
   - Cliquez sur votre produit
   - Le Price ID est dans la section "Tarifs"

---

### Produit 2: Fylora Plus - Yearly

1. **Créer un nouveau produit:**
   - Cliquez sur "Créer un produit" à nouveau

   **Nom:**
   ```
   Fylora Plus - Yearly
   ```

   **Description:**
   ```
   500 GB storage plan - Yearly subscription
   ```

2. **Tarifs:**
   - ✅ Cliquez sur **"Récurrent"**
   - **Période:** Sélectionnez **"Annuel"** (Yearly)
   - **Montant:** `49.00`
   - **Devise:** `USD`
   - **Facturation:** `À chaque période`

3. **Cliquez sur "Ajouter le produit"**
   - 📋 Copiez le **Price ID**: `STRIPE_PRICE_PLUS_YEARLY = price_xxxxxxxxxxxxx`

---

### Produit 3: Fylora Pro - Monthly

1. **Créer un nouveau produit**

   **Nom:**
   ```
   Fylora Pro - Monthly
   ```

   **Description:**
   ```
   1 TB storage plan - Monthly subscription
   ```

2. **Tarifs:**
   - ✅ **Récurrent**
   - **Période:** **Mensuel**
   - **Montant:** `9.99`
   - **Devise:** `USD`

3. **Ajouter le produit**
   - 📋 Copiez: `STRIPE_PRICE_PRO_MONTHLY = price_xxxxxxxxxxxxx`

---

### Produit 4: Fylora Pro - Yearly

1. **Créer un nouveau produit**

   **Nom:**
   ```
   Fylora Pro - Yearly
   ```

   **Description:**
   ```
   1 TB storage plan - Yearly subscription
   ```

2. **Tarifs:**
   - ✅ **Récurrent**
   - **Période:** **Annuel**
   - **Montant:** `99.00`
   - **Devise:** `USD`

3. **Ajouter le produit**
   - 📋 Copiez: `STRIPE_PRICE_PRO_YEARLY = price_xxxxxxxxxxxxx`

---

### Produit 5: Fylora Team - Monthly

1. **Créer un nouveau produit**

   **Nom:**
   ```
   Fylora Team - Monthly
   ```

   **Description:**
   ```
   5 TB storage plan - Monthly subscription
   ```

2. **Tarifs:**
   - ✅ **Récurrent**
   - **Période:** **Mensuel**
   - **Montant:** `24.99`
   - **Devise:** `USD`

3. **Ajouter le produit**
   - 📋 Copiez: `STRIPE_PRICE_TEAM_MONTHLY = price_xxxxxxxxxxxxx`

---

### Produit 6: Fylora Team - Yearly

1. **Créer un nouveau produit**

   **Nom:**
   ```
   Fylora Team - Yearly
   ```

   **Description:**
   ```
   5 TB storage plan - Yearly subscription
   ```

2. **Tarifs:**
   - ✅ **Récurrent**
   - **Période:** **Annuel**
   - **Montant:** `249.00`
   - **Devise:** `USD`

3. **Ajouter le produit**
   - 📋 Copiez: `STRIPE_PRICE_TEAM_YEARLY = price_xxxxxxxxxxxxx`

---

## 📋 Étape 2: Récupérer les Clés API

1. **Dans le Dashboard Stripe:**
   - Allez dans **Developers** (en haut à droite)
   - Cliquez sur **API keys**

2. **Récupérer la Secret Key:**
   - Vous verrez "Secret key" (commence par `sk_test_...`)
   - Cliquez sur **"Reveal test key"** pour la voir
   - 📋 Copiez-la: `STRIPE_SECRET_KEY = sk_test_xxxxxxxxxxxxx`

3. **Récupérer la Publishable Key:**
   - Vous verrez "Publishable key" (commence par `pk_test_...`)
   - Elle est déjà visible
   - 📋 Copiez-la (optionnel pour l'instant)

---

## 📋 Étape 3: Configurer le Webhook

1. **Dans le Dashboard Stripe:**
   - Allez dans **Developers > Webhooks**
   - Cliquez sur **"Add endpoint"**

2. **Configuration de l'Endpoint:**
   - **Endpoint URL:** 
     ```
     https://fylora-1.onrender.com/api/billing/stripe/webhook
     ```
     (Remplacez par votre URL backend si différente)
   
   - **Description:**
     ```
     Fylora Billing Webhook
     ```

3. **Sélectionner les Événements:**
   - Cliquez sur **"Select events"**
   - Cochez ces événements:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.deleted`
     - ✅ `customer.subscription.updated`
   - Cliquez sur **"Add events"**

4. **Créer l'Endpoint:**
   - Cliquez sur **"Add endpoint"**

5. **Récupérer le Signing Secret:**
   - Une fois créé, cliquez sur l'endpoint
   - Vous verrez "Signing secret" (commence par `whsec_...`)
   - Cliquez sur **"Reveal"** pour le voir
   - 📋 Copiez-le: `STRIPE_WEBHOOK_SECRET = whsec_xxxxxxxxxxxxx`

---

## 📋 Étape 4: Résumé des Variables à Copier

Créez un fichier texte temporaire avec toutes ces valeurs:

```
=== STRIPE CONFIGURATION ===

STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

STRIPE_PRICE_PLUS_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PLUS_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_TEAM_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_TEAM_YEARLY=price_xxxxxxxxxxxxx
```

---

## 📋 Étape 5: Ajouter dans Render

1. **Ouvrir Render Dashboard:**
   - Allez sur [https://dashboard.render.com](https://dashboard.render.com)
   - Sélectionnez votre service backend (fylora-backend)

2. **Aller dans Environment:**
   - Dans le menu de gauche, cliquez sur **"Environment"**

3. **Ajouter chaque Variable:**
   - Cliquez sur **"Add Environment Variable"**
   - Pour chaque variable:
     - **Key:** `STRIPE_SECRET_KEY`
     - **Value:** `sk_test_xxxxxxxxxxxxx` (votre valeur)
     - Cliquez sur **"Save Changes"**
   
   Répétez pour toutes les variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_PLUS_MONTHLY`
   - `STRIPE_PRICE_PLUS_YEARLY`
   - `STRIPE_PRICE_PRO_MONTHLY`
   - `STRIPE_PRICE_PRO_YEARLY`
   - `STRIPE_PRICE_TEAM_MONTHLY`
   - `STRIPE_PRICE_TEAM_YEARLY`

4. **Redéployer:**
   - Une fois toutes les variables ajoutées
   - Cliquez sur **"Manual Deploy"** > **"Deploy latest commit"**

---

## ✅ Vérification

### Test Rapide

1. **Vérifier les Logs Render:**
   - Après le redéploiement
   - Allez dans **"Logs"**
   - Vous devriez voir: `✅ Stripe initialized`

2. **Tester la Page Pricing:**
   - Allez sur `/pricing`
   - Cliquez sur "Upgrade" pour un plan
   - Choisir Stripe
   - Vous devriez être redirigé vers Stripe Checkout

---

## 🎯 Où Trouver les Price IDs

Si vous avez déjà créé les produits mais oublié les Price IDs:

1. **Dans Stripe Dashboard:**
   - Allez dans **Products**
   - Cliquez sur un produit (ex: "Fylora Plus - Monthly")
   - Vous verrez la section **"Pricing"**
   - Le **Price ID** est affiché (commence par `price_...`)
   - Cliquez dessus pour le copier

---

## ⚠️ Erreurs Communes

### "Price ID not found"
- ✅ Vérifiez que vous avez bien copié le Price ID complet
- ✅ Vérifiez que le produit est bien en mode "Récurrent"
- ✅ Vérifiez que la période correspond (Monthly/Yearly)

### "Webhook signature verification failed"
- ✅ Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct
- ✅ Vérifiez que l'URL du webhook est correcte
- ✅ Vérifiez que vous utilisez le bon secret (test vs live)

---

## 📞 Besoin d'Aide?

Si vous êtes bloqué à une étape:
1. Prenez une capture d'écran
2. Vérifiez les logs Render
3. Vérifiez que toutes les variables sont bien ajoutées

---

**Une fois toutes les étapes terminées, votre configuration Stripe sera complète ! 🎉**

