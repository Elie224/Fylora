# 🔧 Guide de Configuration Stripe & PayPal

## 📋 Étape 1: Configuration Stripe

### 1.1 Créer un compte Stripe

1. Aller sur [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Créer un compte (ou se connecter)
3. Activer le mode **Test** (pour commencer)

### 1.2 Récupérer les clés API

1. Dans le Dashboard Stripe, aller dans **Developers > API keys**
2. Copier:
   - **Publishable key** (commence par `pk_test_...`)
   - **Secret key** (commence par `sk_test_...`) - Cliquer sur "Reveal test key"

### 1.3 Créer les Products et Prices

#### Créer les Products

1. Aller dans **Products** dans le Dashboard
2. Créer 4 produits:

**Product 1: Fylora Plus Monthly**
- Name: `Fylora Plus - Monthly`
- Description: `500 GB storage plan - Monthly subscription`
- Type: `Service`
- Pricing: `Recurring`, `Monthly`, `$4.99 USD`
- Copier le **Price ID** (commence par `price_...`)

**Product 2: Fylora Plus Yearly**
- Name: `Fylora Plus - Yearly`
- Description: `500 GB storage plan - Yearly subscription`
- Type: `Service`
- Pricing: `Recurring`, `Yearly`, `$49.00 USD`
- Copier le **Price ID**

**Product 3: Fylora Pro Monthly**
- Name: `Fylora Pro - Monthly`
- Description: `1 TB storage plan - Monthly subscription`
- Type: `Service`
- Pricing: `Recurring`, `Monthly`, `$9.99 USD`
- Copier le **Price ID**

**Product 4: Fylora Pro Yearly**
- Name: `Fylora Pro - Yearly`
- Description: `1 TB storage plan - Yearly subscription`
- Type: `Service`
- Pricing: `Recurring`, `Yearly`, `$99.00 USD`
- Copier le **Price ID**

**Product 5: Fylora Team Monthly**
- Name: `Fylora Team - Monthly`
- Description: `5 TB storage plan - Monthly subscription`
- Type: `Service`
- Pricing: `Recurring`, `Monthly`, `$24.99 USD`
- Copier le **Price ID**

**Product 6: Fylora Team Yearly**
- Name: `Fylora Team - Yearly`
- Description: `5 TB storage plan - Yearly subscription`
- Type: `Service`
- Pricing: `Recurring`, `Yearly`, `$249.00 USD`
- Copier le **Price ID**

### 1.4 Configurer le Webhook

1. Aller dans **Developers > Webhooks**
2. Cliquer sur **Add endpoint**
3. Endpoint URL: `https://votre-backend-url.onrender.com/api/billing/stripe/webhook`
4. Événements à écouter:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Copier le **Signing secret** (commence par `whsec_...`)

---

## 📋 Étape 2: Configuration PayPal

### 2.1 Créer un compte PayPal Developer

1. Aller sur [https://developer.paypal.com/](https://developer.paypal.com/)
2. Se connecter avec votre compte PayPal
3. Aller dans **Dashboard**

### 2.2 Créer une Application

1. Cliquer sur **Create App**
2. Nom: `Fylora`
3. Environment: **Sandbox** (pour tester) ou **Live** (production)
4. Copier:
   - **Client ID**
   - **Secret**

### 2.3 Note pour Production

Pour la production, vous devrez:
- Créer une application **Live**
- Obtenir les credentials de production
- Configurer les URLs de callback

---

## 📋 Étape 3: Configuration dans Render

### 3.1 Variables d'Environnement Backend

Dans le Dashboard Render, pour votre service backend:

#### Stripe
```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_PRICE_PLUS_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PLUS_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_TEAM_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_TEAM_YEARLY=price_xxxxxxxxxxxxx
```

#### PayPal
```
PAYPAL_CLIENT_ID=xxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxx
PAYPAL_ENVIRONMENT=sandbox
```

#### Frontend URL
```
FRONTEND_URL=https://votre-frontend-url.onrender.com
```

### 3.2 Comment Ajouter les Variables

1. Dans Render Dashboard, sélectionner votre service backend
2. Aller dans **Environment**
3. Cliquer sur **Add Environment Variable**
4. Ajouter chaque variable une par une
5. **Redeploy** le service après avoir ajouté toutes les variables

---

## 📋 Étape 4: Vérification

### 4.1 Tester Stripe Checkout

1. Aller sur `/pricing`
2. Cliquer sur "Upgrade" pour un plan payant
3. Choisir Stripe
4. Vous devriez être redirigé vers Stripe Checkout
5. Utiliser la carte de test: `4242 4242 4242 4242`
6. Date: n'importe quelle date future
7. CVC: n'importe quel 3 chiffres

### 4.2 Vérifier les Logs

Dans Render Dashboard > Logs, vous devriez voir:
- `Stripe checkout session created`
- `User plan updated from Stripe webhook`

---

## ⚠️ Important

### Mode Test vs Production

- **Test**: Utilisez `sk_test_...` et `pk_test_...`
- **Production**: Utilisez `sk_live_...` et `pk_live_...`

### Sécurité

- **NE JAMAIS** commiter les clés secrètes dans Git
- Utiliser **toujours** les variables d'environnement
- Activer **2FA** sur votre compte Stripe/PayPal

---

## 🔗 Liens Utiles

- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Stripe Testing](https://stripe.com/docs/testing)
- [PayPal Developer Dashboard](https://developer.paypal.com/)
- [PayPal Testing](https://developer.paypal.com/docs/api-basics/sandbox/)

---

**Une fois configuré, votre système de billing sera opérationnel ! 🎉**

