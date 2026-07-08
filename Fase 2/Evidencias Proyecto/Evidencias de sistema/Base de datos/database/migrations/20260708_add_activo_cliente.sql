-- Agrega soft delete a cliente: los clientes "eliminados" desde el front
-- se marcan como activo_cliente = false en vez de borrarse físicamente.

ALTER TABLE cliente
  ADD COLUMN IF NOT EXISTS activo_cliente BOOLEAN NOT NULL DEFAULT true;
