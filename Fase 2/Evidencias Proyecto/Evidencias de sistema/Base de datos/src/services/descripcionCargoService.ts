import { Transaction } from 'sequelize';
import sequelize from '@/config/database';
import { DescripcionCargo, Cargo, Comuna, TipoServicio, Cliente, Contacto, Usuario } from '@/models';

/**
 * Servicio para gestión de Descripciones de Cargo
 * Contiene toda la lógica de negocio relacionada con descripciones de cargo y procesamiento de Excel
 */

export class DescripcionCargoService {
    /**
     * Obtener todas las descripciones de cargo con información completa
     */
    static async getAllDescripciones() {
        const descripciones = await DescripcionCargo.findAll({
            include: [
                {
                    model: Cargo,
                    as: 'cargo',
                    attributes: ['id_cargo', 'nombre_cargo']
                },
                {
                    model: Comuna,
                    as: 'comuna',
                    attributes: ['id_comuna', 'nombre_comuna']
                }
            ],
            order: [['fecha_ingreso', 'DESC']]
        });

        return descripciones.map(desc => ({
            id: desc.id_descripcioncargo.toString(),
            descripcion: desc.descripcion_cargo,
            requisitos: desc.requisitos_y_condiciones,
            vacantes: desc.num_vacante,
            fecha_ingreso: desc.fecha_ingreso.toISOString().split('T')[0],
            cargo: {
                id: (desc.get('cargo') as any)?.id_cargo,
                nombre: (desc.get('cargo') as any)?.nombre_cargo
            },
            comuna: {
                id: (desc.get('comuna') as any)?.id_comuna,
                nombre: (desc.get('comuna') as any)?.nombre_comuna
            },
            tiene_datos_excel: desc.tieneDatosExcel(),
            datos_excel: desc.getDatosExcel(),
            tiene_datos_pdf: desc.tieneDatosPdf()
        }));
    }

    /**
     * Obtener una descripción de cargo por ID
     */
    static async getDescripcionById(id: number) {
        const descripcion = await DescripcionCargo.findByPk(id, {
            include: [
                {
                    model: Cargo,
                    as: 'cargo',
                    attributes: ['id_cargo', 'nombre_cargo']
                },
                {
                    model: Comuna,
                    as: 'comuna',
                    attributes: ['id_comuna', 'nombre_comuna']
                }
            ]
        });

        if (!descripcion) {
            return null;
        }

        const cargo = descripcion.get('cargo') as any;
        const comuna = descripcion.get('comuna') as any;

        return {
            id: descripcion.id_descripcioncargo.toString(),
            descripcion: descripcion.descripcion_cargo,
            requisitos: descripcion.requisitos_y_condiciones,
            vacantes: descripcion.num_vacante,
            fecha_ingreso: descripcion.fecha_ingreso.toISOString().split('T')[0],
            cargo: cargo ? cargo.nombre_cargo : '',
            comuna: comuna ? comuna.nombre_comuna : '',
            datos_excel: descripcion.getDatosExcel(),
            tiene_datos_excel: descripcion.tieneDatosExcel(),
            tiene_datos_pdf: descripcion.tieneDatosPdf()
        };
    }

    /**
     * Crear nueva descripción de cargo (requiere id_solicitud)
     * NOTA: Este método ya NO se usa directamente, la descripción se crea dentro de solicitudService
     */
    static async createDescripcion(data: {
        descripcion: string;
        requisitos: string;
        vacantes: number;
        fecha_ingreso?: string;
        cargo: string;
        comuna: string;
        id_solicitud: number;
        datos_excel?: object;
    }) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            const {
                descripcion,
                requisitos,
                vacantes,
                fecha_ingreso,
                cargo,
                comuna,
                id_solicitud,
                datos_excel
            } = data;

            // Validaciones
            if (!descripcion || !requisitos) {
                throw new Error('La descripción y requisitos son requeridos');
            }

            if (!vacantes || vacantes < 1) {
                throw new Error('Debe haber al menos 1 vacante');
            }

            if (!cargo || !comuna) {
                throw new Error('El cargo y la comuna son requeridos');
            }

            if (!id_solicitud) {
                throw new Error('id_solicitud es requerido');
            }

            // Buscar o crear el cargo
            let cargoRecord = await Cargo.findOne({
                where: { nombre_cargo: cargo.trim() }
            });

            if (!cargoRecord) {
                cargoRecord = await Cargo.create({
                    nombre_cargo: cargo.trim()
                }, { transaction });
            }

            // Buscar la comuna
            const comunaRecord = await Comuna.findOne({
                where: { nombre_comuna: comuna.trim() }
            });

            if (!comunaRecord) {
                throw new Error(`comuna no encontrada: ${comuna}`);
            }

            // Procesar fecha de ingreso
            const fechaIngreso = fecha_ingreso ? new Date(fecha_ingreso) : new Date();

