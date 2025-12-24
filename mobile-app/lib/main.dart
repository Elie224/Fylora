import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'dart:ui';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'providers/auth_provider.dart';
import 'providers/files_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/notes_provider.dart';
import 'routes/app_router.dart';
import 'utils/constants.dart';
import 'utils/http_cache.dart';
import 'utils/performance_optimizer.dart';
import 'utils/advanced_cache.dart';
import 'utils/offline_first.dart';
import 'utils/performance_monitor.dart';

void main() async {
  // S'assurer que Flutter est initialisé
  WidgetsFlutterBinding.ensureInitialized();
  
  // Gestion globale des erreurs Flutter - CRITIQUE pour éviter les crashes
  FlutterError.onError = (FlutterErrorDetails details) {
    // En production, logger l'erreur mais ne pas faire crasher
    if (kDebugMode) {
      FlutterError.presentError(details);
    }
    debugPrint('Flutter Error: ${details.exception}');
    debugPrint('Stack: ${details.stack}');
  };
  
  // Gestion des erreurs non capturées (dart:ui, isolates, etc.)
  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('Uncaught Error: $error');
    debugPrint('Stack: $stack');
    // Retourner true pour indiquer qu'on a géré l'erreur
    return true;
  };
  
  // Initialisations non-bloquantes - toutes dans des try-catch
  _initializeApp();
  
  // Lancer l'application immédiatement
  runApp(const FyloraApp());
}

/// Initialiser les services de manière asynchrone et non-bloquante
void _initializeApp() {
  // Toutes les initialisations sont asynchrones et ne bloquent pas le démarrage
  Future.microtask(() async {
    try {
      // Initialiser le monitoring de performance
      PerformanceMonitor().init();
    } catch (e) {
      debugPrint('Erreur PerformanceMonitor: $e');
    }
    
    try {
      // Initialiser le cache HTTP
      await HttpCache.initialize();
    } catch (e) {
      debugPrint('Erreur HttpCache: $e');
    }
    
    try {
      // Nettoyer le cache avancé
      await AdvancedCache().cleanExpired();
    } catch (e) {
      debugPrint('Erreur AdvancedCache: $e');
    }
    
    try {
      // Initialiser offline-first
      OfflineFirst();
    } catch (e) {
      debugPrint('Erreur OfflineFirst: $e');
    }
    
    try {
      // Nettoyer le cache expiré
      PerformanceOptimizer.cleanExpiredCache();
    } catch (e) {
      debugPrint('Erreur PerformanceOptimizer: $e');
    }
    
    // Marquer le premier frame rendu après un délai
    Future.delayed(const Duration(milliseconds: 100), () {
      try {
        PerformanceMonitor().markFirstFrame();
        PerformanceMonitor().markTimeToInteractive();
      } catch (e) {
        debugPrint('Erreur marquage performance: $e');
      }
    });
  });
}

class FyloraApp extends StatelessWidget {
  const FyloraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) {
            try {
              return AuthProvider();
            } catch (e) {
              debugPrint('Erreur création AuthProvider: $e');
              return AuthProvider(); // Réessayer une fois
            }
          },
        ),
        ChangeNotifierProvider(
          create: (_) {
            try {
              return FilesProvider();
            } catch (e) {
              debugPrint('Erreur création FilesProvider: $e');
              return FilesProvider();
            }
          },
        ),
        ChangeNotifierProvider(
          create: (_) {
            try {
              return ThemeProvider();
            } catch (e) {
              debugPrint('Erreur création ThemeProvider: $e');
              return ThemeProvider();
            }
          },
        ),
        ChangeNotifierProvider(
          create: (_) {
            try {
              return NotesProvider();
            } catch (e) {
              debugPrint('Erreur création NotesProvider: $e');
              return NotesProvider();
            }
          },
        ),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          try {
            return MaterialApp.router(
            title: 'Fylora',
            debugShowCheckedModeBanner: false,
            theme: ThemeData(
              useMaterial3: true,
              colorScheme: ColorScheme.light(
                primary: AppConstants.fyloraBlue,
                secondary: AppConstants.fyloraDarkBlue,
                surface: AppConstants.fyloraWhite,
                background: AppConstants.fyloraGrey,
                error: AppConstants.errorColor,
                onPrimary: AppConstants.fyloraWhite,
                onSecondary: AppConstants.fyloraWhite,
                onSurface: AppConstants.fyloraDarkBlue,
                onBackground: AppConstants.fyloraDarkBlue,
                onError: AppConstants.fyloraWhite,
                brightness: Brightness.light,
              ),
              scaffoldBackgroundColor: AppConstants.fyloraGrey,
              appBarTheme: AppBarTheme(
                backgroundColor: AppConstants.fyloraBlue,
                foregroundColor: AppConstants.fyloraWhite,
                elevation: 0,
                centerTitle: true,
                titleTextStyle: const TextStyle(
                  color: AppConstants.fyloraWhite,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.fyloraBlue,
                  foregroundColor: AppConstants.fyloraWhite,
                  elevation: 2,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  textStyle: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              inputDecorationTheme: InputDecorationTheme(
                filled: true,
                fillColor: AppConstants.fyloraWhite,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppConstants.fyloraBlue, width: 2),
                ),
                errorBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppConstants.errorColor),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
              cardTheme: CardThemeData(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                color: AppConstants.fyloraWhite,
              ),
            ),
            darkTheme: ThemeData(
              useMaterial3: true,
              colorScheme: ColorScheme.dark(
                primary: AppConstants.fyloraBlue,
                secondary: AppConstants.fyloraDarkBlue,
                surface: const Color(0xFF1E1E1E),
                background: const Color(0xFF121212),
                error: AppConstants.errorColor,
                onPrimary: AppConstants.fyloraWhite,
                onSecondary: AppConstants.fyloraWhite,
                onSurface: AppConstants.fyloraWhite,
                onBackground: AppConstants.fyloraWhite,
                onError: AppConstants.fyloraWhite,
                brightness: Brightness.dark,
              ),
              scaffoldBackgroundColor: const Color(0xFF121212),
              appBarTheme: AppBarTheme(
                backgroundColor: AppConstants.fyloraDarkBlue,
                foregroundColor: AppConstants.fyloraWhite,
                elevation: 0,
                centerTitle: true,
                titleTextStyle: const TextStyle(
                  color: AppConstants.fyloraWhite,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.fyloraBlue,
                  foregroundColor: AppConstants.fyloraWhite,
                  elevation: 2,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  textStyle: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              inputDecorationTheme: InputDecorationTheme(
                filled: true,
                fillColor: const Color(0xFF1E1E1E),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade700),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade700),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppConstants.fyloraBlue, width: 2),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
              cardTheme: CardThemeData(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                color: const Color(0xFF1E1E1E),
              ),
            ),
            themeMode: themeProvider.themeMode,
            locale: const Locale('fr', 'FR'),
            supportedLocales: const [
              Locale('fr', 'FR'),
            ],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            routerConfig: AppRouter.createRouter(),
          );
          } catch (e) {
            // En cas d'erreur critique, afficher une page d'erreur
            debugPrint('Erreur critique dans MaterialApp.router: $e');
            return MaterialApp(
              home: Scaffold(
                body: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text('Erreur de démarrage: $e'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          // Redémarrer l'application
                          main();
                        },
                        child: const Text('Réessayer'),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }
        },
      ),
    );
  }
}

