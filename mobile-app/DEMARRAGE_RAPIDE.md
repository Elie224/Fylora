# 🚀 Démarrage Rapide - Test de l'Application Mobile

## ⚠️ Situation Actuelle

Vous êtes dans le dossier `mobile-app` (c'est correct !)  
**Problème** : Flutter n'est pas reconnu dans PowerShell

---

## 🔍 Étape 1 : Vérifier si Flutter est installé

Exécutez cette commande pour trouver Flutter sur votre système :

```powershell
# Chercher flutter.bat sur le disque C:
Get-ChildItem -Path C:\ -Filter flutter.bat -Recurse -ErrorAction SilentlyContinue | Select-Object -First 5 FullName
```

**Si Flutter est trouvé**, vous verrez quelque chose comme :
```
C:\src\flutter\bin\flutter.bat
C:\flutter\bin\flutter.bat
```

---

## ✅ Étape 2 : Ajouter Flutter au PATH (si installé)

**Si vous avez trouvé Flutter** (par exemple dans `C:\src\flutter\bin`) :

### Option A : Pour cette session seulement (temporaire)

```powershell
# Remplacez C:\src\flutter\bin par le chemin réel que vous avez trouvé
$env:PATH += ";C:\src\flutter\bin"

# Vérifier
flutter --version
```

### Option B : De manière permanente (recommandé)

```powershell
# Remplacez C:\src\flutter\bin par le chemin réel que vous avez trouvé
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", "User")

# Redémarrer PowerShell après cette commande
```

**Important** : Après avoir ajouté au PATH, **fermez et rouvrez PowerShell**.

---

## 📥 Étape 3 : Installer Flutter (si non installé)

**Si Flutter n'est pas installé** :

1. **Télécharger Flutter** :
   - Aller sur : https://docs.flutter.dev/get-started/install/windows
   - Télécharger le SDK Flutter pour Windows

2. **Extraire Flutter** :
   - Extraire dans `C:\src\flutter` (créer le dossier si nécessaire)
   - **Ne pas** extraire dans un dossier avec espaces ou caractères spéciaux

3. **Ajouter au PATH** :
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", "User")
   ```

4. **Redémarrer PowerShell**

5. **Vérifier** :
   ```powershell
   flutter doctor
   ```

---

## 🧪 Étape 4 : Tester l'Application (une fois Flutter reconnu)

**Vous êtes déjà dans le bon dossier (`mobile-app`)** !

### 4.1 Installer les dépendances

```powershell
flutter pub get
```

### 4.2 Vérifier les appareils disponibles

```powershell
flutter devices
```

**Vous devriez voir** :
- Windows (desktop)
- Chrome (web)
- Un émulateur Android (si configuré)
- Votre téléphone Android (si connecté via USB)

### 4.3 Lancer l'application

**Option A : Sur un appareil Android connecté**
```powershell
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

**Option B : Sur Chrome (pour test rapide)**
```powershell
flutter run -d chrome --dart-define=API_URL=https://fylora-1.onrender.com
```

**Option C : Sur un émulateur Android (si localhost)**
```powershell
flutter run --dart-define=API_URL=http://10.0.2.2:5001
```

---

## 📋 Checklist Avant les Tests

- [ ] Flutter installé et dans le PATH
- [ ] `flutter doctor` fonctionne sans erreurs critiques
- [ ] `flutter pub get` exécuté avec succès
- [ ] Au moins un appareil disponible (`flutter devices`)
- [ ] Backend accessible (Render ou local)

---

## 🐛 Dépannage Rapide

### Flutter toujours non reconnu après ajout au PATH

1. **Vérifier le PATH actuel** :
   ```powershell
   $env:PATH -split ';' | Select-String flutter
   ```

2. **Tester directement flutter.bat** :
   ```powershell
   # Remplacez par votre chemin
   & "C:\src\flutter\bin\flutter.bat" --version
   ```

3. **Si ça fonctionne, le problème est le PATH** :
   - Redémarrer PowerShell
   - Redémarrer l'ordinateur si nécessaire

### Erreur "Unable to locate Android SDK"

```powershell
flutter doctor --android-licenses
```

Suivez les instructions pour accepter les licences.

---

## 📚 Documents Utiles

- `GUIDE_TEST_COMPLET.md` - Guide de test détaillé
- `RESOLUTION_PROBLEME_FLUTTER.md` - Guide de résolution des problèmes
- `COMMANDES_TEST.ps1` - Script PowerShell pour les tests

---

## ✅ Commandes Essentielles (Une fois Flutter reconnu)

```powershell
# Vous êtes déjà dans mobile-app, donc :

# 1. Installer les dépendances
flutter pub get

# 2. Vérifier la configuration
flutter doctor

# 3. Voir les appareils
flutter devices

# 4. Lancer l'application
flutter run --dart-define=API_URL=https://fylora-1.onrender.com

# 5. Analyser le code
flutter analyze

# 6. Tester
flutter test
```

---

**Une fois Flutter reconnu, suivez le GUIDE_TEST_COMPLET.md pour tester toutes les fonctionnalités !** ✅

