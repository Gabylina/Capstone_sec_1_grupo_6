import app, { initializeApp } from './app';
import { config } from '@/config';
import { testConnection, syncDatabase } from '@/config/database';
import sequelize from '@/config/database';
import { Logger } from '@/utils/logger';
import { getPoolStats } from '@/middleware/connectionManager';
import { cleanupConnections } from '@/middleware/connectionManager';
import { FechasLaborales } from '@/utils/fechasLaborales';
// Importar modelos para que Sequelize los reconozca
import '@/models';

/**
 * Función principal para iniciar el servidor
 */
const startServer = async (): Promise<void> => {
    try {
        // Inicializar la aplicación
        await initializeApp();

        // Probar conexión a la base de datos
        await testConnection();

        // Sincronizar modelos (crear tablas si no existen)
        await syncDatabase();

        // Pre-cargar feriados de Chile para mejorar rendimiento
        try {
            await FechasLaborales.precargarFeriados();
        } catch (error) {
            // Los feriados se cargarán bajo demanda si falla la precarga
        }

        // Iniciar el servidor
        const server = app.listen(config.server.port, () => {
            Logger.info(`Servidor iniciado en puerto ${config.server.port}`);
            Logger.info(`Frontend URL: ${config.server.frontendUrl}`);
            Logger.info(`Entorno: ${config.server.nodeEnv}`);
            Logger.info(`API disponible en: http://localhost:${config.server.port}/api`);
        });

        // Log de estadísticas del pool cada 15 minutos (el pool se gestiona automáticamente)
        const poolStatsInterval = setInterval(async () => {
            const stats = getPoolStats();
            if (stats) {
                Logger.info(`Pool stats: ${stats.used}/${stats.max} conexiones activas`);
            }
        }, 15 * 60 * 1000); // 15 minutos

        // Limpiar el intervalo cuando el servidor se cierre
        server.on('close', () => {
            clearInterval(poolStatsInterval);
        });

        // Manejo de cierre graceful
        const gracefulShutdown = async (signal: string) => {
            Logger.info(`📡 Recibida señal ${signal}. Cerrando servidor...`);

            server.close(async () => {
                Logger.info('✅ Servidor cerrado correctamente');
                
                // Cerrar conexiones de la base de datos
                try {
                    await sequelize.close();
                    Logger.info('✅ Conexiones de base de datos cerradas');
                } catch (error) {
                    Logger.error('❌ Error cerrando conexiones de BD:', error);
                }
                
                process.exit(0);
            });

            // Forzar cierre después de 10 segundos
            setTimeout(() => {
                Logger.error('❌ Forzando cierre del servidor');
                process.exit(1);
            }, 10000);
        };

        // Escuchar señales de cierre
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Manejo de errores no capturados
        process.on('uncaughtException', (error) => {
            Logger.error('❌ Excepción no capturada:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            Logger.error('❌ Promesa rechazada no manejada:', { reason, promise });
            process.exit(1);
        });

    } catch (error) {
        Logger.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Iniciar el servidor
startServer();
