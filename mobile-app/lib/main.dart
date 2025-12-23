import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart';

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
import 'utils/view_preloader.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialiser le monitoring de performance
  PerformanceMonitor().init();
  
  // Initialiser le cache HTTP de manière asynchrone
  HttpCache.initialize();
  
  // Initialiser le cache avancé
  await AdvancedCache().cleanExpired();
  
  // Initialiser offline-first
  OfflineFirst();
  
  // Nettoyer le cache expiré au démarrage
  PerformanceOptimizer.cleanExpiredCache();
  
  runApp(const FyloraApp());
  
  // Marquer le premier frame rendu
  WidgetsBinding.instance.addPostFrameCallback((_) {
    PerformanceMonitor().markFirstFrame();
    PerformanceMonitor().markTimeToInteractive();
  });
}

class FyloraApp extends StatelessWidget {
  const FyloraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => FilesProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => NotesProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
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
              cardTheme: CardTheme(
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
              cardTheme: CardTheme(
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
            routerConfig: AppRouter.createRouter(context),
          );
        },
      ),
    );
  }
}

