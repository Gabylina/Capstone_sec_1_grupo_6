import Usuario from '@/models/Usuario';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret, TokenExpiredError } from 'jsonwebtoken';
import { config } from '@/config';

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  usuario: {
    rut_usuario: string;
    nombre: string;
    apellido: string,
    rol: string;
    activo: boolean;
  };
}

export const loginUser = async ({ email, password }: LoginPayload): Promise<LoginResponse> => {
  // Buscar usuario por email
  const usuario = await Usuario.findOne({ where: { email_usuario: email } });
  if (!usuario) throw new Error('Credenciales incorrectas');

  // Verificar si está activo
  if (!usuario.isActive()) throw new Error('Tu cuenta ha sido desactivada. Contacta al administrador para más información.');

  // Verificar contraseña
  const isMatch = await bcrypt.compare(password, usuario.contrasena_usuario);
  if (!isMatch) throw new Error('Credenciales incorrectas');

  // Verificar que la secret exista
  if (!config.jwt.secret) throw new Error('JWT secret no definida');

  // Opciones de JWT
  //const signOptions: SignOptions = { expiresIn: config.jwt.expiresIn || '1h' };

  // Duración del token: 28800 segundos = 8 horas
  // El frontend está configurado para mostrar una notificación cuando el token expire
  const signOptions: SignOptions = { 
    expiresIn: 28800 // 8 horas en segundos (28800 segundos = 8 horas)
  };

  // Generar token JWT
  const token = jwt.sign(
    {
      id: usuario.rut_usuario,
      email: usuario.email_usuario,
      role: usuario.getRolString(),
      status: usuario.activo_usuario ? 'habilitado' : 'deshabilitado'
    },
    config.jwt.secret as Secret,
    signOptions
  );

  return {
    token,
    usuario: {
      rut_usuario: usuario.rut_usuario,
      nombre: usuario.getNombre(),
      apellido: usuario.getApellido(),
      rol: usuario.getRolString(),
      activo: usuario.isActive()
    }
  };
};

/**
 * Renovar token
 * Genera un nuevo token basándose en el token actual (incluso si está expirado)
 * Solo permite renovación si el token expiró hace menos de 30 minutos
 */
export const refreshToken = async (oldToken: string): Promise<LoginResponse> => {
  try {
    // Primero intentar verificar el token normalmente
    let decoded: any;
    try {
      if (!config.jwt.secret) throw new Error('JWT secret no definida');
      decoded = jwt.verify(oldToken, config.jwt.secret as Secret);
    } catch (error) {
      // Si el token está expirado, verificarlo ignorando la expiración
      if (error instanceof TokenExpiredError) {
        decoded = jwt.decode(oldToken);
        
        // Verificar que no haya expirado hace más de 30 minutos (1800 segundos)
        const now = Math.floor(Date.now() / 1000);
        const timeSinceExpiration = now - decoded.exp;
        
        if (timeSinceExpiration > 1800) { // 30 minutos
          throw new Error('El token expiró hace demasiado tiempo. Por favor inicia sesión nuevamente.');
        }
      } else {
        throw error;
      }
    }

    if (!decoded || !decoded.id) {
      throw new Error('Token inválido');
    }

    // Verificar que el usuario aún exista y esté activo
    const usuario = await Usuario.findOne({
      where: { rut_usuario: decoded.id }
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    if (!usuario.isActive()) {
      throw new Error('Usuario inactivo');
    }

    // Generar nuevo token con la misma información pero 8 horas nuevas
    if (!config.jwt.secret) throw new Error('JWT secret no definida');
    
    const signOptions: SignOptions = {
      expiresIn: 28800 // 8 horas en segundos
    };

    const tokenPayload = {
      id: usuario.rut_usuario,
      email: usuario.email_usuario,
      role: usuario.getRolString(),
      status: usuario.activo_usuario ? 'habilitado' : 'deshabilitado'
    };

    const newToken = jwt.sign(tokenPayload, config.jwt.secret as Secret, signOptions);

    return {
      token: newToken,
      usuario: {
        rut_usuario: usuario.rut_usuario,
        nombre: usuario.getNombre(),
        apellido: usuario.getApellido(),
        rol: usuario.getRolString(),
        activo: usuario.isActive()
      }
    };
  } catch (error: any) {
    throw error;
  }
};
