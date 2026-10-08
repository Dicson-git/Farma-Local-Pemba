import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../lib/database';

export interface AuthenticatedRequest extends Request {
  currentPharmacy?: {
    id: string;
    nome: string;
    email: string;
  };
}

export function authRequired(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionToken = req.cookies?.farmacia_session;

  if (!sessionToken) {
    return res.redirect('/login?error=auth_required');
  }

  const db = DatabaseService.getInstance();
  const farmacia = db.findPharmacyById(sessionToken);

  if (!farmacia) {
    res.clearCookie('farmacia_session');
    return res.redirect('/login?error=session_expired');
  }

  req.currentPharmacy = {
    id: farmacia.id,
    nome: farmacia.nome,
    email: farmacia.email
  };

  next();
}

export function adminAuthRequired(req: Request, res: Response, next: NextFunction) {
  const adminCookie = req.cookies?.admin_session;

  if (!adminCookie || adminCookie !== 'admin-authenticated-token') {
    return res.redirect('/admin/login?error=auth_required');
  }

  next();
}

