import 'package:flutter/material.dart';
import '../../services/notifications_service.dart';
import '../../utils/constants.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationsService _notificationsService = NotificationsService();
  List<dynamic> _notifications = [];
  bool _isLoading = true;
  int _unreadCount = 0;
  int _currentPage = 1;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _loadUnreadCount();
  }

  Future<void> _loadNotifications({bool refresh = false}) async {
    try {
      if (refresh) {
        setState(() {
          _currentPage = 1;
          _notifications = [];
          _hasMore = true;
        });
      }

      setState(() {
        _isLoading = _notifications.isEmpty;
      });

      final response = await _notificationsService.listNotifications(
        page: _currentPage,
        limit: 50,
      );

      if (response.statusCode == 200 && mounted) {
        final newNotifications = response.data['data']['notifications'] ?? [];
        setState(() {
          if (refresh) {
            _notifications = newNotifications;
          } else {
            _notifications.addAll(newNotifications);
          }
          _hasMore = newNotifications.length >= 50;
          _isLoading = false;
        });
        _loadUnreadCount();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors du chargement: $e')),
        );
      }
    }
  }

  Future<void> _loadUnreadCount() async {
    try {
      final response = await _notificationsService.getUnreadCount();
      if (response.statusCode == 200 && mounted) {
        setState(() {
          _unreadCount = response.data['data']['unread_count'] ?? 0;
        });
      }
    } catch (e) {
      // Ignorer les erreurs silencieusement
    }
  }

  Future<void> _markAsRead(String notificationId) async {
    try {
      await _notificationsService.markAsRead(notificationId);
      setState(() {
        final index = _notifications.indexWhere((n) => n['id'] == notificationId);
        if (index != -1) {
          _notifications[index]['read'] = true;
        }
      });
      _loadUnreadCount();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await _notificationsService.markAllAsRead();
      setState(() {
        for (var notification in _notifications) {
          notification['read'] = true;
        }
      });
      _loadUnreadCount();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Toutes les notifications ont été marquées comme lues')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    }
  }

  Future<void> _deleteNotification(String notificationId) async {
    try {
      await _notificationsService.deleteNotification(notificationId);
      setState(() {
        _notifications.removeWhere((n) => n['id'] == notificationId);
      });
      _loadUnreadCount();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    }
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return '';
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays > 7) {
        return '${date.day}/${date.month}/${date.year}';
      } else if (difference.inDays > 0) {
        return 'Il y a ${difference.inDays} jour${difference.inDays > 1 ? 's' : ''}';
      } else if (difference.inHours > 0) {
        return 'Il y a ${difference.inHours} heure${difference.inHours > 1 ? 's' : ''}';
      } else if (difference.inMinutes > 0) {
        return 'Il y a ${difference.inMinutes} minute${difference.inMinutes > 1 ? 's' : ''}';
      } else {
        return 'À l\'instant';
      }
    } catch (e) {
      return dateString;
    }
  }

  IconData _getNotificationIcon(String? type) {
    switch (type) {
      case 'file_shared':
        return Icons.share;
      case 'file_uploaded':
        return Icons.upload;
      case 'file_deleted':
        return Icons.delete;
      case 'folder_shared':
        return Icons.folder_shared;
      default:
        return Icons.notifications;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppConstants.supinfoPurple,
        actions: [
          if (_unreadCount > 0)
            IconButton(
              icon: Stack(
                children: [
                  const Icon(Icons.done_all),
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        '$_unreadCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ],
              ),
              onPressed: _markAllAsRead,
              tooltip: 'Marquer toutes comme lues',
            ),
        ],
      ),
      body: _isLoading && _notifications.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.notifications_none,
                        size: 64,
                        color: Colors.grey.shade400,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Aucune notification',
                        style: TextStyle(
                          fontSize: 18,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => _loadNotifications(refresh: true),
                  child: ListView.builder(
                    itemCount: _notifications.length + (_hasMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _notifications.length) {
                        // Charger plus
                        _loadNotifications();
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16.0),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }

                      final notification = _notifications[index];
                      final isRead = notification['read'] == true;

                      return Dismissible(
                        key: Key(notification['id']),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          color: Colors.red,
                          child: const Icon(Icons.delete, color: Colors.white),
                        ),
                        onDismissed: (direction) {
                          _deleteNotification(notification['id']);
                        },
                        child: Card(
                          margin: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          color: isRead ? null : Colors.blue.shade50,
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: isRead
                                  ? Colors.grey.shade300
                                  : AppConstants.supinfoPurple,
                              child: Icon(
                                _getNotificationIcon(notification['type']),
                                color: isRead ? Colors.grey.shade600 : Colors.white,
                              ),
                            ),
                            title: Text(
                              notification['title'] ?? 'Notification',
                              style: TextStyle(
                                fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (notification['message'] != null)
                                  Text(notification['message']),
                                const SizedBox(height: 4),
                                Text(
                                  _formatDate(notification['created_at']),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                            trailing: isRead
                                ? IconButton(
                                    icon: const Icon(Icons.delete_outline),
                                    onPressed: () => _deleteNotification(notification['id']),
                                  )
                                : IconButton(
                                    icon: const Icon(Icons.check_circle_outline),
                                    onPressed: () => _markAsRead(notification['id']),
                                    tooltip: 'Marquer comme lue',
                                  ),
                            onTap: () {
                              if (!isRead) {
                                _markAsRead(notification['id']);
                              }
                            },
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}




