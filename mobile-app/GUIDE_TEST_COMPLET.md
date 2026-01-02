# 🧪 Guide de Test Complet - Application Mobile Fylora

**Date** : Décembre 2024  
**Objectif** : Tester toutes les fonctionnalités avant la génération de l'APK

---

## 📋 Prérequis

### 1. Vérifications Techniques

```powershell
# 1. Vérifier Flutter
flutter doctor

# 2. Vérifier les dépendances
cd mobile-app
flutter pub get

# 3. Vérifier les appareils disponibles
flutter devices
```

### 2. Configuration de l'API

**Vérifier l'URL de l'API** dans `lib/utils/constants.dart` :
- Production : `https://fylora-1.onrender.com`
- Local : `http://localhost:5001` (ou votre IP locale)

**Pour tester avec l'API de production** :
```powershell
flutter run --dart-define=API_URL=https://fylora-1.onrender.com
```

**Pour tester avec l'API locale** :
```powershell
# Sur émulateur Android
flutter run --dart-define=API_URL=http://10.0.2.2:5001

# Sur appareil physique (remplacer par votre IP)
flutter run --dart-define=API_URL=http://192.168.1.100:5001
```

---

## 🧪 Checklist de Test Complète

### ✅ Phase 1 : Authentification

#### 1.1 Test de Connexion Email/Password

- [ ] **Test 1.1.1** : Connexion avec identifiants valides
  - Entrer un email valide
  - Entrer un mot de passe valide
  - Vérifier que la connexion réussit
  - Vérifier la redirection vers le dashboard
  - **Résultat attendu** : ✅ Connexion réussie, redirection vers `/dashboard`

- [ ] **Test 1.1.2** : Connexion avec email invalide
  - Entrer un email invalide (ex: `test@`)
  - Vérifier le message d'erreur
  - **Résultat attendu** : ❌ Message "Email invalide"

- [ ] **Test 1.1.3** : Connexion avec mot de passe incorrect
  - Entrer un email valide
  - Entrer un mot de passe incorrect
  - Vérifier le message d'erreur
  - **Résultat attendu** : ❌ Message "Email ou mot de passe incorrect"

- [ ] **Test 1.1.4** : Connexion sans connexion internet
  - Désactiver le WiFi/Données
  - Tenter de se connecter
  - Vérifier le message d'erreur
  - **Résultat attendu** : ❌ Message "Erreur de connexion réseau"

#### 1.2 Test d'Inscription

- [ ] **Test 1.2.1** : Inscription avec données valides
  - Entrer un email valide non utilisé
  - Entrer un mot de passe valide (min 8 caractères, majuscule, chiffre)
  - Confirmer le mot de passe
  - Vérifier que l'inscription réussit
  - Vérifier la redirection vers le dashboard
  - **Résultat attendu** : ✅ Inscription réussie, redirection vers `/dashboard`

- [ ] **Test 1.2.2** : Inscription avec email déjà utilisé
  - Entrer un email déjà enregistré
  - Entrer un mot de passe valide
  - Vérifier le message d'erreur
  - **Résultat attendu** : ❌ Message "Cet email est déjà utilisé"

- [ ] **Test 1.2.3** : Inscription avec mot de passe invalide
  - Entrer un email valide
  - Entrer un mot de passe trop court (< 8 caractères)
  - Vérifier le message d'erreur
  - **Résultat attendu** : ❌ Message "Minimum 8 caractères"

- [ ] **Test 1.2.4** : Inscription avec mots de passe non correspondants
  - Entrer un email valide
  - Entrer un mot de passe valide
  - Entrer un mot de passe de confirmation différent
  - Vérifier le message d'erreur
  - **Résultat attendu** : ❌ Message "Les mots de passe ne correspondent pas"

#### 1.3 Test d'Authentification Google

- [ ] **Test 1.3.1** : Connexion Google réussie
  - Cliquer sur "Continuer avec Google"
  - Sélectionner un compte Google
  - Autoriser l'application
  - Vérifier que la connexion réussit
  - Vérifier la redirection vers le dashboard
  - **Résultat attendu** : ✅ Connexion Google réussie, redirection vers `/dashboard`

- [ ] **Test 1.3.2** : Annulation de la connexion Google
  - Cliquer sur "Continuer avec Google"
  - Annuler la sélection du compte
  - Vérifier qu'aucune erreur n'est affichée
  - **Résultat attendu** : ✅ Retour à l'écran de connexion sans erreur

