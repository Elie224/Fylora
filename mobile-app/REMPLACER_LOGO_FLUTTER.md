# 🔄 Remplacer le Logo Flutter par le Logo Fylora

## 📍 Emplacements actuels

Les icônes Flutter se trouvent dans :
```
mobile-app/android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png      (48x48 px)
├── mipmap-hdpi/ic_launcher.png      (72x72 px)
├── mipmap-xhdpi/ic_launcher.png     (96x96 px)
├── mipmap-xxhdpi/ic_launcher.png    (144x144 px)
└── mipmap-xxxhdpi/ic_launcher.png   (192x192 px)
```

## 🎨 Icônes Fylora disponibles

Les icônes Fylora sont disponibles dans :
```
mobile-app/web/icons/
├── Icon-192.png
├── Icon-512.png
└── Icon-maskable-192.png
```

## 🛠️ Solution : Générer les icônes avec Flutter Launcher Icons

### Option 1 : Utiliser flutter_launcher_icons (Recommandé)

1. **Ajouter la dépendance** dans `pubspec.yaml` :
```yaml
dev_dependencies:
  flutter_launcher_icons: ^0.13.1
```

2. **Configurer dans `pubspec.yaml`** :
```yaml
flutter_launcher_icons:
  android: true
  ios: false
  image_path: "assets/icon/fylora_icon.png"  # Votre logo Fylora 1024x1024
  adaptive_icon_background: "#2196F3"  # Bleu Fylora
  adaptive_icon_foreground: "assets/icon/fylora_icon.png"
```

3. **Générer les icônes** :
```powershell
flutter pub get
flutter pub run flutter_launcher_icons
```

### Option 2 : Copier manuellement depuis web/icons

Si vous avez déjà des icônes dans `web/icons/`, vous pouvez les redimensionner :

**Tailles requises :**
- mdpi: 48x48 px
- hdpi: 72x72 px  
- xhdpi: 96x96 px
- xxhdpi: 144x144 px
- xxxhdpi: 192x192 px

**Outils pour redimensionner :**
- **En ligne** : https://www.iloveimg.com/resize-image
- **Windows** : Paint, GIMP
- **Commande ImageMagick** (si installé) :
  ```powershell
  magick web\icons\Icon-512.png -resize 192x192 mipmap-xxxhdpi\ic_launcher.png
  ```

### Option 3 : Créer un logo simple avec texte "Fylora"

Si vous n'avez pas d'icône, créez-en une simple :

1. **Couleur de fond** : #2196F3 (Bleu Fylora)
2. **Texte** : "Fylora" en blanc, police moderne
3. **Style** : Circulaire ou carré arrondi
4. **Résolution** : 1024x1024 px pour le fichier source

## ✅ Étapes pour remplacer

1. **Préparer l'icône source** (1024x1024 px recommandé)
2. **Redimensionner** aux tailles nécessaires (voir ci-dessus)
3. **Remplacer** tous les fichiers `ic_launcher.png` dans chaque dossier `mipmap-*`
4. **Rebuild** l'APK :
   ```powershell
   flutter clean
   flutter build apk --release
   ```

## 🎯 Logo Fylora recommandé

**Design simple :**
- Fond circulaire bleu (#2196F3)
- Texte "F" ou "Fylora" en blanc au centre
- Bordure arrondie (rayon 20%)

**Alternative :**
- Icône nuage ☁️ avec texte "Fylora"
- Fond dégradé bleu (#2196F3 → #1976D2)

## ⚠️ Note

Après remplacement des icônes, vous devrez **désinstaller** l'ancienne application sur votre téléphone avant d'installer le nouvel APK, sinon l'ancienne icône peut rester en cache.

---

**Pour un remplacement rapide : Utilisez flutter_launcher_icons (Option 1)**
