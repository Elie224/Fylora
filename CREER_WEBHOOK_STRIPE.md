# 🎯 Créer le Webhook Stripe - Guide Complet

## ⚠️ Important : Vous êtes sur la mauvaise page !

Vous êtes actuellement sur la page **"Événements"** (Events) qui montre l'**historique** des événements.

Pour **créer un webhook**, vous devez aller dans **"Webhooks"**.

---

## 📍 Étape 1 : Aller dans Webhooks

1. **Dans la barre de navigation en haut**, cliquez sur **"Webhooks"** (à côté de "Événements")
2. Vous verrez une page avec la liste de vos webhooks (probablement vide pour l'instant)
3. **Cliquez sur le bouton "Add endpoint"** ou **"Ajouter un endpoint"** (en haut à droite)

---

## 📍 Étape 2 : Configurer le Webhook

Une fois sur la page de création :

### 2.1 Sélectionner le compte
- ✅ **"Votre compte"** (déjà sélectionné - c'est correct)
- Cliquez sur **"Continuer →"**

### 2.2 Choisir le type de destination
- Sélectionnez **"Endpoint URL"** ou **"URL de destination"**
- Cliquez sur **"Continuer →"**

### 2.3 Entrer l'URL
- Dans le champ **"URL de destination"**, entrez :
  ```
  https://fylora-1.onrender.com/api/billing/stripe/webhook
  ```
- Cliquez sur **"Continuer →"**

### 2.4 Sélectionner les événements

**C'est ici que vous devez sélectionner les événements !**

Sur cette page, vous verrez :
- Une **barre de recherche** en haut
- Une **liste d'événements** organisés par catégorie

**Méthode 1 : Recherche directe**
1. **Tapez dans la barre de recherche** : `checkout.session.completed`
2. L'événement apparaîtra → **Cochez-le**
3. **Tapez** : `customer.subscription.deleted` → **Cochez-le**
4. **Tapez** : `customer.subscription.updated` → **Cochez-le**

**Méthode 2 : Par catégorie**
1. **Déroulez la catégorie "Checkout"** ou **"Sessions"**
   - Cherchez `checkout.session.completed`
2. **Déroulez la catégorie "Subscriptions"** ou **"Abonnements"**
   - Cherchez `customer.subscription.deleted`
   - Cherchez `customer.subscription.updated`

**Méthode 3 : Si vous ne trouvez toujours pas**
1. **Cherchez un bouton "Sélectionner tout"** ou **"Select all"**
2. **Ou sélectionnez toutes les catégories** :
   - ✅ Tous les événements de "Checkout"
   - ✅ Tous les événements de "Subscriptions"

---

## 📍 Étape 3 : Créer le Webhook

1. Une fois les 3 événements cochés, cliquez sur **"Créer la destination"** ou **"Create endpoint"**
2. Le webhook sera créé !

---

## 📍 Étape 4 : Récupérer le Signing Secret

1. **Vous serez redirigé** vers la page de détails du webhook
2. **Cherchez la section "Signing secret"** ou **"Secret de signature"**
3. **Cliquez sur "Révéler"** ou **"Reveal"**
4. **Copiez le secret** : il commence par `whsec_...`
5. **Notez-le** dans `VARIABLES_RENDER_STRIPE_LOCAL.txt`

---

## 🔍 Si Vous Ne Trouvez Toujours Pas les Événements

### Option A : Sélectionner Tous les Événements
- Cochez **"Sélectionner tout"** ou **"Select all"**
- Stripe enverra tous les événements (votre backend filtrera ceux qu'il utilise)

### Option B : Sélectionner par Catégorie
- Cochez toute la catégorie **"Checkout"**
- Cochez toute la catégorie **"Subscriptions"**

### Option C : Recherche Alternative
- Essayez de taper juste **"checkout"** (sans `.completed`)
- Essayez de taper juste **"subscription"** (sans `customer.`)

---

## ✅ Prochaine Action

**Allez dans "Webhooks" maintenant** (pas "Événements") et créez le webhook !

---

**Dites-moi ce que vous voyez quand vous allez dans "Webhooks" !**

