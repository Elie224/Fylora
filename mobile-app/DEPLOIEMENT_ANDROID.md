# 📱 Guide de Déploiement Android - Fylora Mobile

Ce guide vous explique comment déployer l'application Fylora sur votre téléphone Android.

## 📋 Prérequis

1. ✅ Android Studio installé (vous l'avez déjà)
2. ✅ Flutter SDK installé
3. ✅ Téléphone Android avec le mode développeur activé
4. ✅ Câble USB pour connecter le téléphone (ou connexion WiFi ADB)

---

## 🔧 Partie 1 : Configuration de l'URL de l'API

L'application doit pointer vers votre backend Render au lieu de localhost.

### Option 1 : Configuration via Variable d'Environnement (Recommandé)

Lors de la compilation, vous pouvez définir l'URL de l'API :

```bash
flutter build apk --dart-define=API_URL=https://fylora-1.onrender.com
```

### Option 2 : Modifier le fichier constants.dart

Modifiez `mobile-app/lib/utils/constants.dart` :

```dart
static const String apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://fylora-1.onrender.com', // Modifier ici
);
```

---

## 📱 Partie 2 : Activer le Mode Développeur sur votre Téléphone

1. Allez dans **Paramètres** > **À propos du téléphone**
2. Trouvez **Numéro de build** (ou **Numéro de version**)
3. Appuyez **7 fois** sur "Numéro de build"
4. Vous verrez un message "Vous êtes maintenant développeur"
5. Retournez dans **Paramètres** > **Options pour les développeurs**
6. Activez **Débogage USB**

---

## 🔌 Partie 3 : Connecter votre Téléphone

### Méthode 1 : USB (Recommandé)

1. Connectez votre téléphone à l'ordinateur via USB
2. Sur votre téléphone, acceptez la notification "Autoriser le débogage USB"
3. Cochez "Toujours autoriser depuis cet ordinateur"
4. Vérifiez la connexion :
   ```bash
   flutter devices
   ```
   Vous devriez voir votre téléphone listé

### Méthode 2 : WiFi ADB (Alternative)

Si vous préférez sans fil :

1. Connectez votre téléphone et votre ordinateur au même réseau WiFi
2. Dans Android Studio, allez dans **Tools** > **Device Manager**
3. Cliquez sur votre téléphone > **Pair using WiFi**

---

## 🏗️ Partie 4 : Compiler et Installer l'Application

### Option A : Installation Directe (Développement)

Pour tester rapidement :

```bash
cd mobile-app
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

Cette commande va :
- Compiler l'application
- L'installer sur votre téléphone
- La lancer automatiquement

### Option B : Générer un APK (Pour Installation Manuelle)

#### 1. Générer l'APK Debug

```bash
cd mobile-app
flutter build apk --dart-define=API_URL=https://fylora-1.onrender.com
```

L'APK sera généré dans : `mobile-app/build/app/outputs/flutter-apk/app-release.apk`

#### 2. Transférer l'APK sur votre téléphone

**Méthode USB** :
- Copiez `app-release.apk` sur votre téléphone
- Ouvrez le fichier sur votre téléphone
- Acceptez l'installation depuis des sources inconnues si demandé

**Méthode WiFi** :
- Envoyez l'APK par email, WhatsApp, ou cloud
- Téléchargez-le sur votre téléphone
- Installez-le

#### 3. Installer l'APK

1. Sur votre téléphone, ouvrez le fichier APK
2. Si vous voyez "Bloqué par Play Protect", cliquez sur "Installer quand même"
3. Acceptez les permissions demandées
4. L'application sera installée

---

## 🔐 Partie 5 : Permissions Android

L'application nécessite ces permissions (déjà configurées dans AndroidManifest.xml) :

- ✅ **Internet** : Pour se connecter au backend
- ✅ **Accès réseau** : Pour vérifier la connectivité
- ✅ **Stockage** : Pour télécharger/uploader des fichiers (demandé à l'exécution)

---

## 🧪 Partie 6 : Tester l'Application

### 1. Vérifier la Connexion au Backend

1. Ouvrez l'application sur votre téléphone
2. Essayez de vous connecter
3. Vérifiez que les requêtes API fonctionnent

### 2. Vérifier les Logs

Pour voir les logs en temps réel :

```bash
flutter logs
```

Ou dans Android Studio :
- **View** > **Tool Windows** > **Logcat**

---

## 🐛 Résolution de Problèmes

### L'application ne se connecte pas au backend

1. Vérifiez que l'URL de l'API est correcte dans `constants.dart`
2. Vérifiez que votre téléphone a accès à Internet
3. Vérifiez que le backend Render est accessible depuis votre navigateur
4. Vérifiez les logs : `flutter logs`

### Erreur "Unable to locate adb"

```bash
# Windows
set PATH=%PATH%;%LOCALAPPDATA%\Android\Sdk\platform-tools

# Puis vérifiez
adb devices
```

### Erreur "INSTALL_FAILED_INSUFFICIENT_STORAGE"

- Libérez de l'espace sur votre téléphone
- Ou installez sur un téléphone avec plus d'espace

### Erreur "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

- Désinstallez l'ancienne version de l'application
- Réinstallez la nouvelle version

### L'application se ferme immédiatement (Crash)

1. Vérifiez les logs : `flutter logs`
2. Vérifiez que toutes les dépendances sont installées :
   ```bash
   cd mobile-app
   flutter pub get
   ```

---

## 📦 Générer un APK Release (Pour Distribution)

Pour créer un APK optimisé pour la production :

```bash
cd mobile-app
flutter build apk --release --dart-define=API_URL=https://fylora-1.onrender.com
```

L'APK sera dans : `build/app/outputs/flutter-apk/app-release.apk`

**Taille approximative** : ~30-50 MB

---

## 🔄 Mise à Jour de l'Application

Pour mettre à jour l'application :

1. Recompilez avec la nouvelle version :
   ```bash
   flutter build apk --release --dart-define=API_URL=https://fylora-1.onrender.com
   ```
2. Installez le nouvel APK sur votre téléphone
3. L'ancienne version sera remplacée automatiquement

---

## 📝 Configuration Recommandée pour Production

### Modifier constants.dart pour Production

Créez un fichier de configuration séparé ou modifiez `constants.dart` :

```dart
class Constants {
  // URL de production
  static const String apiBaseUrl = 'https://fylora-1.onrender.com';
  
  // Ou utiliser une variable d'environnement
  static const String apiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://fylora-1.onrender.com',
  );
}
```

---

## 🚀 Commandes Rapides

### Compiler et Installer Directement
```bash
cd mobile-app
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

### Générer APK Debug
```bash
cd mobile-app
flutter build apk --dart-define=API_URL=https://fylora-1.onrender.com
```

### Générer APK Release
```bash
cd mobile-app
flutter build apk --release --dart-define=API_URL=https://fylora-1.onrender.com
```

### Voir les Logs
```bash
flutter logs
```

### Vérifier les Appareils Connectés
```bash
flutter devices
```

---

## ✅ Checklist de Déploiement

- [ ] Mode développeur activé sur le téléphone
- [ ] Débogage USB activé
- [ ] Téléphone connecté et détecté (`flutter devices`)
- [ ] URL de l'API configurée pour pointer vers Render
- [ ] Dépendances installées (`flutter pub get`)
- [ ] Application compilée et installée
- [ ] Connexion au backend testée
- [ ] Application fonctionnelle sur le téléphone

---

## 📚 Ressources

- [Documentation Flutter](https://flutter.dev/docs)
- [Guide Android Flutter](https://flutter.dev/docs/deployment/android)
- [ADB Documentation](https://developer.android.com/studio/command-line/adb)

---

**Bon déploiement ! 📱**


