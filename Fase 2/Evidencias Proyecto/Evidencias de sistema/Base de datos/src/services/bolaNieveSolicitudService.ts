import { Transaction } from 'sequelize';
import { BolaNieveSolicitud, Solicitud } from '@/models';

const CODIGOS_CON_BOLA_NIEVE = new Set(['PC', 'HH', 'HS']);

export function solicitudRequiereBolaNieve(codigoServicio: string | null | undefined): boolean {
    if (!codigoServicio) return false;
    return CODIGOS_CON_BOLA_NIEVE.has(String(codigoServicio).toUpperCase().trim());
}

export type BolaNievePayload = {
    contacto_personas_rubro: boolean | null;
    detalle_contacto_personas_rubro?: string | null;
    contacto_empresas_rubro: boolean | null;
    detalle_contacto_empresas_rubro?: string | null;
    busqueda_linkedin: boolean | null;
    detalle_busqueda_linkedin?: string | null;
    apoyo_reclutadores: boolean | null;
    detalle_apoyo_reclutadores?: string | null;
    visitas_terreno: boolean | null;
    detalle_visitas_terreno?: string | null;
};

export function parseBolaNieveBool(value: unknown): boolean | null {
    if (value === null || value === undefined) return null;
    return Boolean(value);
}

export class BolaNieveSolicitudService {
    static async getBySolicitudId(idSolicitud: number) {
        const solicitud = await Solicitud.findByPk(idSolicitud);
        if (!solicitud) {
            throw new Error('Solicitud no encontrada');
        }
        const codigo = (solicitud.codigo_servicio || '').toString().toUpperCase();
        if (!solicitudRequiereBolaNieve(codigo)) {
            return { applies: false as const, data: null };
        }
        const row = await BolaNieveSolicitud.findOne({ where: { id_solicitud: idSolicitud } });
        return { applies: true as const, data: row };
    }

    static async upsert(idSolicitud: number, payload: BolaNievePayload, transaction?: Transaction) {
        const solicitud = await Solicitud.findByPk(idSolicitud, { transaction });
        if (!solicitud) {
            throw new Error('Solicitud no encontrada');
        }
        const codigo = (solicitud.codigo_servicio || '').toString().toUpperCase();
        if (!solicitudRequiereBolaNieve(codigo)) {
            throw new Error('Este tipo de proceso no requiere registro Bola de Nieve');
        }

        await BolaNieveSolicitud.upsert(
            {
                id_solicitud: idSolicitud,
                contacto_personas_rubro: payload.contacto_personas_rubro,
                detalle_contacto_personas_rubro: payload.detalle_contacto_personas_rubro ?? null,
                contacto_empresas_rubro: payload.contacto_empresas_rubro,
                detalle_contacto_empresas_rubro: payload.detalle_contacto_empresas_rubro ?? null,
                busqueda_linkedin: payload.busqueda_linkedin,
                detalle_busqueda_linkedin: payload.detalle_busqueda_linkedin ?? null,
                apoyo_reclutadores: payload.apoyo_reclutadores,
                detalle_apoyo_reclutadores: payload.detalle_apoyo_reclutadores ?? null,
                visitas_terreno: payload.visitas_terreno,
                detalle_visitas_terreno: payload.detalle_visitas_terreno ?? null,
                fecha_actualizacion: new Date(),
            },
            { transaction }
        );
        const saved = await BolaNieveSolicitud.findOne({
            where: { id_solicitud: idSolicitud },
            transaction,
        });
        return saved!;
    }

    static async assertCompletoParaAvance(idSolicitud: number, transaction?: Transaction) {
        const row = await BolaNieveSolicitud.findOne({
            where: { id_solicitud: idSolicitud },
            transaction,
        });
        if (!BolaNieveSolicitud.todosDefinidos(row)) {
            throw new Error('BOLA_NIEVE_INCOMPLETA');
        }
    }
}
