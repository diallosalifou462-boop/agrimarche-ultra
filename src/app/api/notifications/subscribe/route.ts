// app/api/notify/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Pour l'instant, on stocke en mémoire (plus tard on mettra une vraie base de données)
let subscriptions: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const { endpoint, keys, userId } = await request.json();
    
    // Éviter les doublons
    const existingIndex = subscriptions.findIndex(s => s.endpoint === endpoint);
    if (existingIndex !== -1) {
      subscriptions[existingIndex] = { endpoint, keys, userId, createdAt: new Date() };
    } else {
      subscriptions.push({ endpoint, keys, userId, createdAt: new Date() });
    }
    
    console.log(`✅ Nouvel abonnement : ${subscriptions.length} total`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur subscription:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

// Exporter la liste des abonnements pour l'utiliser dans send
export { subscriptions };