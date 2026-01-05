# 🔍 Comment Trouver les Événements Stripe

## 📋 Événements à Sélectionner

Vous devez trouver et cocher ces 3 événements :

1. ✅ `checkout.session.completed`
2. ✅ `customer.subscription.deleted`
3. ✅ `customer.subscription.updated`

---

## 🔎 Méthode 1: Recherche par Nom

1. **Dans la page de sélection des événements**, utilisez la **barre de recherche** en haut
2. **Tapez le nom exact** de l'événement :
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
3. Les résultats apparaîtront automatiquement
4. **Cochez chaque événement** trouvé

---

## 🔎 Méthode 2: Par Catégorie

Si la recherche ne fonctionne pas, cherchez dans ces catégories :

### Catégorie "Checkout"
- Cherchez la section **"Checkout"** ou **"Sessions"**
- Trouvez : `checkout.session.completed`

### Catégorie "Subscriptions"
- Cherchez la section **"Subscriptions"** ou **"Abonnements"**
- Trouvez :
  - `customer.subscription.deleted`
  - `customer.subscription.updated`

---

## 🔎 Méthode 3: Tous les Événements

1. **Déroulez toutes les catégories** dans la liste
2. **Parcourez** les sections suivantes :
   - **Checkout Sessions** → `checkout.session.completed`
   - **Customer Subscriptions** → `customer.subscription.deleted` et `customer.subscription.updated`

---

## 💡 Astuce

Si vous ne trouvez toujours pas :

1. **Vérifiez que vous êtes dans "Votre compte"** (pas "Comptes connectés")
2. **Essayez de taper juste une partie** du nom :
   - `checkout` pour trouver `checkout.session.completed`
   - `subscription` pour trouver les événements de subscription
3. **Les noms peuvent être en français** dans l'interface :
   - "Session de paiement terminée" = `checkout.session.completed`
   - "Abonnement supprimé" = `customer.subscription.deleted`
   - "Abonnement mis à jour" = `customer.subscription.updated`

---

## ✅ Alternative: Sélectionner Tous les Événements

Si vous ne trouvez pas ces événements spécifiques :

1. **Cherchez un bouton "Sélectionner tout"** ou **"Select all"**
2. **Cochez tous les événements** (Stripe filtrera automatiquement)
3. **Ou sélectionnez la catégorie complète** :
   - Tous les événements de "Checkout"
   - Tous les événements de "Subscriptions"

---

## 🎯 Une Fois les Événements Sélectionnés

1. **Cliquez sur "Continuer"** ou **"Créer"**
2. **Le webhook sera créé**
3. **Récupérez le Signing Secret** sur la page suivante

---

**Essayez d'abord la recherche par nom. Si ça ne fonctionne pas, dites-moi ce que vous voyez dans la liste !**

