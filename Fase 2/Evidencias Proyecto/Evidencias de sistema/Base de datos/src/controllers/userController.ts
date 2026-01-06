import { Request, Response } from 'express';
import { createUser, getUsers, updateUser, changePassword, getStats } from '@/services/userService';
import { sendError, sendSuccess } from '@/utils/response';

// Crear usuario
export const createUserController = async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    const newUser = await createUser(userData);
    return sendSuccess(res, newUser, 'Usuario creado correctamente');
  } catch (error: any) {
    // Usar código 400 para errores de validación (RUT duplicado, email duplicado, etc.)
    const statusCode = error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError' ? 400 : 500;
    const message = error.customMessage || error.message || 'Error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente.';
    return sendError(res, message, statusCode);
  }
};

// Obtener usuarios paginados
export const getUsersController = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const role = (req.query.role as "admin" | "consultor") || undefined;
    const status = (req.query.status as "habilitado" | "inhabilitado") || undefined;
    const sortBy = (req.query.sortBy as "nombre" | "apellido") || "nombre";
    const sortOrder = (req.query.sortOrder as "ASC" | "DESC") || "ASC";

    const result = await getUsers(page, limit, search, role, status, sortBy, sortOrder);
    return sendSuccess(res, result, "Usuarios obtenidos correctamente");
  } catch (error: any) {
    return sendError(res, error.message || "Error al obtener usuarios");
  }
};

// Actualizar usuario
export const updateUserController = async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    const updatedUser = await updateUser(userData);
    return sendSuccess(res, updatedUser, "Usuario actualizado correctamente");
  } catch (error: any) {
    // Usar código 400 para errores de validación (email duplicado, etc.)
    const statusCode = error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError' ? 400 : 500;
    const message = error.customMessage || error.message || 'Error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente.';
    return sendError(res, message, statusCode);
  }
};

// Cambiar contraseña de usuario
export const changePasswordController = async (req: Request, res: Response) => {
  try {
    const { rut_usuario, currentPassword, newPassword } = req.body;
    
    if (!rut_usuario || !currentPassword || !newPassword) {
      return sendError(res, "Faltan campos requeridos", 400);
    }
    
    const result = await changePassword(rut_usuario, currentPassword, newPassword);
    return sendSuccess(res, result, result.message);
  } catch (error: any) {
    // Mensajes específicos para errores conocidos
    if (error.message === "Usuario no encontrado") {
      return sendError(res, error.message, 404);
    }
    
    if (error.message === "Contraseña actual incorrecta") {
      return sendError(res, error.message, 400);
    }
    
    // Mensaje genérico para errores no contemplados
    return sendError(res, error.message || "Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.", 500);
  }
};

// Obtener estadísticas de usuarios
export const getStatsController = async (req: Request, res: Response) => {
  try {
    const stats = await getStats();
    return sendSuccess(res, stats, 'Estadísticas obtenidas correctamente');
  } catch (error: any) {
    return sendError(res, error.message || 'Error al obtener estadísticas', 500);
  }
};