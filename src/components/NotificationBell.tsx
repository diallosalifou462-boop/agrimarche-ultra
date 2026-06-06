'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase/messaging';
import { Bell, BellOff } from 'lucide-react';

// ✅ Ajouter un type pour la notification
interface NotificationPayload {
  notification: {
    title: string;
    body: string;
  };
  data?: any;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [notification, setNotification] = useState<NotificationPayload | null>(null);

  // Vérifier l'état actuel des permissions
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission as 'default' | 'granted' | 'denied');
    }
  }, []);

  // Écouter les notifications reçues
  useEffect(() => {
    const handleMessage = async () => {
      const payload = await onMessageListener() as NotificationPayload;
      if (payload) {
        setNotification(payload);
        // Afficher une notification système
        if (Notification.permission === 'granted') {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/logo.png',
          });
        }
      }
    };
    
    handleMessage();
  }, []);

  // Demander la permission
  const requestPermission = async () => {
    if (user) {
      const token = await requestNotificationPermission(user.uid);
      if (token) {
        setPermission('granted');
      }
    } else {
      alert('Connectez-vous pour activer les notifications');
    }
  };

  // Si déjà activé, afficher une cloche avec notification
  if (permission === 'granted') {
    return (
      <div className="relative">
        <Bell size={18} className="text-white" />
        {notification && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  }

  // Si pas encore décidé, afficher un bouton
  if (permission === 'default') {
    return (
      <button
        onClick={requestPermission}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-white text-xs font-medium hover:bg-emerald-500/30 transition"
      >
        <Bell size={14} />
        Activer les notifications
      </button>
    );
  }

  // Si refusé, afficher cloche barrée
  return (
    <div className="relative">
      <BellOff size={18} className="text-gray-400" />
    </div>
  );
}