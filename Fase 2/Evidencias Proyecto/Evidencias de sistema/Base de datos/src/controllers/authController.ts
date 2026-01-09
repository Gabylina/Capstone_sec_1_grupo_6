import { Request, Response } from 'express';
import { loginUser, refreshToken } from '@/services/authService';
import { sendSuccess, sendError } from '@/utils/response';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    sendSuccess(res, result, 'Login exitoso');
  } catch (error: any) {
    sendError(res, error.message || 'Error al iniciar sesión', 401);
  }
};

/**
 * POST /api/auth/refresh
 * Renovar token de sesión
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return sendError(res, 'Token es requerido', 400);
    }

    const result = await refreshToken(token);
    return sendSuccess(res, result, 'Token renovado exitosamente');
  } catch (error: any) {
    // Mensajes de error específicos
    if (error.message.includes('expiró hace demasiado tiempo')) {
      return sendError(res, error.message, 401);
    }
    if (error.message.includes('Usuario inactivo')) {
      return sendError(res, 'Tu cuenta ha sido desactivada. Contacta al administrador.', 403);
    }
    if (error.message.includes('Usuario no encontrado')) {
      return sendError(res, 'Usuario no encontrado', 404);
    }
    if (error.message.includes('Token inválido')) {
      return sendError(res, 'Token inválido', 401);
    }
    
    return sendError(res, error.message || 'Error al renovar el token', 500);
  }
};
