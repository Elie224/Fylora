# 🎯 Guide de Configuration PayPal

## 📋 Vue d'Ensemble

PayPal nécessite **2 variables d'environnement** :
- `PAYPAL_CLIENT_ID` : Votre Client ID PayPal
- `PAYPAL_CLIENT_SECRET` : Votre Secret PayPal
- `PAYPAL_ENVIRONMENT` : `sandbox` (pour les tests) ou `production` (pour la production)

---

## ✅ Étape 1 : Créer un Compte PayPal Developer

1. **Allez sur** : [https://developer.paypal.com](https://developer.paypal.com)
2. **Connectez-vous** avec votre compte PayPal (ou créez-en un)
3. **Acceptez les conditions** si c'est votre première fois

---

## ✅ Étape 2 : Créer une Application

1. **Dans le Dashboard PayPal**, cliquez sur**"My Apps & Credentials"** (Mes applications et identifiants)
2. **Sélectionnez "Sandbox"** (pour les tests) ou **"Live"** (pour la production)
3. **Cliquez sur "Create App"** (Créer une application)

### Configuration de l'Application :

- **App Name** : `Fylora Billing`
- **Merchant** : Sélectionnez votre compte de test ou votre compte réel
- **Features** : Cochez **"Accept Payments"** et **"Future Payments"**
- **Cliquez sur "Create App"**

---

## ✅ Étape 3 : Récupérer les Identifiants

Une fois l'application créée, vous verrez :

### Client ID
- **Copiez le "Client ID"** : Il ressemble à `AeA1QIZXiflr1_-...` ou `AZDxyz123...`
- **Notez-le** : `PAYPAL_CLIENT_ID = [VOTRE_CLIENT_ID]`

### Secret
- **Cliquez sur "Show"** ou **"Reveal"** à côté de "Secret"
- **Copiez le Secret** : Il ressemble à `ELXyz123...` ou `EFGabc456...`
- **Notez-le** : `PAYPAL_CLIENT_SECRET = [VOTRE_SECRET]`

⚠️ **Important** : Le Secret n'est affiché qu'une seule fois ! Copiez-le immédiatement.

---

## ✅ Étape 4 : Configurer l'Environnement

### Pour les Tests (Sandbox)
- **Variable** : `PAYPAL_ENVIRONMENT`
- **Value** : `sandbox`

### Pour la Production (Live)
- **Variable** : `PAYPAL_ENVIRONMENT`
- **Value** : `production`

**Recommandation** : Commencez par `sandbox` pour tester.

---

## ✅ Étape 5 : Ajouter dans Render Dashboard

### Variables à Ajouter :

1. **PAYPAL_CLIENT_ID**
   - **Key:** `PAYPAL_CLIENT_ID`
   - **Value:** Votre Client ID (ex: `AeA1QIZXiflr1_-...`)

2. **PAYPAL_CLIENT_SECRET**
   - **Key:** `PAYPAL_CLIENT_SECRET`
   - **Value:** Votre Secret (ex: `ELXyz123...`)

3. **PAYPAL_ENVIRONMENT**
   - **Key:** `PAYPAL_ENVIRONMENT`
   - **Value:** `sandbox` (pour les tests) ou `production`

### Instructions :

1. **Allez dans Render Dashboard** : [https://dashboard.render.com](https://dashboard.render.com)
2. **Sélectionnez votre service backend** (fylora-backend)
3. **Cliquez sur "Environment"** dans le menu de gauche
4. **Pour chaque variable** :
   - Cliquez sur **"Add Environment Variable"**
   - Collez le **Key** et le **Value**
   - Cliquez sur **"Save Changes"**
5. **Redéployez** : Cliquez sur "Manual Deploy" > "Deploy latest commit"

---

## 🧪 Tester avec PayPal Sandbox

### Créer un Compte de Test :

1. **Dans PayPal Developer Dashboard**, allez dans **"Sandbox"** > **"Accounts"**
2. **Cliquez sur "Create Account"**
3. **Choisissez "Business"** (pour recevoir des paiements)
4. **Remplissez les informations** (email, mot de passe, etc.)
5. **Cliquez sur "Create Account"**

### Tester un Paiement :

1. **Allez sur votre site** : `/pricing`
2. **Cliquez sur "Upgrade"** pour un plan
3. **Choisissez PayPal**
4. **Connectez-vous** avec votre compte de test Sandbox
5. **Approuvez le paiement**

---

## 📋 Checklist PayPal

- [ ] ✅ Compte PayPal Developer créé
- [ ] ✅ Application créée dans PayPal
- [ ] ✅ Client ID récupéré
- [ ] ✅ Secret récupéré
- [ ] ⏳ 3 variables ajoutées dans Render
- [ ] ⏳ Service redéployé
- [ ] ⏳ Test avec compte Sandbox

---

## 🔗 Liens Utiles

- **PayPal Developer Dashboard** : [https://developer.paypal.com](https://developer.paypal.com)
- **Documentation PayPal** : [https://developer.paypal.com/docs](https://developer.paypal.com/docs)
- **Sandbox Testing** : [https://developer.paypal.com/docs/api-basics/sandbox/](https://developer.paypal.com/docs/api-basics/sandbox/)

---

## ⚠️ Notes Importantes

1. **Sandbox vs Production** :
   - **Sandbox** : Pour les tests, utilisez des comptes de test
   - **Production** : Pour les vrais paiements, utilisez votre compte réel

2. **Sécurité** :
   - Ne partagez JAMAIS votre Secret
   - Ne le commitez JAMAIS dans Git
   - Utilisez uniquement les variables d'environnement

3. **Webhooks PayPal** (Optionnel) :
   - PayPal peut aussi envoyer des webhooks pour les événements
   - Pour l'instant, le code utilise les callbacks de retour
   - Vous pouvez configurer des webhooks plus tard si nécessaire

---

**Une fois les 3 variables ajoutées dans Render, PayPal sera opérationnel ! 🚀**

