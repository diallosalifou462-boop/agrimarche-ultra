// /app/delivery/dashboard/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Navigation, MapPin, Phone, MessageCircle, CheckCircle, Truck, Clock, User } from 'lucide-react';

export default function DeliveryDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Vérifier si l'utilisateur est un livreur (role: 'delivery')
  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'delivery')) {
      router.push('/');
    }
  }, [authLoading, user, profile, router]);

  // Récupérer les commandes assignées au livreur
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'orders'), where('deliveryId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Partager la position en temps réel
  const startSharingLocation = () => {
    if (!navigator.geolocation) {
      alert('Géolocalisation non supportée');
      return;
    }

    setSharingLocation(true);

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        
        // Mettre à jour la position pour toutes les commandes en livraison
        for (const order of orders) {
          if (order.status === 'expediee') {
            await updateDoc(doc(db, 'orders', order.id), {
              'tracking.currentLocation': { lat: latitude, lng: longitude },
              'tracking.lastUpdate': new Date(),
            });
          }
        }
      },
      (error) => {
        console.error('Erreur GPS:', error);
        alert('Erreur de géolocalisation');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    
    setWatchId(id);
  };

  const stopSharingLocation = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setSharingLocation(false);
  };

  const markAsDelivered = async (orderId: string) => {
    if (!confirm('Confirmer la livraison ?')) return;
    
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'livree',
      statusLabel: 'Livrée',
      deliveredAt: new Date(),
      'tracking.enabled': false,
    });
    
    alert('✅ Commande marquée comme livrée');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const activeDeliveries = orders.filter(o => o.status === 'expediee');
  const completedDeliveries = orders.filter(o => o.status === 'livree');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Truck size={20} /> Livraisons
              </h1>
              <p className="text-emerald-100 text-sm">{activeDeliveries.length} livraison(s) en cours</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* Contrôle de localisation */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">Partager ma position</p>
              <p className="text-xs text-gray-400">
                {sharingLocation ? '📍 Position partagée en temps réel' : '🔴 Position non partagée'}
              </p>
            </div>
            {!sharingLocation ? (
              <button
                onClick={startSharingLocation}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Navigation size={14} /> Activer
              </button>
            ) : (
              <button
                onClick={stopSharingLocation}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                Désactiver
              </button>
            )}
          </div>
          {currentLocation && sharingLocation && (
            <p className="text-xs text-gray-400 mt-2">
              📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </p>
          )}
        </div>

        {/* Livraisons actives */}
        {activeDeliveries.length === 0 && completedDeliveries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <Truck size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Aucune livraison assignée</p>
          </div>
        ) : (
          <>
            {/* Livraisons en cours */}
            {activeDeliveries.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">En cours</h2>
                {activeDeliveries.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-gray-800">#{order.orderNumber || order.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600">{order.userName}</p>
                      </div>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Clock size={10} /> En livraison
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        {order.customerLocation?.address || 'Adresse non spécifiée'}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        {order.userPhone || 'Pas de téléphone'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`tel:${order.userPhone}`}
                        className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium text-center"
                      >
                        📞 Appeler
                      </a>
                      <a
                        href={`https://wa.me/${order.userPhone?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium text-center"
                      >
                        💬 WhatsApp
                      </a>
                      <button
                        onClick={() => markAsDelivered(order.id)}
                        className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <CheckCircle size={14} /> Livré
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Livraisons terminées */}
            {completedDeliveries.length > 0 && (
              <div className="space-y-3 mt-4">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Terminées</h2>
                {completedDeliveries.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 opacity-70">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-800">#{order.orderNumber || order.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600">{order.userName}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                        <CheckCircle size={10} /> Livrée
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}