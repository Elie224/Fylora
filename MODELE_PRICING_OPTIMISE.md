# 💰 Modèle de Pricing Optimisé - Fylora

## 🎯 Objectifs

1. **Free généreux mais contrôlé** - Découverte & adoption
2. **Plus très attractif** - Plan de conversion (clé du succès)
3. **Pro rentable** - Power users & rentabilité
4. **Team B2B** - Rétention & entreprises

---

## 📊 Plans Détaillés

### 🟢 FREE — 100 Go

**Prix**: 0 $ / mois

**Stockage**: 100 Go

**Fonctionnalités**:
- ✅ Upload / téléchargement
- ✅ Dossiers
- ✅ Partage privé
- ✅ Prévisualisation simple
- ✅ Recherche basique
- ✅ Sécurité standard

**Limitations**:
- ❌ Débit plafonné (10 Go/mois)
- ❌ 1 version par fichier (pas de versions)
- ❌ Pas de partage public
- ❌ Pas d'OCR / IA
- ❌ Pas de sync offline
- ❌ Cold storage après 90 jours d'inactivité
- ❌ Suppression après 12 mois d'inactivité

**Taille max fichier**: 100 MB

**Fichiers par upload**: 10

---

### 🔵 PLUS — 500 Go

**Prix**: 4,99 $ / mois | 49 $ / an (17% d'économie)

**Stockage**: 500 Go

**Fonctionnalités**:
- ✅ Tout du plan FREE
- ✅ Débit élevé (100 Go/mois)
- ✅ Partage public limité (10 liens)
- ✅ 10 versions par fichier
- ✅ Recherche avancée (sans IA)
- ✅ Notifications
- ✅ Support email

**Limitations**:
- ❌ Pas d'OCR / IA
- ❌ Pas de sync offline
- ❌ Pas de teams

**Taille max fichier**: 1 GB

**Fichiers par upload**: 50

---

### 🟣 PRO — 1 To

**Prix**: 9,99 $ / mois | 99 $ / an (17% d'économie)

**Stockage**: 1 To

**Fonctionnalités**:
- ✅ Tout du plan PLUS
- ✅ Débit illimité
- ✅ Partage public illimité
- ✅ Versions illimitées
- ✅ OCR & recherche intelligente
- ✅ Sync offline
- ✅ Historique complet
- ✅ Support prioritaire

**Taille max fichier**: 10 GB

**Fichiers par upload**: 100

---

### 🟠 TEAM — 5 To

**Prix**: 24,99 $ / mois | 249 $ / an (17% d'économie)

**Stockage**: 5 To (partagé)

**Fonctionnalités**:
- ✅ Tout du plan PRO
- ✅ Espaces d'équipe
- ✅ Rôles & permissions
- ✅ Commentaires & annotations
- ✅ Journal d'activité
- ✅ Admin dashboard
- ✅ SLA

**Taille max fichier**: 10 GB

**Fichiers par upload**: 100

---

## 🔄 Upsell Naturel

```
FREE → PLUS → PRO → TEAM
```

**Progression logique**:
- FREE: Découverte
- PLUS: Besoin de plus d'espace ou de partage public
- PRO: Besoin d'IA, OCR, sync offline
- TEAM: Collaboration en équipe

---

## 💰 Économie

### Coûts par Plan (estimation)

- **FREE**: ~0,50 $ / mois (infrastructure)
- **PLUS**: ~1,50 $ / mois (500 Go S3)
- **PRO**: ~2,50 $ / mois (1 To S3)
- **TEAM**: ~5,00 $ / mois (5 To S3)

### Marges

- **FREE**: Perte contrôlée (marketing)
- **PLUS**: Marge ~70% (3,49 $ / mois)
- **PRO**: Marge ~75% (7,49 $ / mois)
- **TEAM**: Marge ~80% (19,99 $ / mois)

---

## 🛡️ Fair Use (Non Négociable)

1. **Quota strict en temps réel**
2. **Scan anti-abus**
3. **Détection d'upload massif automatisé**
4. **Cold storage après 90 jours** (FREE uniquement)
5. **Suppression après 12 mois d'inactivité** (FREE uniquement)

---

## ✅ Implémentation

### Backend

- ✅ `planService.js` - Gestion des plans et features
- ✅ `planMiddleware.js` - Vérification des limitations
- ✅ Routes `/api/plans` - Gestion des plans
- ✅ Modèle User avec champ `plan`

### Frontend

- ✅ Page `/pricing` - Affichage des plans
- ✅ Toggle monthly/yearly
- ✅ Comparaison des features
- ✅ CTA d'upgrade

### Prochaines Étapes

- ⏳ Intégration Stripe/PayPal
- ⏳ Webhooks de billing
- ⏳ Gestion des abonnements
- ⏳ Emails de notification

---

## 📈 Métriques de Succès

- **Taux de conversion FREE → PLUS**: Objectif 5%
- **Taux de conversion PLUS → PRO**: Objectif 15%
- **Taux de rétention PRO**: Objectif 90%
- **Churn FREE**: < 20% / mois
- **ARPU**: Objectif 8 $ / mois

---

**Le modèle est optimisé pour la conversion et la rentabilité ! 🚀**

