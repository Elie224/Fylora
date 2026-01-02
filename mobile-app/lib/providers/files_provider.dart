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
  
  Future<void> loadFiles({String? folderId, int skip = 0, int limit = 50, bool force = false}) async {
    // Throttle pour éviter les appels trop fréquents (sauf si force = true)
    if (!force) {
      final throttleKey = 'loadFiles_${folderId ?? 'root'}';
      if (!PerformanceOptimizer.throttle(throttleKey, const Duration(milliseconds: 300))) {
        return; // Ignorer si appelé trop récemment
      }
    }
    
    _isLoading = true;
    _error = null;
    
    // Mettre à jour le dossier courant si un folderId est fourni
    if (folderId != null && (_currentFolder == null || _currentFolder!.id != folderId)) {
      try {
        final folderResponse = await _apiService.getFolder(folderId);
        if (folderResponse.statusCode == 200) {
          _currentFolder = FolderItem.fromJson(folderResponse.data['data']);
        }
      } catch (e) {
        // Si on ne peut pas charger le dossier, continuer quand même
        _currentFolder = null;
      }
    } else if (folderId == null) {
      _currentFolder = null; // On est à la racine
    }
    
    notifyListeners();
    
    try {
      final response = await _apiService.listFiles(
        folderId: folderId,
        skip: skip,
        limit: limit,
        force: force, // Passer le paramètre force pour désactiver le cache si nécessaire
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
      } else {
        _error = 'Erreur lors du chargement des fichiers (code: ${response.statusCode})';
      }
    } catch (e) {
      _error = 'Erreur lors du chargement: ${e.toString()}';
      print('❌ [FilesProvider] Erreur loadFiles: $_error');
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
          await loadFiles(folderId: folderId, force: true);
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
      print('🔵 [FilesProvider] Début uploadFileFromPlatform: name=${platformFile.name}, folderId=$folderId');
      
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
      
      print('🔵 [FilesProvider] Réponse upload: statusCode=${response.statusCode}');
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        print('✅ [FilesProvider] Upload réussi');
        // Ajouter le fichier à la liste localement pour une mise à jour immédiate
        try {
          final fileData = response.data['data'];
          if (fileData != null) {
            final newFile = FileItem.fromJson(fileData);
            _files.add(newFile);
            notifyListeners();
          }
        } catch (e) {
          // Si le parsing échoue, recharger depuis le serveur
        }
        
        // Invalider le cache et recharger pour s'assurer que tout est à jour
        await PerformanceCache.remove('files_${folderId ?? 'root'}_0_50');
        // Recharger avec force pour s'assurer que les données sont à jour
        await loadFiles(folderId: folderId, force: true);
        return true;
      } else {
        final errorMsg = response.data?['error']?['message'] ?? response.data?['message'] ?? 'Erreur lors de l\'upload';
        _error = 'Erreur lors de l\'upload (code: ${response.statusCode}): $errorMsg';
        print('❌ [FilesProvider] Erreur upload: $_error');
        notifyListeners();
        return false;
      }
    } catch (e, stackTrace) {
      print('❌ [FilesProvider] Exception upload: $e');
      print('❌ [FilesProvider] Stack: $stackTrace');
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  Future<bool> deleteFile(String fileId, {String? currentFolderId}) async {
    try {
      _error = null;
      final folderIdToReload = currentFolderId ?? _currentFolder?.id;
      
      // Invalider le cache AVANT la suppression pour éviter les problèmes de cache
      await PerformanceCache.remove('files_${folderIdToReload ?? 'root'}_0_50');
      
      final response = await _apiService.deleteFile(fileId);
      if (response.statusCode == 200) {
        // Retirer immédiatement de la liste pour un feedback instantané
        _files.removeWhere((f) => f.id == fileId);
        notifyListeners();
        
        // Invalider tous les caches liés aux fichiers
        await PerformanceCache.clear();
        
        // Recharger pour s'assurer de la synchronisation avec le bon folderId
        await loadFiles(folderId: folderIdToReload, force: true);
        return true;
      } else {
        _error = 'Erreur lors de la suppression du fichier (code: ${response.statusCode})';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Erreur lors de la suppression: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }
  
  Future<bool> deleteFolder(String folderId, {String? currentFolderId}) async {
    try {
      _error = null;
      final folderIdToReload = currentFolderId ?? _currentFolder?.id;
      
      // Invalider le cache AVANT la suppression
      await PerformanceCache.remove('files_${folderIdToReload ?? 'root'}_0_50');
      
      final response = await _apiService.deleteFolder(folderId);
      if (response.statusCode == 200) {
        // Retirer immédiatement de la liste pour un feedback instantané
        _folders.removeWhere((f) => f.id == folderId);
        notifyListeners();
        
        // Invalider tous les caches liés
        await PerformanceCache.clear();
        
        // Recharger pour s'assurer de la synchronisation avec le bon folderId
        await loadFiles(folderId: folderIdToReload, force: true);
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
  
  Future<bool> renameFile(String fileId, String newName, {String? currentFolderId}) async {
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
        // Recharger pour s'assurer de la synchronisation avec le bon folderId
        final folderIdToReload = currentFolderId ?? _currentFolder?.id;
        await loadFiles(folderId: folderIdToReload, force: true);
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
  
  Future<bool> renameFolder(String folderId, String newName, {String? currentFolderId}) async {
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
        // Recharger pour s'assurer de la synchronisation avec le bon folderId
        final folderIdToReload = currentFolderId ?? _currentFolder?.id;
        await loadFiles(folderId: folderIdToReload, force: true);
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
      // Utiliser le parentId fourni, sinon le dossier courant, sinon null (racine)
      final actualParentId = parentId ?? _currentFolder?.id;
      final response = await _apiService.createFolder(name, parentId: actualParentId);
      if (response.statusCode == 200 || response.statusCode == 201) {
        // Ajouter le nouveau dossier à la liste localement pour une mise à jour immédiate
        try {
          final folderData = response.data['data'];
          if (folderData != null) {
            final newFolder = FolderItem.fromJson(folderData);
            _folders.add(newFolder);
            notifyListeners();
          }
        } catch (e) {
          // Si le parsing échoue, recharger depuis le serveur
        }
        
        // Recharger pour s'assurer que tout est à jour
        await loadFiles(folderId: actualParentId, force: true);
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
  
  Future<bool> moveFile(String fileId, String? folderId, {String? currentFolderId}) async {
    try {
      _error = null;
      await _apiService.moveFile(fileId, folderId);
      // Retirer le fichier de la liste actuelle pour un feedback instantané
      _files.removeWhere((f) => f.id == fileId);
      notifyListeners();
      // Recharger pour s'assurer de la synchronisation avec le bon folderId
      final folderIdToReload = currentFolderId ?? _currentFolder?.id;
      await loadFiles(folderId: folderIdToReload, force: true);
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  Future<bool> moveFolder(String folderId, String? parentId, {String? currentFolderId}) async {
    try {
      _error = null;
      await _apiService.moveFolder(folderId, parentId);
      // Retirer le dossier de la liste actuelle pour un feedback instantané
      _folders.removeWhere((f) => f.id == folderId);
      notifyListeners();
      // Recharger pour s'assurer de la synchronisation avec le bon folderId
      final folderIdToReload = currentFolderId ?? _currentFolder?.id;
      await loadFiles(folderId: folderIdToReload, force: true);
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