- [ ] **Test 1.3.3** : Connexion Google avec compte existant
  - Se connecter avec un compte Google déjà enregistré
  - Vérifier que la connexion réussit
  - **Résultat attendu** : ✅ Connexion réussie avec compte existant

- [ ] **Test 1.3.4** : Connexion Google avec nouveau compte
  - Se connecter avec un compte Google non enregistré
  - Vérifier que le compte est créé automatiquement
  - Vérifier la connexion
  - **Résultat attendu** : ✅ Compte créé et connexion réussie

---

### ✅ Phase 2 : Navigation et Interface

#### 2.1 Navigation Principale

- [ ] **Test 2.1.1** : Navigation vers Dashboard
  - Se connecter
  - Vérifier l'affichage du dashboard
  - **Résultat attendu** : ✅ Dashboard affiché avec statistiques

- [ ] **Test 2.1.2** : Navigation vers Fichiers
  - Cliquer sur "Fichiers" dans le menu
  - Vérifier l'affichage de la liste des fichiers
  - **Résultat attendu** : ✅ Liste des fichiers affichée

- [ ] **Test 2.1.3** : Navigation vers Notes
  - Cliquer sur "Notes" dans le menu
  - Vérifier l'affichage de la liste des notes
  - **Résultat attendu** : ✅ Liste des notes affichée

- [ ] **Test 2.1.4** : Navigation vers Recherche
  - Cliquer sur "Recherche" dans le menu
  - Vérifier l'affichage de l'écran de recherche
  - **Résultat attendu** : ✅ Écran de recherche affiché

- [ ] **Test 2.1.5** : Navigation vers Paramètres
  - Cliquer sur "Paramètres" dans le menu
  - Vérifier l'affichage des paramètres
  - **Résultat attendu** : ✅ Écran des paramètres affiché

#### 2.2 Thème et Langue

- [ ] **Test 2.2.1** : Changement de thème
  - Aller dans Paramètres
  - Changer le thème (clair/sombre)
  - Vérifier que le thème change immédiatement
  - **Résultat attendu** : ✅ Thème changé et appliqué

- [ ] **Test 2.2.2** : Persistance du thème
  - Changer le thème
  - Fermer et rouvrir l'application
  - Vérifier que le thème est conservé
  - **Résultat attendu** : ✅ Thème conservé après redémarrage

---

### ✅ Phase 3 : Gestion des Fichiers

#### 3.1 Affichage des Fichiers

- [ ] **Test 3.1.1** : Liste des fichiers
  - Aller dans "Fichiers"
  - Vérifier que les fichiers sont affichés
  - **Résultat attendu** : ✅ Liste des fichiers affichée

- [ ] **Test 3.1.2** : Navigation dans les dossiers
  - Cliquer sur un dossier
  - Vérifier l'ouverture du dossier
  - Vérifier le bouton retour
  - **Résultat attendu** : ✅ Navigation dans les dossiers fonctionnelle

#### 3.2 Upload de Fichiers

- [ ] **Test 3.2.1** : Upload d'un fichier simple
  - Cliquer sur "Upload" ou le bouton d'ajout
  - Sélectionner un fichier (image, PDF, etc.)
  - Vérifier la progression de l'upload
  - Vérifier que le fichier apparaît dans la liste
  - **Résultat attendu** : ✅ Fichier uploadé avec succès

- [ ] **Test 3.2.2** : Upload d'une image
  - Uploader une image
  - Vérifier l'affichage de la miniature
  - **Résultat attendu** : ✅ Image uploadée avec miniature

- [ ] **Test 3.2.3** : Upload avec progression
  - Uploader un fichier volumineux
  - Vérifier l'affichage de la barre de progression
  - **Résultat attendu** : ✅ Barre de progression affichée

#### 3.3 Téléchargement de Fichiers

- [ ] **Test 3.3.1** : Téléchargement d'un fichier
  - Cliquer sur un fichier
  - Cliquer sur "Télécharger"
  - Vérifier que le fichier est téléchargé
  - **Résultat attendu** : ✅ Fichier téléchargé

#### 3.4 Prévisualisation

- [ ] **Test 3.4.1** : Prévisualisation d'une image
  - Cliquer sur une image
  - Vérifier l'affichage de la prévisualisation
  - **Résultat attendu** : ✅ Image prévisualisée

