import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { sendUnauthorized, sendForbidden } from '@/utils/response';
import { UserRole } from '@/types';

// Extender la interfaz Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        status: string;
        id_cliente?: number | null;
      };
    }
  }
}

/**
 * Middleware para verificar el token JWT
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.warn('[AUTH] Solicitud sin token', req.method, req.originalUrl);
    sendUnauthorized(res, 'Token de acceso requerido');
    return;
  }

  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      console.warn('[AUTH] Token inválido o expirado:', err?.message, req.method, req.originalUrl);
      sendUnauthorized(res, 'Token inválido o expirado');
      return;
    }

    // Agregar información del usuario a la request
    req.user = decoded as any;
    next();
  });
};

/**
 * Middleware para verificar roles específicos
 */
export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Usuario no autenticado');
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendForbidden(res, 'No tienes permisos para acceder a este recurso');
      return;
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario esté activo
 */
export const requireActiveUser = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    sendUnauthorized(res, 'Usuario no autenticado');
    return;
  }

  if (req.user.status !== 'habilitado') {
    sendForbidden(res, 'Tu cuenta está deshabilitada');
    return;
  }

  next();
};

/**
 * Middleware para verificar si es admin
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Middleware para verificar si es consultor o admin
 */
export const requireConsultorOrAdmin = requireRole(['consultor', 'admin']);

export const requireCliente = requireRole(['cliente']);
