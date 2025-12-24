/// Tracking des actions utilisateur en temps réel
/// Mesure le temps réel par action, taux d'abandon, etc.
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:collection';

class UserActionTracker {
  static final UserActionTracker _instance = UserActionTracker._internal();
  factory UserActionTracker() => _instance;
  
  UserActionTracker._internal() {
    // Flush les logs toutes les 30 secondes
    _flushTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _flushLogs();
    });
  }

  final Map<String, DateTime> _actionStarts = {};
  final Queue<ActionLog> _pendingLogs = Queue<ActionLog>();
  Timer? _flushTimer;

  /// Démarrer le tracking d'une action
  void startAction(String action, {Map<String, dynamic>? metadata}) {
    final key = '$action:${DateTime.now().millisecondsSinceEpoch}';
    _actionStarts[key] = DateTime.now();
  }

  /// Terminer le tracking d'une action
  Future<void> endAction(
    String action, {
    Map<String, dynamic>? metadata,
    bool success = true,
  }) async {
    final now = DateTime.now();
    String? foundKey;
    
    for (final key in _actionStarts.keys) {
      if (key.startsWith(action)) {
        foundKey = key;
        break;
      }
    }

    if (foundKey != null) {
      final startTime = _actionStarts[foundKey]!;
      final duration = now.difference(startTime);

      final log = ActionLog(
        action: action,
        duration: duration.inMilliseconds,
        timestamp: now,
        metadata: metadata ?? {},
        success: success,
      );

      _pendingLogs.add(log);
      _actionStarts.remove(foundKey);

      // Sauvegarder localement
      await _saveLog(log);

      // Envoyer au backend si online (async)
      _sendToBackend(log);
    }
  }

  /// Enregistrer une action simple
  Future<void> trackAction(
    String action, {
    Map<String, dynamic>? metadata,
    int? duration,
  }) async {
    final log = ActionLog(
      action: action,
      duration: duration ?? 0,
      timestamp: DateTime.now(),
      metadata: metadata ?? {},
      success: true,
    );

    _pendingLogs.add(log);
    await _saveLog(log);
    _sendToBackend(log);
  }

  /// Sauvegarder un log localement
  Future<void> _saveLog(ActionLog log) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final logs = prefs.getStringList('action_logs') ?? [];
      logs.add(jsonEncode({
        'action': log.action,
        'duration': log.duration,
        'timestamp': log.timestamp.toIso8601String(),
        'metadata': log.metadata,
        'success': log.success,
      }));

      // Garder seulement les 100 derniers logs
      if (logs.length > 100) {
        logs.removeRange(0, logs.length - 100);
      }

      await prefs.setStringList('action_logs', logs);
    } catch (e) {
      // Ignorer erreurs
    }
  }

  /// Envoyer au backend (async)
  Future<void> _sendToBackend(ActionLog log) async {
    try {
      // TODO: Implémenter l'envoi au backend
      // Utiliser ApiService pour envoyer les logs
    } catch (e) {
      // Ignorer erreurs - les logs restent en local
    }
  }

  /// Flush les logs en attente
  Future<void> _flushLogs() async {
    if (_pendingLogs.isEmpty) return;

    final logs = List<ActionLog>.from(_pendingLogs);
    _pendingLogs.clear();

    for (final log in logs) {
      await _sendToBackend(log);
    }
  }

  /// Obtenir les statistiques d'actions
  Future<Map<String, dynamic>> getActionStats(String action) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final logs = prefs.getStringList('action_logs') ?? [];

      final actionLogs = logs
          .map((l) => jsonDecode(l) as Map<String, dynamic>)
          .where((l) => l['action'] == action)
          .toList();

      if (actionLogs.isEmpty) {
        return {
          'count': 0,
          'avgDuration': 0,
          'minDuration': 0,
          'maxDuration': 0,
        };
      }

      final durations = actionLogs
          .map((l) => l['duration'] as int)
          .where((d) => d > 0)
          .toList();

      if (durations.isEmpty) {
        return {
          'count': actionLogs.length,
          'avgDuration': 0,
          'minDuration': 0,
          'maxDuration': 0,
        };
      }

      durations.sort();

      return {
        'count': actionLogs.length,
        'avgDuration': durations.reduce((a, b) => a + b) / durations.length,
        'minDuration': durations.first,
        'maxDuration': durations.last,
      };
    } catch (e) {
      return {
        'count': 0,
        'avgDuration': 0,
        'minDuration': 0,
        'maxDuration': 0,
      };
    }
  }

  void dispose() {
    _flushTimer?.cancel();
    _flushLogs();
  }
}

class ActionLog {
  final String action;
  final int duration;
  final DateTime timestamp;
  final Map<String, dynamic> metadata;
  final bool success;

  ActionLog({
    required this.action,
    required this.duration,
    required this.timestamp,
    required this.metadata,
    required this.success,
  });
}

