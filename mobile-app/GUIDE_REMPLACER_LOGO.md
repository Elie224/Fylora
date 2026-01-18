# 🎨 Guide Complet : Remplacer le Logo Flutter par Fylora

## ✅ Configuration terminée

Les fichiers suivants ont été configurés :
- ✅ `pubspec.yaml` : Configuration `flutter_launcher_icons` ajoutée
- ✅ `AndroidManifest.xml` : Nom de l'app changé de "fylora_mobile" à "Fylora"

## 📋 Étapes pour remplacer le logo

### Option 1 : Utiliser le script PowerShell (Recommandé si ImageMagick est installé)

```powershell
cd mobile-app
.\generer-icone-fylora.ps1
```

**Prérequis** : ImageMagick installé (https://imagemagick.org/script/download.php)

Le script génère automatiquement :
- `assets/icon/fylora_icon.png` (1024x1024, fond bleu avec "F")
- `assets/icon/fylora_icon_foreground.png` (1024x1024, transparent avec "F")

### Option 2 : Créer l'icône manuellement

1. **Créer l'icône principale** (`assets/icon/fylora_icon.png`) :
   - Taille : 1024x1024 px
   - Fond : Bleu #2196F3 en cercle
   - Texte : "F" ou "Fylora" en blanc, centré
   - Format : PNG

2. **Créer l'icône foreground** (`assets/icon/fylora_icon_foreground.png`) :
   - Taille : 1024x1024 px
   - Fond : Transparent
   - Texte : "F" en blanc, centré
   - Format : PNG avec transparence

**Outils recommandés** :
- **Figma** (en ligne) : https://www.figma.com
- **Canva** (en ligne) : https://www.canva.com
- **Paint.NET** (Windows, gratuit) : https://www.getpaint.net/
- **GIMP** (multi-plateforme, gratuit) : https://www.gimp.org/

### Option 3 : Utiliser l'icône web existante

Si vous avez déjà une icône dans `web/icons/` :
```powershell
# Copier et redimensionner
Copy-Item "web\icons\Icon-512.png" "assets\icon\fylora_icon.png"
# Redimensionner à 1024x1024 avec un outil d'image
```

## 🚀 Générer toutes les tailles Android

Une fois les icônes créées, générez automatiquement toutes les tailles :

```powershell
cd mobile-app
flutter pub get
flutter pub run flutter_launcher_icons
```

Cette commande génère automatiquement :
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

## 📱 Rebuild l'APK

Après génération des icônes :

```powershell
flutter clean
flutter build apk --release --dart-define=API_URL=https://fylora-1.onrender.com
```

Ou utilisez le script existant :
```powershell
.\build-apk-production.ps1
```

## ⚠️ Important

1. **Désinstallez l'ancienne app** sur votre téléphone avant d'installer le nouvel APK
   - Sinon l'ancienne icône peut rester en cache

2. **Vérifiez les fichiers** :
   - `assets/icon/fylora_icon.png` doit exister
   - `assets/icon/fylora_icon_foreground.png` doit exister

3. **Nom de l'app** : L'application s'appelle maintenant "Fylora" au lieu de "fylora_mobile"

## 🎨 Design recommandé

**Simple et professionnel :**
```
┌─────────────┐
│             │
│   ┌───┐     │  Fond circulaire bleu (#2196F3)
│   │ F │     │  Lettre "F" blanche, police Roboto Bold
│   └───┘     │  Taille du texte : ~60% de l'icône
│             │
└─────────────┘
```

**Alternative :**
- Fond dégradé bleu (#2196F3 → #1976D2)
- Icône nuage ☁️ stylisée en blanc
- Texte "Fylora" en bas (optionnel)

## 📚 Documentation

- `CREER_ICONE_FYLORA.md` : Guide détaillé pour créer l'icône
- `REMPLACER_LOGO_FLUTTER.md` : Documentation technique
- `generer-icone-fylora.ps1` : Script automatique (nécessite ImageMagick)

## ✅ Checklist

- [ ] Icônes créées (`fylora_icon.png` et `fylora_icon_foreground.png`)
- [ ] `flutter pub get` exécuté
- [ ] `flutter pub run flutter_launcher_icons` exécuté
- [ ] APK rebuild avec le nouveau logo
- [ ] Ancienne app désinstallée du téléphone
- [ ] Nouvelle app installée et logo Fylora visible ✅

---

**Une fois terminé, le logo Flutter ne sera plus visible dans l'application !** 🎉
