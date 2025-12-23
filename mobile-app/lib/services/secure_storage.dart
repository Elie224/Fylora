/// Wrapper pour FlutterSecureStorage avec gestion d'erreurs améliorée
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      sharedPreferencesName: 'fylora_secure',
      preferencesKeyPrefix: 'fylora_',
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
      rethrow;
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

  /// Vérifier si une clé existe
  static Future<bool> containsKey(String key) async {
    try {
      final value = await _storage.read(key: key);
      return value != null;
    } catch (e) {
      return false;
    }
  }
}





