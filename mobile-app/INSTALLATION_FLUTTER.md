# 📥 Installation de Flutter - Guide Rapide

## 🎯 Objectif

Installer Flutter SDK sur Windows pour pouvoir tester et générer l'APK de l'application mobile Fylora.

---

## ✅ Prérequis

- Windows 10 ou supérieur
- PowerShell 5.0 ou supérieur
- Au moins 2 GB d'espace disque libre
- Connexion internet

---

## 📥 Méthode 1 : Installation Manuelle (Recommandée)

### Étape 1 : Télécharger Flutter SDK

1. **Aller sur le site officiel** :
   - URL : https://docs.flutter.dev/get-started/install/windows
   - Ou télécharger directement : https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.x.x-stable.zip

2. **Télécharger la dernière version stable**

### Étape 2 : Extraire Flutter

1. **Créer un dossier pour Flutter** :
   ```powershell
   # Créer le dossier (si nécessaire)
   New-Item -ItemType Directory -Force -Path "C:\src\flutter"
   ```

2. **Extraire le ZIP** :
   - Extraire le contenu du ZIP dans `C:\src\flutter`
   - **Important** : Le dossier final doit être `C:\src\flutter\bin\flutter.bat`
   - **Ne pas** extraire dans un dossier avec espaces (éviter `C:\Program Files\flutter`)

### Étape 3 : Ajouter Flutter au PATH

**Ouvrir PowerShell en tant qu'administrateur** et exécuter :

```powershell
# Ajouter Flutter au PATH utilisateur (recommandé)
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", "User")
```

**OU** ajouter manuellement :

1. Appuyer sur `Win + R`
2. Taper `sysdm.cpl` et appuyer sur Entrée
3. Onglet "Avancé" > "Variables d'environnement"
4. Sous "Variables utilisateur", sélectionner "Path" > "Modifier"
5. Cliquer sur "Nouveau"
6. Ajouter : `C:\src\flutter\bin`
7. Cliquer sur "OK" partout

### Étape 4 : Redémarrer PowerShell

**Fermer et rouvrir PowerShell** (obligatoire pour que le PATH soit mis à jour)

### Étape 5 : Vérifier l'installation

```powershell
flutter --version
```

Vous devriez voir :
```
Flutter 3.x.x • channel stable • ...
```

### Étape 6 : Vérifier la configuration

```powershell
flutter doctor
```

**Résoudre les problèmes signalés** (licences Android, etc.)

---

## 📥 Méthode 2 : Installation via Git (Alternative)

Si vous avez Git installé :

```powershell
# Créer le dossier
New-Item -ItemType Directory -Force -Path "C:\src"
cd C:\src

# Cloner Flutter
git clone https://github.com/flutter/flutter.git -b stable

# Ajouter au PATH
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", "User")

# Redémarrer PowerShell, puis :
flutter doctor
```

---

## 🔧 Configuration Android (Requis pour Android)

### Option A : Android Studio (Recommandé)

1. **Télécharger Android Studio** :
   - URL : https://developer.android.com/studio
   - Installer Android Studio

2. **Installer les outils Android** :
   - Ouvrir Android Studio
   - Aller dans "More Actions" > "SDK Manager"
   - Installer :
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device

3. **Accepter les licences** :
   ```powershell
   flutter doctor --android-licenses
   ```
   - Appuyer sur `y` pour chaque licence

### Option B : Android SDK Command Line Tools uniquement

1. **Télécharger Android SDK Command Line Tools** :
   - URL : https://developer.android.com/studio#command-tools

2. **Configurer les variables d'environnement** :
   ```powershell
   # ANDROID_HOME
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk", "User")
   
   # PATH
   $androidPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\tools"
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$androidPath", "User")
   ```

---

## ✅ Vérification Finale

Une fois Flutter installé, exécutez :

```powershell
# Vérifier Flutter
flutter --version

# Vérifier la configuration complète
flutter doctor

# Aller dans mobile-app
cd C:\Users\KOURO\OneDrive\Desktop\Fylora\mobile-app

# Installer les dépendances
flutter pub get

# Vérifier les appareils
flutter devices
```

---

## 🐛 Dépannage

### "flutter : command not found" après installation

1. **Vérifier que Flutter est dans le PATH** :
   ```powershell
   $env:PATH -split ';' | Select-String flutter
   ```

2. **Tester directement flutter.bat** :
   ```powershell
   & "C:\src\flutter\bin\flutter.bat" --version
   ```

3. **Si ça fonctionne, redémarrer PowerShell**

4. **Si ça ne fonctionne toujours pas, redémarrer l'ordinateur**

### "Unable to locate Android SDK"

```powershell
# Définir ANDROID_HOME
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk", "User")

# Redémarrer PowerShell
flutter doctor
```

### Erreurs de licences Android

```powershell
flutter doctor --android-licenses
# Appuyer sur 'y' pour chaque licence
```

---

## 📚 Ressources Utiles

- **Documentation officielle** : https://docs.flutter.dev/get-started/install/windows
- **Flutter GitHub** : https://github.com/flutter/flutter
- **Community** : https://flutter.dev/community

---

## ✅ Checklist d'Installation

- [ ] Flutter SDK téléchargé et extrait dans `C:\src\flutter`
- [ ] Flutter ajouté au PATH
- [ ] PowerShell redémarré
- [ ] `flutter --version` fonctionne
- [ ] `flutter doctor` montre au moins Android toolchain
- [ ] Licences Android acceptées
- [ ] `flutter pub get` fonctionne dans mobile-app

---

**Une fois Flutter installé, suivez DEMARRAGE_RAPIDE.md pour commencer les tests !** 🚀

