/**
 * =============================================================================
 * REPARACIÓN DE HITOS EN BASE DE DATOS — LLConsulting
 * =============================================================================
 *
 * Para quién: persona que ejecuta mantenimiento en servidor (dev o producción).
 *
 * Qué hace este script:
 *   1) --audit   → Solo lista procesos con problemas (NO modifica la BD).
 *   2) --repair  → Corrige hitos incorrectos o faltantes.
 *
 * Problemas que detecta:
 *   • MEZCLADOS: el proceso es PC pero tiene hitos de CA/SC/etc. (o al revés).
 *   • SIN HITOS: el proceso no tiene ningún hito pero su tipo sí tiene plantilla
 *     (PC, SC, CA, ES, etc.). Muchos ES antiguos pueden aparecer aquí.
 *
 * Qué hace --repair por cada proceso afectado:
 *   • Borra hitos cuyo codigo_servicio no coincide con el del proceso.
 *   • Si no quedan hitos válidos, copia la plantilla correcta del tipo de servicio.
 *   • Activa el hito de inicio del proceso.
 *
 * IMPORTANTE antes de --repair en PRODUCCIÓN:
 *   • Hacer backup de la base de datos.
 *   • Desplegar antes el backend con el código nuevo (filtro de hitos + bloqueo
 *     de cambio de tipo de proceso). Sin eso, el problema puede repetirse.
 *   • Las fechas de cumplimiento de hitos viejos pueden perderse al regenerar.
 *
 * =============================================================================
 * PASOS EN PRODUCCIÓN
 * =============================================================================
 *
 * 1) Conectarse al servidor donde está el backend.
 *
 * 2) Ir a la carpeta del backend:
 *      cd "Fase 2/Evidencias Proyecto/Evidencias de sistema/Base de datos"
 *    (ajustar ruta según el servidor)
 *
 * 3) Verificar que el archivo .env apunta a la BD de PRODUCCIÓN:
 *      DB_HOST=...
 *      DB_PORT=...
 *      DB_NAME=...
 *      DB_USER=...
 *      DB_PASSWORD=...
 *
 * 4) Instalar dependencias si hace falta:
 *      npm install
 *
 * 5) AUDITORÍA (solo lectura — ejecutar primero siempre):
 *      npx ts-node -r tsconfig-paths/register scripts/reparar-hitos-incorrectos.ts --audit
 *
 *    Revisar la salida:
 *      - "Mezclados" = procesos con hitos de otro servicio (prioridad alta).
 *      - "Sin hitos" = procesos sin línea de tiempo (opcional reparar).
 *
 * 6) REPARACIÓN (modifica la BD — solo después del backup):
 *      npx ts-node -r tsconfig-paths/register scripts/reparar-hitos-incorrectos.ts --repair
 *
 *    Al terminar vuelve a auditar solo. Debería mostrar "Mezclados: 0".
 *
 * 7) Reiniciar el servicio del backend en producción.
 *
 * =============================================================================
 * CONSULTA SQL ALTERNATIVA (solo lectura, en pgAdmin / Aiven)
 * =============================================================================
 *
 * Procesos con hitos de otro servicio:
 *
 *   SELECT s.id_solicitud, s.codigo_servicio, c.nombre_cliente,
 *          COUNT(*) FILTER (WHERE hs.codigo_servicio <> s.codigo_servicio) AS hitos_malos
 *   FROM solicitud s
 *   JOIN contacto co ON co.id_contacto = s.id_contacto
 *   JOIN cliente c ON c.id_cliente = co.id_cliente
 *   JOIN hito_solicitud hs ON hs.id_solicitud = s.id_solicitud
 *   GROUP BY s.id_solicitud, s.codigo_servicio, c.nombre_cliente
 *   HAVING COUNT(*) FILTER (WHERE hs.codigo_servicio <> s.codigo_servicio) > 0;
 *
 * Procesos sin ningún hito:
 *
 *   SELECT s.id_solicitud, s.codigo_servicio, c.nombre_cliente
 *   FROM solicitud s
 *   JOIN contacto co ON co.id_contacto = s.id_contacto
 *   JOIN cliente c ON c.id_cliente = co.id_cliente
 *   WHERE NOT EXISTS (SELECT 1 FROM hito_solicitud hs WHERE hs.id_solicitud = s.id_solicitud)
 *   ORDER BY s.codigo_servicio, s.id_solicitud;
 *
 * =============================================================================
 */
import { QueryTypes } from 'sequelize';
import sequelize from '../src/config/database';
import { HitoSolicitudService } from '../src/services/hitoSolicitudService';
import { PLANTILLAS_HITOS } from '../src/data/plantillasHitos';

const ESPERADOS: Record<string, number> = {
  PC: 4, HH: 4, LL: 2, FI: 2, TR: 2, PP: 2, ES: 2, EP: 2, TS: 2, SC: 7, CA: 6,
};

type FilaProceso = {
  id_solicitud: number;
  codigo_servicio: string;
  nombre_cliente: string;
  total_hitos: number;
  hitos_ok: number;
  hitos_malos: number;
};

