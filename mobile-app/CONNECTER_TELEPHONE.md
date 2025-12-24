# 📱 Guide : Connecter votre Téléphone Android

## 🔍 Problème Actuel

Votre téléphone Android n'est pas détecté par Flutter. Voici comment le résoudre.

---

## ✅ Solution 1 : Via Android Studio (Recommandé)

### Étape 1 : Ouvrir Android Studio

1. Ouvrez **Android Studio**
2. Allez dans **Tools** > **Device Manager**
3. Connectez votre téléphone via USB

### Étape 2 : Vérifier la Connexion

Dans Android Studio Device Manager :
- Si votre téléphone apparaît, il est connecté ✅
- Si vous voyez "Unauthorized", acceptez la notification sur le téléphone

### Étape 3 : Lancer depuis Android Studio

1. Ouvrez le projet Flutter dans Android Studio
2. Sélectionnez votre téléphone dans la liste des appareils
3. Cliquez sur le bouton **Run** (▶️)

---

## ✅ Solution 2 : Configurer ADB dans le PATH

### Trouver le Chemin ADB

ADB se trouve généralement dans :
```
C:\Users\<VotreNom>\AppData\Local\Android\Sdk\platform-tools
```

### Ajouter au PATH Temporairement

Dans PowerShell :

```powershell
# Remplacer <VotreNom> par votre nom d'utilisateur
$env:Path += ";C:\Users\PC\AppData\Local\Android\Sdk\platform-tools"

# Vérifier
adb devices
```

### Ajouter au PATH Permanemment

1. Windows + R > `sysdm.cpl` > Onglet **Avancé**
2. Cliquez sur **Variables d'environnement**
3. Dans **Variables système**, trouvez **Path**
4. Cliquez sur **Modifier** > **Nouveau**
5. Ajoutez : `C:\Users\PC\AppData\Local\Android\Sdk\platform-tools`
6. Cliquez sur **OK** partout
7. **Redémarrez PowerShell**

---

## ✅ Solution 3 : Utiliser Flutter Directement

Flutter devrait avoir accès à ADB via le SDK. Essayez :

```powershell
# Nettoyer le cache Flutter
flutter clean

# Vérifier les appareils
flutter devices

# Si le téléphone apparaît maintenant, lancer
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

---

## 🔌 Vérifications sur le Téléphone

### 1. Mode Développeur Activé ?

- Paramètres > À propos du téléphone
- Appuyez 7 fois sur "Numéro de build"
- Message : "Vous êtes maintenant développeur"

### 2. Débogage USB Activé ?

- Paramètres > Options pour les développeurs
- **"Débogage USB"** doit être activé

### 3. Autorisation USB Acceptée ?

- Connectez le téléphone via USB
- Une notification apparaît : "Autoriser le débogage USB ?"
- **Cochez "Toujours autoriser depuis cet ordinateur"**
- Cliquez sur **Autoriser**

### 4. Mode de Transfert USB Correct ?

- Quand vous connectez le câble, une notification apparaît
- Appuyez sur la notification
- Sélectionnez **"Transfert de fichiers"** ou **"MTP"**
- **NE PAS** sélectionner "Chargement uniquement"

---

## 🧪 Test de Connexion

Après avoir suivi les étapes ci-dessus :

```powershell
# Méthode 1 : Via le chemin complet ADB
& "C:\Users\PC\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices

# Méthode 2 : Via Flutter
flutter devices
```

**Résultat attendu** :
```
SM-G950F (mobile) • R58M30ABC123 • android-arm64 • Android 11
```

---

## 🚀 Une Fois le Téléphone Détecté

```powershell
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

---

## 📱 Alternative : Générer un APK

Si vous avez des difficultés avec la connexion USB, générez un APK :

```powershell
flutter build apk --release --dart-define=API_URL=https://fylora-1.onrender.com
```

L'APK sera dans : `build/app/outputs/flutter-apk/app-release.apk`

Ensuite :
1. Transférez l'APK sur votre téléphone (email, WhatsApp, cloud)
2. Ouvrez le fichier APK sur votre téléphone
3. Acceptez l'installation depuis des sources inconnues
4. Installez l'application

---

**Suivez ces étapes et votre téléphone devrait être détecté ! 🔌**




