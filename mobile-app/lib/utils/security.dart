/// Utilitaires de sécurité pour l'application mobile
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Valider un email
bool isValidEmail(String email) {
  final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  return emailRegex.hasMatch(email);
}

/// Valider un mot de passe fort
bool isValidPassword(String password) {
  // Au moins 8 caractères, une majuscule, une minuscule, un chiffre
  final passwordRegex = RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$');
  return passwordRegex.hasMatch(password);
}

/// Valider et nettoyer un nom de fichier
String sanitizeFileName(String fileName) {
  // Supprimer les caractères dangereux
  return fileName
      .replaceAll(RegExp(r'[<>:"/\\|?*\x00-\x1f]'), '')
      .replaceAll('..', '')
      .trim()
      .substring(0, fileName.length > 255 ? 255 : fileName.length);
}

/// Échapper les caractères HTML
String escapeHtml(String text) {
  return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
}

/// Générer un hash SHA-256
String generateHash(String input) {
  final bytes = utf8.encode(input);
  final digest = sha256.convert(bytes);
  return digest.toString();
}

/// Gestion sécurisée du stockage
class SecureStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  /// Stocker une valeur de manière sécurisée
  static Future<void> setSecure(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (e) {
      print('Failed to store secure value: $e');
    }
  }

  /// Récupérer une valeur de manière sécurisée
  static Future<String?> getSecure(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (e) {
      print('Failed to retrieve secure value: $e');
      return null;
    }
  }

  /// Supprimer une valeur de manière sécurisée
  static Future<void> deleteSecure(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (e) {
      print('Failed to delete secure value: $e');
    }
  }

  /// Supprimer toutes les valeurs
  static Future<void> deleteAll() async {
    try {
      await _storage.deleteAll();
    } catch (e) {
      print('Failed to delete all secure values: $e');
    }
  }
}

/// Valider un chemin de fichier pour prévenir les directory traversal
bool validateFilePath(String filePath, String baseDir) {
  final normalizedPath = filePath.replaceAll('..', '');
  return normalizedPath.startsWith(baseDir);
}





