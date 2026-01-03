import React from 'react';

// Système de traduction amélioré pour l'application
const translations = {
  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    files: 'Fichiers',
    search: 'Recherche',
    trash: 'Corbeille',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    favorites: 'Favoris',
    favorite: 'Favoris',
    addToFavorites: 'Ajouter aux favoris',
    removeFromFavorites: 'Retirer des favoris',
    activity: 'Activité',
    
    // Auth
    login: 'Connexion',
    signup: 'Créer un compte',
    email: 'E-mail',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    loginButton: 'Se connecter',
    loginLoading: 'Connexion...',
    signupButton: 'S\'inscrire',
    signupLoading: 'Inscription...',
    noAccount: 'Pas encore de compte ?',
    hasAccount: 'Déjà un compte ?',
    signupLink: 'S\'inscrire',
    loginLink: 'Connexion',
    fillAllFields: 'Veuillez remplir tous les champs',
    passwordsDontMatch: 'Les mots de passe ne correspondent pas',
    passwordMinLength: 'Le mot de passe doit contenir au moins 8 caractères',
    passwordRequiresUppercase: 'Le mot de passe doit contenir au moins une majuscule',
    passwordRequiresNumber: 'Le mot de passe doit contenir au moins un chiffre',
    passwordRequirements: 'Au moins 8 caractères, une majuscule et un chiffre',
    loginFailed: 'La connexion a échoué',
    signupFailed: 'L\'inscription a échoué',
    continueWith: 'Continuer avec',
    or: 'ou',
    backToHome: 'Retour à l\'accueil',
    
    // Pages
    myFiles: 'Mes fichiers',
    upload: 'Uploader',
    newFolder: 'Nouveau dossier',
    folderName: 'Nom du nouveau dossier',
    create: 'Créer',
    name: 'Nom',
    size: 'Taille',
    modified: 'Modifié',
    actions: 'Actions',
    download: 'Télécharger',
    downloadZip: 'Télécharger (ZIP)',
    share: 'Partager',
    rename: 'Renommer',
    move: 'Déplacer',
    delete: 'Supprimer',
    cancel: 'Annuler',
    selectDestination: 'Sélectionner le dossier de destination',
    save: 'Enregistrer',
    close: 'Fermer',
    back: 'Retour',
    root: 'Racine',
    
    // Files page
    emptyFolder: 'Glissez-déposez des fichiers ici ou cliquez sur "Uploader"',
    uploadInProgress: 'Upload en cours...',
    renameItem: 'Renommer',
    deleteConfirm: 'Voulez-vous vraiment supprimer',
    deleteConfirmDetails: 'Cette action enverra dans la corbeille.',
    deleteSuccess: 'a été supprimé et envoyé dans la corbeille.',
    deleteError: 'Erreur lors de la suppression',
    uploadError: 'Erreur lors de l\'upload',
    moveError: 'Erreur lors du déplacement',
    shareModal: 'Partager',
    shareType: 'Type de partage:',
    publicLink: 'Lien public',
    shareWithUser: 'Partager avec un utilisateur',
    sharePassword: 'Mot de passe (optionnel):',
    shareExpiresAt: 'Expire le (optionnel):',
    generateLink: 'Générer le lien',
    shareLinkGenerated: 'Lien de partage généré:',
    copyLink: 'Copier le lien',
    searchUser: 'Rechercher un utilisateur:',
    selectUser: 'Sélectionner un utilisateur',
    shareWith: 'Partagera avec:',
    linkCopied: 'Lien copié dans le presse-papiers !',
    shareError: 'Erreur lors de la génération du lien de partage',
    selectUserError: 'Veuillez sélectionner un utilisateur à partager avec.',
    
    // Dashboard
    storageSpace: 'Espace de stockage',
    used: 'Utilisé',
    available: 'Disponible',
    usedOf: 'utilisé sur',
    breakdownByType: 'Répartition par type',
    storageEvolution: 'Évolution de l\'espace utilisé (7 derniers jours)',
    images: 'Images',
    videos: 'Vidéos',
    documents: 'Documents',
    audio: 'Audio',
    others: 'Autres',
    recentFiles: 'Fichiers récents',
    noRecentFiles: 'Aucun fichier récent',
    viewAll: 'Voir tout',
    statistics: 'Statistiques',
    totalFiles: 'Total fichiers',
    totalFolders: 'Total dossiers',
    
    // Search
    searchPlaceholder: 'Rechercher un fichier ou dossier...',
    searchButton: 'Rechercher',
    searching: 'Recherche en cours...',
    results: 'Résultats',
    noResults: 'Aucun résultat trouvé',
    type: 'Type',
    all: 'Tous',
    allTypes: 'Tous les types',
    file: 'Fichier',
    folder: 'Dossier',
    folders: 'Dossiers',
    mimeType: 'Type MIME',
    allFormats: 'Tous les formats',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    dateFrom: 'Date de début',
    dateTo: 'Date de fin',
    
    // Trash
    trashEmpty: 'La corbeille est vide',
    items: 'éléments',
    itemsInTrash: 'élément dans la corbeille',
    itemsInTrashPlural: 'éléments dans la corbeille',
    deletedOn: 'Supprimé le',
    restore: 'Restaurer',
    restoreSuccess: 'restauré avec succès',
    restoreError: 'Erreur lors de la restauration',
    permanentDelete: 'Supprimer définitivement',
    permanentDeleteConfirm: 'Êtes-vous sûr de vouloir supprimer définitivement ce fichier ? Cette action est irréversible.',
    permanentDeleteFolderConfirm: 'Êtes-vous sûr de vouloir supprimer définitivement ce dossier et tous ses fichiers ? Cette action est irréversible.',
    permanentDeleteSuccess: 'Supprimé définitivement',
    permanentDeleteError: 'Erreur lors de la suppression définitive',
    
    // Settings
    accountInfo: 'Informations du compte',
    lightTheme: 'Thème clair',
    darkTheme: 'Thème sombre',
    switchToDark: 'Passer au thème sombre',
    switchToLight: 'Passer au thème clair',
    profile: 'Profil',
    security: 'Sécurité',
    preferences: 'Préférences',
    displayName: 'Nom d\'affichage',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    changePassword: 'Changer le mot de passe',
    language: 'Langue',
    languageLabel: 'Langue / Language',
    theme: 'Thème',
    interfacePreferences: 'Préférences d\'interface',
    notifications: 'Activer les notifications',
    spaceUsed: 'Espace utilisé',
    accountCreated: 'Compte créé le',
    lastLogin: 'Dernière connexion',
    never: 'Jamais',
    saveChanges: 'Enregistrer les modifications',
    saving: 'Enregistrement...',
    preferencesUpdated: 'Préférences mises à jour',
    passwordChanged: 'Mot de passe modifié avec succès',
    profileUpdated: 'Profil mis à jour avec succès',
    uploadAvatar: 'Changer l\'avatar',
    yourName: 'Votre nom',
    
    // Messages
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    yes: 'Oui',
    no: 'Non',
    mustBeConnected: 'Vous devez être connecté pour télécharger',
    downloadError: 'Erreur lors du téléchargement',
    renameError: 'Erreur lors du renommage',
    createFolderError: 'Erreur lors de la création du dossier',
    loadError: 'Erreur lors du chargement',
    
    // Home page
    tagline: 'Vos fichiers, votre liberté, votre cloud.',
    nav: {
      login: 'Connexion',
      skip: 'Passer'
    },
    freeFeatures: {
      title: 'Gratuit pour toujours',
      subtitle: 'Découvrez ce qui est inclus dans votre compte gratuit',
      items: {
        storage: '1 To de stockage gratuit',
        folders: 'Dossiers illimités',
        sharing: 'Partage de fichiers illimité',
        encryption: 'Chiffrement de bout en bout',
        devices: 'Accès multi-appareils',
        sync: 'Synchronisation en temps réel'
      }
    },
    slides: {
      welcome: {
        title: 'Bienvenue sur Fylora',
        description: 'Votre espace de stockage cloud sécurisé et moderne pour tous vos fichiers'
      },
      security: {
        title: 'Sécurité maximale',
        description: 'Vos fichiers sont chiffrés et protégés avec les dernières technologies de sécurité'
      },
      sync: {
        title: 'Synchronisation rapide',
        description: 'Accédez à vos fichiers instantanément depuis n\'importe où dans le monde'
      },
      platform: {
        title: 'Multi-plateforme',
        description: 'Disponible sur tous vos appareils : web, mobile et desktop'
      },
      sharing: {
        title: 'Partage facile',
        description: 'Partagez vos fichiers avec un simple lien sécurisé en quelques clics'
      }
    },
    buttons: {
      next: 'Suivant',
      previous: 'Précédent',
      start: 'Commencer'
    },
    copyright: '© 2025 Fylora. Tous droits réservés.',
    
    // Preview
    technicalDetails: 'Détails techniques',
    fileId: 'ID du fichier',
    fileType: 'Type de fichier',
    fileSize: 'Taille du fichier',
    createdAt: 'Créé le',
    updatedAt: 'Modifié le',
    edit: 'Éditer',
    
    // Gallery
    gallery: 'Galerie',
    loadingGallery: 'Chargement de la galerie...',
    allMedia: 'Tous les médias',
    imagesOnly: 'Images uniquement',
    videosOnly: 'Vidéos uniquement',
    media: 'média',
    medias: 'médias',
    noMediaFound: 'Aucun média trouvé',
    noPhotosOrVideos: 'Vous n\'avez pas encore de photos ou vidéos',
    noImagesFound: 'Aucune image trouvée',
    noVideosFound: 'Aucune vidéo trouvée',
    grid: 'Grille',
    timeline: 'Timeline',
    total: 'Total',
    
    // Admin
    administration: 'Administration',
    adminStats: 'Statistiques Administrateur',
    totalUsers: 'Total utilisateurs',
    activeUsers: 'Utilisateurs actifs',
    inactiveUsers: 'Utilisateurs inactifs',
    totalStorage: 'Stockage total utilisé',
    recentUsers: 'Utilisateurs récents',
    userManagement: 'Gestion des utilisateurs',
    searchUsers: 'Rechercher des utilisateurs...',
    email: 'Email',
    displayName: 'Nom d\'affichage',
    quotaLimit: 'Quota limite',
    quotaUsed: 'Quota utilisé',
    status: 'Statut',
    active: 'Actif',
    inactive: 'Inactif',
    admin: 'Admin',
    actions: 'Actions',
    editUser: 'Modifier l\'utilisateur',
    save: 'Enregistrer',
    cancel: 'Annuler',
    userUpdated: 'Utilisateur mis à jour avec succès',
    errorLoadingStats: 'Erreur lors du chargement des statistiques',
    errorLoadingUsers: 'Erreur lors du chargement des utilisateurs',
    errorUpdatingUser: 'Erreur lors de la mise à jour de l\'utilisateur',
    extendStorage: 'Étendre le stockage',
    additionalStorage: 'Espace supplémentaire (en GB)',
    newQuotaLimit: 'Nouveau quota limite (en GB)',
    storageExtended: 'Stockage étendu avec succès',
    errorExtendingStorage: 'Erreur lors de l\'extension du stockage',
    
    // SetAdmin
    adminConfiguration: 'Configuration Administrateur',
    setAdminDescription: 'Définir un utilisateur comme administrateur. Cette page est temporaire et doit être supprimée après utilisation.',
    userEmail: 'Email de l\'utilisateur',
    setAsAdmin: 'Définir comme Administrateur',
    configuring: 'Configuration en cours...',
    alreadyAdmin: 'Vous êtes déjà administrateur',
    important: 'Important',
    deleteAfterUse: 'Cette page doit être supprimée après avoir défini l\'administrateur pour des raisons de sécurité.',
    enterEmail: 'Veuillez entrer un email',
    configurationError: 'Erreur lors de la configuration',
    serverConnectionError: 'Erreur de connexion au serveur',
    
    // Share
    loading: 'Chargement...',
    error: 'Erreur',
    passwordProtected: 'Partage protégé par mot de passe',
    enterPassword: 'Mot de passe',
    access: 'Accéder',
    fileShare: 'Partage de fichier',
    size: 'Taille',
    type: 'Type',
    downloadFile: 'Télécharger le fichier',
    downloadFolder: 'Télécharger le dossier (ZIP)',
    shareNotFound: 'Partage non trouvé ou expiré',
    shareExpired: 'Ce partage a expiré',
    shareDeactivated: 'Ce partage a été désactivé',
    shareNotFoundError: 'Partage non trouvé',
    errorLoadingShare: 'Erreur lors du chargement du partage',
    errorDownload: 'Erreur lors du téléchargement',
    incorrectPassword: 'Mot de passe incorrect',
    errorVerifyingPassword: 'Erreur lors de la vérification du mot de passe',
    resourceNotFound: 'Ressource non trouvée',
    
    // Activity
    activity: 'Activité',
    activities: 'Activités',
    noActivities: 'Aucune activité récente',
    actionType: 'Type d\'action',
    resourceType: 'Type de ressource',
    dateFrom: 'Date de début',
    dateTo: 'Date de fin',
    filter: 'Filtrer',
    clearFilters: 'Effacer les filtres',
    export: 'Exporter',
    exportActivities: 'Exporter les activités',
    errorLoadingActivities: 'Erreur lors du chargement des activités',
    errorExportingActivities: 'Erreur lors de l\'exportation des activités'
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    files: 'Files',
    search: 'Search',
    trash: 'Trash',
    settings: 'Settings',
    logout: 'Logout',
    favorites: 'Favorites',
    favorite: 'Favorites',
    addToFavorites: 'Add to favorites',
    removeFromFavorites: 'Remove from favorites',
    activity: 'Activity',
    
    // Auth
    login: 'Login',
    signup: 'Create account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    loginButton: 'Login',
    loginLoading: 'Logging in...',
    signupButton: 'Sign up',
    signupLoading: 'Signing up...',
    noAccount: 'Don\'t have an account?',
    hasAccount: 'Already have an account?',
    signupLink: 'Sign up',
    loginLink: 'Login',
    fillAllFields: 'Please fill all fields',
    passwordsDontMatch: 'Passwords do not match',
    passwordMinLength: 'Password must contain at least 8 characters',
    passwordRequiresUppercase: 'Password must contain at least one uppercase letter',
    passwordRequiresNumber: 'Password must contain at least one number',
    passwordRequirements: 'At least 8 characters, one uppercase and one number',
    loginFailed: 'Login failed',
    signupFailed: 'Sign up failed',
    continueWith: 'Continue with',
    or: 'or',
    backToHome: 'Back to home',
    
    // Pages
    myFiles: 'My files',
    upload: 'Upload',
    newFolder: 'New folder',
    folderName: 'New folder name',
    create: 'Create',
    name: 'Name',
    size: 'Size',
    modified: 'Modified',
    actions: 'Actions',
    download: 'Download',
    downloadZip: 'Download (ZIP)',
    share: 'Share',
    rename: 'Rename',
    move: 'Move',
    delete: 'Delete',
    cancel: 'Cancel',
    selectDestination: 'Select destination folder',
    save: 'Save',
    close: 'Close',
    back: 'Back',
    root: 'Root',
    
    // Files page
    emptyFolder: 'Drag and drop files here or click "Upload"',
    uploadInProgress: 'Upload in progress...',
    renameItem: 'Rename',
    deleteConfirm: 'Do you really want to delete',
    deleteConfirmDetails: 'This action will send to trash.',
    deleteSuccess: 'has been deleted and sent to trash.',
    deleteError: 'Error during deletion',
    uploadError: 'Error during upload',
    moveError: 'Error during move',
    shareModal: 'Share',
    shareType: 'Share type:',
    publicLink: 'Public link',
    shareWithUser: 'Share with user',
    sharePassword: 'Password (optional):',
    shareExpiresAt: 'Expires on (optional):',
    generateLink: 'Generate link',
    shareLinkGenerated: 'Share link generated:',
    copyLink: 'Copy link',
    searchUser: 'Search for a user:',
    selectUser: 'Select a user',
    shareWith: 'Will share with:',
    linkCopied: 'Link copied to clipboard!',
    shareError: 'Error generating share link',
    selectUserError: 'Please select a user to share with.',
    
    // Dashboard
    storageSpace: 'Storage space',
    used: 'Used',
    available: 'Available',
    usedOf: 'used of',
    breakdownByType: 'Breakdown by type',
    storageEvolution: 'Storage evolution (last 7 days)',
    images: 'Images',
    videos: 'Videos',
    documents: 'Documents',
    audio: 'Audio',
    others: 'Others',
    recentFiles: 'Recent files',
    noRecentFiles: 'No recent files',
    viewAll: 'View all',
    statistics: 'Statistics',
    totalFiles: 'Total files',
    totalFolders: 'Total folders',
    
    // Search
    searchPlaceholder: 'Search for a file or folder...',
    searchButton: 'Search',
    searching: 'Searching...',
    results: 'Results',
    noResults: 'No results found',
    type: 'Type',
    all: 'All',
    allTypes: 'All types',
    file: 'File',
    folder: 'Folder',
    folders: 'Folders',
    mimeType: 'MIME type',
    allFormats: 'All formats',
    startDate: 'Start date',
    endDate: 'End date',
    dateFrom: 'Date from',
    dateTo: 'Date to',
    
    // Trash
    trashEmpty: 'Trash is empty',
    items: 'items',
    itemsInTrash: 'item in trash',
    itemsInTrashPlural: 'items in trash',
    deletedOn: 'Deleted on',
    restore: 'Restore',
    restoreSuccess: 'restored successfully',
    restoreError: 'Error during restoration',
    permanentDelete: 'Permanently delete',
    permanentDeleteConfirm: 'Are you sure you want to permanently delete this file? This action is irreversible.',
    permanentDeleteFolderConfirm: 'Are you sure you want to permanently delete this folder and all its files? This action is irreversible.',
    permanentDeleteSuccess: 'Permanently deleted',
    permanentDeleteError: 'Error during permanent deletion',
    
    // Settings
    accountInfo: 'Account Information',
    profile: 'Profile',
    security: 'Security',
    preferences: 'Preferences',
    displayName: 'Display name',
    currentPassword: 'Current password',
    newPassword: 'New password',
    changePassword: 'Change password',
    language: 'Language',
    languageLabel: 'Language / Langue',
    theme: 'Theme',
    lightTheme: 'Light theme',
    darkTheme: 'Dark theme',
    switchToDark: 'Switch to dark theme',
    switchToLight: 'Switch to light theme',
    interfacePreferences: 'Interface preferences',
    notifications: 'Enable notifications',
    spaceUsed: 'Space used',
    accountCreated: 'Account created on',
    lastLogin: 'Last login',
    never: 'Never',
    saveChanges: 'Save changes',
    saving: 'Saving...',
    preferencesUpdated: 'Preferences updated',
    passwordChanged: 'Password changed successfully',
    profileUpdated: 'Profile updated successfully',
    uploadAvatar: 'Change avatar',
    yourName: 'Your name',
    
    // Messages
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    yes: 'Yes',
    no: 'No',
    mustBeConnected: 'You must be logged in to download',
    downloadError: 'Error during download',
    renameError: 'Error during rename',
    createFolderError: 'Error creating folder',
    loadError: 'Error loading',
    
    // Home page
    tagline: 'Your files, your freedom, your cloud.',
    nav: {
      login: 'Login',
      skip: 'Skip'
    },
    freeFeatures: {
      title: 'Free forever',
      subtitle: 'Discover what\'s included in your free account',
      items: {
        storage: '1 TB free storage',
        folders: 'Unlimited folders',
        sharing: 'Unlimited file sharing',
        encryption: 'End-to-end encryption',
        devices: 'Multi-device access',
        sync: 'Real-time sync'
      }
    },
    slides: {
      welcome: {
        title: 'Welcome to Fylora',
        description: 'Your secure and modern cloud storage space for all your files'
      },
      security: {
        title: 'Maximum security',
        description: 'Your files are encrypted and protected with the latest security technologies'
      },
      sync: {
        title: 'Fast synchronization',
        description: 'Access your files instantly from anywhere in the world'
      },
      platform: {
        title: 'Multi-platform',
        description: 'Available on all your devices: web, mobile and desktop'
      },
      sharing: {
        title: 'Easy sharing',
        description: 'Share your files with a simple secure link in just a few clicks'
      }
    },
    buttons: {
      next: 'Next',
      previous: 'Previous',
      start: 'Get Started'
    },
    copyright: '© 2025 Fylora. All rights reserved.',
    
    // Preview
    technicalDetails: 'Technical details',
    fileId: 'File ID',
    fileType: 'File type',
    fileSize: 'File size',
    createdAt: 'Created at',
    updatedAt: 'Updated at',
    edit: 'Edit',
    
    // Gallery
    gallery: 'Gallery',
    loadingGallery: 'Loading gallery...',
    allMedia: 'All media',
    imagesOnly: 'Images only',
    videosOnly: 'Videos only',
    media: 'media',
    medias: 'media',
    noMediaFound: 'No media found',
    noPhotosOrVideos: 'You don\'t have any photos or videos yet',
    noImagesFound: 'No images found',
    noVideosFound: 'No videos found',
    grid: 'Grid',
    timeline: 'Timeline',
    total: 'Total',
    
    // Admin
    administration: 'Administration',
    adminStats: 'Admin Statistics',
    totalUsers: 'Total users',
    activeUsers: 'Active users',
    inactiveUsers: 'Inactive users',
    totalStorage: 'Total storage used',
    recentUsers: 'Recent users',
    userManagement: 'User Management',
    searchUsers: 'Search users...',
    email: 'Email',
    displayName: 'Display name',
    quotaLimit: 'Quota limit',
    quotaUsed: 'Quota used',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    admin: 'Admin',
    actions: 'Actions',
    editUser: 'Edit user',
    save: 'Save',
    cancel: 'Cancel',
    userUpdated: 'User updated successfully',
    errorLoadingStats: 'Error loading statistics',
    errorLoadingUsers: 'Error loading users',
    errorUpdatingUser: 'Error updating user',
    thisUser: 'this user',
    deleteUserConfirm: 'Are you sure you want to delete this user?',
    userDeleted: 'User deleted successfully',
    extendStorage: 'Extend storage',
    additionalStorage: 'Additional storage (in GB)',
    newQuotaLimit: 'New quota limit (in GB)',
    storageExtended: 'Storage extended successfully',
    errorExtendingStorage: 'Error extending storage',
    
    // SetAdmin
    adminConfiguration: 'Administrator Configuration',
    setAdminDescription: 'Set a user as administrator. This page is temporary and should be deleted after use.',
    userEmail: 'User email',
    setAsAdmin: 'Set as Administrator',
    configuring: 'Configuring...',
    alreadyAdmin: 'You are already an administrator',
    important: 'Important',
    deleteAfterUse: 'This page must be deleted after setting the administrator for security reasons.',
    enterEmail: 'Please enter an email',
    configurationError: 'Configuration error',
    serverConnectionError: 'Server connection error',
    
    // Share
    loading: 'Loading...',
    error: 'Error',
    passwordProtected: 'Password protected share',
    enterPassword: 'Password',
    access: 'Access',
    fileShare: 'File share',
    size: 'Size',
    type: 'Type',
    downloadFile: 'Download file',
    downloadFolder: 'Download folder (ZIP)',
    shareNotFound: 'Share not found or expired',
    shareExpired: 'This share has expired',
    shareDeactivated: 'This share has been deactivated',
    shareNotFoundError: 'Share not found',
    errorLoadingShare: 'Error loading share',
    errorDownload: 'Error downloading',
    incorrectPassword: 'Incorrect password',
    errorVerifyingPassword: 'Error verifying password',
    resourceNotFound: 'Resource not found',
    
    // Activity
    activity: 'Activity',
    activities: 'Activities',
    noActivities: 'No recent activities',
    actionType: 'Action type',
    resourceType: 'Resource type',
    dateFrom: 'Date from',
    dateTo: 'Date to',
    filter: 'Filter',
    clearFilters: 'Clear filters',
    export: 'Export',
    exportActivities: 'Export activities',
    errorLoadingActivities: 'Error loading activities',
    errorExportingActivities: 'Error exporting activities',
    user: 'User',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    accountActive: 'Account active'
  }
};

