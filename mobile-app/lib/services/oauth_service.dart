import 'package:google_sign_in/google_sign_in.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';
import '../utils/constants.dart';
import '../utils/secure_logger.dart';

class TimeoutException implements Exception {
  final String message;
  TimeoutException(this.message);
}

/// Service pour gérer l'authentification OAuth avec Google uniquement
class OAuthService {
  // Client ID Google - À configurer depuis les variables d'environnement ou constants
  static String? get _googleClientId {
    // Pour le web, le client ID doit être dans la balise meta
    // Pour mobile, on peut le passer ici si nécessaire
    return null; // Utilise la balise meta pour le web
  }

  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile', 'openid'],
    // Pour le web, le clientId est lu depuis la balise meta
    // clientId: _googleClientId, // Décommenter si nécessaire pour mobile
  );

  /// Connexion avec Google (natif)
  static Future<Map<String, dynamic>?> signInWithGoogle() async {
    try {
      GoogleSignInAccount? googleUser;
      
      // Sur le web, essayer signInSilently() d'abord
      if (kIsWeb) {
        try {
          googleUser = await _googleSignIn.signInSilently();
        } catch (e) {
          SecureLogger.error('signInSilently failed', error: e);
        }
      }
      
      // Si signInSilently() n'a pas fonctionné, utiliser signIn()
      if (googleUser == null) {
        // Déconnecter d'abord pour éviter les problèmes de cache (sauf sur web)
        if (!kIsWeb) {
          await _googleSignIn.signOut();
        }
        
        googleUser = await _googleSignIn.signIn();
      }
      
      if (googleUser == null) {
        // L'utilisateur a annulé la connexion
        return null;
      }

      // Essayer d'obtenir l'authentification
      // Sur le web, l'erreur 403 de la People API peut faire échouer cet appel
      // mais l'access_token est souvent déjà disponible
      GoogleSignInAuthentication? googleAuth;
      String? accessToken;
      String? idToken;
      
      try {
        googleAuth = await googleUser.authentication;
        accessToken = googleAuth.accessToken;
        idToken = googleAuth.idToken;
      } catch (e) {
        // Si l'authentification échoue à cause de la People API (403),
        // on peut quand même utiliser les infos utilisateur disponibles
        // L'erreur 403 est un warning dans la console, mais l'access_token peut être disponible
        SecureLogger.warning('Error getting authentication (may be People API 403)', error: e);
        
        // Sur le web, essayer de récupérer l'access_token depuis les logs Google
        // ou utiliser les infos utilisateur directement
        // Note: Sur le web, si l'access_token n'est pas disponible, on ne peut pas continuer
        if (kIsWeb) {
          // L'access_token devrait être disponible même si l'appel à authentication échoue
          // car il est obtenu avant l'appel à la People API
          // On va utiliser les infos utilisateur et laisser le backend gérer
          SecureLogger.info('Using user info directly, access_token will be handled by backend');
        } else {
          // Sur mobile, l'authentification ne devrait pas échouer
          rethrow;
        }
      }

      // Vérifier qu'on a au moins les infos utilisateur
      if (googleUser.email == null || googleUser.email!.isEmpty) {
        throw Exception('Email Google non disponible. Veuillez réessayer.');
      }

      // Construire le résultat avec les infos disponibles
      final result = <String, dynamic>{
        'provider': 'google',
        'email': googleUser.email,
        'display_name': googleUser.displayName ?? googleUser.email!.split('@')[0],
        'photo_url': googleUser.photoUrl,
      };
      
      // Ajouter les tokens si disponibles
      if (idToken != null && idToken.isNotEmpty) {
        result['id_token'] = idToken;
      }
      
      if (accessToken != null && accessToken.isNotEmpty) {
        result['access_token'] = accessToken;
      }

      // Sur le web, si on n'a pas de tokens mais qu'on a les infos utilisateur,
      // on peut quand même envoyer au backend qui utilisera l'API userinfo
      if (kIsWeb && accessToken == null && idToken == null) {
        SecureLogger.warning('No tokens available, but user info is present. Backend will handle authentication.');
        // On continue quand même, le backend pourra utiliser l'API userinfo avec l'access_token
        // s'il est disponible dans la session Google
      }

      return result;
    } catch (e) {
      SecureLogger.error('Error signing in with Google', error: e);
      // Améliorer les messages d'erreur
      if (e.toString().contains('sign_in_canceled') || e.toString().contains('SIGN_IN_CANCELLED')) {
        // L'utilisateur a annulé, ne pas lever d'exception
        return null;
      }
      if (e.toString().contains('network_error') || e.toString().contains('NETWORK_ERROR')) {
        throw Exception('Erreur de connexion réseau. Vérifiez votre connexion internet.');
      }
      if (e.toString().contains('sign_in_failed') || e.toString().contains('SIGN_IN_FAILED')) {
        throw Exception('Échec de la connexion Google. Veuillez réessayer.');
      }
      rethrow;
    }
  }

  /// Connexion OAuth générique (fallback vers navigateur) - Désactivé, Google uniquement
  static Future<void> signInWithProvider(String provider) async {
    try {
      final callbackUrl = 'fylora://oauth/$provider/callback';
      final oauthUrl = '${AppConstants.apiBaseUrl}/api/auth/$provider?redirect_uri=$callbackUrl';
      
      final uri = Uri.parse(oauthUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
      } else {
        throw 'Impossible d\'ouvrir le navigateur';
      }
    } catch (e) {
      SecureLogger.error('Error signing in with $provider', error: e);
      rethrow;
    }
  }

  /// Déconnexion Google
  static Future<void> signOutGoogle() async {
    try {
      await _googleSignIn.signOut();
    } catch (e) {
      SecureLogger.error('Error signing out from Google', error: e);
    }
  }
}