- [ ] **Test 3.4.2** : Prévisualisation d'un PDF
  - Cliquer sur un PDF
  - Vérifier l'affichage du PDF
  - **Résultat attendu** : ✅ PDF prévisualisé

#### 3.5 Gestion des Fichiers

- [ ] **Test 3.5.1** : Renommer un fichier
  - Long press sur un fichier
  - Sélectionner "Renommer"
  - Entrer un nouveau nom
  - Vérifier que le nom est changé
  - **Résultat attendu** : ✅ Fichier renommé

- [ ] **Test 3.5.2** : Supprimer un fichier
  - Long press sur un fichier
  - Sélectionner "Supprimer"
  - Confirmer la suppression
  - Vérifier que le fichier disparaît
  - **Résultat attendu** : ✅ Fichier supprimé (dans la corbeille)

- [ ] **Test 3.5.3** : Déplacer un fichier
  - Long press sur un fichier
  - Sélectionner "Déplacer"
  - Choisir un dossier de destination
  - Vérifier que le fichier est déplacé
  - **Résultat attendu** : ✅ Fichier déplacé

#### 3.6 Dossiers

- [ ] **Test 3.6.1** : Créer un dossier
  - Cliquer sur "Nouveau dossier"
  - Entrer un nom
  - Vérifier que le dossier est créé
  - **Résultat attendu** : ✅ Dossier créé

- [ ] **Test 3.6.2** : Supprimer un dossier
  - Long press sur un dossier
  - Sélectionner "Supprimer"
  - Confirmer
  - Vérifier que le dossier disparaît
  - **Résultat attendu** : ✅ Dossier supprimé

---

### ✅ Phase 4 : Recherche

#### 4.1 Recherche de Fichiers

- [ ] **Test 4.1.1** : Recherche par nom
  - Aller dans "Recherche"
  - Entrer un nom de fichier
  - Vérifier les résultats
  - **Résultat attendu** : ✅ Résultats de recherche affichés

- [ ] **Test 4.1.2** : Recherche avec filtres
  - Rechercher avec un filtre de type
  - Vérifier les résultats filtrés
  - **Résultat attendu** : ✅ Résultats filtrés correctement

---

### ✅ Phase 5 : Notes

#### 5.1 Gestion des Notes

- [ ] **Test 5.1.1** : Créer une note
  - Aller dans "Notes"
  - Cliquer sur "Nouvelle note"
  - Entrer du contenu
  - Sauvegarder
  - Vérifier que la note est créée
  - **Résultat attendu** : ✅ Note créée

- [ ] **Test 5.1.2** : Modifier une note
  - Ouvrir une note existante
  - Modifier le contenu
  - Sauvegarder
  - Vérifier que les modifications sont sauvegardées
  - **Résultat attendu** : ✅ Note modifiée

- [ ] **Test 5.1.3** : Supprimer une note
  - Long press sur une note
  - Sélectionner "Supprimer"
  - Confirmer
  - Vérifier que la note est supprimée
  - **Résultat attendu** : ✅ Note supprimée

---

### ✅ Phase 6 : Partage

#### 6.1 Partage de Fichiers

- [ ] **Test 6.1.1** : Créer un lien de partage public
  - Sélectionner un fichier
  - Cliquer sur "Partager"
  - Sélectionner "Lien public"
  - Vérifier que le lien est généré
  - **Résultat attendu** : ✅ Lien de partage généré

- [ ] **Test 6.1.2** : Partager avec un utilisateur
  - Sélectionner un fichier
  - Cliquer sur "Partager"
  - Sélectionner "Partager avec utilisateur"
  - Choisir un utilisateur
  - Vérifier que le partage est créé
  - **Résultat attendu** : ✅ Partage créé

---

### ✅ Phase 7 : Corbeille

#### 7.1 Gestion de la Corbeille

- [ ] **Test 7.1.1** : Voir les fichiers supprimés
  - Aller dans "Corbeille"
  - Vérifier l'affichage des fichiers supprimés
  - **Résultat attendu** : ✅ Fichiers supprimés affichés

- [ ] **Test 7.1.2** : Restaurer un fichier
  - Aller dans "Corbeille"
  - Sélectionner un fichier
  - Cliquer sur "Restaurer"
  - Vérifier que le fichier est restauré
  - **Résultat attendu** : ✅ Fichier restauré

