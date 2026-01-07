import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fileService, folderService, shareService, userService, apiClient } from '../services/api';
import { tagsService } from '../services/tagsService';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuthStore } from '../services/authStore';
import { useTheme } from '../contexts/ThemeContext';
import { FileListSkeleton } from '../components/SkeletonLoader';
import { VirtualList } from '../components/VirtualList';
import { prefetchManager } from '../utils/prefetch';
import { registerShortcut, CommonShortcuts } from '../utils/keyboardShortcuts';
import AdvancedFilters from '../components/AdvancedFilters';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Toast';

export default function Files() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage(); // Inclure language pour forcer le re-render
  const { logout } = useAuthStore();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [items, setItems] = useState([]);
  
  // Couleurs dynamiques selon le thème - Thème clair amélioré
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const secondaryBg = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f0f4f8';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';
  const shadowHover = theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.12)';
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [showShareModal, setShowShareModal] = useState(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [shareType, setShareType] = useState('public'); // 'public' ou 'internal'
  const [shareUserSearch, setShareUserSearch] = useState('');
  const [shareUsers, setShareUsers] = useState([]);
  const [selectedShareUser, setSelectedShareUser] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemToMove, setItemToMove] = useState(null);
  const [availableFolders, setAvailableFolders] = useState([]);
  const [selectedDestinationFolder, setSelectedDestinationFolder] = useState(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [error, setError] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('filesViewMode');
    return saved || 'list'; // 'list' ou 'grid'
  });

  // Gérer la déconnexion automatique
  useEffect(() => {
    const handleLogout = async () => {
      await logout();
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout, navigate]);

  // Charger le dossier depuis les paramètres URL au montage
  useEffect(() => {
    const folderId = searchParams.get('folder');
    if (folderId && folderId !== currentFolder?.id) {
      // Charger les informations du dossier
      folderService.get(folderId).then(response => {
        if (response && response.data && response.data.data) {
          const folder = response.data.data;
          setCurrentFolder(folder);
          setError(null);
          // Recharger les fichiers après avoir chargé le dossier
          setTimeout(() => {
            loadFiles(true);
          }, 100);
        } else {
          throw new Error(t('invalidResponseStructure'));
        }
      }).catch(err => {
        console.error('Failed to load folder:', err);
        setError(t('cannotLoadFolder') + ' ' + (err.response?.data?.error?.message || err.message || t('unknownError')));
      });
    } else if (!folderId) {
      // Si pas de folderId dans l'URL, réinitialiser le dossier courant
      setCurrentFolder(null);
      // Recharger les fichiers de la racine
      setTimeout(() => {
        loadFiles(true);
      }, 100);
    }
  }, [searchParams, t]);

  const loadTags = useCallback(async () => {
    try {
      const response = await tagsService.listTags();
      setAvailableTags(response.data?.tags || []);
    } catch (err) {
      console.error('Failed to load tags:', err);
      // Ne pas bloquer l'application si les tags ne se chargent pas
    }
  }, []);

  const toggleSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const downloadBatch = async () => {
    if (selectedItems.size === 0) {
      showToast(t('selectAtLeastOne'), 'warning');
      return;
    }

    try {
      const fileIds = [];
      const folderIds = [];

      items.forEach(item => {
        const itemId = item.id || item._id;
        if (selectedItems.has(itemId)) {
          if (item.type === 'folder' || item.parent_id !== undefined) {
            folderIds.push(itemId);
          } else {
            fileIds.push(itemId);
          }
        }
      });

      const response = await fileService.downloadBatch(fileIds, folderIds);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fylora_download_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSelectedItems(new Set());
    } catch (err) {
      console.error('Batch download failed:', err);
      showToast(err.response?.data?.error?.message || t('downloadError'), 'error');
    }
  };

  const loadFiles = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      // Forcer le rechargement sans cache si demandé
      const params = forceRefresh ? { _t: Date.now() } : {};
      const response = await fileService.list(currentFolder?.id || null, params);
      
      // Vérifier la structure de réponse avant d'accéder aux données
      if (!response || !response.data) {
        throw new Error(t('invalidServerResponse'));
      }
      
      const items = response.data?.data?.items || response.data?.items || [];
      setItems(items);
    } catch (err) {
      console.error('Failed to load files:', err);
      const errorMessage = err.response?.data?.error?.message || err.message || t('unknownError');
      const statusCode = err.response?.status;
      
      // Si c'est une erreur 401, ne pas afficher d'erreur car la redirection est gérée par l'intercepteur
      if (statusCode === 401) {
        // L'intercepteur va gérer la redirection via l'événement auth:logout
        setLoading(false);
        return;
      }
      
      let userMessage = t('loadError') || 'Erreur lors du chargement des fichiers';
      
      if (statusCode === 403) {
        userMessage = t('accessDenied');
      } else if (statusCode === 404) {
        userMessage = t('folderNotFound');
      } else if (!err.response) {
        userMessage = t('cannotConnectToServer') || 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
      } else {
        userMessage += ': ' + errorMessage;
      }
      
      setError(userMessage);
      setItems([]); // Vider la liste en cas d'erreur
    } finally {
      setLoading(false);
    }
  }, [currentFolder?.id, t]);

  // Charger les fichiers et tags au montage
  useEffect(() => {
    loadFiles();
    loadTags();
  }, [loadFiles, loadTags]);
  
  // Recharger les fichiers quand le dossier change (séparé pour éviter les conflits)
  const prevFolderIdRef = useRef(currentFolder?.id);
  useEffect(() => {
    // Ne recharger que si le dossier a vraiment changé
    if (prevFolderIdRef.current !== currentFolder?.id) {
      prevFolderIdRef.current = currentFolder?.id;
      loadFiles(true);
    }
  }, [currentFolder?.id, loadFiles]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    uploadFiles(files);
  };

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const progress = {};
    const uploadedFiles = []; // Pour la mise à jour optimiste
    const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50 MB
    
    try {
      for (const file of files) {
        progress[file.name] = 0;
        setUploadProgress({ ...progress });
        
        try {
          // Utiliser upload multipart pour les gros fichiers (> 50MB)
          if (file.size > LARGE_FILE_THRESHOLD) {
            const MultipartUploader = (await import('../utils/multipartUpload')).default;
            const uploader = new MultipartUploader(file, {
              onProgress: (percent, uploaded, total) => {
                progress[file.name] = percent;
                setUploadProgress({ ...progress });
              },
              onComplete: (result) => {
                progress[file.name] = 100;
                setUploadProgress({ ...progress });
                
                // Créer l'entrée en base de données
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                const token = localStorage.getItem('access_token');
                
                fetch(`${apiUrl}/api/files`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: file.name,
                    mimeType: file.type,
                    size: result.size || file.size,
                    folderId: currentFolder?.id || null,
                    filePath: result.filePath || result.fileKey || result.path,
                    storageType: 'local',
                  }),
                })
                .then(res => res.json())
                .then(data => {
                  if (data.data) {
                    uploadedFiles.push(data.data);
                    setItems(prevItems => {
                      const exists = prevItems.some(item => (item.id || item._id) === (data.data.id || data.data._id));
                      if (exists) return prevItems;
                      return [...prevItems, { ...data.data, type: 'file' }];
                    });
                  }
                })
                .catch(err => {
                  console.error('Error creating file record:', err);
                });
              },
              onError: (err) => {
                console.error(`Multipart upload failed for ${file.name}:`, err);
                const errorMsg = err.response?.data?.error?.message || err.message || t('uploadError');
                showToast(`${t('error')} ${file.name}: ${errorMsg}`, 'error');
                progress[file.name] = -1;
                setUploadProgress({ ...progress });
              },
            });
            
            await uploader.start();
          } else {
            // Upload normal pour petits fichiers
            const response = await fileService.upload(
              file, 
              currentFolder?.id || null,
              (percent) => {
                progress[file.name] = percent;
                setUploadProgress({ ...progress });
              }
            );
            
            // Mise à jour optimiste : ajouter le fichier immédiatement à la liste
            if (response?.data?.data) {
              const uploadedFile = response.data.data;
              uploadedFiles.push(uploadedFile);
              // Ajouter immédiatement à la liste pour feedback instantané
              setItems(prevItems => {
                // Vérifier si le fichier n'est pas déjà dans la liste
                const exists = prevItems.some(item => (item.id || item._id) === (uploadedFile.id || uploadedFile._id));
                if (exists) return prevItems;
                return [...prevItems, { ...uploadedFile, type: 'file' }];
              });
            }
            
            progress[file.name] = 100;
            setUploadProgress({ ...progress });
          }
        } catch (fileErr) {
          console.error(`Upload failed for ${file.name}:`, fileErr);
          const errorMsg = fileErr.response?.data?.error?.message || fileErr.message || t('uploadError');
          showToast(`${t('error')} ${file.name}: ${errorMsg}`, 'error');
          progress[file.name] = -1; // Marquer comme échoué
          setUploadProgress({ ...progress });
        }
      }
      
      // Recharger la liste des fichiers après tous les uploads (forcer le rechargement)
      await loadFiles(true);
      setUploadProgress({});
    } catch (err) {
      console.error('Upload failed:', err);
      showToast(t('uploadError') + ': ' + (err.response?.data?.error?.message || err.message), 'error');
      // Recharger même en cas d'erreur pour avoir l'état correct
      await loadFiles(true);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      // S'assurer que parent_id est null ou une chaîne valide
      const parentId = currentFolder?.id || currentFolder?._id || null;
      
      // Convertir en chaîne si c'est un ObjectId, sinon null
      const normalizedParentId = parentId ? String(parentId) : null;
      
      console.log('Creating folder with:', { name: newFolderName.trim(), parent_id: normalizedParentId });
      
      // Mise à jour optimiste : ajouter le dossier immédiatement à la liste
      const folderName = newFolderName.trim();
      const tempFolder = {
        id: `temp-${Date.now()}`,
        name: folderName,
        type: 'folder',
        parent_id: normalizedParentId,
        created_at: new Date().toISOString(),
        isTemp: true // Marquer comme temporaire
      };
      setItems(prevItems => [...prevItems, tempFolder]);
      setNewFolderName('');
      setShowNewFolder(false);
      
      const response = await folderService.create(folderName, normalizedParentId);
      
      // Remplacer le dossier temporaire par le vrai dossier
      if (response?.data?.data) {
        const createdFolder = response.data.data;
        setItems(prevItems => 
          prevItems.map(item => 
            item.id === tempFolder.id 
              ? { ...createdFolder, type: 'folder' }
              : item
          )
        );
      }
      
      // Recharger la liste (forcer le rechargement) pour avoir les données complètes
      await loadFiles(true);
    } catch (err) {
      console.error('Failed to create folder:', err);
      console.error('Error response:', err.response?.data);
      
      // Retirer le dossier temporaire en cas d'erreur
      setItems(prevItems => prevItems.filter(item => !item.isTemp));
      
      // Construire un message d'erreur détaillé
      let errorMessage = t('unknownError');
      if (err.response?.data?.error) {
        if (err.response.data.error.details && Array.isArray(err.response.data.error.details)) {
          errorMessage = err.response.data.error.details.map(d => d.message).join('\n');
        } else if (err.response.data.error.message) {
          errorMessage = err.response.data.error.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      showToast(t('createFolderError') + ': ' + errorMessage, 'error');
    }
  };

  const renameItem = async () => {
    if (!editName.trim() || !editingItem) return;
    try {
      // Mise à jour optimiste : mettre à jour le nom immédiatement
      const newName = editName.trim();
      setItems(prevItems => 
        prevItems.map(item => {
          const itemId = item.id || item._id;
          const editingId = editingItem.id || editingItem._id;
          if (itemId === editingId) {
            return { ...item, name: newName };
          }
          return item;
        })
      );
      
      if (editingItem.type === 'folder') {
        await folderService.rename(editingItem.id, newName);
      } else {
        await fileService.rename(editingItem.id, newName);
      }
      
      setEditingItem(null);
      setEditName('');
      
      // Recharger immédiatement pour avoir les données complètes
      await loadFiles(true);
    } catch (err) {
      console.error('Failed to rename:', err);
      showToast(t('renameError'), 'error');
      // Recharger en cas d'erreur pour récupérer l'état correct
      await loadFiles(true);
    }
  };

  const deleteItem = (item) => {
    console.log('=== DELETE ITEM REQUEST ===');
    console.log('Item received:', item);
    
    if (!item) {
      console.error('❌ No item provided');
      showToast(t('errorNoItemSelected'), 'warning');
      return;
    }
    
    const itemId = item.id || item._id;
    if (!itemId) {
      console.error('❌ Item has no id:', item);
      showToast(t('errorNoItemId'), 'error');
      return;
    }
    
    // Stocker l'item à supprimer et afficher la modal
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) {
      console.error('❌ No item to delete');
      return;
    }
    
    const item = itemToDelete;
    const itemId = item.id || item._id;
    const itemName = item.name || 'cet élément';
    const itemType = item.type || (item.folder_id !== undefined ? 'file' : 'folder');
    
    console.log('=== CONFIRM DELETE START ===');
    console.log('Deleting:', { id: itemId, name: itemName, type: itemType });
    
    // Fermer la modal
    setItemToDelete(null);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error(t('mustBeConnectedToDelete'));
      }
      
      const endpoint = itemType === 'folder' 
        ? `${apiUrl}/api/folders/${itemId}`
        : `${apiUrl}/api/files/${itemId}`;
      
      console.log('Making DELETE request to:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      const responseData = await response.json().catch(() => ({ message: 'No JSON response' }));
      console.log('Response data:', responseData);
      
      if (!response.ok) {
        const errorMsg = responseData.error?.message || responseData.message || `Erreur ${response.status}`;
        console.error('❌ Delete failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('✅ Deletion successful!');
      
      // Mise à jour optimiste : supprimer l'élément de la liste immédiatement
      setItems(prevItems => {
        const filtered = prevItems.filter(item => {
          const itemIdToCheck = item.id || item._id;
          return itemIdToCheck !== itemId;
        });
        return filtered;
      });
      
      // Recharger la liste après suppression (forcer le rechargement sans cache) - IMMÉDIATEMENT
      // Ne pas attendre, faire en parallèle
      loadFiles(true).catch(err => {
        console.error('Error reloading files after deletion:', err);
      });
      
      showToast(t('deletedSuccessfully') || 'Fichier supprimé avec succès', 'success');
      
      // Ne pas afficher d'alert pour une meilleure UX - la suppression est visible immédiatement
      // alert(`✅ "${itemName}" ${t('deletedSuccessfully')}`);
    } catch (err) {
      console.error('❌ Deletion error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      });
      
      const errorMessage = err.message || 'Erreur lors de la suppression';
      showToast(`${t('deleteError')}: ${errorMessage}`, 'error');
    }
    
    console.log('=== CONFIRM DELETE END ===');
  };

  // Rechercher des utilisateurs pour le partage interne
  const searchUsers = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setShareUsers([]);
      return;
    }
    try {
      const response = await userService.listUsers(searchTerm);
      setShareUsers(response.data.data || []);
    } catch (err) {
      console.error('Failed to search users:', err);
      setShareUsers([]);
    }
  };

  useEffect(() => {
    if (shareType === 'internal' && shareUserSearch) {
      const timeoutId = setTimeout(() => {
        searchUsers(shareUserSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setShareUsers([]);
    }
  }, [shareUserSearch, shareType]);

  const shareItem = async () => {
    if (!showShareModal) return;
    
    // Vérifier que l'utilisateur est connecté
    const token = localStorage.getItem('access_token');
    if (!token) {
      showToast(t('mustBeConnected'), 'warning');
      navigate('/login');
      return;
    }
    
    try {
      // Partage interne
      if (shareType === 'internal') {
        if (!selectedShareUser) {
          showToast(t('selectUserError'), 'warning');
          return;
        }
        
        const response = await shareService.shareWithUser(
          showShareModal.type === 'file' ? showShareModal.id : null,
          showShareModal.type === 'folder' ? showShareModal.id : null,
          selectedShareUser.id
        );
        
        if (response.data) {
          showToast(`${t('share')} ${t('success')}: ${selectedShareUser.email || selectedShareUser.display_name}`, 'success');
          setShowShareModal(null);
          setSharePassword('');
          setShareExpiresAt('');
          setShareType('public');
          setSelectedShareUser(null);
          setShareUserSearch('');
        }
        return;
      }
      
      // Partage public
      const options = {};
      
      // Gérer le mot de passe
      if (sharePassword && typeof sharePassword === 'string' && sharePassword.trim() !== '') {
        if (sharePassword.trim().length < 6) {
          showToast(t('passwordMinLength'), 'warning');
          return;
        }
        options.password = sharePassword.trim();
      }
      
      // Gérer la date d'expiration
      if (shareExpiresAt) {
        // Si c'est une string, l'utiliser directement
        if (typeof shareExpiresAt === 'string' && shareExpiresAt.trim() !== '') {
          options.expiresAt = shareExpiresAt.trim();
        }
        // Sinon, convertir en ISO string si c'est une Date
        else if (shareExpiresAt instanceof Date) {
          options.expiresAt = shareExpiresAt.toISOString();
        }
        // Sinon, essayer de convertir en string
        else {
          options.expiresAt = String(shareExpiresAt);
        }
      }
      
      console.log('Creating share with options:', { ...options, fileId: showShareModal.id, type: showShareModal.type });
      
      let response;
      if (showShareModal.type === 'file') {
        response = await shareService.generatePublicLink(showShareModal.id, options);
      } else {
        response = await shareService.generateFolderLink(showShareModal.id, options);
      }
      
      if (response.data && response.data.data) {
        const frontendUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3001';
        const shareUrl = response.data.data.share_url || `${frontendUrl}/share/${response.data.data.public_token}`;
        setShareLink(shareUrl);
        setSharePassword('');
        setShareExpiresAt('');
      } else {
        throw new Error(t('invalidServerResponse'));
      }
    } catch (err) {
      console.error('Failed to share:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.error?.details?.[0]?.message || err.message || t('errorCreatingShare');
      
      // Si c'est une erreur 401, rediriger vers login
      if (err.response?.status === 401) {
        showToast(t('sessionExpired'), 'warning');
        navigate('/login');
      } else {
        showToast(errorMsg, 'error');
      }
    }
  };

  const openFolder = (folder) => {
    if (!folder || !folder.id) {
      console.error('Invalid folder:', folder);
      return;
    }
    
    // Mettre à jour l'état local d'abord
    if (currentFolder) {
      setFolderHistory([...folderHistory, currentFolder]);
    }
    setCurrentFolder(folder);
    
    // Mettre à jour l'URL pour permettre le partage et le rafraîchissement
    navigate(`/files?folder=${folder.id}`, { replace: false });
    
    // Recharger les fichiers immédiatement - SANS setTimeout
    loadFiles(true);
  };

  const goBack = () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setFolderHistory(folderHistory.slice(0, -1));
      // Mettre à jour l'URL
      if (previousFolder?.id) {
        navigate(`/files?folder=${previousFolder.id}`, { replace: false });
      } else {
        navigate('/files', { replace: false });
      }
      setCurrentFolder(previousFolder);
      // Recharger immédiatement
      loadFiles(true);
    } else {
      // Retour à la racine
      navigate('/files', { replace: false });
      setCurrentFolder(null);
      setFolderHistory([]);
      // Recharger immédiatement
      loadFiles(true);
    }
  };

  // Charger tous les dossiers disponibles pour le déplacement
  const loadAvailableFolders = async () => {
    try {
      setLoadingFolders(true);
      const response = await folderService.list(null);
      const allFolders = response.data.data?.items || [];
      
      // Filtrer pour exclure le dossier actuel et ses enfants si on déplace un dossier
      const filteredFolders = allFolders.filter(folder => {
        if (itemToMove && itemToMove.type === 'folder') {
          // Ne pas permettre de déplacer un dossier dans lui-même ou ses enfants
          return folder.id !== itemToMove.id;
        }
        return true;
      });
      
      setAvailableFolders(filteredFolders);
    } catch (err) {
      console.error('Failed to load folders:', err);
      setAvailableFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  // Ouvrir la modal de déplacement
  const openMoveModal = (item) => {
    setItemToMove(item);
    setSelectedDestinationFolder(null);
    loadAvailableFolders();
  };

  // Effectuer le déplacement
  const confirmMove = async () => {
    if (!itemToMove || selectedDestinationFolder === undefined) return;
    
    try {
      // Mise à jour optimiste : supprimer l'élément de la liste immédiatement
      const itemId = itemToMove.id || itemToMove._id;
      setItems(prevItems => prevItems.filter(item => {
        const itemIdToCheck = item.id || item._id;
        return itemIdToCheck !== itemId;
      }));
      
      if (itemToMove.type === 'file') {
        await fileService.move(itemToMove.id, selectedDestinationFolder);
      } else {
        await folderService.move(itemToMove.id, selectedDestinationFolder);
      }
      
      setItemToMove(null);
      setSelectedDestinationFolder(null);
      
      // Recharger immédiatement pour avoir l'état correct
      await loadFiles(true);
    } catch (err) {
      console.error('Failed to move:', err);
      const errorMsg = err.response?.data?.error?.message || err.message || t('moveError');
      showToast(errorMsg, 'error');
      // Recharger en cas d'erreur pour récupérer l'état correct
      await loadFiles(true);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const breadcrumbs = currentFolder 
    ? [...folderHistory.map(f => f.name), currentFolder.name]
    : [];

  return (
    <>
      <ConfirmDialog />
      <div style={{ 
      padding: '24px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      backgroundColor: bgColor,
      minHeight: '100vh'
    }}>
      {/* En-tête amélioré */}
      <div style={{ 
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: cardBg,
        borderRadius: '12px',
        boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)',
        border: `1px solid ${borderColor}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ 
              margin: 0, 
              marginBottom: '8px',
              fontSize: '28px',
              fontWeight: '700',
              color: textColor
            }}>📁 {t('myFiles')}</h1>
            {(currentFolder || folderHistory.length > 0) && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                flexWrap: 'wrap',
                fontSize: '14px',
                color: textSecondary
              }}>
                <button 
                  onClick={goBack} 
                  style={{ 
                    padding: '8px 16px',
                    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                    border: `2px solid ${theme === 'dark' ? '#444' : '#9ca3af'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    color: theme === 'dark' ? '#e0e0e0' : '#1a202c',
                    boxShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = theme === 'dark' ? '#3d3d3d' : '#f3f4f6';
                    e.target.style.borderColor = theme === 'dark' ? '#555' : '#6b7280';
                    e.target.style.boxShadow = theme === 'dark' ? '0 4px 8px rgba(0,0,0,0.4)' : '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
                    e.target.style.borderColor = theme === 'dark' ? '#444' : '#9ca3af';
                    e.target.style.boxShadow = theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  ← {t('back')}
                </button>
                <span style={{ color: textSecondary }}>|</span>
                <span 
                  onClick={() => { setCurrentFolder(null); setFolderHistory([]); }} 
                  style={{ 
                    cursor: 'pointer', 
                    color: '#2196F3',
                    fontWeight: '500',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#1976D2'}
                  onMouseLeave={(e) => e.target.style.color = '#2196F3'}
                >
                  {t('root')}
                </span>
                {breadcrumbs.map((name, idx) => (
                  <React.Fragment key={idx}>
                    <span style={{ color: textSecondary }}>/</span>
                    <span style={{ color: textSecondary }}>{name}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Sélecteur de vue */}
            <div style={{ 
              display: 'flex', 
              gap: '4px', 
              backgroundColor: secondaryBg, 
              padding: '4px', 
              borderRadius: '8px',
              border: `1px solid ${borderColor}`
            }}>
              <button
                onClick={() => {
                  setViewMode('list');
                  localStorage.setItem('filesViewMode', 'list');
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: viewMode === 'list' ? '#2196F3' : 'transparent',
                  color: viewMode === 'list' ? 'white' : textColor,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title={t('listView') || 'Vue liste'}
              >
                <span>☰</span>
                <span style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>{t('list') || 'Liste'}</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('grid');
                  localStorage.setItem('filesViewMode', 'grid');
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: viewMode === 'grid' ? '#2196F3' : 'transparent',
                  color: viewMode === 'grid' ? 'white' : textColor,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title={t('gridView') || 'Vue grille'}
              >
                <span>⊞</span>
                <span style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>{t('grid') || 'Grille'}</span>
              </button>
            </div>
            
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="file-upload"
            />
            {/* Action principale : Télécharger */}
            <label 
              htmlFor="file-upload" 
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#2196F3', 
                color: 'white', 
                borderRadius: '10px', 
                cursor: 'pointer', 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.35)',
                transition: 'all 0.2s',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#1976D2';
                e.target.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.45)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#2196F3';
                e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.35)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '18px' }}>📤</span>
              <span>{t('upload')}</span>
            </label>
            {/* Action secondaire : Nouveau dossier (moins voyant) */}
            <button
              onClick={() => setShowNewFolder(!showNewFolder)}
              style={{ 
                padding: '10px 18px', 
                backgroundColor: 'transparent', 
                color: theme === 'dark' ? '#90caf9' : '#2196F3', 
                border: `1.5px solid ${theme === 'dark' ? '#64b5f6' : '#2196F3'}`, 
                borderRadius: '10px', 
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                boxShadow: 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#e3f2fd';
                e.target.style.borderColor = theme === 'dark' ? '#90caf9' : '#1976D2';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = theme === 'dark' ? '#64b5f6' : '#2196F3';
              }}
            >
              <span style={{ fontSize: '16px' }}>📁</span>
              <span>{t('newFolder')}</span>
            </button>
          </div>
        </div>
      </div>

      {showNewFolder && (
        <div style={{ marginBottom: 16, padding: 16, border: '1px solid #ddd', borderRadius: 4 }}>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t('folderName')}
            onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            style={{ padding: 8, width: 300, marginRight: 8 }}
          />
          <button onClick={createFolder} style={{ padding: '8px 16px', marginRight: 8 }}>{t('create')}</button>
          <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>{t('cancel')}</button>
        </div>
      )}

      {editingItem && (
        <div style={{ marginBottom: 16, padding: 16, border: '1px solid #ddd', borderRadius: 4, backgroundColor: '#fff9c4' }}>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder={t('renameItem')}
            onKeyPress={(e) => e.key === 'Enter' && renameItem()}
            style={{ padding: 8, width: 300, marginRight: 8 }}
            autoFocus
          />
          <button onClick={renameItem} style={{ padding: '8px 16px', marginRight: 8 }}>{t('rename')}</button>
          <button onClick={() => { setEditingItem(null); setEditName(''); }}>{t('cancel')}</button>
        </div>
      )}

      {showShareModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: 24, borderRadius: 8, maxWidth: 500, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>{t('shareModal')} {showShareModal.name}</h2>
            {!shareLink ? (
              <>
                {/* Type de partage */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8 }}>{t('shareType')}</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setShareType('public'); setSelectedShareUser(null); setShareUserSearch(''); }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: shareType === 'public' ? '#2196F3' : '#f0f0f0',
                        color: shareType === 'public' ? 'white' : '#333',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      {t('publicLink')}
                    </button>
                    <button
                      onClick={() => { setShareType('internal'); setSharePassword(''); setShareExpiresAt(''); }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: shareType === 'internal' ? '#2196F3' : '#f0f0f0',
                        color: shareType === 'internal' ? 'white' : '#333',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      {t('shareWithUser')}
                    </button>
                  </div>
                </div>

                {/* Partage public */}
                {shareType === 'public' && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 4 }}>{t('sharePassword')}</label>
                      <input
                        type="password"
                        value={sharePassword}
                        onChange={(e) => setSharePassword(e.target.value)}
                        style={{ padding: 8, width: '100%' }}
                        placeholder={t('leaveEmptyForPublic')}
                      />
                      <small style={{ color: '#666', fontSize: '12px' }}>{t('passwordMinLength')}</small>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 4 }}>{t('shareExpiresAt')}</label>
                      <input
                        type="datetime-local"
                        lang={language === 'en' ? 'en-US' : 'fr-FR'}
                        value={shareExpiresAt}
                        onChange={(e) => setShareExpiresAt(e.target.value)}
                        style={{ padding: 8, width: '100%' }}
                      />
                    </div>
                  </>
                )}

                {/* Partage interne */}
                {shareType === 'internal' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4 }}>{t('searchUser')}</label>
                    <input
                      type="text"
                      value={shareUserSearch}
                      onChange={(e) => setShareUserSearch(e.target.value)}
                      style={{ padding: 8, width: '100%' }}
                      placeholder={t('typeEmailOrName')}
                    />
                    {shareUsers.length > 0 && (
                      <div style={{ marginTop: 8, border: '1px solid #ddd', borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                        {shareUsers.map(user => (
                          <div
                            key={user.id}
                            onClick={() => setSelectedShareUser(user)}
                            style={{
                              padding: 12,
                              cursor: 'pointer',
                              backgroundColor: selectedShareUser?.id === user.id ? '#e3f2fd' : 'white',
                              borderBottom: '1px solid #eee'
                            }}
                          >
                            <div style={{ fontWeight: 'bold' }}>{user.display_name || user.email}</div>
                            {user.display_name && <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedShareUser && (
                      <div style={{ marginTop: 8, padding: 8, backgroundColor: '#e8f5e9', borderRadius: 4 }}>
                        {t('shareWith')}: {selectedShareUser.display_name || selectedShareUser.email}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    onClick={shareItem} 
                    style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    {shareType === 'public' ? t('generateLink') : t('share')}
                  </button>
                  <button 
                    onClick={() => { 
                      setShowShareModal(null); 
                      setShareLink(''); 
                      setSharePassword(''); 
                      setShareExpiresAt('');
                      setShareType('public');
                      setSelectedShareUser(null);
                      setShareUserSearch('');
                    }} 
                    style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>{t('shareLinkLabel')}</label>
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    style={{ padding: 8, width: '100%', backgroundColor: 'white' }}
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      showToast(t('linkCopied'), 'success');
                    }}
                    style={{ marginTop: 8, padding: '4px 8px', fontSize: '12px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    {t('copyLink')}
                  </button>
                </div>
                <button 
                  onClick={() => { setShowShareModal(null); setShareLink(''); setSharePassword(''); setShareExpiresAt(''); }} 
                  style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  {t('close')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {uploading && (
        <div style={{ 
          padding: 8, 
          backgroundColor: theme === 'dark' ? '#3d2f0f' : '#fff3cd', 
          marginBottom: 16, 
          borderRadius: 4,
          border: `1px solid ${borderColor}`,
          color: textColor
        }}>
          <div style={{ color: textColor }}>{t('uploadInProgress')}</div>
          {Object.keys(uploadProgress).map(fileName => (
            <div key={fileName} style={{ marginTop: 4, color: textColor }}>
              {fileName}: {uploadProgress[fileName]}%
            </div>
          ))}
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{ 
          minHeight: 400, 
          border: `2px dashed ${borderColor}`, 
          borderRadius: '12px', 
          padding: '32px',
          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fafafa',
          transition: 'all 0.3s'
        }}
        onDragEnter={(e) => {
          e.currentTarget.style.borderColor = '#2196F3';
          e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1a237e' : '#f0f7ff';
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.borderColor = borderColor;
          e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1a1a1a' : '#fafafa';
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: textSecondary }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>⏳</div>
            <div style={{ color: textColor }}>{t('loading') || 'Chargement...'}</div>
          </div>
        ) : error ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#d32f2f',
            backgroundColor: theme === 'dark' ? '#3d1f1f' : '#ffebee',
            borderRadius: '8px',
            margin: '20px',
            border: `1px solid ${borderColor}`
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px', color: '#d32f2f' }}>
              {error}
            </div>
            <button
              onClick={() => {
                setError(null);
                loadFiles();
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {t('retry')}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: textSecondary }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
            <p style={{ fontSize: '16px', marginBottom: '8px', color: textColor }}>{t('emptyFolder') || 'Aucun fichier ou dossier'}</p>
            <p style={{ fontSize: '14px', color: textSecondary }}>
              {t('dragDropFiles')}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          // Vue Grille Moderne
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px',
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: cardBg,
            boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)',
            border: `1px solid ${borderColor}`
          }}>
            {items.map((item, index) => {
              // S'assurer que le type est bien défini - amélioration de la logique
              let itemType = item.type;
              if (!itemType) {
                // Si pas de type explicite, déterminer par les propriétés
                if (item.folder_id === undefined && item.parent_id === undefined) {
                  // Si ni folder_id ni parent_id, c'est probablement un dossier racine
                  itemType = 'folder';
                } else if (item.folder_id !== null || item.parent_id !== null) {
                  // Si folder_id ou parent_id existe, c'est un fichier
                  itemType = 'file';
                } else {
                  // Par défaut, considérer comme fichier si on ne peut pas déterminer
                  itemType = 'file';
                }
              }
              // Normaliser le type
              itemType = itemType === 'folder' ? 'folder' : 'file';
              const rawId = item.id || item._id;
              let itemId;
              if (typeof rawId === 'object' && rawId !== null) {
                itemId = String(rawId.id || rawId._id || rawId);
              } else {
                itemId = String(rawId || '');
              }
              
              if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId === '[object Object]') {
                itemId = `invalid-${index}`;
              }
              
              const isSelected = selectedItems.has(itemId);
              
              return (
                <div
                  key={itemId}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (itemType === 'folder') {
                      openFolder({ ...item, type: itemType, id: itemId });
                    } else {
                      navigate(`/preview/${itemId}`);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSelection(itemId);
                  }}
                  style={{
                    backgroundColor: isSelected ? (theme === 'dark' ? '#1a237e' : '#e3f2fd') : cardBg,
                    border: `2px solid ${isSelected ? '#2196F3' : borderColor}`,
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isSelected 
                      ? (theme === 'dark' ? '0 8px 24px rgba(33, 150, 243, 0.4)' : '0 8px 24px rgba(33, 150, 243, 0.25)')
                      : (theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)'),
                    transform: 'scale(1)',
                    minHeight: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                      e.currentTarget.style.boxShadow = theme === 'dark' 
                        ? '0 12px 32px rgba(0,0,0,0.4)' 
                        : '0 12px 32px rgba(0,0,0,0.15)';
                      e.currentTarget.style.borderColor = '#2196F3';
                    }
                    // Afficher les actions au survol
                    const actions = e.currentTarget.querySelector('.file-card-actions');
                    if (actions) actions.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = theme === 'dark' 
                        ? '0 2px 8px rgba(0,0,0,0.3)' 
                        : '0 2px 8px rgba(0,0,0,0.08)';
                      e.currentTarget.style.borderColor = borderColor;
                    }
                    // Masquer les actions
                    const actions = e.currentTarget.querySelector('.file-card-actions');
                    if (actions) actions.style.opacity = '0';
                  }}
                >
                  {/* Icône principale */}
                  <div style={{
                    fontSize: '64px',
                    marginBottom: '8px',
                    filter: isSelected ? 'drop-shadow(0 4px 8px rgba(33, 150, 243, 0.5))' : 'none',
                    transition: 'all 0.3s'
                  }}>
                    {itemType === 'folder' ? '📁' : '📄'}
                  </div>
                  
                  {/* Nom du fichier */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                    textAlign: 'center',
                    wordBreak: 'break-word',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.4'
                  }}>
                    {item.name}
                  </div>
                  
                  {/* Métadonnées */}
                  <div style={{
                    fontSize: '12px',
                    color: textSecondary,
                    textAlign: 'center',
                    width: '100%',
                    marginTop: 'auto',
                    paddingTop: '8px',
                    borderTop: `1px solid ${borderColor}`
                  }}>
                    <div>{formatBytes(item.size || 0)}</div>
                    <div style={{ marginTop: '4px' }}>
                      {new Date(item.updated_at || item.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </div>
                  </div>
                  
                  {/* Menu d'actions au survol */}
                  <div 
                    className="file-card-actions"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      display: 'flex',
                      gap: '4px',
                      opacity: 0,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0';
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {itemType !== 'folder' && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            // Utiliser apiClient qui gère automatiquement le refresh token
                            const response = await apiClient.get(`/files/${itemId}/download`, {
                              responseType: 'blob', // Important pour les fichiers binaires
                            });
                            
                            if (!response || !response.data) {
                              throw new Error(t('downloadError') || 'Download error');
                            }
                            
                            // Obtenir le nom de fichier depuis les headers Content-Disposition pour préserver l'extension
                            const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
                            let finalFileName = item.name || 'download';
                            if (contentDisposition) {
                              const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                              if (fileNameMatch && fileNameMatch[1]) {
                                finalFileName = fileNameMatch[1].replace(/['"]/g, '');
                                try {
                                  finalFileName = decodeURIComponent(finalFileName);
                                } catch (e) {
                                  // Si le décodage échoue, utiliser le nom tel quel
                                }
                              }
                            }
                            
                            // Télécharger le blob avec le nom de fichier original
                            const blob = response.data;
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = finalFileName;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            showToast(t('downloadStarted') || 'Download started', 'success');
                          } catch (err) {
                            console.error('Download failed:', err);
                            showToast(err.message || t('downloadError'), 'error');
                          }
                        }}
                        style={{
                          padding: '6px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        title={t('download')}
                      >
                        ⬇️
                      </button>
                    )}
                    {itemType === 'folder' && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                            const token = localStorage.getItem('access_token');
                            
                            if (!token) {
                              showToast(t('mustBeConnected'), 'warning');
                              return;
                            }
                            
                            const response = await fetch(`${apiUrl}/api/folders/${itemId}/download`, {
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            });
                            
                            if (!response.ok) {
                              const error = await response.json().catch(() => ({ error: { message: t('downloadError') } }));
                              throw new Error(error.error?.message || `${t('error')} ${response.status}`);
                            }
                            
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${item.name}.zip`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (err) {
                            console.error('Download failed:', err);
                            showToast(err.message || t('downloadError'), 'error');
                          }
                        }}
                        style={{
                          padding: '6px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        title={t('downloadZip')}
                      >
                        ⬇️
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (itemType === 'file') {
                          setShowShareModal({ id: itemId, name: item.name, type: 'file' });
                        } else {
                          setShowShareModal({ id: itemId, name: item.name, type: 'folder' });
                        }
                      }}
                      style={{
                        padding: '6px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title={t('share')}
                    >
                      🔗
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem({ ...item, type: itemType, id: itemId });
                      }}
                      style={{
                        padding: '6px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title={t('delete')}
                    >
                      🗑️
                    </button>
                  </div>
                  
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ 
            overflowX: 'auto', 
            borderRadius: '12px',
            boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)',
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'separate',
              borderSpacing: 0,
              minWidth: '600px'
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f8f9fa',
                  borderBottom: `2px solid ${borderColor}`
                }}>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{t('name')}</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{t('size')}</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{t('modified')}</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  // S'assurer que le type est bien défini - logique améliorée avec priorité à la taille
                  let itemType = item.type;
                  
                  // Si l'élément a une taille définie et > 0, c'est définitivement un fichier
                  const hasSize = item.size !== undefined && item.size !== null && item.size > 0;
                  const hasMimeType = item.mimeType !== undefined && item.mimeType !== null && item.mimeType !== '';
                  
                  // Priorité 1 : Si taille ou mimeType existe, c'est un fichier
                  if (hasSize || hasMimeType) {
                    itemType = 'file';
                  }
                  // Priorité 2 : Si type explicite et valide, l'utiliser
                  else if (itemType === 'folder' || itemType === 'file') {
                    // Garder le type tel quel
                  }
                  // Priorité 3 : Sinon, déterminer par les propriétés
                  else {
                    // Un dossier racine a généralement folder_id === null ET parent_id === null
                    // Mais c'est peu fiable, donc par défaut considérer comme fichier si on ne peut pas déterminer
                    itemType = 'file';
                  }
                  
                  // Normaliser le type pour être sûr
                  itemType = (itemType === 'folder') ? 'folder' : 'file';
                  // S'assurer que l'ID est toujours une string, même si c'est un objet
                  const rawId = item.id || item._id;
                  let itemId;
                  if (typeof rawId === 'object' && rawId !== null) {
                    // Extraire l'ID de l'objet si possible
                    if (rawId.id !== undefined && rawId.id !== null) {
                      itemId = String(rawId.id);
                    } else if (rawId._id !== undefined && rawId._id !== null) {
                      itemId = String(rawId._id);
                    } else {
                      // Fallback : utiliser toString() mais logger un avertissement
                      console.warn('Item has object ID without id/_id property:', rawId, 'item:', item);
                      itemId = String(rawId);
                    }
                  } else {
                    itemId = String(rawId || '');
                  }
                  
                  // Validation finale
                  if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId === '[object Object]') {
                    console.error('Invalid itemId after conversion:', { rawId, itemId, item });
                    itemId = `invalid-${index}`; // Fallback pour éviter les erreurs de rendu
                  }
                  
                  return (
                  <tr 
                    key={itemId} 
                    style={{ 
                      borderBottom: index < items.length - 1 ? `1px solid ${borderColor}` : 'none',
                      backgroundColor: index % 2 === 0 ? cardBg : (theme === 'dark' ? '#252525' : '#fafafa'),
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? cardBg : (theme === 'dark' ? '#252525' : '#fafafa');
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      {itemType === 'folder' ? (
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openFolder({ ...item, type: itemType, id: itemId });
                          }}
                          style={{ 
                            cursor: 'pointer', 
                            fontWeight: '600', 
                            color: '#2196F3',
                            fontSize: '15px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#1976D2'}
                          onMouseLeave={(e) => e.target.style.color = '#2196F3'}
                        >
                          <span style={{ fontSize: '20px' }}>📁</span> {item.name}
                        </span>
                      ) : (
                        <span
                          onClick={() => navigate(`/preview/${itemId}`)}
                          style={{ 
                            cursor: 'pointer',
                            fontSize: '15px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: textColor,
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#2196F3'}
                          onMouseLeave={(e) => e.target.style.color = textColor}
                        >
                          <span style={{ fontSize: '18px' }}>📄</span> {item.name}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px', color: textSecondary, fontSize: '14px' }}>{formatBytes(item.size || 0)}</td>
                    <td style={{ padding: '16px', color: textSecondary, fontSize: '14px' }}>{new Date(item.updated_at || item.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}</td>
                    <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Bouton de téléchargement pour les fichiers */}
                      {/* Afficher si ce n'est pas un dossier OU si l'élément a une taille (indicateur de fichier) */}
                      {itemType !== 'folder' && (
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              // Utiliser apiClient qui gère automatiquement le refresh token
                              const response = await apiClient.get(`/files/${itemId}/download`, {
                                responseType: 'blob', // Important pour les fichiers binaires
                              });
                              
                              if (!response || !response.data) {
                                throw new Error(t('downloadError') || 'Download error');
                              }
                              
                              // Obtenir le nom de fichier depuis les headers Content-Disposition pour préserver l'extension
                              // Avec axios, les headers sont dans response.headers (objet, pas Response)
                              const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
                              let finalFileName = item.name || 'download';
                              if (contentDisposition) {
                                const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                                if (fileNameMatch && fileNameMatch[1]) {
                                  finalFileName = fileNameMatch[1].replace(/['"]/g, '');
                                  try {
                                    finalFileName = decodeURIComponent(finalFileName);
                                  } catch (e) {
                                    // Si le décodage échoue, utiliser le nom tel quel
                                  }
                                }
                              }
                              
                              // Télécharger le blob avec le nom de fichier original
                              // axios retourne déjà un blob avec responseType: 'blob'
                              const blob = response.data;
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = finalFileName; // Utiliser le nom de fichier original avec extension
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                              showToast(t('downloadStarted') || 'Download started', 'success');
                            } catch (err) {
                              console.error('Download failed:', err);
                              showToast(err.message || t('downloadError'), 'error');
                            }
                          }}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(33, 150, 243, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#1976D2';
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = theme === 'dark' ? '0 4px 8px rgba(33, 150, 243, 0.5)' : '0 4px 12px rgba(33, 150, 243, 0.6)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#2196F3';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = theme === 'dark' ? '0 2px 4px rgba(33, 150, 243, 0.4)' : '0 2px 6px rgba(33, 150, 243, 0.5)';
                          }}
                          title={t('download')}
                        >
                          ⬇️ {t('download')}
                        </button>
                      )}
                      {itemType === 'folder' && (
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                              const token = localStorage.getItem('access_token');
                              
                              if (!token) {
                                showToast(t('mustBeConnected'), 'warning');
                                return;
                              }
                              
                              const response = await fetch(`${apiUrl}/api/folders/${itemId}/download`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              
                              if (!response.ok) {
                                const error = await response.json().catch(() => ({ error: { message: t('downloadError') } }));
                                throw new Error(error.error?.message || `${t('error')} ${response.status}`);
                              }
                              
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${item.name}.zip`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            } catch (err) {
                              console.error('Download failed:', err);
                              showToast(err.message || t('downloadError'), 'error');
                            }
                          }}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(33, 150, 243, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#1976D2';
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = theme === 'dark' ? '0 4px 8px rgba(33, 150, 243, 0.5)' : '0 4px 12px rgba(33, 150, 243, 0.6)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#2196F3';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = theme === 'dark' ? '0 2px 4px rgba(33, 150, 243, 0.4)' : '0 2px 6px rgba(33, 150, 243, 0.5)';
                          }}
                          title={t('downloadZip')}
                        >
                          ⬇️ {t('downloadZip')}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowShareModal({ id: itemId, name: item.name, type: itemType });
                          setShareLink('');
                        }}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(76, 175, 80, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#45a049';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 8px rgba(76, 175, 80, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#4CAF50';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 4px rgba(76, 175, 80, 0.3)';
                        }}
                        title={t('share')}
                      >
                        🔗 {t('share')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingItem({ ...item, type: itemType, id: itemId });
                          setEditName(item.name);
                        }}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#FF9800',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(255, 152, 0, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f57c00';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 8px rgba(255, 152, 0, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#FF9800';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 4px rgba(255, 152, 0, 0.3)';
                        }}
                        title={t('rename')}
                      >
                        ✏️ {t('rename')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openMoveModal({ ...item, type: itemType, id: itemId });
                        }}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#9C27B0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(156, 39, 176, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#7b1fa2';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 8px rgba(156, 39, 176, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#9C27B0';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 4px rgba(156, 39, 176, 0.3)';
                        }}
                        title={t('move')}
                      >
                        📦 {t('move')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteItem({ ...item, type: itemType, id: itemId });
                        }}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(244, 67, 54, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#d32f2f';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 8px rgba(244, 67, 54, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#f44336';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 4px rgba(244, 67, 54, 0.3)';
                        }}
                        title={t('delete')}
                      >
                        🗑️ {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal de déplacement */}
      {itemToMove && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 12,
            maxWidth: 500,
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>
              📦 {t('move')} "{itemToMove.name}"
            </h2>
            
            {loadingFolders ? (
              <div>{t('loading')}</div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8 }}>{t('selectDestination')}</label>
                  <select
                    value={selectedDestinationFolder || ''}
                    onChange={(e) => setSelectedDestinationFolder(e.target.value || null)}
                    style={{ padding: 8, width: '100%', fontSize: 14 }}
                  >
                    <option value="">{t('root')}</option>
                    {availableFolders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setItemToMove(null);
                      setSelectedDestinationFolder(null);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={confirmMove}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    {t('move')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {itemToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 12,
            maxWidth: 500,
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: 16, color: '#333' }}>
              ⚠️ {t('deleteConfirm')}
            </h2>
            <p style={{ marginBottom: 24, color: '#666', fontSize: '1.1em' }}>
              {t('deleteConfirm')} <strong>"{itemToDelete.name}"</strong> ?
            </p>
            <p style={{ marginBottom: 24, color: '#999', fontSize: '0.9em' }}>
              {t('deleteConfirmDetails')} {itemToDelete.type === 'folder' ? t('folder') : t('file')}.
              {t('language') === 'en' ? ' You can restore it later if needed.' : ' Vous pourrez le restaurer plus tard si nécessaire.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  console.log('User cancelled deletion in modal');
                  setItemToDelete(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '1em',
                  fontWeight: 'bold'
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '1em',
                  fontWeight: 'bold'
                }}
              >
                🗑️ {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
