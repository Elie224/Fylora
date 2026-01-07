# Guide : Quelles clés Supabase utiliser ?

## ⚠️ Important : Différence entre JWT Keys et API Keys

### ❌ JWT Keys (page actuelle)
- **Utilisation** : Pour signer et vérifier les tokens JWT d'authentification
- **Non nécessaire** pour Supabase Storage
- Cette page est pour la sécurité des tokens, pas pour les fichiers

### ✅ API Keys (ce dont vous avez besoin)
- **Utilisation** : Pour accéder aux services Supabase (Storage, Database, etc.)
- **Nécessaire** pour Supabase Storage
- C'est ce qu'il faut pour stocker les fichiers

## 📍 Où trouver les API Keys ?

1. **Dans le menu de gauche**, sous "API Keys" (pas "JWT Keys")
2. Ou allez directement dans **Settings** → **API**

## 🔑 Quelles clés utiliser ?

### Option 1 : Clés Legacy (recommandé pour débuter)

Dans **Settings** → **API**, section **"Legacy anon, service_role API keys"** :

- ✅ **service_role key** : Utilisez cette clé (pas `anon`)
  - Commence par `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - A tous les droits nécessaires pour gérer les fichiers
  - **⚠️ SECRÈTE** : Ne la partagez jamais publiquement

- ❌ **anon key** : Ne pas utiliser pour Storage
  - Permissions limitées
  - Ne fonctionnera pas pour upload/delete

### Option 2 : Nouvelles clés (si disponibles)

Dans **Settings** → **API**, section **"Publishable and secret API keys"** :

- ✅ **Secret key** : Utilisez cette clé
  - Commence par `sb_secret_...`
  - A tous les droits nécessaires

- ❌ **Publishable key** : Ne pas utiliser pour Storage
  - Permissions limitées

## 📝 Variables d'environnement à configurer

Sur Render, ajoutez :

```bash
SUPABASE_URL=https://vajplmdfwwczsksfngrs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici
SUPABASE_BUCKET=fylora-files
```

## 🎯 Résumé

1. **Quittez la page "JWT Keys"** (celle que vous voyez actuellement)
2. **Allez dans "Settings" → "API"** (ou "API Keys" dans le menu)
3. **Copiez la clé "service_role"** (legacy) ou **"Secret key"** (nouvelle)
4. **Configurez-la sur Render** dans les variables d'environnement

## ❓ Comment savoir si c'est la bonne clé ?

- ✅ **Bonne clé** : Commence par `eyJ...` (legacy) ou `sb_secret_...` (nouvelle)
- ❌ **Mauvaise clé** : Commence par `sb_publishable_...` ou est marquée "anon"

## 🔒 Sécurité

- La clé `service_role` ou `secret` a **TOUS les droits**
- Ne la partagez **JAMAIS** publiquement
- Ne la commitez **JAMAIS** dans Git
- Utilisez uniquement dans les variables d'environnement sur Render

