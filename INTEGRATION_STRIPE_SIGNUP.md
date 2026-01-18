# Intégration Stripe pour vérification de carte à l'inscription

## Modifications effectuées

### Backend
1. ✅ Modèle User : ajout de `card_verified`, `card_verification_date`, `stripe_customer_id`
2. ✅ Service `billingService.verifyCardForSignup()` : vérification via Stripe Setup Intent (sans prélèvement)
3. ✅ Route `/api/auth/verify-card` : vérification de carte avant inscription
4. ✅ Route `/api/auth/stripe-publishable-key` : obtention de la clé publique Stripe
5. ✅ Contrôleur `authController.signup` : exige `stripeCustomerId` et détection de doublons
6. ✅ Détection renforcée : même carte, informations similaires

### Frontend (à compléter)
1. ✅ Packages installés : `@stripe/stripe-js`, `@stripe/react-stripe-js`
2. ✅ `api.js` : ajout de `stripeCustomerId` dans signup
3. ✅ `authStore.js` : ajout de `stripeCustomerId` dans signup
4. ⚠️ `Signup.jsx` : Intégration Stripe Elements (partiellement fait, besoin de compléter)

## Étapes restantes pour Signup.jsx

1. Ajouter un composant interne `CardInput` qui utilise `CardElement` de Stripe
2. Ajouter le champ de carte entre "confirmPassword" et le bouton "S'inscrire"
3. Modifier `handleSubmit` pour :
   - Vérifier la carte avant l'inscription
   - Créer un PaymentMethod Stripe
   - Appeler `/api/auth/verify-card`
   - Stocker `stripeCustomerId`
   - Puis procéder à l'inscription

## Variable d'environnement requise

Backend : `STRIPE_PUBLISHABLE_KEY` doit être configurée dans `.env`

## Notes

- La vérification se fait via Stripe Setup Intent (aucun prélèvement)
- Un utilisateur ne peut pas utiliser la même carte pour plusieurs comptes
- Les informations similaires (nom, prénom) sont vérifiées
- L'inscription est bloquée si la carte est déjà utilisée
