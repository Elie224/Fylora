# Corrections nécessaires pour la compilation

## ✅ Corrections effectuées
1. Ajout des constantes manquantes dans AppConstants (supinfoPurple, etc.)
2. Correction CardTheme → CardThemeData dans main.dart
3. Correction structure Drawer dans dashboard_screen.dart

## ⚠️ Corrections restantes

### 1. Méthodes manquantes dans ApiService
- `listFiles()`
- `getDashboard()`
- `getFolder()`
- `downloadFile()`
- `deleteFile()`
- `deleteFolder()`
- `renameFile()`
- `renameFolder()`
- `createFolder()`
- `moveFile()`
- `moveFolder()`
- `downloadFolder()`
- `getAllFolders()`
- `previewFile()`
- `search()`
- `updateProfile()`
- `uploadAvatar()`
- `changePassword()`
- `listUsers()`
- `createInternalShare()`
- `createPublicShare()`
- `getPublicShare()`
- `listTrashFiles()`
- `listTrashFolders()`
- `restoreFile()`
- `restoreFolder()`

### 2. Méthodes manquantes dans AuthProvider
- `oauthLogin()`
- Getter `error`

### 3. Problèmes flutter_quill
- API changée dans flutter_quill 11.5.0
- `QuillToolbar.simple()` → nouvelle API
- `QuillEditor.basic()` → nouvelle API
- `Delta` → `DocumentDelta` ou autre

### 4. Conflits SecureStorage
- Deux imports de SecureStorage différents
- Résoudre les conflits dans auth_service.dart

### 5. Autres problèmes
- `SyncItem<dynamic>` → `SyncItem` (pas de générique)
- `FileItem` import manquant dans app_router.dart
- `template_outlined` icon n'existe pas
- Problèmes avec user.email, user.displayName (user est Map, pas objet)


