// src/hooks/usePWA.ts
import { useEffect, useState } from 'react';
import { installPrompt } from '@/pwa/install-prompt';
import { offlineSync } from '@/pwa/offline-sync';
import { notificationsManager } from '@/pwa/notifications';

interface PWAState {
  isInstallable: boolean;
  isOnline: boolean;
  isStandalone: boolean;
  notificationsEnabled: boolean;
  pendingOrdersCount: number;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isStandalone: typeof window !== 'undefined'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false,
    notificationsEnabled: typeof Notification !== 'undefined'
      ? Notification.permission === 'granted'
      : false,
    pendingOrdersCount: 0
  });

  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setState(prev => ({ ...prev, isStandalone: e.matches }));
    };

    const updatePendingCount = async () => {
      const count = await offlineSync.getPendingOrdersCount();
      setState(prev => ({ ...prev, pendingOrdersCount: count }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    displayModeQuery.addEventListener('change', handleDisplayModeChange);

    const unsubscribe = installPrompt.onInstallableChange((visible) => {
      setState(prev => ({ ...prev, isInstallable: visible }));
    });

    const interval = setInterval(updatePendingCount, 5000);
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const install = async () => installPrompt.showInstallPrompt();

  const requestNotifications = async () => {
    const granted = await notificationsManager.requestPermission();
    setState(prev => ({ ...prev, notificationsEnabled: granted }));
    return granted;
  };

  const syncNow = async () => {
    await offlineSync.syncAllPending();
    const count = await offlineSync.getPendingOrdersCount();
    setState(prev => ({ ...prev, pendingOrdersCount: count }));
  };

  return { ...state, install, requestNotifications, syncNow };
}
