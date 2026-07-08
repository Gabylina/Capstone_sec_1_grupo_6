import sequelize from '@/config/database';
import Usuario from '@/models/Usuario';

async function main() {
  await sequelize.authenticate();

  const existing = await Usuario.findOne({ where: { email_usuario: 'nico' } });
  if (existing) {
    console.log('YA_EXISTE', existing.rut_usuario, existing.email_usuario);
    process.exit(0);
  }

  const usuario = await Usuario.create({
    rut_usuario: '11111111-1',
    nombre_usuario: 'Nico',
    apellido_usuario: 'Admin',
    email_usuario: 'nico',
    contrasena_usuario: 'nico',
    activo_usuario: true,
    rol_usuario: 1,
  }, { validate: false });

  console.log('CREADO', usuario.rut_usuario, usuario.email_usuario);
  process.exit(0);
}

main().catch((e) => {
  console.error('ERROR', e.message);
  process.exit(1);
});
