-- Portal cliente: usuario vinculado a empresa (cliente)
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS id_cliente INTEGER REFERENCES cliente(id_cliente) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuario_id_cliente ON usuario(id_cliente);

-- Rol 3 = cliente (ajustar constraint si existe)
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_rol_usuario_check;
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_usuario_check CHECK (rol_usuario IN (1, 2, 3));

COMMENT ON COLUMN usuario.id_cliente IS 'Empresa cliente asociada cuando rol_usuario = 3';
