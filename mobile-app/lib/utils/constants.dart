import 'package:flutter/material.dart';

/// Constantes simplifiées pour faciliter l'utilisation
class Constants {
  /// URL de base de l'API backend
  static const String apiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:5001',
  );

  /// URL complète de l'API (base + /api)
  static const String apiUrl = '$apiBaseUrl/api';

  /// Clés de stockage sécurisé
  static const String storageAccessToken = 'access_token';
  static const String storageRefreshToken = 'refresh_token';
  static const String storageUser = 'user';

  /// Limites de taille
  static const int maxFileSize = 1099511627776; // 1 To
  static const int maxImageSize = 5242880; // 5 Mo

  /// Couleurs Fylora
  static const Color primaryColor = Color(0xFF2196F3);
  static const Color successColor = Color(0xFF10b981);
  static const Color errorColor = Color(0xFFdc2626);
  static const Color warningColor = Color(0xFFf59e0b);
}

/// Constantes de l'application Fylora (version complète)
/// 
/// Cette classe centralise toutes les constantes utilisées dans l'application mobile.
/// Elle facilite la maintenance et assure la cohérence des valeurs.
class AppConstants {
  // ============================================
  // Configuration API
  // ============================================
  
  /// URL de base de l'API backend
  /// Peut être surchargée via la variable d'environnement API_URL
  static const String apiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:5001',
  );
  
  /// URL complète de l'API (base + /api)
  static const String apiUrl = '$apiBaseUrl/api';
  
  // ============================================
  // Clés de stockage sécurisé
  // ============================================
  
  /// Clé pour stocker le token d'accès
  static const String storageAccessToken = 'access_token';
  
  /// Clé pour stocker le token de rafraîchissement
  static const String storageRefreshToken = 'refresh_token';
  
  /// Clé pour stocker les données utilisateur
  static const String storageUser = 'user';
  
  // ============================================
  // Limites de taille de fichiers
  // ============================================
  
  /// Taille maximale d'un fichier : 1 To (1 099 511 627 776 octets)
  static const int maxFileSize = 1099511627776;
  
  /// Taille maximale d'une image pour avatar : 5 Mo (5 242 880 octets)
  static const int maxImageSize = 5242880;
  
  // ============================================
  // Palette de couleurs Fylora
  // ============================================
  
  /// Bleu principal de Fylora
  static const Color fyloraBlue = Color(0xFF2196F3);
  
  /// Blanc pur
  static const Color fyloraWhite = Color(0xFFFFFFFF);
  
  /// Gris clair pour les arrière-plans
  static const Color fyloraGrey = Color(0xFFF5F5F5);
  
  /// Vert pour les actions positives
  static const Color fyloraGreen = Color(0xFF10b981);
  
  /// Bleu foncé pour les éléments secondaires
  static const Color fyloraDarkBlue = Color(0xFF1976D2);
  
  // ============================================
  // Couleurs système (feedback utilisateur)
  // ============================================
  
  /// Couleur de succès (vert)
  static const Color successColor = Color(0xFF10b981);
  
  /// Couleur d'erreur (rouge)
  static const Color errorColor = Color(0xFFdc2626);
  
  /// Couleur d'avertissement (orange)
  static const Color warningColor = Color(0xFFf59e0b);
  
  /// Couleur d'information (bleu)
  static const Color infoColor = Color(0xFF2196F3);
  
  // ============================================
  // Configuration du quota
  // ============================================
  
  /// Quota par défaut : 1 To (1 099 511 627 776 octets)
  static const int defaultQuotaLimit = 1099511627776;
}
