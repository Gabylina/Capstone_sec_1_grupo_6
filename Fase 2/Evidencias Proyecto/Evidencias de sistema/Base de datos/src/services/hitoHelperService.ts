import { Transaction, Op } from 'sequelize';
import { HitoSolicitud } from '@/models';
import { Logger } from '@/utils/logger';

/**
 * Servicio auxiliar para gestión de cumplimiento de hitos
 */
export class HitoHelperService {
    /**
     * Marca la fecha de cumplimiento de un hito específico
     * Solo actualiza si el hito no tiene fecha de cumplimiento previa
     * 
     * @param idSolicitud - ID de la solicitud
     * @param nombreHito - Nombre del hito a marcar
     * @param fechaCumplimiento - Fecha de cumplimiento (por defecto NOW)
     * @param transaction - Transacción opcional
     * @returns true si se marcó, false si ya estaba marcado
     */
    static async marcarCumplimientoHito(
        idSolicitud: number,
        nombreHito: string,
        fechaCumplimiento: Date = new Date(),
        transaction?: Transaction
    ): Promise<boolean> {
        try {
            const [numUpdated] = await HitoSolicitud.update(
                { fecha_cumplimiento: fechaCumplimiento },
                {
                    where: {
                        id_solicitud: idSolicitud,
                        nombre_hito: nombreHito,
                        fecha_cumplimiento: { [Op.is]: null } as any // Solo actualizar si no está marcado
                    },
                    transaction
                }
            );

            if (numUpdated > 0) {
                Logger.info(`Hito "${nombreHito}" marcado como cumplido para solicitud ${idSolicitud}`);
                return true;
            } else {
                Logger.debug(`Hito "${nombreHito}" ya estaba marcado o no existe para solicitud ${idSolicitud}`);
                return false;
            }
        } catch (error) {
            Logger.error(`Error al marcar cumplimiento de hito "${nombreHito}" para solicitud ${idSolicitud}:`, error);
            throw error;
        }
    }

    /**
     * Marca el cumplimiento del primer hito de una solicitud (Publicación de cargo)
     * Se llama cuando se agrega el primer portal a una solicitud
     * 
     * @param idSolicitud - ID de la solicitud
     * @param transaction - Transacción opcional
     */
    static async marcarHitoPublicacion(
        idSolicitud: number,
        transaction?: Transaction
    ): Promise<void> {
        try {
            // Verificar si ya existe alguna publicación previa para esta solicitud
            const hito = await HitoSolicitud.findOne({
                where: {
                    id_solicitud: idSolicitud,
                    nombre_hito: 'Publicación de cargo'
                },
                transaction
            });

            if (hito && !hito.fecha_cumplimiento) {
                await this.marcarCumplimientoHito(
                    idSolicitud,
                    'Publicación de cargo',
                    new Date(),
                    transaction
                );
            }
        } catch (error) {
            Logger.error(`Error al marcar hito de publicación para solicitud ${idSolicitud}:`, error);
            // No lanzar error para no bloquear la creación de la publicación
        }
    }

