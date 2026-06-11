import {
    Contratacion,
    Postulacion,
    Solicitud,
    Contacto,
    Cliente,
    TipoServicio,
    EstadoContratacion,
    DescripcionCargo,
    Cargo,
    Candidato,
    Usuario,
} from '@/models';
import { Op } from 'sequelize';
import { parseEncuestaSatisfaccion } from '@/utils/encuestaSatisfaccion';
import { getServiciosConEncuesta, servicioTieneEncuesta } from '@/utils/encuestaModuloConfig';

const ID_ESTADO_CONTRATADO = 1;

type RowContext = {
    idContratacion: number;
    idSolicitud: number;
    idPostulacion: number;
    proceso: string;
    nombreCandidato: string;
    idCliente: number;
    nombreCliente: string;
    rutConsultor: string;
    nombreConsultor: string;
    codigoServicio: string;
    nombreServicio: string;
    encuestaRaw?: string | null;
};

export class SatisfaccionClienteService {
    private static async loadRows(opts?: {
        serviceType?: string[];
        clienteId?: string[];
        consultorRut?: string[];
    }): Promise<RowContext[]> {
        const serviceTypes = opts?.serviceType;
        const solicitudWhere =
            serviceTypes?.length
                ? (serviceTypes.length === 1
                    ? { codigo_servicio: serviceTypes[0] }
                    : { codigo_servicio: { [Op.in]: serviceTypes } })
                : undefined;

        const contrataciones = await Contratacion.findAll({
            where: { id_estado_contratacion: ID_ESTADO_CONTRATADO },
            attributes: ['id_contratacion', 'encuesta_satisfaccion'],
            include: [
                {
                    model: Postulacion,
                    as: 'postulacion',
                    required: true,
                    attributes: ['id_postulacion'],
                    include: [
                        {
                            model: Candidato,
                            as: 'candidato',
                            required: false,
                            attributes: [
                                'nombre_candidato',
                                'primer_apellido_candidato',
                                'segundo_apellido_candidato',
                            ],
                        },
                        {
                            model: Solicitud,
                            as: 'solicitud',
                            required: true,
                            where: solicitudWhere,
                            attributes: ['id_solicitud', 'codigo_servicio', 'rut_usuario'],
                            include: [
                                {
                                    model: Usuario,
                                    as: 'usuario',
                                    required: false,
                                    attributes: ['rut_usuario', 'nombre_usuario', 'apellido_usuario'],
                                },
                                {
                                    model: Contacto,
                                    as: 'contacto',
                                    required: true,
                                    attributes: ['id_contacto'],
                                    include: [
                                        {
                                            model: Cliente,
                                            as: 'cliente',
                                            required: true,
                                            attributes: ['id_cliente', 'nombre_cliente'],
                                        },
                                    ],
                                },
                                {
                                    model: TipoServicio,
                                    as: 'tipoServicio',
                                    required: false,
                                    attributes: ['codigo_servicio', 'nombre_servicio'],
                                },
                                {
                                    model: DescripcionCargo,
                                    as: 'descripcionCargo',
                                    required: false,
                                    attributes: ['id_descripcioncargo'],
                                    include: [
                                        {
                                            model: Cargo,
                                            as: 'cargo',
                                            required: false,
                                            attributes: ['nombre_cargo'],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: EstadoContratacion,
                    as: 'estadoContratacion',
                    required: true,
                    attributes: ['nombre_estado_contratacion'],
                },
            ],
        });

        const rows: RowContext[] = [];
        for (const c of contrataciones) {
            const post = (c as any).postulacion as Postulacion | undefined;
            const sol = post ? ((post as any).solicitud as Solicitud | undefined) : undefined;
            const contacto = sol ? ((sol as any).contacto as Contacto | undefined) : undefined;
            const cliente = contacto ? ((contacto as any).cliente as Cliente | undefined) : undefined;
            if (!cliente) continue;

            const tipo = sol ? ((sol as any).tipoServicio as TipoServicio | undefined) : undefined;
            const codigo = sol?.codigo_servicio || tipo?.codigo_servicio || 'OTRO';
            if (!servicioTieneEncuesta(codigo)) continue;
            const nombre = tipo?.nombre_servicio || codigo;

            const desc = sol ? ((sol as any).descripcionCargo as DescripcionCargo | undefined) : undefined;
            const cargo = desc ? ((desc as any).cargo as Cargo | undefined) : undefined;
            const nombreCargo = cargo?.nombre_cargo?.trim();
            const idSolicitud = sol?.id_solicitud ?? 0;
            const proceso = nombreCargo || `Proceso #${idSolicitud}`;

            const cand = post ? ((post as any).candidato as Candidato | undefined) : undefined;
            const nombreCandidato = cand
                ? `${cand.nombre_candidato} ${cand.primer_apellido_candidato} ${cand.segundo_apellido_candidato || ''}`.trim()
                : '—';

            const usuario = sol ? ((sol as any).usuario as Usuario | undefined) : undefined;
            const rutConsultor = sol?.rut_usuario || usuario?.rut_usuario || '';
            const nombreConsultor = usuario
                ? `${usuario.nombre_usuario} ${usuario.apellido_usuario}`.trim()
                : 'Sin asignar';

            rows.push({
                idContratacion: c.id_contratacion,
                idSolicitud,
                idPostulacion: post?.id_postulacion ?? 0,
                proceso,
                nombreCandidato,
                idCliente: cliente.id_cliente,
                nombreCliente: cliente.nombre_cliente,
                rutConsultor,
                nombreConsultor,
                codigoServicio: codigo,
                nombreServicio: nombre,
                encuestaRaw: c.encuesta_satisfaccion,
            });
        }

        let filtered = rows;
        if (opts?.clienteId?.length) {
            const ids = opts.clienteId.map(Number).filter((n) => !Number.isNaN(n));
            if (ids.length) {
                filtered = filtered.filter((r) => ids.includes(r.idCliente));
            }
        }
        if (opts?.consultorRut?.length) {
            filtered = filtered.filter((r) => opts.consultorRut!.includes(r.rutConsultor));
        }
        return filtered;
    }

    static async getDashboard(opts?: {
        serviceType?: string[];
        clienteId?: string[];
        consultorRut?: string[];
    }) {
        const rows = await this.loadRows(opts);

        let respondidas = 0;
        let sinRespuesta = 0;
        const calidadScores: number[] = [];
        const comunicacionScores: number[] = [];
        const calidadCandidatosScores: number[] = [];
        const tiempoScores: number[] = [];
        const acompanamientoScores: number[] = [];
        const notaScores: number[] = [];
        let volveriaSi = 0;
        let volveriaNo = 0;

        const byClient = new Map<
            number,
            { nombre: string; scores: number[]; count: number }
        >();

        for (const row of rows) {
            const parsed = parseEncuestaSatisfaccion(row.encuestaRaw);
            if (parsed.respondida && parsed.notaTotal !== undefined) {
                respondidas += 1;
                notaScores.push(parsed.notaTotal);
                if (parsed.calidad !== undefined) calidadScores.push(parsed.calidad);
                if (parsed.comunicacion !== undefined) comunicacionScores.push(parsed.comunicacion);
                if (parsed.calidad_candidatos !== undefined) calidadCandidatosScores.push(parsed.calidad_candidatos);
                if (parsed.tiempo !== undefined) tiempoScores.push(parsed.tiempo);
                if (parsed.acompanamiento !== undefined) acompanamientoScores.push(parsed.acompanamiento);
                else if (parsed.apoyo !== undefined) acompanamientoScores.push(parsed.apoyo);
                if (parsed.volveria_trabajar === true) volveriaSi += 1;
                if (parsed.volveria_trabajar === false) volveriaNo += 1;

                const prev = byClient.get(row.idCliente) || {
                    nombre: row.nombreCliente,
                    scores: [],
                    count: 0,
                };
                prev.scores.push(parsed.notaTotal);
                prev.count += 1;
                byClient.set(row.idCliente, prev);
            } else {
                sinRespuesta += 1;
            }
        }

        const avg = (arr: number[]) =>
            arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null;

        const clientRanking = [...byClient.entries()]
            .map(([idCliente, v]) => ({
                id_cliente: idCliente,
                cliente: v.nombre,
                nota_promedio:
                    v.scores.length > 0
                        ? Math.round((v.scores.reduce((a, b) => a + b, 0) / v.scores.length) * 100) / 100
                        : 0,
                encuestas_respondidas: v.count,
            }))
            .filter((c) => c.encuestas_respondidas > 0);

        clientRanking.sort((a, b) => b.nota_promedio - a.nota_promedio);

        const top = clientRanking.slice(0, 8);
        const bottom = [...clientRanking].reverse().slice(0, 8);

        const tiposSet = new Map<string, string>();
        const clientesSet = new Map<number, string>();
        const consultoresSet = new Map<string, string>();
        const allRows = await this.loadRows({ serviceType: opts?.serviceType });
        for (const r of allRows) {
            tiposSet.set(r.codigoServicio, r.nombreServicio);
            clientesSet.set(r.idCliente, r.nombreCliente);
            if (r.rutConsultor) {
                consultoresSet.set(r.rutConsultor, r.nombreConsultor);
            }
        }

        const tiposDb = await TipoServicio.findAll({
            where: { codigo_servicio: getServiciosConEncuesta().map((s) => s.codigo) },
            attributes: ['codigo_servicio', 'nombre_servicio'],
        });
        for (const t of tiposDb) {
            tiposSet.set(t.codigo_servicio, t.nombre_servicio);
        }

        const detalleEncuestas = rows.map((row) => {
            const parsed = parseEncuestaSatisfaccion(row.encuestaRaw);
            const respondida = parsed.respondida && parsed.notaTotal !== undefined;
            return {
                id_contratacion: row.idContratacion,
                id_solicitud: row.idSolicitud,
                id_postulacion: row.idPostulacion,
                proceso: row.proceso,
                cliente: row.nombreCliente,
                id_cliente: row.idCliente,
                consultor: row.nombreConsultor,
                rut_consultor: row.rutConsultor,
                candidato: row.nombreCandidato,
                servicio: row.nombreServicio,
                codigo_servicio: row.codigoServicio,
                respondida,
                nota_total: parsed.notaTotal ?? null,
                comunicacion: parsed.comunicacion ?? null,
                calidad_candidatos: parsed.calidad_candidatos ?? parsed.calidad ?? null,
                tiempo: parsed.tiempo ?? null,
                acompanamiento: parsed.acompanamiento ?? parsed.apoyo ?? null,
                volveria_trabajar: parsed.volveria_trabajar ?? null,
                motivo_no: parsed.motivo_no ?? null,
                /** @deprecated */
                calidad: parsed.calidad ?? parsed.calidad_candidatos ?? null,
                /** @deprecated */
                apoyo: parsed.apoyo ?? parsed.acompanamiento ?? null,
            };
        });

        detalleEncuestas.sort((a, b) => {
            if (a.respondida !== b.respondida) return a.respondida ? 1 : -1;
            return a.proceso.localeCompare(b.proceso, 'es');
        });

        type ProcesoAgg = {
            id_solicitud: number;
            proceso: string;
            cliente: string;
            servicio: string;
            codigo_servicio: string;
            total_encuestas: number;
            respondidas: number;
            sin_respuesta: number;
            estado: 'respondida' | 'pendiente' | 'parcial';
            nota_promedio: number | null;
        };

        const procesosMap = new Map<number, ProcesoAgg>();
        for (const item of detalleEncuestas) {
            const prev = procesosMap.get(item.id_solicitud) || {
                id_solicitud: item.id_solicitud,
                proceso: item.proceso,
                cliente: item.cliente,
                servicio: item.servicio,
                codigo_servicio: item.codigo_servicio,
                total_encuestas: 0,
                respondidas: 0,
                sin_respuesta: 0,
                estado: 'pendiente' as const,
                nota_promedio: null,
            };
            prev.total_encuestas += 1;
            if (item.respondida) {
                prev.respondidas += 1;
            } else {
                prev.sin_respuesta += 1;
            }
            procesosMap.set(item.id_solicitud, prev);
        }

        const procesosEncuesta = [...procesosMap.values()].map((p) => {
            const notas = detalleEncuestas
                .filter((d) => d.id_solicitud === p.id_solicitud && d.nota_total != null)
                .map((d) => d.nota_total as number);
            let estado: ProcesoAgg['estado'] = 'pendiente';
            if (p.respondidas === p.total_encuestas && p.total_encuestas > 0) estado = 'respondida';
            else if (p.respondidas > 0) estado = 'parcial';

            return {
                ...p,
                estado,
                nota_promedio:
                    notas.length > 0
                        ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100
                        : null,
            };
        });

        procesosEncuesta.sort((a, b) => {
            const order = { pendiente: 0, parcial: 1, respondida: 2 };
            const diff = order[a.estado] - order[b.estado];
            if (diff !== 0) return diff;
            return a.proceso.localeCompare(b.proceso, 'es');
        });

        return {
            resumen: {
                total_encuestas: rows.length,
                respondidas,
                sin_respuesta: sinRespuesta,
                nota_total: avg(notaScores),
            },
            dimensiones: [
                {
                    clave: 'comunicacion',
                    etiqueta: 'Comunicación clara y oportuna',
                    promedio: avg(comunicacionScores.length ? comunicacionScores : calidadScores),
                    escala_max: 5,
                },
                {
                    clave: 'calidad_candidatos',
                    etiqueta: 'Calidad de candidatos vs perfil',
                    promedio: avg(calidadCandidatosScores.length ? calidadCandidatosScores : calidadScores),
                    escala_max: 5,
                },
                {
                    clave: 'tiempo',
                    etiqueta: 'Tiempo de respuesta del equipo',
                    promedio: avg(tiempoScores),
                    escala_max: 5,
                },
                {
                    clave: 'acompanamiento',
                    etiqueta: 'Acompañamiento del consultor',
                    promedio: avg(acompanamientoScores),
                    escala_max: 5,
                },
            ],
            recontratacion: {
                volveria_si: volveriaSi,
                volveria_no: volveriaNo,
            },
            ranking: {
                mas_satisfechos: top,
                menos_satisfechos: bottom,
            },
            tipos_servicio: getServiciosConEncuesta()
                .map(({ codigo }) => ({
                    codigo,
                    nombre: tiposSet.get(codigo) || codigo,
                }))
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
            clientes_disponibles: [...clientesSet.entries()]
                .map(([id_cliente, nombre]) => ({ id_cliente, nombre }))
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
            consultores_disponibles: [...consultoresSet.entries()]
                .map(([rut_usuario, nombre]) => ({ rut_usuario, nombre }))
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
            procesos_encuesta: procesosEncuesta,
            detalle_encuestas: detalleEncuestas,
        };
    }
}
