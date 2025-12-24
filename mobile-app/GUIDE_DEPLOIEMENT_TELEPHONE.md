# 📱 Guide Déploiement sur Téléphone Android

## ✅ État Actuel

- ✅ Flutter installé (3.38.5)
- ✅ Android SDK configuré
- ⚠️ Téléphone Android non détecté

---

## 🔌 Partie 1 : Connecter votre Téléphone Android

### Étape 1 : Activer le Mode Développeur

1. Sur votre téléphone Android, allez dans **Paramètres**
2. Allez dans **À propos du téléphone** (ou **À propos de l'appareil**)
3. Trouvez **Numéro de build** (ou **Numéro de version**)
4. **Appuyez 7 fois** sur "Numéro de build"
5. Vous verrez un message : "Vous êtes maintenant développeur !"

### Étape 2 : Activer le Débogage USB

1. Retournez dans **Paramètres**
2. Trouvez **Options pour les développeurs** (ou **Paramètres développeur**)
3. Activez **Débogage USB**
4. Acceptez l'avertissement de sécurité

### Étape 3 : Connecter le Téléphone

1. **Connectez votre téléphone à l'ordinateur via USB**
2. Sur votre téléphone, une notification apparaîtra : "Autoriser le débogage USB ?"
3. **Cochez "Toujours autoriser depuis cet ordinateur"**
4. Cliquez sur **Autoriser**

### Étape 4 : Vérifier la Connexion

Dans votre terminal PowerShell (vous êtes déjà dans `mobile-app`) :

```powershell
flutter devices
```

Vous devriez maintenant voir votre téléphone listé, par exemple :
```
SM-G950F (mobile) • R58M30ABC123 • android-arm64 • Android 11 (API 30)
```

---

## 🔧 Partie 2 : Configurer l'URL de l'API

L'application doit pointer vers votre backend Render.

### Option 1 : Modifier constants.dart (Déjà fait ✅)

Le fichier `lib/utils/constants.dart` a déjà été modifié pour pointer vers Render par défaut.

### Option 2 : Utiliser une Variable d'Environnement

Vous pouvez aussi compiler avec l'URL spécifiée :

```powershell
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

---

## 🚀 Partie 3 : Installer l'Application

### Méthode 1 : Installation Directe (Recommandée)

Une fois votre téléphone connecté et détecté :

```powershell
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

Cette commande va :
- ✅ Compiler l'application
- ✅ L'installer sur votre téléphone
- ✅ La lancer automatiquement

### Méthode 2 : Générer un APK

Si vous préférez générer un fichier APK à installer manuellement :

```powershell
# APK Debug (pour tests)
flutter build apk --dart-define=API_URL=https://fylora-1.onrender.com

# APK Release (optimisé pour production)
flutter build apk --release --dart-define=API_URL=https://fylora-1.onrender.com
```

L'APK sera dans : `build/app/outputs/flutter-apk/app-release.apk`

Ensuite :
1. Transférez l'APK sur votre téléphone (USB, email, cloud)
2. Ouvrez le fichier APK sur votre téléphone
3. Acceptez l'installation depuis des sources inconnues si demandé
4. Installez l'application

---

## 🐛 Résolution de Problèmes

### Le téléphone n'est pas détecté

**Solution 1 : Vérifier les Drivers USB**

1. Ouvrez **Gestionnaire de périphériques** (Windows + X > Gestionnaire de périphériques)
2. Cherchez votre téléphone sous "Périphériques Android" ou "Autres périphériques"
3. Si vous voyez un point d'exclamation, installez les drivers :
   - Clic droit > Mettre à jour le pilote
   - Ou téléchargez les drivers depuis le site du fabricant

**Solution 2 : Vérifier ADB**

```powershell
# Vérifier si ADB détecte le téléphone
adb devices
```

Si vous voyez "unauthorized", acceptez la notification sur votre téléphone.

**Solution 3 : Réessayer la Connexion**

1. Déconnectez et reconnectez le câble USB
2. Sur le téléphone, acceptez à nouveau "Autoriser le débogage USB"
3. Vérifiez : `flutter devices`

### Erreur "Waiting for another flutter command"

Un autre processus Flutter est en cours. Attendez qu'il se termine ou redémarrez le terminal.

### Erreur lors de la Compilation

```powershell
# Nettoyer le projet
flutter clean

# Réinstaller les dépendances
flutter pub get

# Réessayer
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

---

## 📋 Checklist Rapide

- [ ] Mode développeur activé sur le téléphone
- [ ] Débogage USB activé
- [ ] Téléphone connecté via USB
- [ ] Notification "Autoriser le débogage USB" acceptée
- [ ] `flutter devices` détecte le téléphone
- [ ] URL de l'API configurée (déjà fait ✅)
- [ ] Application compilée et installée

---

## 🎯 Commandes Essentielles

```powershell
# Vérifier les appareils connectés
flutter devices

# Installer et lancer l'application
flutter run --dart-define=API_URL=https://fylora-1.onrender.com

# Générer un APK
flutter build apk --release --dart-define=API_URL=https://fylora-1.onrender.com

# Voir les logs en temps réel
flutter logs

# Nettoyer le projet
flutter clean

# Réinstaller les dépendances
flutter pub get
```

---

## ✅ Une Fois Installé

1. Ouvrez l'application sur votre téléphone
2. Testez la connexion au backend Render
3. Essayez de vous connecter
4. Vérifiez que les fonctionnalités fonctionnent

---

**Prêt à déployer ! 🚀**




