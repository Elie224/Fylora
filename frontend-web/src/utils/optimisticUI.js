/**
 * Optimistic UI pour feedback instantané
 * Met à jour l'UI immédiatement avant confirmation serveur
 */
import { useState, useCallback } from 'react';

export function useOptimisticUpdate(initialState, updateFn, rollbackFn) {
  const [state, setState] = useState(initialState);
  const [pendingUpdates, setPendingUpdates] = useState(new Map());

  const optimisticUpdate = useCallback(async (update, optimisticState) => {
    const updateId = Date.now().toString();
    
    // Mettre à jour immédiatement (optimistic)
    setState(optimisticState);
    setPendingUpdates(prev => new Map(prev).set(updateId, { update, rollback: () => setState(state) }));

    try {
      // Exécuter la mise à jour réelle
      const result = await updateFn(update);
      
      // Confirmer la mise à jour
      setState(result);
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateId);
        return newMap;
      });

      return result;
    } catch (error) {
      // Rollback en cas d'erreur
      const pending = pendingUpdates.get(updateId);
      if (pending && rollbackFn) {
        rollbackFn(pending.update, error);
      } else {
        setState(state); // Rollback simple
      }
      
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateId);
        return newMap;
      });

      throw error;
    }
  }, [updateFn, rollbackFn, state, pendingUpdates]);

  return [state, optimisticUpdate, pendingUpdates.size > 0];
}

/**
 * Hook pour actions optimistes simples
 */
export function useOptimisticAction(actionFn) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setIsPending(true);
    setError(null);

    try {
      const result = await actionFn(...args);
      setIsPending(false);
      return result;
    } catch (err) {
      setError(err);
      setIsPending(false);
      throw err;
    }
  }, [actionFn]);

  return [execute, isPending, error];
}


