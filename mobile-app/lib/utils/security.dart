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

// SecureStorage a été déplacé dans services/secure_storage.dart
// Importez-le avec: import '../services/secure_storage.dart';

/// Valider un chemin de fichier pour prévenir les directory traversal
bool validateFilePath(String filePath, String baseDir) {
  final normalizedPath = filePath.replaceAll('..', '');
  return normalizedPath.startsWith(baseDir);
}





