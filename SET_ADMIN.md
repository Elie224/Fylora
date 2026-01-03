# Configuration de l'Administrateur

Ce guide explique comment définir `kouroumaelisee@gmail.com` comme administrateur de Fylora.

## Méthode 1 : Script PowerShell (Windows - Recommandé)

1. Ouvrez PowerShell dans le dossier `backend`
2. Exécutez :
```powershell
.\scripts\setAdmin.ps1
```

## Méthode 2 : Via npm (si Node.js est dans le PATH)

```bash
cd backend
npm run set-admin
```

## Méthode 3 : Directement avec Node.js

```bash
cd backend
node scripts/setAdmin.js
```

## Vérification

Après avoir exécuté le script, l'utilisateur `kouroumaelisee@gmail.com` pourra :

- ✅ Accéder à la page `/admin`
- ✅ Voir le lien "⚙️ Administration" dans le menu de navigation
- ✅ Accéder à toutes les routes API `/api/admin/*`
- ✅ Gérer les utilisateurs et voir les statistiques

## Important

⚠️ **L'utilisateur doit d'abord exister dans la base de données** (créé via l'interface d'inscription ou OAuth).

Si l'utilisateur n'existe pas, le script affichera :
```
❌ Utilisateur kouroumaelisee@gmail.com non trouvé
   Veuillez d'abord créer cet utilisateur via l'interface d'inscription.
```

## Protection de la page Admin

La page d'administration est protégée à plusieurs niveaux :

1. **Frontend** : `Admin.jsx` vérifie `user.is_admin` et redirige vers `/dashboard` si non admin
2. **Backend** : `adminMiddleware` protège toutes les routes `/api/admin/*`
3. **Navigation** : Le lien "Administration" n'apparaît que si `user.is_admin === true`

## Exécution sur Render (Production)

Sur Render, vous pouvez exécuter le script via la console SSH :

```bash
cd backend
node scripts/setAdmin.js
```

Ou ajoutez-le dans les scripts de déploiement si nécessaire.