- [ ] **Test 7.1.3** : Supprimer définitivement
  - Aller dans "Corbeille"
  - Sélectionner un fichier
  - Cliquer sur "Supprimer définitivement"
  - Confirmer
  - Vérifier que le fichier est supprimé définitivement
  - **Résultat attendu** : ✅ Fichier supprimé définitivement

---

### ✅ Phase 8 : Paramètres et Profil

#### 8.1 Profil Utilisateur

- [ ] **Test 8.1.1** : Voir le profil
  - Aller dans "Paramètres"
  - Vérifier l'affichage des informations du profil
  - **Résultat attendu** : ✅ Profil affiché

- [ ] **Test 8.1.2** : Modifier le profil
  - Modifier le nom d'affichage
  - Sauvegarder
  - Vérifier que les modifications sont sauvegardées
  - **Résultat attendu** : ✅ Profil modifié

- [ ] **Test 8.1.3** : Changer le mot de passe
  - Aller dans "Changer le mot de passe"
  - Entrer l'ancien mot de passe
  - Entrer le nouveau mot de passe
  - Confirmer
  - Vérifier que le mot de passe est changé
  - **Résultat attendu** : ✅ Mot de passe changé

#### 8.2 Déconnexion

- [ ] **Test 8.2.1** : Déconnexion
  - Aller dans "Paramètres"
  - Cliquer sur "Déconnexion"
  - Confirmer
  - Vérifier la redirection vers l'écran de connexion
  - **Résultat attendu** : ✅ Déconnexion réussie, redirection vers `/login`

---

### ✅ Phase 9 : Performance et Stabilité

#### 9.1 Performance

- [ ] **Test 9.1.1** : Temps de chargement
  - Mesurer le temps de chargement de l'application
  - Vérifier que c'est acceptable (< 3 secondes)
  - **Résultat attendu** : ✅ Chargement rapide

- [ ] **Test 9.1.2** : Fluidité de l'interface
  - Naviguer dans l'application
  - Vérifier qu'il n'y a pas de lag
  - **Résultat attendu** : ✅ Interface fluide

#### 9.2 Stabilité

- [ ] **Test 9.2.1** : Gestion des erreurs réseau
  - Désactiver le réseau pendant l'utilisation
  - Vérifier que les erreurs sont gérées proprement
  - **Résultat attendu** : ✅ Messages d'erreur appropriés

- [ ] **Test 9.2.2** : Persistance des données
  - Se connecter
  - Fermer l'application
  - Rouvrir l'application
  - Vérifier que la session est conservée
  - **Résultat attendu** : ✅ Session conservée

---

## 🐛 Tests de Bugs Connus

### Bugs à Vérifier

- [ ] **Bug 1** : Vérifier que l'authentification Google fonctionne correctement
- [ ] **Bug 2** : Vérifier que les messages d'erreur sont clairs
- [ ] **Bug 3** : Vérifier que le refresh token fonctionne automatiquement
- [ ] **Bug 4** : Vérifier qu'il n'y a pas de crash lors de la déconnexion

---

## 📊 Résumé des Tests

### Statistiques

- **Total des tests** : ~50 tests
- **Tests critiques** : Authentification, Upload, Partage
- **Tests de régression** : Navigation, Thème, Persistance

### Critères de Réussite

✅ **Prêt pour APK** si :
- Tous les tests d'authentification passent (Phase 1)
- Tous les tests de navigation passent (Phase 2)
- Au moins 80% des tests de fonctionnalités passent (Phases 3-8)
- Aucun crash critique (Phase 9)

---

## 🚀 Après les Tests

### Si tous les tests passent :

1. ✅ Générer l'APK de release
2. ✅ Tester l'APK sur un appareil physique
3. ✅ Vérifier les performances en release
4. ✅ Générer l'APK final

### Si des tests échouent :

1. ❌ Noter les tests qui échouent
2. ❌ Corriger les bugs identifiés
3. ❌ Re-tester les fonctionnalités corrigées
4. ❌ Répéter jusqu'à ce que tous les tests critiques passent

---

## 📝 Notes de Test

**Date du test** : _______________  
**Testeur** : _______________  
**Appareil** : _______________  
**Version** : 1.0.0+1  
**API utilisée** : _______________

**Tests réussis** : ___ / 50  
**Tests échoués** : ___ / 50  
**Bugs identifiés** : ___

**Commentaires** :
_________________________________________________
_________________________________________________
_________________________________________________

---

**Bon test ! 🧪**

