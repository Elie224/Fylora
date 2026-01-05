# 🧪 Guide de Test des Webhooks Stripe

## 📋 Prérequis

1. ✅ Stripe configuré dans Render
2. ✅ Webhook endpoint configuré dans Stripe Dashboard
3. ✅ Backend déployé et accessible
4. ✅ Logs accessibles (Render Dashboard)

---

## 🔧 Étape 1: Configuration du Webhook dans Stripe

### 1.1 Créer l'Endpoint

1. Aller dans [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Cliquer sur **Add endpoint**
3. Endpoint URL: `https://votre-backend-url.onrender.com/api/billing/stripe/webhook`
4. Description: `Fylora Billing Webhook`

### 1.2 Sélectionner les Événements

Sélectionner ces événements:
- ✅ `checkout.session.completed` - Quand un paiement réussit
- ✅ `customer.subscription.deleted` - Quand un abonnement est annulé
- ✅ `customer.subscription.updated` - Quand un abonnement est mis à jour

### 1.3 Récupérer le Signing Secret

1. Après création, cliquer sur l'endpoint
2. Copier le **Signing secret** (commence par `whsec_...`)
3. L'ajouter dans Render comme `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Étape 2: Test avec Stripe CLI (Recommandé)

### 2.1 Installer Stripe CLI

**Windows:**
```powershell
# Via Scoop
scoop install stripe

# Ou télécharger depuis https://github.com/stripe/stripe-cli/releases
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Télécharger depuis https://github.com/stripe/stripe-cli/releases
```

### 2.2 Se Connecter à Stripe

```bash
stripe login
```

Cela ouvrira votre navigateur pour authentification.

### 2.3 Forwarder les Webhooks vers le Backend Local

```bash
# Pour tester en local
stripe listen --forward-to http://localhost:5001/api/billing/stripe/webhook
```

Cela affichera un **webhook signing secret** temporaire. Utilisez-le pour les tests locaux.

### 2.4 Tester un Événement

Dans un autre terminal:

```bash
# Tester checkout.session.completed
stripe trigger checkout.session.completed
```

Vous devriez voir l'événement dans votre backend.

---

## 🌐 Étape 3: Test avec le Backend en Production

### 3.1 Utiliser Stripe Dashboard

1. Aller dans **Developers > Webhooks**
2. Sélectionner votre endpoint
3. Cliquer sur **Send test webhook**
4. Choisir l'événement: `checkout.session.completed`
5. Cliquer sur **Send test webhook**

### 3.2 Vérifier les Logs

Dans Render Dashboard > Logs, vous devriez voir:

```
✅ Stripe webhook received: checkout.session.completed
✅ User plan updated from Stripe webhook
   userId: xxx
   planId: plus
   sessionId: cs_test_xxx
```

---

## 🧪 Étape 4: Test Complet du Flow

### 4.1 Test d'un Upgrade Réel

1. **Frontend**: Aller sur `/pricing`
2. **Cliquer** sur "Upgrade" pour un plan payant
3. **Choisir** Stripe
4. **Utiliser** la carte de test: `4242 4242 4242 4242`
5. **Compléter** le checkout
6. **Vérifier** dans les logs que le webhook a été reçu
7. **Vérifier** que l'utilisateur a été mis à jour dans MongoDB

### 4.2 Vérifier dans MongoDB

```javascript
// Vérifier que le plan a été mis à jour
db.users.findOne({ email: "user@example.com" }, { plan: 1, quota_limit: 1 })
```

Devrait afficher:
```json
{
  "plan": "plus",
  "quota_limit": 536870912000  // 500 Go
}
```

---

## 🔍 Étape 5: Debugging

### 5.1 Vérifier les Logs Backend

Dans Render Dashboard > Logs, chercher:
- `Stripe webhook received`
- `User plan updated from Stripe webhook`
- `Error handling Stripe webhook`

### 5.2 Vérifier dans Stripe Dashboard

1. Aller dans **Developers > Webhooks**
2. Sélectionner votre endpoint
3. Voir les **Recent events**
4. Vérifier le statut (✅ Success ou ❌ Failed)

### 5.3 Erreurs Communes

#### Erreur: "No signatures found"
- ✅ Vérifier que `STRIPE_WEBHOOK_SECRET` est configuré
- ✅ Vérifier que le secret correspond à l'endpoint

#### Erreur: "Invalid signature"
- ✅ Vérifier que le webhook secret est correct
- ✅ Vérifier que l'URL de l'endpoint est correcte

#### Erreur: "User not found"
- ✅ Vérifier que `client_reference_id` contient l'ID utilisateur
- ✅ Vérifier que l'utilisateur existe dans MongoDB

---

## 📊 Étape 6: Monitoring

### 6.1 Dashboard Stripe

Dans Stripe Dashboard > Webhooks:
- ✅ Voir le nombre de webhooks envoyés
- ✅ Voir le taux de succès
- ✅ Voir les erreurs

### 6.2 Logs Render

Configurer des alertes pour:
- ❌ Erreurs de webhook
- ❌ Échecs de mise à jour utilisateur

---

## ✅ Checklist de Test

- [ ] Webhook endpoint configuré dans Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` configuré dans Render
- [ ] Test avec Stripe CLI (local)
- [ ] Test avec Stripe Dashboard (production)
- [ ] Test d'un upgrade complet
- [ ] Vérification dans MongoDB
- [ ] Monitoring des erreurs

---

## 🔗 Ressources

- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Testing](https://stripe.com/docs/testing)

---

**Une fois les tests réussis, votre système de billing est prêt pour la production ! 🎉**

