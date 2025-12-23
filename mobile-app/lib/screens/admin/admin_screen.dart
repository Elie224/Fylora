import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../services/admin_service.dart';
import '../../utils/constants.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final AdminService _adminService = AdminService();
  Map<String, dynamic>? _stats;
  List<dynamic> _users = [];
  bool _isLoading = true;
  bool _isLoadingUsers = false;
  int _currentPage = 1;
  int _totalPages = 1;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  dynamic _selectedUser;
  final _formKey = GlobalKey<FormState>();
  final _displayNameController = TextEditingController();
  final _quotaLimitController = TextEditingController();
  bool _isActive = true;
  bool _isAdmin = false;

  @override
  void initState() {
    super.initState();
    _checkAdminAccess();
  }

  Future<void> _checkAdminAccess() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (!authProvider.isAuthenticated || !authProvider.user?['is_admin']) {
      if (mounted) {
        context.go('/dashboard');
      }
      return;
    }
    _loadStats();
    _loadUsers();
  }

  Future<void> _loadStats() async {
    try {
      final response = await _adminService.getStats();
      if (response.statusCode == 200 && mounted) {
        setState(() {
          _stats = response.data['data'];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors du chargement des statistiques: $e')),
        );
      }
    }
  }

  Future<void> _loadUsers({int? page}) async {
    try {
      setState(() {
        _isLoadingUsers = true;
        if (page != null) _currentPage = page;
      });

      final response = await _adminService.listUsers(
        page: _currentPage,
        limit: 20,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
      );

      if (response.statusCode == 200 && mounted) {
        setState(() {
          _users = response.data['data']['users'] ?? [];
          _totalPages = response.data['data']['pagination']?['pages'] ?? 1;
          _isLoading = false;
          _isLoadingUsers = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isLoadingUsers = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors du chargement des utilisateurs: $e')),
        );
      }
    }
  }

  void _openEditDialog(dynamic user) {
    setState(() {
      _selectedUser = user;
      _displayNameController.text = user['display_name'] ?? '';
      _quotaLimitController.text = ((user['quota_limit'] ?? 0) / (1024 * 1024 * 1024)).toStringAsFixed(2);
      _isActive = user['is_active'] ?? true;
      _isAdmin = user['is_admin'] ?? false;
    });

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Modifier ${user['email']}'),
        content: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _displayNameController,
                  decoration: const InputDecoration(
                    labelText: 'Nom d\'affichage',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _quotaLimitController,
                  decoration: const InputDecoration(
                    labelText: 'Quota limite (GB)',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                CheckboxListTile(
                  title: const Text('Compte actif'),
                  value: _isActive,
                  onChanged: (value) => setState(() => _isActive = value ?? true),
                ),
                CheckboxListTile(
                  title: const Text('Administrateur'),
                  value: _isAdmin,
                  onChanged: (value) => setState(() => _isAdmin = value ?? false),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: _updateUser,
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }

  Future<void> _updateUser() async {
    if (!_formKey.currentState!.validate()) return;

    try {
      final quotaLimitBytes = (double.parse(_quotaLimitController.text) * 1024 * 1024 * 1024).toInt();
      
      await _adminService.updateUser(
        _selectedUser['id'],
        displayName: _displayNameController.text,
        quotaLimit: quotaLimitBytes,
        isActive: _isActive,
        isAdmin: _isAdmin,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Utilisateur mis à jour avec succès')),
        );
        _loadUsers();
        _loadStats();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    }
  }

  Future<void> _deleteUser(dynamic user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer l\'utilisateur'),
        content: Text('Êtes-vous sûr de vouloir supprimer ${user['email']} ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _adminService.deleteUser(user['id']);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Utilisateur supprimé avec succès')),
          );
          _loadUsers();
          _loadStats();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erreur: $e')),
          );
        }
      }
    }
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(2)} KB';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }

  @override
  void dispose() {
    _searchController.dispose();
    _displayNameController.dispose();
    _quotaLimitController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    
    if (!authProvider.isAuthenticated || !authProvider.user?['is_admin']) {
      return const Scaffold(
        body: Center(child: Text('Accès refusé')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Administration'),
        backgroundColor: AppConstants.supinfoPurple,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async {
                await _loadStats();
                await _loadUsers();
              },
              child: CustomScrollView(
                slivers: [
                  // Statistiques
                  if (_stats != null)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: GridView.count(
                          crossAxisCount: 2,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 1.5,
                          children: [
                            _StatCard(
                              title: 'Utilisateurs',
                              value: '${_stats!['users']?['total'] ?? 0}',
                              subtitle: '${_stats!['users']?['active'] ?? 0} actifs',
                              color: Colors.blue,
                            ),
                            _StatCard(
                              title: 'Fichiers',
                              value: '${_stats!['files']?['total'] ?? 0}',
                              color: Colors.green,
                            ),
                            _StatCard(
                              title: 'Dossiers',
                              value: '${_stats!['folders']?['total'] ?? 0}',
                              color: Colors.orange,
                            ),
                            _StatCard(
                              title: 'Stockage',
                              value: _formatBytes(_stats!['storage']?['total_used'] ?? 0),
                              color: Colors.purple,
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Recherche
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: 'Rechercher un utilisateur...',
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _searchQuery = '');
                                    _loadUsers(page: 1);
                                  },
                                )
                              : null,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onSubmitted: (value) {
                          setState(() => _searchQuery = value);
                          _loadUsers(page: 1);
                        },
                      ),
                    ),
                  ),

                  // Liste des utilisateurs
                  _isLoadingUsers
                      ? const SliverFillRemaining(
                          child: Center(child: CircularProgressIndicator()),
                        )
                      : _users.isEmpty
                          ? const SliverFillRemaining(
                              child: Center(child: Text('Aucun utilisateur trouvé')),
                            )
                          : SliverList(
                              delegate: SliverChildBuilderDelegate(
                                (context, index) {
                                  final user = _users[index];
                                  return Card(
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 8,
                                    ),
                                    child: ListTile(
                                      title: Text(user['email'] ?? ''),
                                      subtitle: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          if (user['display_name'] != null)
                                            Text(user['display_name']),
                                          Text(
                                            '${_formatBytes(user['quota_used'] ?? 0)} / ${_formatBytes(user['quota_limit'] ?? 0)}',
                                          ),
                                        ],
                                      ),
                                      trailing: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          if (user['is_active'] == true)
                                            Chip(
                                              label: const Text('Actif'),
                                              backgroundColor: Colors.green.shade100,
                                              labelStyle: const TextStyle(fontSize: 10),
                                            )
                                          else
                                            Chip(
                                              label: const Text('Inactif'),
                                              backgroundColor: Colors.red.shade100,
                                              labelStyle: const TextStyle(fontSize: 10),
                                            ),
                                          if (user['is_admin'] == true)
                                            Chip(
                                              label: const Text('Admin'),
                                              backgroundColor: Colors.blue.shade100,
                                              labelStyle: const TextStyle(fontSize: 10),
                                            ),
                                        ],
                                      ),
                                      onTap: () => _openEditDialog(user),
                                    ),
                                  );
                                },
                                childCount: _users.length,
                              ),
                            ),

                  // Pagination
                  if (_totalPages > 1)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.chevron_left),
                              onPressed: _currentPage > 1
                                  ? () => _loadUsers(page: _currentPage - 1)
                                  : null,
                            ),
                            Text('Page $_currentPage sur $_totalPages'),
                            IconButton(
                              icon: const Icon(Icons.chevron_right),
                              onPressed: _currentPage < _totalPages
                                  ? () => _loadUsers(page: _currentPage + 1)
                                  : null,
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String? subtitle;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(
                subtitle!,
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.grey.shade500,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

