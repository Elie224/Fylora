# 🔧 Résolution Problème : Téléphone Android Non Détecté

## ❌ Problème Actuel

Flutter ne détecte pas votre téléphone Android. Seuls Chrome et Edge sont disponibles.

## ✅ Solutions Étape par Étape

### Solution 1 : Vérifier la Connexion USB

1. **Débranchez et rebranchez** le câble USB
2. Sur votre téléphone, vérifiez qu'une notification apparaît
3. Acceptez "Autoriser le débogage USB"
4. Cochez "Toujours autoriser depuis cet ordinateur"

### Solution 2 : Vérifier le Mode Développeur

1. Sur votre téléphone : **Paramètres** > **Options pour les développeurs**
2. Vérifiez que **"Débogage USB"** est bien activé
3. Si l'option n'existe pas, activez le mode développeur :
   - Paramètres > À propos du téléphone
   - Appuyez 7 fois sur "Numéro de build"

### Solution 3 : Vérifier les Drivers USB

1. Ouvrez **Gestionnaire de périphériques** (Windows + X > Gestionnaire de périphériques)
2. Cherchez votre téléphone sous :
   - **"Périphériques Android"**
   - **"Autres périphériques"** (avec un point d'exclamation)
3. Si vous voyez un point d'exclamation :
   - Clic droit > **Mettre à jour le pilote**
   - Ou téléchargez les drivers depuis le site du fabricant (Samsung, Xiaomi, etc.)

### Solution 4 : Installer les Drivers USB Android

**Pour Samsung** :
- Téléchargez "Samsung USB Driver" depuis le site Samsung

**Pour Xiaomi** :
- Téléchargez "Mi USB Driver" depuis le site Xiaomi

**Pour autres marques** :
- Téléchargez les drivers depuis le site du fabricant
- Ou utilisez "Universal ADB Driver"

### Solution 5 : Vérifier ADB Manuellement

Dans PowerShell :

```powershell
# Vérifier si ADB détecte le téléphone
adb devices
```

**Si vous voyez "unauthorized"** :
- Sur votre téléphone, acceptez la notification "Autoriser le débogage USB"

**Si vous voyez "device"** :
- Le téléphone est connecté mais Flutter ne le détecte pas
- Essayez : `flutter devices`

**Si rien n'apparaît** :
- Le téléphone n'est pas détecté par ADB
- Vérifiez les drivers USB

### Solution 6 : Réinitialiser ADB

```powershell
# Arrêter le serveur ADB
adb kill-server

# Redémarrer le serveur ADB
adb start-server

# Vérifier les appareils
adb devices
```

### Solution 7 : Vérifier le Mode de Transfert USB

Sur votre téléphone, quand vous connectez le câble USB :
1. Une notification apparaît : "Charger cet appareil via USB"
2. **Appuyez sur la notification**
3. Sélectionnez **"Transfert de fichiers"** ou **"MTP"**
4. Ne sélectionnez PAS "Chargement uniquement"

### Solution 8 : Essayer un Autre Câble USB

Parfois le problème vient du câble :
- Utilisez un câble USB de qualité
- Évitez les câbles de charge uniquement
- Essayez un autre câble si possible

---

## 🧪 Test de Connexion

Après avoir suivi les solutions ci-dessus :

```powershell
# 1. Vérifier ADB
adb devices

# 2. Si le téléphone apparaît, vérifier Flutter
flutter devices

# 3. Si Flutter détecte le téléphone, lancer l'application
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

---

## 📱 Alternative : Utiliser un Émulateur Android

Si vous ne pouvez pas connecter votre téléphone, vous pouvez utiliser un émulateur :

```powershell
# Lister les émulateurs disponibles
flutter emulators

# Lancer un émulateur
flutter emulators --launch <nom_emulateur>

# Puis lancer l'application
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

---

## ✅ Checklist de Vérification

- [ ] Mode développeur activé (7 clics sur "Numéro de build")
- [ ] Débogage USB activé dans Options développeur
- [ ] Téléphone connecté via USB
- [ ] Notification "Autoriser le débogage USB" acceptée
- [ ] Mode de transfert USB = "Transfert de fichiers" (pas "Chargement uniquement")
- [ ] Drivers USB installés (vérifier dans Gestionnaire de périphériques)
- [ ] `adb devices` montre le téléphone
- [ ] `flutter devices` montre le téléphone

---

**Suivez ces étapes dans l'ordre et votre téléphone devrait être détecté ! 🔌**


