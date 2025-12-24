import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/files/files_screen.dart';
import '../screens/files/preview_screen.dart';
import '../screens/files/image_gallery_screen.dart';
import '../screens/search/search_screen.dart';
import '../screens/settings/settings_screen.dart';
import '../screens/share/share_screen.dart';
import '../screens/share/public_share_screen.dart';
import '../screens/trash/trash_screen.dart';
import '../screens/notes/notes_list_screen.dart';
import '../screens/notes/note_edit_screen.dart';
import '../screens/activity/activity_screen.dart';
import '../screens/admin/admin_screen.dart';
import '../screens/notifications/notifications_screen.dart';
import '../providers/auth_provider.dart';
import '../models/file.dart';

class AppRouter {
  static GoRouter createRouter() {
    return GoRouter(
      initialLocation: '/login',
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/signup',
          builder: (context, state) => const SignupScreen(),
        ),
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardScreen(),
        ),
        GoRoute(
          path: '/files',
          builder: (context, state) {
            final folderId = state.uri.queryParameters['folder'];
            return FilesScreen(folderId: folderId);
          },
        ),
        GoRoute(
          path: '/preview/:id',
          builder: (context, state) {
            final fileId = state.pathParameters['id']!;
            return PreviewScreen(fileId: fileId);
          },
        ),
        GoRoute(
          path: '/gallery',
          builder: (context, state) {
            // Les images seront passées via les arguments de navigation
            final imagesJson = state.extra as List<dynamic>?;
            final initialIndex = state.uri.queryParameters['index'];
            if (imagesJson == null) {
              return const Scaffold(
                body: Center(child: Text('Aucune image disponible')),
              );
            }
            final images = imagesJson.map((json) => FileItem.fromJson(json)).toList();
            return ImageGalleryScreen(
              images: images,
              initialIndex: initialIndex != null ? int.tryParse(initialIndex) ?? 0 : 0,
            );
          },
        ),
        GoRoute(
          path: '/search',
          builder: (context, state) => const SearchScreen(),
        ),
        GoRoute(
          path: '/settings',
          builder: (context, state) => const SettingsScreen(),
        ),
        GoRoute(
          path: '/trash',
          builder: (context, state) => const TrashScreen(),
        ),
        GoRoute(
          path: '/share',
          builder: (context, state) {
            final fileId = state.uri.queryParameters['file'];
            final folderId = state.uri.queryParameters['folder'];
            return ShareScreen(fileId: fileId, folderId: folderId);
          },
        ),
        // Route pour les liens de partage publics (accessible sans authentification)
        GoRoute(
          path: '/share/:token',
          builder: (context, state) {
            final token = state.pathParameters['token']!;
            return PublicShareScreen(token: token);
          },
        ),
        GoRoute(
          path: '/notes',
          builder: (context, state) => const NotesListScreen(),
        ),
        GoRoute(
          path: '/notes/:id',
          builder: (context, state) {
            final noteId = state.pathParameters['id']!;
            return NoteEditScreen(noteId: noteId);
          },
        ),
        GoRoute(
          path: '/activity',
          builder: (context, state) => const ActivityScreen(),
        ),
        GoRoute(
          path: '/admin',
          builder: (context, state) => const AdminScreen(),
        ),
        GoRoute(
          path: '/notifications',
          builder: (context, state) => const NotificationsScreen(),
        ),
      ],
      redirect: (context, state) {
        try {
          // Vérifier si le context est disponible et contient les providers
          if (!context.mounted) {
            return '/login';
          }
          
          try {
            final authProvider = Provider.of<AuthProvider>(context, listen: false);
            final isLoggedIn = authProvider.isAuthenticated;
            final isLoginRoute = state.matchedLocation == '/login' || state.matchedLocation == '/signup';
            final isPublicShareRoute = state.matchedLocation.startsWith('/share/') && 
                                       state.pathParameters.containsKey('token');
            
            // Permettre l'accès aux liens de partage publics sans authentification
            if (isPublicShareRoute) {
              return null;
            }
            
            if (!isLoggedIn && !isLoginRoute) {
              return '/login';
            }
            
            if (isLoggedIn && isLoginRoute) {
              return '/dashboard';
            }
            
            return null;
          } catch (e) {
            // Si le provider n'est pas disponible, rediriger vers login
            debugPrint('Provider non disponible dans redirect: $e');
            final isLoginRoute = state.matchedLocation == '/login' || state.matchedLocation == '/signup';
            return isLoginRoute ? null : '/login';
          }
        } catch (e) {
          // En cas d'erreur, rediriger vers login
          debugPrint('Erreur dans redirect: $e');
          return '/login';
        }
      },
      errorBuilder: (context, state) => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text('Erreur de navigation: ${state.error}'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go('/login'),
                child: const Text('Retour à l\'accueil'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
