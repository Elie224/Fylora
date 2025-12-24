/// Provider pour gérer le thème de l'application
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeProvider with ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.light;
  static const String _themeKey = 'theme_mode';

  ThemeProvider() {
    // Charger le thème de manière asynchrone sans bloquer
    _loadTheme().catchError((e) {
      // Ignorer les erreurs de chargement du thème
    });
  }

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == ThemeMode.dark;

  /// Charger le thème depuis le stockage
  Future<void> _loadTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedTheme = prefs.getString(_themeKey);
      if (savedTheme != null) {
        _themeMode = savedTheme == 'dark' ? ThemeMode.dark : ThemeMode.light;
        notifyListeners();
      }
    } catch (e) {
      print('Error loading theme: $e');
    }
  }

  /// Changer le thème
  Future<void> setTheme(ThemeMode mode) async {
    _themeMode = mode;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_themeKey, mode == ThemeMode.dark ? 'dark' : 'light');
    } catch (e) {
      print('Error saving theme: $e');
    }
  }

  /// Basculer entre clair et sombre
  Future<void> toggleTheme() async {
    await setTheme(_themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark);
  }
}
