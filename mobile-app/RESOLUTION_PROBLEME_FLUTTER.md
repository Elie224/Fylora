# 🔧 Résolution du Problème Flutter Non Reconnu

## Problème
```
flutter : Le terme «flutter» n'est pas reconnu comme nom d'applet de commande...
```

Cela signifie que Flutter n'est pas dans le PATH de votre système.

---

## ✅ Solutions

### Solution 1 : Vérifier si Flutter est installé

**Vérifier si Flutter existe sur votre système** :

```powershell
# Chercher Flutter dans les emplacements communs
Test-Path "C:\src\flutter\bin\flutter.bat"
Test-Path "C:\flutter\bin\flutter.bat"
Test-Path "$env:LOCALAPPDATA\flutter\bin\flutter.bat"
```

### Solution 2 : Ajouter Flutter au PATH (si installé)

**Si Flutter est installé mais pas dans le PATH** :

1. **Trouver l'emplacement de Flutter** :
   ```powershell
   # Chercher flutter.bat
   Get-ChildItem -Path C:\ -Filter flutter.bat -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 FullName
   ```

2. **Ajouter Flutter au PATH pour cette session** :
   ```powershell
   # Remplacez C:\src\flutter\bin par votre chemin réel
   $env:PATH += ";C:\src\flutter\bin"
   ```

3. **Ajouter Flutter au PATH de manière permanente** :
   ```powershell
   # Remplacez C:\src\flutter\bin par votre chemin réel
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", "User")
   ```

4. **Redémarrer PowerShell** après avoir modifié le PATH

5. **Vérifier** :
   ```powershell
   flutter --version
   ```

### Solution 3 : Installer Flutter (si non installé)

**Si Flutter n'est pas installé** :

1. **Télécharger Flutter SDK** :
   - Aller sur : https://docs.flutter.dev/get-started/install/windows
   - Télécharger le SDK Flutter pour Windows

2. **Extraire Flutter** :
   - Extraire dans `C:\src\flutter` (ou un autre emplacement)
   - **Important** : Ne pas extraire dans un dossier avec des espaces ou des caractères spéciaux

3. **Ajouter Flutter au PATH** :
   ```powershell
   # Ajouter au PATH utilisateur
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", "User")
   ```

4. **Redémarrer PowerShell**

5. **Vérifier l'installation** :
   ```powershell
   flutter doctor
   ```

---

## 🚀 Après avoir résolu le problème

Une fois Flutter reconnu, vous pouvez :

```powershell
# 1. Aller dans le dossier mobile-app
cd mobile-app

# 2. Installer les dépendances
flutter pub get

# 3. Vérifier les appareils disponibles
flutter devices

# 4. Lancer l'application
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

---

## 📝 Vérification Rapide

**Commande pour vérifier si Flutter est maintenant reconnu** :

```powershell
flutter --version
```

**Si cela fonctionne, vous devriez voir** :
```
Flutter 3.x.x • channel stable • ...
```

---

## ⚠️ Notes Importantes

1. **Redémarrer PowerShell** : Après avoir modifié le PATH, vous devez redémarrer PowerShell pour que les changements prennent effet.

2. **Emplacement Flutter** : L'emplacement standard est `C:\src\flutter\bin`, mais il peut être ailleurs.

3. **Permissions** : Vous devez avoir les droits d'administration pour modifier le PATH système (mais pas pour le PATH utilisateur).

---

## 🔍 Dépannage Supplémentaire

**Si Flutter est toujours non reconnu après avoir ajouté au PATH** :

1. **Vérifier le PATH actuel** :
   ```powershell
   $env:PATH -split ';' | Select-String flutter
   ```

2. **Vérifier que flutter.bat existe** :
   ```powershell
   Test-Path "C:\src\flutter\bin\flutter.bat"
   ```

3. **Tester directement** :
   ```powershell
   & "C:\src\flutter\bin\flutter.bat" --version
   ```

4. **Si cela fonctionne, le problème est le PATH** :
   - Vérifiez que vous avez bien ajouté le bon chemin
   - Redémarrez PowerShell
   - Redémarrez votre ordinateur si nécessaire

---

**Une fois Flutter reconnu, vous pourrez continuer avec les tests !** ✅

