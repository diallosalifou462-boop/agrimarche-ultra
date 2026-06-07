// middleware.ts
// ⚠️ TEMPORAIREMENT DÉSACTIVÉ - La protection est gérée dans chaque page
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // ✅ Middleware désactivé en production
  return NextResponse.next();
}

export const config = {
  matcher: [],
};