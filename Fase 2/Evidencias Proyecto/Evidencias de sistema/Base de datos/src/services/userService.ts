import { Op } from "sequelize";
import Usuario from "@/models/Usuario";
import bcrypt from "bcryptjs";

interface CreateUserPayload {
  rut_usuario: string;
  nombre_usuario: string;
  apellido_usuario: string;
  email_usuario: string;
  contrasena_usuario: string;
  rol_usuario: number; // 1 = admin, 2 = consultor
  activo_usuario?: boolean; // opcional, por defecto true
}
interface UserPayload {
  rut_usuario: string; // obligatorio en update, opcional en create si la PK se genera de otra forma
  nombre_usuario?: string;
  apellido_usuario?: string;
  email_usuario?: string;
  contrasena_usuario?: string;
  rol_usuario?: number; // 1 = admin, 2 = consultor
  activo_usuario?: boolean;
}

// Crear usuario
export const createUser = async (data: CreateUserPayload) => {
  try {
    const usuario = await Usuario.create({
      ...data,
      activo_usuario: data.activo_usuario ?? true,
    });

    return {
      rut_usuario: usuario.rut_usuario,
      nombre: usuario.getNombreCompleto(),
      email: usuario.email_usuario,
      rol: usuario.getRolString(),
      activo: usuario.activo_usuario,
    };
  } catch (error: any) {
    // Re-lanzar el error original para que el controlador pueda detectar el tipo
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Error de clave única (RUT o email duplicado)
      const field = error.errors?.[0]?.path;
      if (field === 'rut_usuario') {
        error.customMessage = 'El RUT ya está registrado en el sistema';
      } else if (field === 'email_usuario') {
        error.customMessage = 'El correo electrónico ya está registrado en el sistema';
      } else {
        error.customMessage = 'Ya existe un usuario con estos datos';
      }
    } else if (error.name === 'SequelizeValidationError') {
      // Error de validación
      const messages = error.errors?.map((e: any) => e.message).join(', ');
      error.customMessage = messages || 'Error de validación en los datos del usuario';
    }
    
    // Re-lanzar el error con su nombre original preservado
    throw error;
  }
};

// Actualizar usuario
export const updateUser = async (data: UserPayload) => {
  try {
    const { rut_usuario, ...updateFields } = data;

    const usuario = await Usuario.findByPk(rut_usuario);
    if (!usuario) throw new Error("Usuario no encontrado");

    await usuario.update(updateFields);

    return {
      rut_usuario: usuario.rut_usuario,
      nombre: usuario.getNombreCompleto(),
      email: usuario.email_usuario,
      rol: usuario.getRolString(),
      activo: usuario.activo_usuario,
    };
  } catch (error: any) {
    // Re-lanzar el error original para que el controlador pueda detectar el tipo
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Error de clave única (email duplicado en update)
      const field = error.errors?.[0]?.path;
      if (field === 'email_usuario') {
        error.customMessage = 'El correo electrónico ya está registrado en el sistema';
      } else {
        error.customMessage = 'Ya existe un usuario con estos datos';
      }
    } else if (error.name === 'SequelizeValidationError') {
      // Error de validación
      const messages = error.errors?.map((e: any) => e.message).join(', ');
      error.customMessage = messages || 'Error de validación en los datos del usuario';
    }
    
    // Re-lanzar el error con su nombre original preservado
    throw error;
  }
};


// Obtener usuarios paginados con filtros opcionales y orden
export const getUsers = async (
  page: number = 1,
  limit: number = 10,
  search: string = "",
  role?: "admin" | "consultor",
  status?: "habilitado" | "inhabilitado",
  sortBy: "nombre" | "apellido" = "nombre",
  sortOrder: "ASC" | "DESC" = "ASC"
) => {
  const offset = (page - 1) * limit;

  const andConditions: any[] = [];

  // Filtro de búsqueda por texto
  if (search) {
    andConditions.push({
      [Op.or]: [
        { nombre_usuario: { [Op.iLike]: `%${search}%` } },
        { apellido_usuario: { [Op.iLike]: `%${search}%` } },
        { email_usuario: { [Op.iLike]: `%${search}%` } },
      ],
    });
  }

  // Filtro por rol
  let roleValue: number | undefined;
  if (role === "admin") roleValue = 1;
  else if (role === "consultor") roleValue = 2;

  if (roleValue !== undefined) {
    andConditions.push({ rol_usuario: roleValue });
  }

  // Filtro por estado
  if (status === "habilitado") andConditions.push({ activo_usuario: true });
  else if (status === "inhabilitado") andConditions.push({ activo_usuario: false });

  // Construir la condición final
  const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

  // Determinar columna para ordenar
  const orderColumn = sortBy === "nombre" ? "nombre_usuario" : "apellido_usuario";

  const { count, rows } = await Usuario.findAndCountAll({
    where,
    limit,
    offset,
    order: [[orderColumn, sortOrder]],
    attributes: [
      "rut_usuario",
      "nombre_usuario",
      "apellido_usuario",
      "email_usuario",
      "rol_usuario",
      "activo_usuario",
    ],
  });

  return {
    users: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
};


// page: número. Página que quieres obtener (por defecto 1)
// limit: número. Cantidad de usuarios por página (por defecto 10)
// search: string. Palabra clave para buscar en nombre, apellido o email
// role: "admin" o "consultor". Filtra usuarios por rol
// status: "habilitado" o "inhabilitado". Filtra usuarios por estado
// sortBy: "nombre" o "apellido". Columna para ordenar los resultados (por defecto "nombre")
// sortOrder: "ASC" o "DESC". Dirección del orden (por defecto "ASC")

// Ejemplo de URL con todos los filtros:
// http://localhost:3001/api/users?page=2&limit=5&search=nico&role=consultor&status=habilitado&sortBy=apellido&sortOrder=DESC



// Cambiar contraseña de usuario
export const changePassword = async (rut_usuario: string, currentPassword: string, newPassword: string) => {
  const usuario = await Usuario.findByPk(rut_usuario);
  if (!usuario) throw new Error("Usuario no encontrado");

  // Verificar contraseña actual
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, usuario.contrasena_usuario);
  if (!isCurrentPasswordValid) throw new Error("Contraseña actual incorrecta");

  // Actualizar con nueva contraseña (se hasheará automáticamente por el hook)
  await usuario.update({ contrasena_usuario: newPassword });

  return {
    rut_usuario: usuario.rut_usuario,
    message: "Contraseña actualizada correctamente"
  };
};

// Obtener estadísticas de usuarios
export const getStats = async () => {
  const totalUsuarios = await Usuario.count();
  const totalConsultores = await Usuario.count({ where: { rol_usuario: 2 } }); // 2 = consultor
  const totalAdministradores = await Usuario.count({ where: { rol_usuario: 1 } }); // 1 = admin
  const usuariosActivos = await Usuario.count({ where: { activo_usuario: true } });
  const usuariosInactivos = await Usuario.count({ where: { activo_usuario: false } });

  return {
    total_usuarios: totalUsuarios,
    total_consultores: totalConsultores,
    total_administradores: totalAdministradores,
    usuarios_activos: usuariosActivos,
    usuarios_inactivos: usuariosInactivos
  };
};