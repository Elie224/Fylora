# 🔍 Où Trouver le Price ID dans Stripe

## 📋 Méthode 1: Après la Création du Produit

### Étape 1: Le Produit est Créé
Après avoir cliqué sur "Ajouter le produit", vous serez redirigé vers la page du produit.

### Étape 2: Trouver le Price ID
1. **Sur la page du produit**, vous verrez plusieurs sections
2. **Cherchez la section "Tarifs"** ou **"Pricing"**
3. Dans cette section, vous verrez:
   - Le montant (ex: 4,99 €)
   - La période (ex: Mensuel)
   - **Le Price ID** (commence par `price_...`)

### Étape 3: Copier le Price ID
- Le Price ID est généralement affiché comme: `price_1ABC123...`
- Cliquez dessus ou utilisez l'icône de copie à côté
- Copiez-le complètement

---

## 📋 Méthode 2: Depuis la Liste des Produits

### Si vous avez fermé la page du produit:

1. **Dans le menu de gauche**, cliquez sur **"Catalogue de produits"** (Product catalog)
2. **Cliquez sur le produit** que vous venez de créer (ex: "Fylora Plus - Monthly")
3. **Sur la page du produit**, cherchez la section **"Tarifs"**
4. **Le Price ID** est affiché là

---

## 📋 Méthode 3: Via l'API (Alternative)

Si vous ne trouvez toujours pas:

1. **Dans le menu de gauche**, cliquez sur **"Développeurs"** (Developers)
2. Cliquez sur **"API"** ou **"Logs"**
3. Vous pouvez voir les Price IDs dans les requêtes API

---

## 🎯 À Quoi Ressemble le Price ID?

Le Price ID ressemble à ceci:
```
price_1ABC123def456GHI789jkl012MNO345pqr678STU901vwx234YZA567bcd890
```

Il commence **TOUJOURS** par `price_` suivi de lettres et chiffres.

---

## ⚠️ Important

### Si vous ne voyez PAS de Price ID:

1. **Vérifiez que vous avez bien sélectionné "Récurrent"** (pas "Ponctuel")
   - Les produits "Ponctuel" n'ont pas de Price ID de la même manière
   - Il faut absolument que ce soit "Récurrent"

2. **Vérifiez que le produit est bien créé**
   - Allez dans "Catalogue de produits"
   - Vérifiez que votre produit apparaît dans la liste

3. **Si le produit est "Ponctuel":**
   - Vous devez le modifier
   - Cliquez sur le produit
   - Modifiez le tarif pour le mettre en "Récurrent"

---

## 📸 Où Regarder Exactement

Sur la page du produit, le Price ID se trouve généralement:

```
┌─────────────────────────────────┐
│  Fylora Plus - Monthly          │
├─────────────────────────────────┤
│  Description: ...              │
│                                 │
│  ┌─ Tarifs ─────────────────┐  │
│  │                          │  │
│  │  4,99 € / mois           │  │
│  │  price_1ABC123...  [📋]  │  │ ← ICI!
│  │                          │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

---

## ✅ Checklist

- [ ] J'ai créé le produit avec "Récurrent" (pas "Ponctuel")
- [ ] Je suis sur la page du produit
- [ ] Je vois la section "Tarifs" ou "Pricing"
- [ ] Je vois un identifiant qui commence par `price_`
- [ ] Je l'ai copié

---

## 🆘 Si Vous Êtes Toujours Bloqué

1. **Prenez une capture d'écran** de la page du produit
2. **Vérifiez dans "Catalogue de produits"** que le produit existe
3. **Cliquez sur le produit** pour voir ses détails
4. **Cherchez la section "Tarifs"** en scrollant un peu

Le Price ID est **TOUJOURS** visible sur la page du produit, dans la section des tarifs.

---

**Le Price ID est essentiel pour la configuration ! Assurez-vous de le copier pour chaque produit. 🎯**

