/// Provider pour gérer la langue de l'application
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

class LanguageProvider with ChangeNotifier {
  Locale _locale = const Locale('fr', 'FR');
  static const String _languageKey = 'language';

  LanguageProvider() {
    _loadLanguage();
  }

  Locale get locale => _locale;
  String get languageCode => _locale.languageCode;

  /// Charger la langue depuis le stockage
  Future<void> _loadLanguage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedLanguage = prefs.getString(_languageKey);
      if (savedLanguage != null) {
        _locale = Locale(savedLanguage);
        Intl.defaultLocale = savedLanguage;
        notifyListeners();
      }
    } catch (e) {
      print('Error loading language: $e');
    }
  }

  /// Changer la langue
  Future<void> setLanguage(Locale locale) async {
    _locale = locale;
    Intl.defaultLocale = locale.languageCode;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_languageKey, locale.languageCode);
    } catch (e) {
      print('Error saving language: $e');
    }
  }

  /// Langues supportées
  static const List<Locale> supportedLocales = [
    Locale('fr', 'FR'),
    Locale('en', 'US'),
  ];
}





