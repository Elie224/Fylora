# 🚀 Déploiement Rapide sur Téléphone Android

## ✅ Prérequis Vérifiés

- ✅ Flutter installé (3.38.5)
- ✅ Android SDK configuré
- ✅ Dépendances installées (`flutter pub get` réussi)
- ✅ URL API configurée pour Render (`https://fylora-1.onrender.com`)

---

## 📱 Étapes pour Déployer

### 1. Connecter votre Téléphone

**Sur votre téléphone Android** :

1. **Activer le Mode Développeur** :
   - Paramètres > À propos du téléphone
   - Appuyez **7 fois** sur "Numéro de build"
   - Message : "Vous êtes maintenant développeur"

2. **Activer le Débogage USB** :
   - Paramètres > Options pour les développeurs
   - Activez **"Débogage USB"**

3. **Connecter le Téléphone** :
   - Connectez votre téléphone à l'ordinateur via USB
   - Sur le téléphone, acceptez "Autoriser le débogage USB"
   - Cochez "Toujours autoriser depuis cet ordinateur"

### 2. Vérifier la Connexion

Dans votre terminal PowerShell (vous êtes dans `mobile-app`) :

```powershell
flutter devices
```

Vous devriez voir votre téléphone listé, par exemple :
```
SM-G950F (mobile) • R58M30ABC123 • android-arm64 • Android 11
```

**Si le téléphone n'apparaît pas** :
- Vérifiez que le câble USB fonctionne
- Vérifiez que le débogage USB est activé
- Acceptez à nouveau la notification sur le téléphone
- Essayez : `adb devices` pour voir si ADB détecte le téléphone

### 3. Installer l'Application

Une fois le téléphone détecté, lancez :

```powershell
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

Cette commande va :
- ✅ Compiler l'application
- ✅ L'installer sur votre téléphone
- ✅ La lancer automatiquement

**Première compilation peut prendre 2-5 minutes** - soyez patient !

### 4. Tester l'Application

1. L'application devrait s'ouvrir automatiquement sur votre téléphone
2. Testez la connexion au backend Render
3. Essayez de vous connecter

---

## 🔄 Commandes Utiles

```powershell
# Vérifier les appareils connectés
flutter devices

# Installer et lancer l'application
flutter run --dart-define=API_URL=https://fylora-1.onrender.com

# Voir les logs en temps réel
flutter logs

# Nettoyer et réinstaller
flutter clean
flutter pub get
```

---

## 🐛 Problèmes Courants

### "No devices found"

1. Vérifiez que le téléphone est connecté et allumé
2. Vérifiez que le débogage USB est activé
3. Essayez de débrancher et rebrancher le câble USB
4. Acceptez à nouveau "Autoriser le débogage USB" sur le téléphone

### Erreur de compilation

```powershell
flutter clean
flutter pub get
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

### L'application ne se connecte pas au backend

1. Vérifiez que votre téléphone a accès à Internet
2. Vérifiez que le backend Render est accessible : `https://fylora-1.onrender.com/api/health`
3. Vérifiez les logs : `flutter logs`

---

## 📦 Alternative : Générer un APK

Si vous préférez installer manuellement :

```powershell
# Générer l'APK
flutter build apk --release --dart-define=API_URL=https://fylora-1.onrender.com

# L'APK sera dans : build/app/outputs/flutter-apk/app-release.apk
```

Ensuite :
1. Transférez l'APK sur votre téléphone
2. Ouvrez le fichier APK
3. Installez l'application

---

**Prêt à déployer ! 🚀**

Une fois votre téléphone connecté, lancez simplement :
```powershell
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

