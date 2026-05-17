import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';

export const BOLA_NIEVE_ITEM_KEYS = [
    'contacto_personas_rubro',
    'contacto_empresas_rubro',
    'busqueda_linkedin',
    'apoyo_reclutadores',
    'visitas_terreno',
] as const;

export type BolaNieveItemKey = (typeof BOLA_NIEVE_ITEM_KEYS)[number];

export interface BolaNieveSolicitudAttributes {
    id_bola_nieve_solicitud: number;
    id_solicitud: number;
    contacto_personas_rubro: boolean | null;
    detalle_contacto_personas_rubro: string | null;
    contacto_empresas_rubro: boolean | null;
    detalle_contacto_empresas_rubro: string | null;
    busqueda_linkedin: boolean | null;
    detalle_busqueda_linkedin: string | null;
    apoyo_reclutadores: boolean | null;
    detalle_apoyo_reclutadores: string | null;
    visitas_terreno: boolean | null;
    detalle_visitas_terreno: string | null;
    fecha_actualizacion: Date;
}

export interface BolaNieveSolicitudCreationAttributes
    extends Optional<
        BolaNieveSolicitudAttributes,
        | 'id_bola_nieve_solicitud'
        | 'contacto_personas_rubro'
        | 'contacto_empresas_rubro'
        | 'busqueda_linkedin'
        | 'apoyo_reclutadores'
        | 'visitas_terreno'
        | 'detalle_contacto_personas_rubro'
        | 'detalle_contacto_empresas_rubro'
        | 'detalle_busqueda_linkedin'
        | 'detalle_apoyo_reclutadores'
        | 'detalle_visitas_terreno'
        | 'fecha_actualizacion'
    > {}

class BolaNieveSolicitud
    extends Model<BolaNieveSolicitudAttributes, BolaNieveSolicitudCreationAttributes>
    implements BolaNieveSolicitudAttributes
{
    public id_bola_nieve_solicitud!: number;
    public id_solicitud!: number;
    public contacto_personas_rubro!: boolean | null;
    public detalle_contacto_personas_rubro!: string | null;
    public contacto_empresas_rubro!: boolean | null;
    public detalle_contacto_empresas_rubro!: string | null;
    public busqueda_linkedin!: boolean | null;
    public detalle_busqueda_linkedin!: string | null;
    public apoyo_reclutadores!: boolean | null;
    public detalle_apoyo_reclutadores!: string | null;
    public visitas_terreno!: boolean | null;
    public detalle_visitas_terreno!: string | null;
    public fecha_actualizacion!: Date;

    /** Los 5 ítems tienen decisión registrada (logrado o no logrado). */
    public static todosDefinidos(row: BolaNieveSolicitud | null): boolean {
        if (!row) return false;
        return BOLA_NIEVE_ITEM_KEYS.every((key) => row[key] !== null && row[key] !== undefined);
    }
}

BolaNieveSolicitud.init(
    {
        id_bola_nieve_solicitud: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        id_solicitud: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: 'solicitud', key: 'id_solicitud' },
        },
        contacto_personas_rubro: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
        detalle_contacto_personas_rubro: { type: DataTypes.TEXT, allowNull: true },
        contacto_empresas_rubro: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
        detalle_contacto_empresas_rubro: { type: DataTypes.TEXT, allowNull: true },
        busqueda_linkedin: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
        detalle_busqueda_linkedin: { type: DataTypes.TEXT, allowNull: true },
        apoyo_reclutadores: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
        detalle_apoyo_reclutadores: { type: DataTypes.TEXT, allowNull: true },
        visitas_terreno: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
        detalle_visitas_terreno: { type: DataTypes.TEXT, allowNull: true },
        fecha_actualizacion: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'bola_nieve_solicitud',
        modelName: 'BolaNieveSolicitud',
        underscored: true,
        timestamps: false,
        indexes: [{ fields: ['id_solicitud'] }],
    }
);

export default BolaNieveSolicitud;
