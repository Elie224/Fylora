import 'dart:io';
import 'package:flutter/foundation.dart';
import '../models/file.dart';
import '../models/folder.dart';
import '../services/api_service.dart';
import '../utils/file_security.dart';
import '../utils/rate_limiter.dart';
import '../utils/performance_optimizer.dart';
import '../utils/performance_cache.dart';
import '../utils/secure_logger.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';

class FilesProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<FileItem> _files = [];
  List<FolderItem> _folders = [];
  FolderItem? _currentFolder;
  bool _isLoading = false;
  String? _error;
  
  List<FileItem> get files => _files;
  List<FolderItem> get folders => _folders;
  FolderItem? get currentFolder => _currentFolder;
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  List<dynamic> get allItems {
    // Utiliser la memoization pour éviter les recalculs
    return PerformanceOptimizer.memoize(
      'allItems_${_folders.length}_${_files.length}',
      () => [
        ..._folders.map((f) => {'type': 'folder', 'item': f}),
        ..._files.map((f) => {'type': 'file', 'item': f}),
      ],
      expiry: const Duration(seconds: 1),
    ) ?? [];
  }
  
  Future<void> loadFiles({String? folderId, int skip = 0, int limit = 50}) async {
    // Throttle pour éviter les appels trop fréquents
    final throttleKey = 'loadFiles_${folderId ?? 'root'}';
    if (!PerformanceOptimizer.throttle(throttleKey, const Duration(milliseconds: 300))) {
      return; // Ignorer si appelé trop récemment
    }
    
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      final response = await _apiService.listFiles(
        folderId: folderId,
        skip: skip,
        limit: limit,
      );
      
      if (response.statusCode == 200) {
        final items = response.data['data']['items'] ?? [];
        
        // Si c'est une nouvelle page, réinitialiser les listes
        if (skip == 0) {
          _files = [];
          _folders = [];
        }
        
        // Parsing optimisé avec gestion d'erreurs
        for (var item in items) {
          if (item is! Map<String, dynamic>) {
            continue; // Ignorer les items non valides
          }
          
          try {
            // Utiliser le champ 'type' retourné par le backend pour déterminer si c'est un fichier ou un dossier
            if (item['type'] == 'file') {
              final file = FileItem.fromJson(item);
              // Validation supplémentaire après parsing
              if (file.id.isNotEmpty && file.name.isNotEmpty) {
                _files.add(file);
              }
            } else if (item['type'] == 'folder') {
              final folder = FolderItem.fromJson(item);
              // Validation supplémentaire après parsing
              if (folder.id.isNotEmpty && folder.name.isNotEmpty) {
                _folders.add(folder);
              }
            }
          } catch (e) {
            // Logger l'erreur mais continuer pour éviter de planter l'app
            SecureLogger.warning('Failed to parse item: $e', data: {'item': item});
            continue;
          }
        }
        
        // Limiter la taille des listes en mémoire (max 1000 items)
        if (_files.length > 1000) {
          _files = _files.sublist(_files.length - 1000);
        }
        if (_folders.length > 1000) {
          _folders = _folders.sublist(_folders.length - 1000);
        }
        
        // Nettoyer le cache de memoization
        PerformanceOptimizer.cleanExpiredCache();
      }
    } catch (e) {
      _error = e.toString();
    }
    
    _isLoading = false;
    notifyListeners();
  }
  
  Future<bool> uploadFile(String filePath, {String? folderId, Function(int, int)? onProgress}) async {
    try {
      // Rate limiting pour les uploads
      if (!uploadRateLimiter.canMakeRequest('upload')) {
        final waitTime = uploadRateLimiter.getTimeUntilNextRequest('upload');
        _error = 'Trop d\'uploads. Veuillez attendre ${waitTime?.inSeconds ?? 0} secondes.';
        notifyListeners();
        return false;
      }
      
      // Sur mobile, utiliser File de dart:io
      if (!kIsWeb) {
        final file = File(filePath);
        
        // Validation de sécurité du fichier avant upload (uniquement sur mobile)
        final validation = FileSecurity.validateFile(file);
        if (!validation.isValid) {
          _error = validation.error ?? 'Fichier invalide';
          notifyListeners();
          return false;
        }
        
        final path = folderId != null ? '/files?folder=$folderId' : '/files';
        final response = await _apiService.uploadFile(
          path,
          file,
          onProgress: onProgress,
        );
        
        if (response.statusCode == 201 || response.statusCode == 200) {
          // Invalider le cache pour forcer le rechargement
          await PerformanceCache.remove('files_${folderId ?? 'root'}_0_50');
          await loadFiles(folderId: folderId);
          return true;
        } else {
          _error = 'Erreur lors de l\'upload (code: ${response.statusCode})';
          notifyListeners();
          return false;
        }
      } else {
        // Sur web, l'upload doit être fait différemment via PlatformFile
        // Cette méthode ne doit pas être appelée directement sur le web
        _error = 'Upload sur web non supporté via cette méthode';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  /// Upload de fichier avec PlatformFile (support web et mobile)
  Future<bool> uploadFileFromPlatform(PlatformFile platformFile, {String? folderId, Function(int, int)? onProgress}) async {
    try {
      // Rate limiting pour les uploads
      if (!uploadRateLimiter.canMakeRequest('upload')) {
        final waitTime = uploadRateLimiter.getTimeUntilNextRequest('upload');
        _error = 'Trop d\'uploads. Veuillez attendre ${waitTime?.inSeconds ?? 0} secondes.';
        notifyListeners();
        return false;
      }
      
      // Utiliser l'endpoint /files/upload avec folder_id dans le body si nécessaire
      final response = await _apiService.uploadFileFromPlatform(
        '/files/upload',
        platformFile,
        folderId: folderId,
        onProgress: onProgress,
      );
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        // Invalider le cache pour forcer le rechargement
        await PerformanceCache.remove('files_${folderId ?? 'root'}_0_50');
        await loadFiles(folderId: folderId);
        return true;
      } else {
        _error = 'Erreur lors de l\'upload (code: ${response.statusCode})';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  Future<bool> deleteFile(String fileId) async {
    try {
      _error = null;
      final response = await _apiService.deleteFile(fileId);
      if (response.statusCode == 200) {
        // Retirer immédiatement de la liste pour un feedback instantané
        _files.removeWhere((f) => f.id == fileId);
        notifyListeners();
        // Recharger pour s'assurer de la synchronisation
        await loadFiles(folderId: _currentFolder?.id);
        return true;
      } else {
        _error = 'Erreur lors de la suppression du fichier';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  Future<bool> deleteFolder(String folderId) async {
    try {
      _error = null;
      final response = await _apiService.deleteFolder(folderId);
      if (response.statusCode == 200) {
        // Retirer immédiatement de la liste pour un feedback instantané
        _folders.removeWhere((f) => f.id == folderId);
        notifyListeners();
        // Recharger pour s'assurer de la synchronisation
        await loadFiles(folderId: _currentFolder?.id);
        return true;
      } else {
        _error = 'Erreur lors de la suppression du dossier';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  Future<bool> renameFile(String fileId, String newName) async {
    try {
      _error = null;
      final response = await _apiService.renameFile(fileId, newName);
      if (response.statusCode == 200) {
        // Mettre à jour immédiatement dans la liste
        final index = _files.indexWhere((f) => f.id == fileId);
        if (index >= 0) {
          _files[index] = FileItem.fromJson(response.data['data']);
          notifyListeners();
        }
        // Recharger pour s'assurer de la synchronisation
        await loadFiles(folderId: _currentFolder?.id);
        return true;
      } else {
        _error = 'Erreur lors du renommage du fichier';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  Future<bool> renameFolder(String folderId, String newName) async {
    try {
      _error = null;
      final response = await _apiService.renameFolder(folderId, newName);
      if (response.statusCode == 200) {
        // Mettre à jour immédiatement dans la liste
        final index = _folders.indexWhere((f) => f.id == folderId);
        if (index >= 0) {
          _folders[index] = FolderItem.fromJson(response.data['data']);
          notifyListeners();
        }
        // Recharger pour s'assurer de la synchronisation
        await loadFiles(folderId: _currentFolder?.id);
        return true;
      } else {
        _error = 'Erreur lors du renommage du dossier';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  Future<bool> createFolder(String name, {String? parentId}) async {
    try {
      _error = null;
      final response = await _apiService.createFolder(name, parentId: parentId ?? _currentFolder?.id);
      if (response.statusCode == 200 || response.statusCode == 201) {
        // Invalider le cache et recharger
        await loadFiles(folderId: _currentFolder?.id);
        return true;
      } else {
        _error = 'Erreur lors de la création du dossier';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  Future<bool> moveFile(String fileId, String? folderId) async {
    try {
      await _apiService.moveFile(fileId, folderId);
      await loadFiles(folderId: _currentFolder?.id);
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  Future<bool> moveFolder(String folderId, String? parentId) async {
    try {
      _error = null;
      await _apiService.moveFolder(folderId, parentId);
      await loadFiles(folderId: _currentFolder?.id);
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  Future<Response> downloadFolder(String folderId) async {
    return await _apiService.downloadFolder(folderId);
  }
  
  void setCurrentFolder(FolderItem? folder) {
    _currentFolder = folder;
    notifyListeners();
  }
  
  void clearError() {
    _error = null;
    notifyListeners();
  }
}

