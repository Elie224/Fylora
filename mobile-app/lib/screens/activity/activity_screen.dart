/// Écran de l'activité
import 'package:flutter/material.dart';
import '../../services/activity_service.dart';
import '../../utils/constants.dart';

class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  final ActivityService _activityService = ActivityService();
  List<dynamic> _activities = [];
  bool _isLoading = true;
  String? _error;
  int _page = 1;
  int _totalPages = 1;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadActivities();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.9) {
      if (_page < _totalPages) {
        _loadMoreActivities();
      }
    }
  }

  Future<void> _loadActivities({bool refresh = false}) async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
        if (refresh) {
          _page = 1;
          _activities = [];
        }
      });

      final response = await _activityService.listActivities(
        page: _page,
        limit: 50,
      );

      if (response.statusCode == 200) {
        final data = response.data['data'] ?? {};
        setState(() {
          if (refresh) {
            _activities = data['activities'] ?? [];
          } else {
            _activities.addAll(data['activities'] ?? []);
          }
          _totalPages = data['pagination']?['pages'] ?? 1;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMoreActivities() async {
    if (_page >= _totalPages || _isLoading) return;
    setState(() {
      _page++;
    });
    await _loadActivities();
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays == 0) {
        if (difference.inHours == 0) {
          if (difference.inMinutes == 0) {
            return 'À l\'instant';
          }
          return 'Il y a ${difference.inMinutes} min';
        }
        return 'Il y a ${difference.inHours} h';
      } else if (difference.inDays == 1) {
        return 'Hier';
      } else if (difference.inDays < 7) {
        return 'Il y a ${difference.inDays} jours';
      } else {
        return '${date.day}/${date.month}/${date.year}';
      }
    } catch (e) {
      return dateString;
    }
  }

  IconData _getActionIcon(String actionType) {
    switch (actionType) {
      case 'upload':
        return Icons.upload;
      case 'download':
        return Icons.download;
      case 'delete':
        return Icons.delete;
      case 'rename':
        return Icons.edit;
      case 'move':
        return Icons.drive_file_move;
      case 'share':
        return Icons.share;
      default:
        return Icons.info;
    }
  }

  Color _getActionColor(String actionType) {
    switch (actionType) {
      case 'upload':
        return Colors.green;
      case 'download':
        return Colors.blue;
      case 'delete':
        return Colors.red;
      case 'rename':
        return Colors.orange;
      case 'move':
        return Colors.purple;
      case 'share':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Activité'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _loadActivities(refresh: true),
          ),
        ],
      ),
      body: _isLoading && _activities.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _activities.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Erreur: $_error'),
                      ElevatedButton(
                        onPressed: () => _loadActivities(refresh: true),
                        child: const Text('Réessayer'),
                      ),
                    ],
                  ),
                )
              : _activities.isEmpty
                  ? const Center(child: Text('Aucune activité'))
                  : RefreshIndicator(
                      onRefresh: () => _loadActivities(refresh: true),
                      child: ListView.builder(
                        controller: _scrollController,
                        itemCount: _activities.length + (_isLoading ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == _activities.length) {
                            return const Center(
                              child: Padding(
                                padding: EdgeInsets.all(16),
                                child: CircularProgressIndicator(),
                              ),
                            );
                          }

                          final activity = _activities[index];
                          final actionType = activity['action_type'] ?? '';
                          final resourceType = activity['resource_type'] ?? '';
                          final resourceName = activity['resource_name'] ?? '';

                          return Card(
                            margin: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            child: ListTile(
                              leading: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: _getActionColor(actionType)
                                      .withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  _getActionIcon(actionType),
                                  color: _getActionColor(actionType),
                                ),
                              ),
                              title: Text(
                                '$actionType $resourceType',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(resourceName),
                                  const SizedBox(height: 4),
                                  Text(
                                    _formatDate(activity['created_at'] ?? ''),
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}


