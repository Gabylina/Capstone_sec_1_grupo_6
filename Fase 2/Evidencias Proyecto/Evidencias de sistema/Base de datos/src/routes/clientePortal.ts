import { Router } from 'express';

import { ClientePortalController } from '@/controllers/clientePortalController';

import { authenticateToken, requireAdmin, requireRole } from '@/middleware/auth';



const router = Router();



router.get(

    '/resumen',

    authenticateToken,

    requireRole(['cliente']),

    ClientePortalController.getResumen

);



router.get(

    '/solicitudes',

    authenticateToken,

    requireRole(['cliente']),

    ClientePortalController.listSolicitudes

);



router.get(

    '/clientes/credenciales-status',

    authenticateToken,

    requireAdmin,

    ClientePortalController.getCredencialesStatus

);



router.get(

    '/clientes/:idCliente/credencial',

    authenticateToken,

    requireAdmin,

    ClientePortalController.getCredencial

);



router.put(

    '/clientes/:idCliente/credencial',

    authenticateToken,

    requireAdmin,

    ClientePortalController.upsertCredencial

);



router.post(

    '/clientes/:idCliente/generar-credencial',

    authenticateToken,

    requireAdmin,

    ClientePortalController.generarCredencial

);



router.patch(

    '/clientes/:idCliente/credencial/activo',

    authenticateToken,

    requireAdmin,

    ClientePortalController.setCredencialActiva

);



export default router;

