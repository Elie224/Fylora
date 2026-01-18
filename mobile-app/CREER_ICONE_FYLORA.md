# 🎨 Créer l'Icône Fylora pour Android

## 🎯 Objectif

Remplacer le logo Flutter par défaut par une icône Fylora personnalisée.

## 📝 Étapes rapides

### Étape 1 : Créer l'icône source

Vous avez deux options :

#### Option A : Utiliser un logo simple (Recommandé pour démarrer)

Créez un fichier PNG **1024x1024 px** avec :
- **Fond** : Bleu Fylora (#2196F3) en cercle
- **Texte** : "F" ou "Fylora" en blanc, police moderne (Roboto Bold)
- **Style** : Fond circulaire, texte centré

#### Option B : Utiliser l'icône web existante

Si `mobile-app/web/icons/Icon-512.png` existe :
1. Copiez-le vers `mobile-app/assets/icon/fylora_icon.png`
2. Redimensionnez à 1024x1024 px si nécessaire

### Étape 2 : Créer l'icône adaptive (Foreground)

Pour Android 8.0+, créez une version **foreground** (512x512 px) :
- **Fond** : Transparent
- **Texte** : "F" ou "Fylora" en blanc
- **Style** : Icône centrée, pas de fond coloré

Nommez-le : `mobile-app/assets/icon/fylora_icon_foreground.png`

### Étape 3 : Générer toutes les tailles

```powershell
cd C:\Users\KOURO\OneDrive\Desktop\Fylora\mobile-app
flutter pub get
flutter pub run flutter_launcher_icons
```

Cela générera automatiquement toutes les tailles nécessaires dans `android/app/src/main/res/mipmap-*/`.

### Étape 4 : Rebuild l'APK

```powershell
flutter clean
flutter build apk --release
```

## 🛠️ Outils pour créer l'icône

### En ligne (Gratuit)
1. **Figma** : https://www.figma.com (créer un cercle bleu + texte)
2. **Canva** : https://www.canva.com (templates icônes d'apps)
3. **Android Asset Studio** : https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html

### Sur Windows
1. **Paint.NET** (gratuit) : https://www.getpaint.net/
2. **GIMP** (gratuit) : https://www.gimp.org/
3. **Photoshop** (payant)

## 📐 Spécifications techniques

### Icône principale (fylora_icon.png)
- **Taille** : 1024x1024 px
- **Format** : PNG
- **Fond** : Bleu #2196F3 ou transparent
- **Contenu** : Texte "Fylora" ou icône simple

### Icône foreground (fylora_icon_foreground.png)
- **Taille** : 512x512 px minimum (1024x1024 recommandé)
- **Format** : PNG avec transparence
- **Fond** : Transparent
- **Zone sûre** : Gardez le contenu dans un cercle de 66% du centre

## ✅ Résultat attendu

Après génération, vous devriez voir :
```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png      (icône Fylora 48x48)
├── mipmap-hdpi/ic_launcher.png      (icône Fylora 72x72)
├── mipmap-xhdpi/ic_launcher.png     (icône Fylora 96x96)
├── mipmap-xxhdpi/ic_launcher.png    (icône Fylora 144x144)
└── mipmap-xxxhdpi/ic_launcher.png   (icône Fylora 192x192)
```

## 🎨 Design recommandé

**Simple et professionnel :**
- Fond circulaire bleu (#2196F3)
- Lettre "F" blanche au centre (police: Roboto Bold, 70% de la taille)
- Bordure arrondie naturelle

**Alternative :**
- Fond dégradé bleu (#2196F3 → #1976D2)
- Icône nuage ☁️ stylisée en blanc
- Texte "Fylora" en bas (optionnel)

## ⚠️ Notes importantes

1. **Désinstallez l'ancienne app** sur votre téléphone avant d'installer le nouvel APK
2. Le nom de l'app a été changé de "fylora_mobile" à "Fylora" dans AndroidManifest.xml
3. Les icônes seront automatiquement générées dans toutes les tailles nécessaires

---

**Une fois les icônes créées et le build effectué, le logo Flutter ne sera plus visible !** ✅
