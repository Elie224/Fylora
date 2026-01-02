import 'package:google_sign_in/google_sign_in.dart';
import 'package:url_launcher/url_launcher.dart';
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
    scopes: ['email', 'profile'],
    // Pour le web, le clientId est lu depuis la balise meta
    // clientId: _googleClientId, // Décommenter si nécessaire pour mobile
  );

  /// Connexion avec Google (natif)
  static Future<Map<String, dynamic>?> signInWithGoogle() async {
    try {
      // Déconnecter d'abord pour éviter les problèmes de cache
      await _googleSignIn.signOut();
      
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      
      if (googleUser == null) {
        // L'utilisateur a annulé la connexion
        return null;
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      // Vérifier que les tokens sont présents
      if (googleAuth.idToken == null) {
        throw Exception('Token Google manquant. Veuillez réessayer.');
      }

      // Envoyer le token au backend pour validation et création de compte
      return {
        'provider': 'google',
        'id_token': googleAuth.idToken!,
        'access_token': googleAuth.accessToken,
        'email': googleUser.email,
        'display_name': googleUser.displayName,
        'photo_url': googleUser.photoUrl,
      };
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