// Langues supportées avec métadonnées
export const supportedLanguages = {
  fr: {
    code: 'fr',
    name: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
    locale: 'fr-FR'
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    locale: 'en-US'
  }
};

// Détection automatique de la langue du navigateur
export const detectBrowserLanguage = () => {
  if (typeof window === 'undefined') return 'fr';
  
  const browserLang = navigator.language || navigator.userLanguage;
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  // Si la langue du navigateur est supportée, l'utiliser
  if (supportedLanguages[langCode]) {
    return langCode;
  }
  
  // Sinon, vérifier les langues préférées
  if (navigator.languages) {
    for (const lang of navigator.languages) {
      const code = lang.split('-')[0].toLowerCase();
      if (supportedLanguages[code]) {
        return code;
      }
    }
  }
  
  // Par défaut, français
  return 'fr';
};

// Fonction pour obtenir la langue actuelle
export const getCurrentLanguage = () => {
  if (typeof window === 'undefined') return 'fr';
  
  const stored = localStorage.getItem('language');
  if (stored && supportedLanguages[stored]) {
    return stored;
  }
  
  // Si aucune langue stockée, retourner 'fr' par défaut
  // AUCUNE détection automatique - seul l'utilisateur peut changer la langue
  return 'fr';
};

// Fonction pour définir la langue
export const setLanguage = (lang) => {
  if (typeof window === 'undefined') return;
  
  if (lang && supportedLanguages[lang]) {
    localStorage.setItem('language', lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr'); // Support futur RTL
  }
};

// Fonction de traduction améliorée avec support des clés imbriquées
export const t = (key, lang = null) => {
  const currentLang = lang || getCurrentLanguage();
  const keys = key.split('.');
  let value = translations[currentLang] || translations.fr;
  
  // Parcourir les clés imbriquées
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback vers le français si la traduction n'existe pas
      value = translations.fr;
      for (const k2 of keys) {
        value = value?.[k2];
      }
      break;
    }
  }
  
  // Si toujours undefined, essayer avec la clé complète comme fallback
  if (value === undefined) {
    console.warn(`Translation missing for key: ${key} in language: ${currentLang}`);
    return key;
  }
  
  return value;
};

