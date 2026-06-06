'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useUserLocation } from '@/hooks/useUserLocation';
import {
  collection, addDoc, Timestamp, doc, updateDoc, increment, getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import {
  ShoppingBag, CheckCircle, Truck, MapPin, Mail, User, Leaf,
  ArrowLeft, Sparkles, Package, Calendar, CreditCard, Navigation,
  Loader2, ChevronRight, Gift, Smartphone, Banknote, Wallet,
} from 'lucide-react';
import { initDeliveryTracking, getEstimatedDeliveryDate } from '@/lib/deliveryTracking';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
  color: string;
}

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    unit: string;
    category?: string;
    images?: string[];
    stock?: number;
    sellerId?: string;
    sellerName?: string;
    sellerPhoto?: string;
    sellerPhone?: string;
    region?: string;
  };
  quantity: number;
}

interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, clearCart } = useCart() as { cart: Cart; clearCart: () => void };
  const { location, loading: locationLoading, detectLocation } = useUserLocation();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [animationStep, setAnimationStep] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash_on_delivery');

  const cartItems   = useMemo(() => cart?.items || [], [cart]);
  const totalPrice  = useMemo(() => cart?.total || 0, [cart]);
  const isFreeDelivery = totalPrice >= 5000;

  const estimatedDeliveryFee = useMemo(() => {
    if (isFreeDelivery) return 0;
    if (!location?.lat || !location?.lng) return 1000;
    const dist = Math.sqrt(
      Math.pow(location.lat - 14.7167, 2) + Math.pow(location.lng + 17.4677, 2)
    ) * 111;
    if (dist <= 10)  return 500;
    if (dist <= 30)  return 1000;
    if (dist <= 100) return 1500;
    return 2000;
  }, [location, isFreeDelivery]);

  const paymentMethods: PaymentMethod[] = useMemo(() => [
    { id: 'cash_on_delivery', name: 'Espèces à la livraison', icon: <Banknote size={20} />, description: 'Payez en espèces lors de la réception', available: true,  color: 'from-emerald-500 to-teal-500' },
    { id: 'wave',             name: 'Wave',                   icon: <Smartphone size={20} />, description: 'Paiement mobile instantané',          available: true,  color: 'from-blue-500 to-indigo-500' },
    { id: 'orange_money',     name: 'Orange Money',           icon: <Smartphone size={20} />, description: 'Paiement via Orange Money',            available: true,  color: 'from-orange-500 to-red-500' },
    { id: 'free_money',       name: 'Free Money',             icon: <Smartphone size={20} />, description: 'Paiement via Free Money',              available: true,  color: 'from-purple-500 to-pink-500' },
    { id: 'card',             name: 'Carte bancaire',         icon: <CreditCard size={20} />, description: 'Paiement sécurisé par carte',          available: false, color: 'from-gray-500 to-gray-600' },
  ], []);

  useEffect(() => {
    const t = setInterval(() => setAnimationStep(p => (p < 3 ? p + 1 : p)), 200);
    return () => clearInterval(t);
  }, []);

  const generateOrderNumber = useCallback(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `AGR-${y}${m}${day}-${r}`;
  }, []);

  const estimatedDeliveryTime = useMemo(() => {
    if (isFreeDelivery) return '24-48h (Express)';
    if (!location?.lat || !location?.lng) return 'À confirmer';
    const dist = Math.sqrt(
      Math.pow(location.lat - 14.7167, 2) + Math.pow(location.lng + 17.4677, 2)
    ) * 111;
    if (dist <= 10)  return '24h';
    if (dist <= 30)  return '24-48h';
    if (dist <= 100) return '48-72h';
    return '3-5 jours';
  }, [location, isFreeDelivery]);

  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) { alert('Votre panier est vide'); return; }
    setLoading(true);

    try {
      const firstItem   = cartItems[0];
      const orderNumber = generateOrderNumber();
      setOrderId(orderNumber);

      // ✅ Correction : utilisation de valeurs par défaut sécurisées
      const safeSellerId    = firstItem?.product?.sellerId || user?.uid || 'agrimarche-official';
      const safeSellerName  = firstItem?.product?.sellerName || 'AgriMarché';
      const safeSellerPhoto = '/logo.png'; // Valeur par défaut sécurisée
      const safeSellerPhone = firstItem?.product?.sellerPhone || '221779747073';
      const safeSellerRegion= firstItem?.product?.region || 'Dakar, Sénégal';

      // Récupérer la localisation du vendeur depuis son profil
      let sellerLat = 14.7167;
      let sellerLng = -17.4677;
      let sellerAddress = 'Dakar, Sénégal';
      
      if (safeSellerId && safeSellerId !== 'agrimarche-official') {
        try {
          const sellerDoc = await getDoc(doc(db, 'users', safeSellerId));
          if (sellerDoc.exists()) {
            const sellerData = sellerDoc.data();
            sellerLat = sellerData?.latitude || sellerData?.lat || 14.7167;
            sellerLng = sellerData?.longitude || sellerData?.lng || -17.4677;
            sellerAddress = sellerData?.address || sellerData?.city || 'Dakar, Sénégal';
          }
        } catch (err) {
          console.error('Erreur récupération localisation vendeur:', err);
        }
      }

      const safeUserId   = user?.uid           || 'guest-user';
      const safeUserName = user?.displayName   || 'Client AgriMarché';
      const safeUserEmail= user?.email         || '';
      const safeUserPhone = (user as any)?.phoneNumber || '';

      const safePaymentMethod     = paymentMethods.find(m => m.id === selectedPaymentMethod);
      const safePaymentMethodName = safePaymentMethod?.name || 'Espèces à la livraison';

      const newOrder = {
        id:            orderNumber,
        sellerId:      safeSellerId,
        sellerName:    safeSellerName,
        sellerPhoto:   safeSellerPhoto,
        sellerPhone:   safeSellerPhone,
        sellerRegion:  safeSellerRegion,
        userId:        safeUserId,
        userName:      safeUserName,
        userEmail:     safeUserEmail,
        userPhone:     safeUserPhone,
        
        sellerLocation: {
          lat: sellerLat,
          lng: sellerLng,
          address: sellerAddress,
        },
        
        customerLocation: {
          lat: location?.lat || null,
          lng: location?.lng || null,
          address: location?.address || location?.city || 'Adresse non détectée',
        },
        
        customerLocationRaw: {
          city:     location?.city     || 'Non détectée',
          region:   location?.region   || 'Sénégal',
          lat:      location?.lat      || null,
          lng:      location?.lng      || null,
          detected: location?.detected || false,
          address:  location?.address  || '',
        },
        date: new Date().toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
        timestamp:          new Date().toISOString(),
        status:             'en_attente',
        statusLabel:        'En attente de validation',
        cancelledBy:        null,
        cancelledAt:        null,
        subtotal:           totalPrice || 0,
        deliveryFee:        estimatedDeliveryFee || 0,
        isFreeDelivery:     isFreeDelivery || false,
        total:              (totalPrice + (isFreeDelivery ? 0 : estimatedDeliveryFee)) || 0,
        paymentMethod:      selectedPaymentMethod || 'cash_on_delivery',
        paymentMethodName:  safePaymentMethodName,
        paymentStatus:      'en_attente',
        items:              cartItems.map(item => ({
          productId:   item?.product?.id    || 'unknown',
          productName: item?.product?.name  || 'Produit inconnu',
          productPrice:item?.product?.price || 0,
          quantity:    item?.quantity       || 1,
          unit:        item?.product?.unit  || 'kg',
          total:       (item?.product?.price || 0) * (item?.quantity || 1),
          image:       item?.product?.images?.[0] || null,
          category:    item?.product?.category    || 'Autres',
          region:      item?.product?.region      || 'Sénégal',
          sellerId:    item?.product?.sellerId    || safeSellerId,
        })),
        deliveryTime:         estimatedDeliveryTime || 'À confirmer',
        deliveryInstructions: '',
        itemCount:            cartItems.length || 0,
        createdAt:            Timestamp.now(),
        updatedAt:            new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'orders'), newOrder);

      await initDeliveryTracking(docRef.id);
      await updateDoc(doc(db, 'orders', docRef.id), {
        estimatedDelivery: Timestamp.fromDate(getEstimatedDeliveryDate(new Date())),
      });

      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: safeSellerId,
            title: '🛒 Nouvelle commande',
            body: `${safeUserName || 'Un client'} a commandé pour ${newOrder.total?.toLocaleString()} FCFA`,
            link: '/seller/orders',
          }),
        });
        console.log('✅ Notification vendeur envoyée');
      } catch (err) {
        console.error('Erreur notification:', err);
      }

      for (const item of cartItems) {
        if (item?.product?.id) {
          await updateDoc(doc(db, 'products', item.product.id), {
            stock: increment(-(item.quantity || 1)),
          });
        }
      }

      const prev = JSON.parse(localStorage.getItem('agrimarche_orders') || '[]');
      localStorage.setItem('agrimarche_orders', JSON.stringify([{ ...newOrder, firestoreId: docRef.id }, ...prev]));
      localStorage.setItem('last_order', JSON.stringify({ ...newOrder, firestoreId: docRef.id }));

      setSuccess(true);
      clearCart();
      setTimeout(() => router.push('/account/orders'), 2500);
    } catch (err) {
      console.error(err);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, [cartItems, totalPrice, estimatedDeliveryFee, isFreeDelivery, estimatedDeliveryTime,
      generateOrderNumber, user, location, selectedPaymentMethod, paymentMethods, clearCart, router]);

  // ── Succès ───────────────────────────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-75" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle size={48} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">Commande confirmée ! 🎉</h1>
        <p className="text-gray-500 mb-2">Merci pour votre confiance</p>
        <p className="text-gray-400 text-sm mb-6">
          N° commande : <span className="font-mono font-bold text-emerald-600">{orderId}</span>
        </p>
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <Truck size={18} /><span className="font-semibold">Livraison estimée</span>
          </div>
          <p className="text-sm text-gray-700">{estimatedDeliveryTime}</p>
          {isFreeDelivery && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <Gift size={12} />Livraison gratuite !
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/account/orders" className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl font-semibold transition-all text-center">
            Voir mes commandes
          </Link>
          <Link href="/main/products" className="flex-1 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 py-3 rounded-xl font-semibold transition-all text-center">
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  );

  // ── Page checkout ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 py-8 px-4">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors mb-4">
            <ArrowLeft size={20} />Retour au panier
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center gap-3">
            <Sparkles className="text-emerald-500" size={32} />Validation commande
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Gauche */}
          <div className="lg:col-span-2 space-y-6">

            {/* Localisation */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><MapPin size={20} />Adresse de livraison</h2>
              </div>
              <div className="p-6">
                <button
                  onClick={detectLocation}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Navigation size={20} className="text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">Utiliser ma position</p>
                      {locationLoading ? (
                        <p className="text-sm text-gray-500">Détection…</p>
                      ) : location?.city ? (
                        <p className="text-sm text-gray-600">{location.city}, {location.region}</p>
                      ) : (
                        <p className="text-sm text-gray-500">Cliquez pour détecter</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-emerald-600" />
                </button>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><User size={20} />Informations de contact</h2>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { icon: User,  label: 'Nom complet', val: user?.displayName || 'Client AgriMarché' },
                  { icon: Mail,  label: 'Email',        val: user?.email       || 'Non renseigné' },
                  { icon: User,  label: 'Téléphone',    val: (user as any)?.phoneNumber || 'À renseigner' },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Icon size={18} className="text-emerald-600" />
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="font-medium text-gray-800">{val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Paiement */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><CreditCard size={20} />Mode de paiement</h2>
              </div>
              <div className="p-6 space-y-3">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                      selectedPaymentMethod === method.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'
                    } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPaymentMethod === method.id}
                      onChange={() => method.available && setSelectedPaymentMethod(method.id)}
                      disabled={!method.available}
                      className="w-5 h-5 text-emerald-600"
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">{method.icon}</div>
                        <div>
                          <p className="font-medium text-gray-800">{method.name}</p>
                          <p className="text-xs text-gray-500">{method.description}</p>
                        </div>
                      </div>
                      {!method.available && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full">Bientôt</span>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Droite — récapitulatif */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2"><Package size={20} />Récapitulatif</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3 py-2 border-b border-gray-100">
                        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Leaf size={20} className="text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 text-sm">{item?.product?.name || 'Produit'}</p>
                          <p className="text-xs text-gray-500">{item?.quantity || 0} × {(item?.product?.price || 0).toLocaleString()} FCFA</p>
                        </div>
                        <p className="font-semibold text-emerald-600 text-sm">
                          {((item?.product?.price || 0) * (item?.quantity || 0)).toLocaleString()} FCFA
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sous-total</span>
                      <span>{totalPrice.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Livraison</span>
                      <span>{isFreeDelivery ? 'Gratuite' : `${estimatedDeliveryFee.toLocaleString()} FCFA`}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-100">
                      <span className="font-bold text-gray-800">Total</span>
                      <span className="font-bold text-xl text-emerald-700">
                        {(totalPrice + (isFreeDelivery ? 0 : estimatedDeliveryFee)).toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={loading || cartItems.length === 0}
                    className="w-full mt-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 size={20} className="animate-spin" />Traitement…</> : <><Sparkles size={20} />Confirmer</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}