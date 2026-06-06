// src/hooks/usePushNotifications.ts
import { useEffect, useState } from 'react';
import { notificationsManager } from '@/pwa/notifications';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    const granted = await notificationsManager.requestPermission();
    setPermission(Notification.permission);
    return granted;
  };

  return { permission, isSupported, requestPermission, isGranted: permission === 'granted' };
}
