# 🔧 Installation des Outils Android (cmdline-tools)

## Problème
```
Android sdkmanager not found. Update to the latest Android SDK and ensure that the
cmdline-tools are installed to resolve this.
```

---

## ✅ Solution : Installer les Command-Line Tools Android

### Option 1 : Installation Rapide via Android Studio (Recommandé)

**Avantages** :
- ✅ Installation complète et simple
- ✅ Interface graphique
- ✅ Gestion automatique des SDK

**Étapes** :

1. **Télécharger Android Studio** :
   - URL : https://developer.android.com/studio
   - Télécharger et installer Android Studio

2. **Installer les composants nécessaires** :
   - Ouvrir Android Studio
   - Aller dans "More Actions" > "SDK Manager"
   - Dans l'onglet "SDK Tools", cocher :
     - ✅ Android SDK Command-line Tools (latest)
     - ✅ Android SDK Build-Tools
     - ✅ Android SDK Platform-Tools
   - Cliquer sur "Apply" et installer

3. **Configurer les variables d'environnement** :

   ```powershell
   # Définir ANDROID_HOME (remplacez par votre chemin si différent)
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
   
   # Ajouter au PATH
   $androidPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\tools;$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin"
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$androidPath", "User")
   ```

4. **Redémarrer PowerShell**

5. **Vérifier** :
   ```powershell
   flutter doctor --android-licenses
   ```

---

### Option 2 : Installation Manuelle des Command-Line Tools (Sans Android Studio)

**Si vous ne voulez pas installer Android Studio complet** :

1. **Télécharger les Command-Line Tools** :
   - URL : https://developer.android.com/studio#command-tools
   - Télécharger "Command line tools only" pour Windows
   - Fichier : `commandlinetools-win-XXXXXX_latest.zip`

2. **Créer la structure de dossiers** :
   ```powershell
   # Créer le dossier SDK (si n'existe pas)
   $sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
   New-Item -ItemType Directory -Force -Path "$sdkPath\cmdline-tools"
   ```

3. **Extraire les outils** :
   - Extraire le ZIP dans `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\`
   - **Important** : Renommer le dossier extrait en `latest`
   - Structure finale : `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat`

4. **Configurer les variables d'environnement** :
   ```powershell
   # Définir ANDROID_HOME
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
   
   # Ajouter au PATH
   $androidPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\tools;$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin"
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$androidPath", "User")
   ```

5. **Installer les composants nécessaires** :
   ```powershell
   # Accepter les licences
   flutter doctor --android-licenses
   ```

---

## 🚀 Solution Rapide : Tester sur Chrome (Sans Android)

**Si vous voulez tester l'application MAINTENANT sans installer les outils Android** :

Vous pouvez tester l'application sur Chrome (web) sans avoir besoin des outils Android !

```powershell
# Aller dans mobile-app
cd C:\Users\KOURO\OneDrive\Desktop\Fylora\mobile-app

# Installer les dépendances
flutter pub get

# Lancer sur Chrome
flutter run -d chrome --dart-define=API_URL=https://fylora-1.onrender.com
```

**Avantages** :
- ✅ Pas besoin d'outils Android
- ✅ Test rapide de l'interface
- ✅ Test de l'authentification
- ✅ Test des fonctionnalités principales

**Limitations** :
- ⚠️ Certaines fonctionnalités mobiles ne seront pas disponibles (caméra, fichiers locaux, etc.)
- ⚠️ Mais vous pouvez tester l'authentification, la navigation, les fichiers, etc.

---

## 📋 Vérification Après Installation

Une fois les outils Android installés :

```powershell
# Vérifier la configuration
flutter doctor

# Accepter les licences
flutter doctor --android-licenses

# Vérifier à nouveau
flutter doctor
```

**Résultat attendu** :
```
[√] Android toolchain - develop for Android devices (Android SDK version XX.X.X)
```

---

## 🎯 Recommandation

**Pour tester rapidement** :
1. Utilisez Chrome pour tester maintenant : `flutter run -d chrome`
2. Installez les outils Android plus tard pour tester sur un appareil physique

**Pour tester sur Android** :
1. Installez Android Studio (Option 1 - plus simple)
2. Configurez les variables d'environnement
3. Acceptez les licences
4. Testez sur un appareil ou émulateur

---

## 📝 Notes

- **ANDROID_HOME** : Doit pointer vers le dossier SDK (généralement `%LOCALAPPDATA%\Android\Sdk`)
- **PATH** : Doit inclure `platform-tools`, `tools`, et `cmdline-tools\latest\bin`
- **Redémarrer PowerShell** : Obligatoire après modification des variables d'environnement

---

**Vous pouvez tester sur Chrome maintenant, ou installer les outils Android pour tester sur un appareil physique !** 🚀

