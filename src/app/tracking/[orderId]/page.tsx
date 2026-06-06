'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { 
  Clock, CheckCircle, MapPin, Store, Truck, 
  Phone, MessageCircle, Navigation, User, XCircle, Package
} from 'lucide-react';

export default function TrackingPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const unsub = onSnapshot(doc(db, 'orders', orderId as string), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [orderId]);

  const getStatusInfo = () => {
    const statusMap: Record<string, { label: string; color: string; icon: JSX.Element }> = {
      'en_attente': { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: <Clock size={14} /> },
      'en_preparation': { label: 'Préparation', color: 'bg-blue-100 text-blue-700', icon: <Package size={14} /> },
      'expediee': { label: 'En livraison', color: 'bg-purple-100 text-purple-700', icon: <Truck size={14} /> },
      'livree': { label: 'Livrée', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
      'annulee': { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> },
    };
    return statusMap[order?.status] || statusMap['en_attente'];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Commande non trouvée</p>
          <Link href="/account/orders" className="text-emerald-600 mt-4 inline-block">
            Retour à mes commandes
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/account/orders" className="text-white/80 hover:text-white">
              ←
            </Link>
            <div>
              <h1 className="text-xl font-bold">Suivi de livraison</h1>
              <p className="text-emerald-100 text-sm">Commande #{order.orderNumber || orderId?.slice(-8)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        
        {/* Statut actuel */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Statut</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusInfo.color}`}>
              {statusInfo.icon} {statusInfo.label}
            </span>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
            
            {[
              { label: 'Commande confirmée', key: 'confirmed', completed: true },
              { label: 'Préparation', key: 'preparing', completed: order.status !== 'en_attente' },
              { label: 'En livraison', key: 'shipped', completed: order.status === 'expediee' || order.status === 'livree' },
              { label: 'Livrée', key: 'delivered', completed: order.status === 'livree' },
            ].map((step, idx) => (
              <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step.completed ? <CheckCircle size={14} /> : <Clock size={14} />}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${step.completed ? 'text-gray-800' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Informations livreur (si assigné) */}
        {order.deliveryPerson && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <User size={18} className="text-emerald-600" />
              Votre livreur
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-bold">
                {order.deliveryPerson.name?.charAt(0) || 'L'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{order.deliveryPerson.name}</p>
                <p className="text-sm text-gray-500">{order.deliveryPerson.vehicle || 'Livreur'}</p>
                <div className="flex gap-2 mt-2">
                  <a href={`tel:${order.deliveryPerson.phone}`} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Phone size={12} /> Appeler
                  </a>
                  <a href={`https://wa.me/${order.deliveryPerson.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1">
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Position du livreur (en temps réel) */}
        {order.status === 'expediee' && order.tracking?.currentLocation && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin size={18} className="text-emerald-600" />
              Position du livreur
            </h2>
            <div className="bg-gray-100 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-2">📍 Dernière position connue</p>
              <p className="text-xs text-gray-400">
                Lat: {order.tracking.currentLocation.lat?.toFixed(6)}<br />
                Lng: {order.tracking.currentLocation.lng?.toFixed(6)}
              </p>
              <button
                onClick={() => {
                  window.open(`https://maps.google.com/?q=${order.tracking.currentLocation.lat},${order.tracking.currentLocation.lng}`, '_blank');
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium"
              >
                <Navigation size={14} /> Voir sur Google Maps
              </button>
            </div>
            {order.tracking.lastUpdate && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Dernière mise à jour : {new Date(order.tracking.lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {/* Adresses */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Store size={16} className="text-emerald-600" />
              <span className="font-medium text-gray-700">Point de retrait</span>
            </div>
            <p className="text-sm text-gray-600">{order.sellerLocation?.address || order.sellerRegion || 'Boutique du vendeur'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-emerald-600" />
              <span className="font-medium text-gray-700">Livraison</span>
            </div>
            <p className="text-sm text-gray-600">{order.customerLocation?.address || 'Votre adresse'}</p>
          </div>
        </div>

        {/* Bouton partage */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/tracking/${orderId}`);
            alert('Lien de suivi copié !');
          }}
          className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium"
        >
          📋 Partager le lien de suivi
        </button>

      </div>
    </div>
  );
}