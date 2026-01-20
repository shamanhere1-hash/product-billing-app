import { useState, useEffect, useCallback } from 'react';

interface PendingOperation {
  id: string;
  type: 'create_order' | 'update_status' | 'update_order' | 'add_product' | 'update_product' | 'delete_product';
  data: any;
  timestamp: number;
}

const PENDING_OPS_KEY = 'ph_supplies_pending_ops';
const OFFLINE_DATA_KEY = 'ph_supplies_offline_data';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending operations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PENDING_OPS_KEY);
      if (stored) {
        setPendingOperations(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pending operations:', error);
    }
  }, []);

  // Save pending operations to localStorage
  useEffect(() => {
    localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(pendingOperations));
  }, [pendingOperations]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addPendingOperation = useCallback((
    type: PendingOperation['type'],
    data: any
  ) => {
    const operation: PendingOperation = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
    };
    setPendingOperations(prev => [...prev, operation]);
    return operation.id;
  }, []);

  const removePendingOperation = useCallback((id: string) => {
    setPendingOperations(prev => prev.filter(op => op.id !== id));
  }, []);

  const clearPendingOperations = useCallback(() => {
    setPendingOperations([]);
  }, []);

  // Cache data for offline use
  const cacheOfflineData = useCallback((key: string, data: any) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem(OFFLINE_DATA_KEY) || '{}');
      offlineData[key] = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error caching offline data:', error);
    }
  }, []);

  const getOfflineData = useCallback((key: string) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem(OFFLINE_DATA_KEY) || '{}');
      return offlineData[key]?.data ?? null;
    } catch (error) {
      console.error('Error getting offline data:', error);
      return null;
    }
  }, []);

  return {
    isOnline,
    pendingOperations,
    isSyncing,
    setIsSyncing,
    addPendingOperation,
    removePendingOperation,
    clearPendingOperations,
    cacheOfflineData,
    getOfflineData,
    hasPendingOperations: pendingOperations.length > 0,
  };
}
