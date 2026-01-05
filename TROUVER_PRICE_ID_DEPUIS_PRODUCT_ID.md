# 🔍 Trouver le Price ID depuis le Product ID

## 📋 Vous avez: Product ID
```
prod_TjktDJNwddaRhi
```

C'est le **Product ID**, mais nous avons besoin du **Price ID** (qui commence par `price_...`).

---

## 🎯 Comment Trouver le Price ID

### Méthode 1: Depuis le Dashboard Stripe

1. **Dans Stripe Dashboard:**
   - Allez dans **"Catalogue de produits"** (menu de gauche)
   - **Cherchez votre produit** avec l'ID `prod_TjktDJNwddaRhi`
   - **Cliquez dessus**

2. **Sur la page du produit:**
   - Faites défiler jusqu'à la section **"Tarifs"** ou **"Pricing"**
   - Vous verrez le **Price ID** affiché là
   - Il commence par `price_...`

### Méthode 2: Via l'URL Directe

1. **Dans votre navigateur**, allez sur:
   ```
   https://dashboard.stripe.com/test/products/prod_TjktDJNwddaRhi
   ```

2. **Sur cette page**, cherchez la section **"Tarifs"**
3. **Le Price ID** est affiché dans cette section

---

## 📋 Ce que Vous Devriez Voir

Sur la page du produit, vous devriez voir quelque chose comme:

```
┌─────────────────────────────────┐
│  Fylora Plus - Monthly          │
│  ID: prod_TjktDJNwddaRhi        │
├─────────────────────────────────┤
│  Description: ...              │
│                                 │
│  ┌─ Tarifs ─────────────────┐  │
│  │                          │  │
│  │  Prix récurrent          │  │
│  │  4,99 € / mois           │  │
│  │                          │  │
│  │  price_1ABC123def456...  │  │ ← C'EST ÇA!
│  │  [Icône de copie 📋]     │  │
│  │                          │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

---

## ⚠️ Important

- **Product ID** (`prod_...`) = Le produit lui-même
- **Price ID** (`price_...`) = Le tarif/prix du produit ← **C'EST CE QU'IL NOUS FAUT!**

Pour la configuration dans Render, nous avons besoin du **Price ID**, pas du Product ID.

---

## ✅ Une Fois que Vous Avez le Price ID

Copiez-le et notez-le comme ceci:

```
STRIPE_PRICE_PLUS_MONTHLY = price_xxxxxxxxxxxxx
```

(Remplacez `xxxxxxxxxxxxx` par votre vrai Price ID)

---

## 🆘 Si Vous Ne Voyez Toujours Pas le Price ID

1. **Vérifiez que le produit a bien un tarif "Récurrent"**
   - Si c'est "Ponctuel", il faut le modifier
   - Cliquez sur "Modifier" et changez en "Récurrent"

2. **Vérifiez que le tarif est bien configuré**
   - Le montant doit être défini
   - La période doit être définie (Mensuel ou Annuel)

3. **Essayez de créer un nouveau tarif**
   - Sur la page du produit
   - Cliquez sur "Ajouter un tarif" ou "Add pricing"
   - Configurez-le en "Récurrent"
   - Le Price ID sera généré automatiquement

---

**Le Price ID est essentiel pour la configuration ! Trouvez-le sur la page du produit. 🎯**