async function auditar(): Promise<{ mezclados: FilaProceso[]; sinHitos: FilaProceso[] }> {
  const mezclados = await sequelize.query<FilaProceso>(`
    SELECT s.id_solicitud, s.codigo_servicio, c.nombre_cliente,
      COUNT(hs.id_hito_solicitud)::int AS total_hitos,
      COUNT(*) FILTER (WHERE hs.codigo_servicio = s.codigo_servicio)::int AS hitos_ok,
      COUNT(*) FILTER (WHERE hs.codigo_servicio <> s.codigo_servicio)::int AS hitos_malos
    FROM solicitud s
    JOIN contacto co ON co.id_contacto = s.id_contacto
    JOIN cliente c ON c.id_cliente = co.id_cliente
    JOIN hito_solicitud hs ON hs.id_solicitud = s.id_solicitud
    WHERE hs.codigo_servicio <> s.codigo_servicio
    GROUP BY s.id_solicitud, s.codigo_servicio, c.nombre_cliente
    ORDER BY s.id_solicitud
  `, { type: QueryTypes.SELECT });

  const sinHitos = await sequelize.query<FilaProceso>(`
    SELECT s.id_solicitud, s.codigo_servicio, c.nombre_cliente,
      0::int AS total_hitos, 0::int AS hitos_ok, 0::int AS hitos_malos
    FROM solicitud s
    JOIN contacto co ON co.id_contacto = s.id_contacto
    JOIN cliente c ON c.id_cliente = co.id_cliente
    WHERE NOT EXISTS (SELECT 1 FROM hito_solicitud hs WHERE hs.id_solicitud = s.id_solicitud)
    ORDER BY s.codigo_servicio, s.id_solicitud
  `, { type: QueryTypes.SELECT });

  return { mezclados, sinHitos };
}

function imprimirAuditoria(mezclados: FilaProceso[], sinHitos: FilaProceso[]) {
  console.log('\n=== PROCESOS CON HITOS DE OTRO SERVICIO ===');
  if (mezclados.length === 0) {
    console.log('  Ninguno.');
  } else {
    mezclados.forEach((r) => {
      const esp = ESPERADOS[r.codigo_servicio];
      console.log(
        `  ID ${r.id_solicitud} | ${r.codigo_servicio} | ${r.nombre_cliente} | ` +
        `${r.total_hitos} hitos (${r.hitos_malos} incorrectos) | esperados: ${esp ?? '?'}`
      );
    });
  }

  const sinHitosConPlantilla = sinHitos.filter((r) => r.codigo_servicio in PLANTILLAS_HITOS);
  const sinHitosSinPlantilla = sinHitos.filter((r) => !(r.codigo_servicio in PLANTILLAS_HITOS));

  console.log('\n=== PROCESOS SIN NINGÚN HITO (con plantilla definida) ===');
  if (sinHitosConPlantilla.length === 0) {
    console.log('  Ninguno.');
  } else {
    const porServicio: Record<string, number> = {};
    sinHitosConPlantilla.forEach((r) => {
      porServicio[r.codigo_servicio] = (porServicio[r.codigo_servicio] || 0) + 1;
    });
    Object.entries(porServicio).forEach(([cod, n]) =>
      console.log(`  ${cod}: ${n} proceso(s)`)
    );
    console.log(`  Total: ${sinHitosConPlantilla.length}`);
    console.log('  (Suelen ser evaluaciones ES/EP/TS antiguas creadas antes de la línea de tiempo.)');
  }

  if (sinHitosSinPlantilla.length > 0) {
    console.log('\n=== SIN HITOS Y SIN PLANTILLA (no aplica reparación automática) ===');
    console.log(`  ${sinHitosSinPlantilla.length} proceso(s)`);
  }

  console.log('\n=== RESUMEN ===');
  console.log(`  Mezclados: ${mezclados.length}`);
  console.log(`  Sin hitos (reparables): ${sinHitosConPlantilla.length}`);
}

async function reparar() {
  const { mezclados, sinHitos } = await auditar();
  const idsMezclados = mezclados.map((r) => r.id_solicitud);
  const idsSinHitos = sinHitos
    .filter((r) => r.codigo_servicio in PLANTILLAS_HITOS)
    .map((r) => r.id_solicitud);
  const ids = [...new Set([...idsMezclados, ...idsSinHitos])];

  if (ids.length === 0) {
    console.log('\nNo hay procesos que reparar.');
    return;
  }

  console.log(`\nReparando ${ids.length} proceso(s)...\n`);
  for (const id of ids) {
    try {
      const hitos = await HitoSolicitudService.getHitosBySolicitud(id);
      console.log(
        `✅ ID ${id}: ${hitos.length} hitos → ${hitos.map((h) => h.nombre_hito).join(' → ')}`
      );
    } catch (e: any) {
      console.error(`❌ ID ${id}:`, e.message);
    }
  }
}

(async () => {
  const modo = process.argv[2] || '--audit';
  console.log('=== Reparación de hitos LLConsulting ===');
  console.log(`Modo: ${modo}`);
  console.log(`BD: ${process.env.DB_HOST} / ${process.env.DB_NAME}`);

  if (modo === '--audit') {
    const { mezclados, sinHitos } = await auditar();
    imprimirAuditoria(mezclados, sinHitos);
  } else if (modo === '--repair') {
    console.log('\n⚠️  Este modo MODIFICA la base de datos. Asegúrate de tener backup.\n');
    await reparar();
    console.log('\n--- Verificación post-reparación ---');
    const { mezclados, sinHitos } = await auditar();
    imprimirAuditoria(mezclados, sinHitos);
  } else {
    console.error('\nUso correcto:');
    console.error('  --audit   Solo listar problemas (no modifica nada)');
    console.error('  --repair  Corregir hitos (modifica la BD)');
    process.exit(1);
  }

  await sequelize.close();
  console.log('\nListo.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