    /**
     * Marca el cumplimiento de hitos según la transición de etapa de módulos
     * Se llama cuando se cambia la etapa de una solicitud
     * 
     * @param idSolicitud - ID de la solicitud
     * @param idEtapaAnterior - ID de la etapa anterior (origen)
     * @param idEtapaNueva - ID de la etapa nueva (destino)
     * @param codigoServicio - Código del servicio (PC, HH, LL, etc.)
     * @param transaction - Transacción opcional
     */
    static async marcarHitoPorCambioEtapa(
        idSolicitud: number,
        idEtapaAnterior: number,
        idEtapaNueva: number,
        codigoServicio: string,
        transaction?: Transaction
    ): Promise<void> {
        try {
            // Mapeo de transiciones de etapa a nombres de hitos
            const serviciosProcesosCompletos = ['PC', 'HH'];
            const serviciosLongList = ['LL', 'TR', 'FI'];

            // Transición de Módulo 2 → Módulo 3 (Etapa 2 → 3)
            if (idEtapaAnterior === 2 && idEtapaNueva === 3) {
                if (serviciosProcesosCompletos.includes(codigoServicio)) {
                    await this.marcarCumplimientoHito(
                        idSolicitud,
                        'Presentación de terna inicial',
                        new Date(),
                        transaction
                    );
                }
            }

            // Transición de Módulo 3 → Módulo 4 (Etapa 3 → 4)
            // Solo para PC y HH - LL, FI, TR marcan su hito al finalizar la solicitud
            if (idEtapaAnterior === 3 && idEtapaNueva === 4) {
                if (serviciosProcesosCompletos.includes(codigoServicio)) {
                    await this.marcarCumplimientoHito(
                        idSolicitud,
                        'Entrevistas con candidatos aprobados',
                        new Date(),
                        transaction
                    );
                }
            }

            // Transición de Módulo 4 → Módulo 5 (Etapa 4 → 5)
            if (idEtapaAnterior === 4 && idEtapaNueva === 5) {
                if (serviciosProcesosCompletos.includes(codigoServicio)) {
                    await this.marcarCumplimientoHito(
                        idSolicitud,
                        'Presentación de terna final con informe',
                        new Date(),
                        transaction
                    );
                }
            }
        } catch (error) {
            Logger.error(`Error al marcar hito por cambio de etapa para solicitud ${idSolicitud}:`, error);
            // No lanzar error para no bloquear el cambio de etapa
        }
    }

    /**
     * Marca el cumplimiento del hito "Agendar entrevista" o "Agendar test"
     * Se llama cuando se registra la primera fecha de entrevista/test para una solicitud
     * 
     * @param idSolicitud - ID de la solicitud
     * @param codigoServicio - Código del servicio (ES, AP, TS)
     * @param transaction - Transacción opcional
     */
    static async marcarHitoAgendarEntrevista(
        idSolicitud: number,
        codigoServicio: string,
        transaction?: Transaction
    ): Promise<void> {
        try {
            let nombreHito: string;

            if (codigoServicio === 'TS') {
                nombreHito = 'Agendar test';
            } else if (codigoServicio === 'ES' || codigoServicio === 'EP') {
                nombreHito = 'Agendar entrevista';
            } else {
                return; // No aplica para otros servicios
            }

            await this.marcarCumplimientoHito(
                idSolicitud,
                nombreHito,
                new Date(),
                transaction
            );
        } catch (error) {
            Logger.error(`Error al marcar hito de agendar entrevista para solicitud ${idSolicitud}:`, error);
            // No lanzar error para no bloquear la creación de la evaluación
        }
    }

    /**
     * Marca el cumplimiento de hitos finales al cerrar el proceso
     * Se llama cuando se cierra exitosamente una solicitud
     * 
     * @param idSolicitud - ID de la solicitud
     * @param codigoServicio - Código del servicio
     * @param transaction - Transacción opcional
     */
    static async marcarHitoCierreProces(
        idSolicitud: number,
        codigoServicio: string,
        transaction?: Transaction
    ): Promise<void> {
        try {
            let nombreHito: string | null = null;

            // Servicios de evaluación
            if (codigoServicio === 'ES' || codigoServicio === 'EP') {
                nombreHito = 'Envío de informe';
            } else if (codigoServicio === 'TS') {
                nombreHito = 'Entrega de resultado';
            } else if (codigoServicio === 'PP') {
                nombreHito = 'Entrega de perfiles y cierre';
            } else if (codigoServicio === 'LL' || codigoServicio === 'FI' || codigoServicio === 'TR') {
                // Long List, Filtro Inteligente y Target Recruitment
                // completan su hito al finalizar la solicitud
                nombreHito = 'Presentación de candidatos';
            }

            if (nombreHito) {
                await this.marcarCumplimientoHito(
                    idSolicitud,
                    nombreHito,
                    new Date(),
                    transaction
                );
            }
        } catch (error) {
            Logger.error(`Error al marcar hito de cierre de proceso para solicitud ${idSolicitud}:`, error);
            // No lanzar error para no bloquear el cierre del proceso
        }
    }
}

