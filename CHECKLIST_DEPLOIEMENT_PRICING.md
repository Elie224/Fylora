# ✅ Checklist de Déploiement du Système de Pricing

## 📋 Phase 1: Configuration Stripe

- [ ] Créer un compte Stripe
- [ ] Récupérer les clés API (Test)
  - [ ] `STRIPE_SECRET_KEY` (sk_test_...)
  - [ ] `STRIPE_PUBLISHABLE_KEY` (pk_test_...)
- [ ] Créer les 6 Products dans Stripe Dashboard
  - [ ] Fylora Plus Monthly
  - [ ] Fylora Plus Yearly
  - [ ] Fylora Pro Monthly
  - [ ] Fylora Pro Yearly
  - [ ] Fylora Team Monthly
  - [ ] Fylora Team Yearly
- [ ] Copier les 6 Price IDs
- [ ] Configurer le Webhook endpoint
- [ ] Récupérer le Webhook Secret (whsec_...)

---

## 📋 Phase 2: Configuration PayPal

- [ ] Créer un compte PayPal Developer
- [ ] Créer une application Sandbox
- [ ] Récupérer les credentials
  - [ ] `PAYPAL_CLIENT_ID`
  - [ ] `PAYPAL_CLIENT_SECRET`
- [ ] Configurer `PAYPAL_ENVIRONMENT=sandbox`

---

## 📋 Phase 3: Configuration Render

### Backend
- [ ] Ajouter `STRIPE_SECRET_KEY`
- [ ] Ajouter `STRIPE_WEBHOOK_SECRET`
- [ ] Ajouter `STRIPE_PRICE_PLUS_MONTHLY`
- [ ] Ajouter `STRIPE_PRICE_PLUS_YEARLY`
- [ ] Ajouter `STRIPE_PRICE_PRO_MONTHLY`
- [ ] Ajouter `STRIPE_PRICE_PRO_YEARLY`
- [ ] Ajouter `STRIPE_PRICE_TEAM_MONTHLY`
- [ ] Ajouter `STRIPE_PRICE_TEAM_YEARLY`
- [ ] Ajouter `PAYPAL_CLIENT_ID`
- [ ] Ajouter `PAYPAL_CLIENT_SECRET`
- [ ] Ajouter `PAYPAL_ENVIRONMENT`
- [ ] Ajouter `FRONTEND_URL`
- [ ] Redéployer le backend

---

## 📋 Phase 4: Migration Utilisateurs

- [ ] Backup de la base de données MongoDB
- [ ] Tester la migration en mode dry-run
  ```bash
  node backend/scripts/migrateUsersToFreePlan.js --dry-run
  ```
- [ ] Vérifier les résultats du dry-run
- [ ] Exécuter la migration réelle
  ```bash
  node backend/scripts/migrateUsersToFreePlan.js
  ```
- [ ] Vérifier les résultats dans MongoDB
- [ ] Notifier les utilisateurs (optionnel)

---

## 📋 Phase 5: Tests

### Tests Frontend
- [ ] Accéder à `/pricing`
- [ ] Vérifier l'affichage des 4 plans
- [ ] Tester le toggle monthly/yearly
- [ ] Vérifier les prix affichés

### Tests Stripe
- [ ] Tester un upgrade avec Stripe
- [ ] Utiliser la carte de test: `4242 4242 4242 4242`
- [ ] Vérifier la redirection vers Stripe Checkout
- [ ] Compléter le paiement
- [ ] Vérifier le retour sur `/pricing?success=true`
- [ ] Vérifier que le plan a été mis à jour

### Tests PayPal
- [ ] Tester un upgrade avec PayPal
- [ ] Vérifier la redirection vers PayPal
- [ ] Compléter le paiement (Sandbox)
- [ ] Vérifier le retour
- [ ] Vérifier que le plan a été mis à jour

### Tests Webhooks
- [ ] Installer Stripe CLI
- [ ] Tester les webhooks en local
- [ ] Tester les webhooks en production
- [ ] Vérifier les logs dans Render

### Tests Limitations
- [ ] Tester l'upload avec un fichier > 100 MB (FREE)
- [ ] Vérifier l'erreur de taille max
- [ ] Tester le bandwidth limit (FREE)
- [ ] Vérifier l'erreur de bandwidth

---

## 📋 Phase 6: Vérification Post-Déploiement

- [ ] Vérifier les logs backend (pas d'erreurs)
- [ ] Vérifier les logs frontend (pas d'erreurs)
- [ ] Vérifier MongoDB (plans corrects)
- [ ] Tester avec plusieurs utilisateurs
- [ ] Vérifier les métriques Stripe Dashboard
- [ ] Vérifier les métriques PayPal Dashboard

---

## 📋 Phase 7: Production (Quand Prêt)

- [ ] Passer Stripe en mode Live
  - [ ] Récupérer les clés Live
  - [ ] Mettre à jour `STRIPE_SECRET_KEY` (sk_live_...)
  - [ ] Créer les Products Live
  - [ ] Mettre à jour les Price IDs
- [ ] Passer PayPal en mode Live
  - [ ] Créer une application Live
  - [ ] Mettre à jour les credentials
  - [ ] Mettre à jour `PAYPAL_ENVIRONMENT=production`
- [ ] Redéployer avec les nouvelles variables
- [ ] Tester avec de vrais paiements (petits montants)
- [ ] Monitorer les transactions

---

## 🚨 Points d'Attention

### Sécurité
- [ ] ✅ Ne jamais commiter les clés secrètes
- [ ] ✅ Utiliser uniquement les variables d'environnement
- [ ] ✅ Activer 2FA sur Stripe/PayPal
- [ ] ✅ Limiter l'accès au Dashboard Stripe/PayPal

### Monitoring
- [ ] ✅ Configurer des alertes pour les erreurs
- [ ] ✅ Monitorer les taux de conversion
- [ ] ✅ Monitorer les erreurs de paiement
- [ ] ✅ Monitorer les webhooks échoués

### Support
- [ ] ✅ Préparer une FAQ pour les utilisateurs
- [ ] ✅ Préparer des réponses aux questions courantes
- [ ] ✅ Documenter le processus d'upgrade

---

## 📊 Métriques à Suivre

- Taux de conversion FREE → PLUS
- Taux de conversion PLUS → PRO
- Taux de rétention PRO
- Churn FREE
- ARPU (Average Revenue Per User)
- Taux d'erreur des webhooks
- Temps de réponse des paiements

---

## ✅ Validation Finale

- [ ] Tous les tests passent
- [ ] Aucune erreur dans les logs
- [ ] Les webhooks fonctionnent
- [ ] Les limitations sont appliquées
- [ ] Les utilisateurs peuvent upgrader
- [ ] La migration est terminée
- [ ] La documentation est à jour

---

**Une fois toutes les cases cochées, votre système de pricing est prêt pour la production ! 🎉**

