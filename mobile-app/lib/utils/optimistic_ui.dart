/// Optimistic UI pour feedback instantané
/// Met à jour l'UI immédiatement avant confirmation serveur
import 'package:flutter/foundation.dart';

class OptimisticUpdate<T> {
  final T optimisticValue;
  final Future<T> Function() updateFn;
  final void Function(T, dynamic)? rollbackFn;
  final ValueNotifier<T> state;
  final ValueNotifier<bool> isPending;
  final ValueNotifier<dynamic> error;

  OptimisticUpdate({
    required T initialValue,
    required this.updateFn,
    this.rollbackFn,
  })  : optimisticValue = initialValue,
        state = ValueNotifier<T>(initialValue),
        isPending = ValueNotifier<bool>(false),
        error = ValueNotifier<dynamic>(null);

  /// Exécuter une mise à jour optimiste
  Future<T?> execute(T optimisticState) async {
    // Sauvegarder l'état actuel pour rollback
    final previousState = state.value;

    // Mettre à jour immédiatement (optimistic)
    state.value = optimisticState;
    isPending.value = true;
    error.value = null;

    try {
      // Exécuter la mise à jour réelle
      final result = await updateFn();

      // Confirmer la mise à jour
      state.value = result;
      isPending.value = false;

      return result;
    } catch (e) {
      // Rollback en cas d'erreur
      if (rollbackFn != null) {
        rollbackFn!(previousState, e);
      } else {
        state.value = previousState; // Rollback simple
      }

      isPending.value = false;
      error.value = e;

      rethrow;
    }
  }

  void dispose() {
    state.dispose();
    isPending.dispose();
    error.dispose();
  }
}

/// Hook pour actions optimistes simples
class OptimisticAction {
  final ValueNotifier<bool> isPending = ValueNotifier<bool>(false);
  final ValueNotifier<dynamic> error = ValueNotifier<dynamic>(null);

  Future<T?> execute<T>(Future<T> Function() actionFn) async {
    isPending.value = true;
    error.value = null;

    try {
      final result = await actionFn();
      isPending.value = false;
      return result;
    } catch (e) {
      error.value = e;
      isPending.value = false;
      rethrow;
    }
  }

  void dispose() {
    isPending.dispose();
    error.dispose();
  }
}