            // Crear descripción de cargo
            const nuevaDescripcion = await DescripcionCargo.create({
                descripcion_cargo: descripcion.trim(),
                requisitos_y_condiciones: requisitos.trim(),
                num_vacante: vacantes,
                fecha_ingreso: fechaIngreso,
                id_cargo: cargoRecord.id_cargo,
                id_comuna: comunaRecord.id_comuna,
                id_solicitud: id_solicitud,
                datos_excel: datos_excel || undefined
            }, { transaction });

            await transaction.commit();

            // Obtener la descripción completa con relaciones
            const descripcionCompleta = await DescripcionCargo.findByPk(nuevaDescripcion.id_descripcioncargo, {
                include: [
                    {
                        model: Cargo,
                        as: 'cargo',
                        attributes: ['id_cargo', 'nombre_cargo']
                    },
                    {
                        model: Comuna,
                        as: 'comuna',
                        attributes: ['id_comuna', 'nombre_comuna']
                    }
                ]
            });

            const cargoData = descripcionCompleta!.get('cargo') as any;
            const comunaData = descripcionCompleta!.get('comuna') as any;

            return {
                id: nuevaDescripcion.id_descripcioncargo.toString(),
                descripcion: nuevaDescripcion.descripcion_cargo,
                requisitos: nuevaDescripcion.requisitos_y_condiciones,
                vacantes: nuevaDescripcion.num_vacante,
                fecha_ingreso: nuevaDescripcion.fecha_ingreso.toISOString().split('T')[0],
                cargo: cargoData?.nombre_cargo || '',
                comuna: comunaData?.nombre_comuna || '',
                tiene_datos_excel: nuevaDescripcion.tieneDatosExcel(),
                datos_excel: nuevaDescripcion.getDatosExcel()
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Actualizar descripción de cargo
     */
    static async updateDescripcion(id: number, data: {
        descripcion?: string;
        requisitos?: string;
        vacantes?: number;
        fecha_ingreso?: string;
        cargo?: string;
        comuna?: string;
        datos_excel?: object;
    }) {
        const descripcion = await DescripcionCargo.findByPk(id);
        
        if (!descripcion) {
            throw new Error('Descripción de cargo no encontrada');
        }

        const updateData: any = {};

        if (data.descripcion) {
            updateData.descripcion_cargo = data.descripcion.trim();
        }
        if (data.requisitos) {
            updateData.requisitos_y_condiciones = data.requisitos.trim();
        }
        if (data.vacantes) {
            updateData.num_vacante = data.vacantes;
        }
        if (data.fecha_ingreso) {
            updateData.fecha_ingreso = new Date(data.fecha_ingreso);
        }
        if (data.cargo) {
            let cargoRecord = await Cargo.findOne({
                where: { nombre_cargo: data.cargo.trim() }
            });
            if (!cargoRecord) {
                cargoRecord = await Cargo.create({
                    nombre_cargo: data.cargo.trim()
                });
            }
            updateData.id_cargo = cargoRecord.id_cargo;
        }
        if (data.comuna) {
            const comunaRecord = await Comuna.findOne({
                where: { nombre_comuna: data.comuna.trim() }
            });
            if (!comunaRecord) {
                throw new Error(`comuna no encontrada: ${data.comuna}`);
            }
            updateData.id_comuna = comunaRecord.id_comuna;
        }
        if (data.datos_excel !== undefined) {
            updateData.datos_excel = data.datos_excel;
        }

        await descripcion.update(updateData);

        // Obtener la descripción actualizada con relaciones
        const descripcionActualizada = await DescripcionCargo.findByPk(id, {
            include: [
                {
                    model: Cargo,
                    as: 'cargo',
                    attributes: ['id_cargo', 'nombre_cargo']
                },
                {
                    model: Comuna,
                    as: 'comuna',
                    attributes: ['id_comuna', 'nombre_comuna']
                }
            ]
        });

        const cargoData = descripcionActualizada!.get('cargo') as any;
        const comunaData = descripcionActualizada!.get('comuna') as any;

        return {
            id: descripcionActualizada!.id_descripcioncargo.toString(),
            descripcion: descripcionActualizada!.descripcion_cargo,
            requisitos: descripcionActualizada!.requisitos_y_condiciones,
            vacantes: descripcionActualizada!.num_vacante,
            fecha_ingreso: descripcionActualizada!.fecha_ingreso.toISOString().split('T')[0],
            cargo: cargoData?.nombre_cargo || '',
            comuna: comunaData?.nombre_comuna || '',
            tiene_datos_excel: descripcionActualizada!.tieneDatosExcel(),
            datos_excel: descripcionActualizada!.getDatosExcel(),
            tiene_datos_pdf: descripcionActualizada!.tieneDatosPdf()
        };
    }

    /**
     * Agregar datos de Excel a una descripción de cargo
     */
    static async agregarDatosExcel(id: number, datosExcel: object) {
        const descripcion = await DescripcionCargo.findByPk(id);
        
        if (!descripcion) {
            throw new Error('Descripción de cargo no encontrada');
        }

        await descripcion.update({
            datos_excel: datosExcel
        });

        return {
            id: descripcion.id_descripcioncargo,
            datos_excel: descripcion.getDatosExcel(),
            tiene_datos_excel: true
        };
    }

    /**
     * Obtener datos de Excel de una descripción
     */
    static async getDatosExcel(id: number) {
        const descripcion = await DescripcionCargo.findByPk(id);
        
        if (!descripcion) {
            throw new Error('Descripción de cargo no encontrada');
        }

        if (!descripcion.tieneDatosExcel()) {
            throw new Error('Esta descripción no tiene datos de Excel asociados');
        }

        return {
            id: descripcion.id_descripcioncargo,
            datos_excel: descripcion.getDatosExcel()
        };
    }

    /**
     * Actualizar / guardar PDF asociado a una descripción de cargo
     */
    static async updatePdf(id: number, pdfBuffer: Buffer) {
        const descripcion = await DescripcionCargo.findByPk(id);

        if (!descripcion) {
            throw new Error('Descripción de cargo no encontrada');
        }

        await descripcion.update({
            datos_pdf: pdfBuffer
        });

        return {
            id: descripcion.id_descripcioncargo,
            tiene_datos_pdf: descripcion.tieneDatosPdf()
        };
    }

    /**
     * Obtener PDF asociado a una descripción de cargo
     */
    static async getPdf(id: number) {
        const descripcion = await DescripcionCargo.findByPk(id);

        if (!descripcion) {
            throw new Error('Descripción de cargo no encontrada');
        }

        if (!descripcion.tieneDatosPdf()) {
            throw new Error('Esta descripción no tiene PDF asociado');
        }

        return {
            id: descripcion.id_descripcioncargo,
            pdf: descripcion.datos_pdf
        };
    }


    /**
     * Eliminar descripción de cargo
     */
    static async deleteDescripcion(id: number) {
        const descripcion = await DescripcionCargo.findByPk(id);
        
        if (!descripcion) {
            throw new Error('Descripción de cargo no encontrada');
        }

        // Verificar si está asociada a una solicitud (relación inversa: DescripcionCargo.id_solicitud)
        if (descripcion.id_solicitud) {
            throw new Error('No se puede eliminar la descripción porque está asociada a una solicitud');
        }

        await descripcion.destroy();

        return { id };
    }

    /**
     * Obtener datos auxiliares para el formulario de descripción de cargo
     */
    static async getDatosFormulario() {
        // Obtener tipos de servicio
        const tiposServicio = await TipoServicio.findAll({
            attributes: ['codigo_servicio', 'nombre_servicio'],
            order: [['nombre_servicio', 'ASC']]
        });

        // Obtener clientes con sus contactos
        const clientes = await Cliente.findAll({
            where: { activo_cliente: true },
            include: [
                {
                    model: Contacto,
                    as: 'contactos',
                    attributes: ['id_contacto', 'nombre_contacto', 'email_contacto']
                }
            ],
            order: [['nombre_cliente', 'ASC']]
        });

        // Obtener consultores (usuarios con rol_usuario=2)
        const consultores = await Usuario.findAll({
            where: { rol_usuario: 2, activo_usuario: true },
            attributes: ['rut_usuario', 'nombre_usuario', 'apellido_usuario', 'email_usuario'],
            order: [['nombre_usuario', 'ASC'], ['apellido_usuario', 'ASC']]
        });

        // Obtener cargos
        const cargos = await Cargo.findAll({
            attributes: ['id_cargo', 'nombre_cargo'],
            order: [['nombre_cargo', 'ASC']]
        });

        // Obtener comunas
        const comunas = await Comuna.findAll({
            attributes: ['id_comuna', 'nombre_comuna'],
            order: [['nombre_comuna', 'ASC']]
        });

        return {
            tipos_servicio: tiposServicio.map(ts => ({
                codigo: ts.codigo_servicio,
                nombre: ts.nombre_servicio
            })),
            clientes: clientes.map(cliente => ({
                id: cliente.id_cliente.toString(),
                nombre: cliente.nombre_cliente,
                contactos: (cliente.get('contactos') as any[])?.map((contacto: any) => ({
                    id: contacto.id_contacto.toString(),
                    nombre: contacto.nombre_contacto,
                    email: contacto.email_contacto
                })) || []
            })),
            consultores: consultores.map(consultor => ({
                rut: consultor.rut_usuario,
                nombre: `${consultor.nombre_usuario} ${consultor.apellido_usuario}`,
                email: consultor.email_usuario
            })),
            cargos: cargos.map(cargo => cargo.nombre_cargo),
            comunas: comunas.map(comuna => comuna.nombre_comuna)
        };
    }
}

