# 📱 Guide de Build APK Production - Fylora Mobile

## 🎯 Vue d'ensemble

Ce guide vous permet de générer un APK Android pour l'application Fylora Mobile en mode production, connecté au backend Render.

---

## ✅ Prérequis

1. **Flutter SDK installé** (version 3.0.0 ou supérieure)
   - Vérifier: `flutter doctor`
   - Si non installé: https://flutter.dev/docs/get-started/install

2. **Android SDK installé**
   - Vérifier dans `flutter doctor`
   - Acceptez les licences: `flutter doctor --android-licenses`

3. **Variables d'environnement**
   - L'URL de l'API est configurée via `--dart-define=API_URL=...`
   - Par défaut: `https://fylora-1.onrender.com`

---

## 🚀 Méthode 1 : Script Automatique (Recommandé)

### Étape 1 : Exécuter le script

```powershell
cd C:\Users\KOURO\OneDrive\Desktop\Fylora\mobile-app
.\build-apk-production.ps1
```

### Étape 2 : Vérifier le résultat

L'APK sera généré à :
```
mobile-app\build\app\outputs\flutter-apk\app-release.apk
```

### Étape 3 : Personnaliser l'URL de l'API (optionnel)

Si vous voulez utiliser une autre URL :

```powershell
.\build-apk-production.ps1 -ApiUrl "https://votre-backend.onrender.com"
```

---

## 🛠️ Méthode 2 : Commandes Manuelles

### Étape 1 : Nettoyer le projet

```powershell
cd C:\Users\KOURO\OneDrive\Desktop\Fylora\mobile-app
flutter clean
```

### Étape 2 : Installer les dépendances

```powershell
flutter pub get
```

### Étape 3 : Build l'APK

```powershell
flutter build apk --release --dart-define=API_URL=https://fylora-1.onrender.com
```

### Étape 4 : Vérifier l'APK

L'APK sera créé à :
```
build\app\outputs\flutter-apk\app-release.apk
```

---

## 📋 Configuration actuelle

- **Application ID**: `com.example.fylora_mobile`
- **Version**: `1.0.0+1` (définie dans `pubspec.yaml`)
- **API URL par défaut**: `https://fylora-1.onrender.com`
- **Signing**: Debug keys (pour test, pas pour Google Play)

---

## 🔧 Personnaliser la configuration

### Changer l'Application ID

Éditer `mobile-app/android/app/build.gradle.kts` :

```kotlin
defaultConfig {
    applicationId = "com.fylora.app" // Changez ici
    // ...
}
```

### Changer la version

Éditer `mobile-app/pubspec.yaml` :

```yaml
version: 1.0.1+2  # version+versionCode
```

### Changer le nom de l'application

Éditer `mobile-app/android/app/src/main/AndroidManifest.xml` :

```xml
<application
    android:label="Fylora"  <!-- Changez ici -->
    ...
>
```

---

## 📦 Installation de l'APK

### Sur téléphone Android

1. **Transférer l'APK** sur votre téléphone (USB, email, Google Drive, etc.)
2. **Activer les sources inconnues** :
   - Paramètres → Sécurité → Activer "Sources inconnues"
3. **Ouvrir le fichier APK** depuis l'application Fichiers
4. **Installer** l'application

### Via ADB (si téléphone connecté en USB)

```powershell
adb install -r build\app\outputs\flutter-apk\app-release.apk
```

---

## 🐛 Dépannage

### Erreur: "Flutter n'est pas reconnu"

```powershell
# Ajouter Flutter au PATH
$env:Path += ";C:\path\to\flutter\bin"
```

### Erreur: "Android SDK non trouvé"

```powershell
flutter doctor --android-licenses
# Accepter toutes les licences
```

### Erreur: "Gradle build failed"

```powershell
cd android
.\gradlew clean
cd ..
flutter clean
flutter pub get
flutter build apk --release
```

### L'APK ne se connecte pas au backend

Vérifier que l'URL de l'API est correcte :

```powershell
# Rebuild avec la bonne URL
flutter build apk --release --dart-define=API_URL=https://fylora-1.onrender.com
```

---

## 📊 Informations sur l'APK

Une fois généré, l'APK contient :

- ✅ Application Flutter compilée
- ✅ Configuration API pointant vers Render
- ✅ Permissions réseau (INTERNET, ACCESS_NETWORK_STATE)
- ✅ Configuration OAuth pour Google
- ✅ Toutes les dépendances natives

**Taille estimée**: ~25-30 MB

---

## 🔒 Note sur le signing (Production)

**Actuellement, l'APK utilise des clés de debug.**

Pour publier sur Google Play Store :

1. **Générer une clé de release** :
   ```powershell
   keytool -genkey -v -keystore fylora-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias fylora
   ```

2. **Configurer le signing** dans `android/app/build.gradle.kts`

3. **Build avec la clé de release**

**⚠️ Important**: Les clés de debug ne permettent PAS de publier sur Google Play.

---

## ✅ Checklist finale

Avant de distribuer l'APK :

- [ ] Flutter doctor sans erreurs critiques
- [ ] APK généré avec succès
- [ ] Taille de l'APK raisonnable (<50 MB)
- [ ] Test de connexion au backend réussi
- [ ] Test sur un appareil Android réel
- [ ] Toutes les fonctionnalités testées

---

## 📞 Support

En cas de problème :

1. Vérifier `flutter doctor`
2. Vérifier les logs : `flutter build apk --release --verbose`
3. Consulter la documentation Flutter : https://flutter.dev/docs/deployment/android

---

**🎉 Une fois l'APK généré, vous pouvez l'installer sur vos appareils Android !**