// Formatage des nombres selon la locale
export const formatNumber = (number, lang = null) => {
  const currentLang = lang || getCurrentLanguage();
  const locale = supportedLanguages[currentLang]?.locale || 'fr-FR';
  
  try {
    return new Intl.NumberFormat(locale).format(number);
  } catch (e) {
    return number.toString();
  }
};

// Formatage des dates selon la locale
export const formatDate = (date, options = {}, lang = null) => {
  const currentLang = lang || getCurrentLanguage();
  const locale = supportedLanguages[currentLang]?.locale || 'fr-FR';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(dateObj);
  } catch (e) {
    return date.toString();
  }
};

// Formatage de la taille des fichiers
export const formatFileSize = (bytes, lang = null) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const currentLang = lang || getCurrentLanguage();
  const k = 1024;
  const sizes = currentLang === 'fr' 
    ? ['B', 'Ko', 'Mo', 'Go', 'To']
    : ['B', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = (bytes / Math.pow(k, i)).toFixed(2);
  
  return `${size} ${sizes[i]}`;
};

// Hook React pour les traductions
export const useTranslation = () => {
  const [lang, setLangState] = React.useState(getCurrentLanguage());
  
  React.useEffect(() => {
    const handleStorageChange = () => {
      setLangState(getCurrentLanguage());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  return {
    t: (key) => t(key, lang),
    language: lang,
    setLanguage: (newLang) => {
      setLanguage(newLang);
      setLangState(newLang);
    },
    formatNumber: (number) => formatNumber(number, lang),
    formatDate: (date, options) => formatDate(date, options, lang),
    formatFileSize: (bytes) => formatFileSize(bytes, lang)
  };
};

export default { 
  t, 
  getCurrentLanguage, 
  setLanguage, 
  useTranslation,
  detectBrowserLanguage,
  supportedLanguages,
  formatNumber,
  formatDate,
  formatFileSize
};
