# 🎯 Guide de Configuration du Webhook PayPal

## 📋 Vue d'Ensemble

Le webhook PayPal permet de **mettre à jour automatiquement le plan de l'utilisateur** après un paiement, **sans intervention admin**.

**Les paiements vont directement sur votre compte PayPal** (associé au Client ID/Secret que vous avez configuré).

---

## ✅ Étape 1 : Configurer le Webhook dans PayPal

### 1.1 Accéder aux Webhooks

1. **Allez sur** : [https://developer.paypal.com](https://developer.paypal.com)
2. **Connectez-vous** avec votre compte PayPal
3. **Cliquez sur "My Apps & Credentials"** (Mes applications et identifiants)
4. **Sélectionnez votre application** (celle que vous avez créée pour Fylora)
5. **Cliquez sur "Webhooks"** dans le menu de gauche

### 1.2 Créer un Webhook

1. **Cliquez sur "Add Webhook"** (Ajouter un webhook)
2. **Remplissez les informations** :
   - **Webhook URL** : `https://fylora-1.onrender.com/api/billing/paypal/webhook`
   - **Event types** : Sélectionnez les événements suivants :
     - ✅ `PAYMENT.CAPTURE.COMPLETED` (Paiement complété)
     - ✅ `PAYMENT.SALE.COMPLETED` (Vente complétée)
     - ✅ `BILLING.SUBSCRIPTION.CANCELLED` (Abonnement annulé)
     - ✅ `BILLING.SUBSCRIPTION.EXPIRED` (Abonnement expiré)
3. **Cliquez sur "Save"** (Enregistrer)

### 1.3 Récupérer l'ID du Webhook

Une fois créé, **notez l'ID du webhook** (il ressemble à `WH-2W426848G89348236-67973617NV550584A`).

---

## ✅ Étape 2 : Vérifier la Configuration

### Variables d'Environnement Requises

Assurez-vous que ces variables sont configurées dans Render :

- ✅ `PAYPAL_CLIENT_ID` : Votre Client ID PayPal
- ✅ `PAYPAL_CLIENT_SECRET` : Votre Secret PayPal
- ✅ `PAYPAL_ENVIRONMENT` : `production` (pour la production) ou `sandbox` (pour les tests)

---

## ✅ Étape 3 : Tester le Webhook

### 3.1 Test avec PayPal Sandbox

1. **Allez sur** : [https://developer.paypal.com](https://developer.paypal.com)
2. **Cliquez sur "Sandbox"** > **"Webhooks"**
3. **Sélectionnez votre webhook**
4. **Cliquez sur "Send test event"** (Envoyer un événement de test)
5. **Vérifiez les logs** dans Render pour voir si le webhook est reçu

### 3.2 Test avec un Vrai Paiement

1. **Effectuez un paiement test** via votre site
2. **Vérifiez les logs** dans Render Dashboard
3. **Vérifiez que le plan de l'utilisateur** est mis à jour automatiquement

---

## 🔍 Comment ça Fonctionne

### Flux de Paiement PayPal

1. **L'utilisateur clique sur "Upgrade"** dans `/pricing`
2. **Le backend crée un paiement PayPal** avec les métadonnées (userId, planId, period)
3. **L'utilisateur est redirigé vers PayPal** pour payer
4. **L'utilisateur paie** → **L'argent va directement sur votre compte PayPal**
5. **PayPal envoie un webhook** à `https://fylora-1.onrender.com/api/billing/paypal/webhook`
6. **Le backend reçoit le webhook** et met à jour automatiquement :
   - `user.plan` → Le nouveau plan
   - `user.quota_limit` → Le nouveau quota
7. **L'utilisateur a immédiatement accès** à son nouveau plan

---

## 📋 Événements PayPal Gérés

| Événement | Action |
|-----------|--------|
| `PAYMENT.CAPTURE.COMPLETED` | Met à jour le plan de l'utilisateur |
| `PAYMENT.SALE.COMPLETED` | Met à jour le plan de l'utilisateur |
| `BILLING.SUBSCRIPTION.CANCELLED` | Rétrograde vers FREE |
| `BILLING.SUBSCRIPTION.EXPIRED` | Rétrograde vers FREE |

---

## ⚠️ Notes Importantes

1. **Les paiements vont sur VOTRE compte PayPal** :
   - Le compte associé au `PAYPAL_CLIENT_ID` et `PAYPAL_CLIENT_SECRET`
   - Si vous utilisez votre propre Client ID/Secret, les paiements vont sur votre compte
   - **Aucune configuration supplémentaire n'est nécessaire**

2. **Webhook URL** :
   - **Production** : `https://fylora-1.onrender.com/api/billing/paypal/webhook`
   - **Sandbox** : Utilisez la même URL mais avec `PAYPAL_ENVIRONMENT=sandbox`

3. **Sécurité** :
   - PayPal signe les webhooks avec une signature
   - Le code vérifie automatiquement la signature
   - Seuls les webhooks valides sont traités

---

## 🧪 Tester Localement (Optionnel)

Si vous voulez tester localement, utilisez [ngrok](https://ngrok.com/) :

```bash
ngrok http 5001
```

Puis utilisez l'URL ngrok dans PayPal : `https://votre-url.ngrok.io/api/billing/paypal/webhook`

---

## ✅ Checklist

- [ ] ✅ Webhook créé dans PayPal Developer Dashboard
- [ ] ✅ URL du webhook : `https://fylora-1.onrender.com/api/billing/paypal/webhook`
- [ ] ✅ Événements sélectionnés : `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.SALE.COMPLETED`, etc.
- [ ] ✅ Variables PayPal configurées dans Render
- [ ] ✅ Test effectué avec PayPal Sandbox
- [ ] ✅ Vérification que les paiements vont sur votre compte PayPal

---

**Une fois le webhook configuré, les paiements PayPal mettront automatiquement à jour le plan de l'utilisateur ! 🚀**

