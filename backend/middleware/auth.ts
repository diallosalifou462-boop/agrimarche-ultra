import { Request, Response, NextFunction } from 'express';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
    }),
  });
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        role?: string;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      res.status(401).json({
        error: 'Non authentifié',
      });
      return;
    }

    const decoded = await getAuth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: (decoded as any).role || 'user',
    };

    next();
  } catch (error) {
    console.error(error);

    res.status(401).json({
      error: 'Token invalide ou expiré',
    });
  }
}

export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      error: 'Accès réservé aux administrateurs',
    });
    return;
  }

  next();
}