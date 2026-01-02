# 🚀 Tester l'Application MAINTENANT (Sans Outils Android)

**Vous pouvez tester l'application sur Chrome sans installer les outils Android !**

---

## ✅ Test Rapide sur Chrome

### Étape 1 : Aller dans mobile-app

```powershell
cd C:\Users\KOURO\OneDrive\Desktop\Fylora\mobile-app
```

### Étape 2 : Installer les dépendances

```powershell
flutter pub get
```

### Étape 3 : Lancer sur Chrome

```powershell
flutter run -d chrome --dart-define=API_URL=https://fylora-1.onrender.com
```

**L'application s'ouvrira automatiquement dans Chrome !**

---

## 🧪 Tests à Effectuer

Une fois l'application lancée dans Chrome :

### 1. Test de Connexion ✅
- Cliquer sur "Connexion"
- Entrer un email et mot de passe valides
- Vérifier que la connexion réussit
- Vérifier la redirection vers le dashboard

### 2. Test d'Inscription ✅
- Cliquer sur "Inscription"
- Créer un nouveau compte
- Vérifier que l'inscription réussit
- Vérifier la redirection vers le dashboard

### 3. Test Authentification Google ✅
- Cliquer sur "Continuer avec Google"
- Sélectionner un compte Google
- Vérifier que la connexion réussit
- Vérifier la redirection vers le dashboard

### 4. Test Navigation ✅
- Vérifier que le dashboard s'affiche
- Naviguer vers "Fichiers"
- Naviguer vers "Notes"
- Naviguer vers "Recherche"
- Naviguer vers "Paramètres"

### 5. Test Déconnexion ✅
- Aller dans "Paramètres"
- Cliquer sur "Déconnexion"
- Vérifier la redirection vers l'écran de connexion

---

## 📊 Si Tous les Tests Passent

✅ **L'application fonctionne correctement !**

**Prochaines étapes** :
1. Suivre le **GUIDE_TEST_COMPLET.md** pour tester toutes les fonctionnalités
2. Installer les outils Android (si vous voulez tester sur un appareil)
3. Générer l'APK une fois tous les tests passés

---

## ⚠️ Limitations du Test sur Chrome

- ⚠️ Certaines fonctionnalités mobiles ne seront pas disponibles (caméra, fichiers locaux, etc.)
- ⚠️ Mais vous pouvez tester :
  - ✅ Authentification (email, Google)
  - ✅ Navigation
  - ✅ Interface utilisateur
  - ✅ Gestion des fichiers (upload, téléchargement)
  - ✅ Notes
  - ✅ Recherche
  - ✅ Partage

---

## 🔧 Si Vous Voulez Tester sur Android Plus Tard

Consultez **INSTALLATION_ANDROID_TOOLS.md** pour installer les outils Android nécessaires.

---

**Lancez l'application sur Chrome maintenant et testez les fonctionnalités !** 🚀

