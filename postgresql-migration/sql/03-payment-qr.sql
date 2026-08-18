BEGIN;

-- Metadatos del QR; la imagen vive en el almacenamiento del servidor.
-- El celular conserva una copia local para abrirla sin esperar a la red.
CREATE TABLE IF NOT EXISTS payment_qr_config (
    method VARCHAR(20) PRIMARY KEY CHECK (method IN ('yape','plin','bbva')),
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(80) NOT NULL,
    version BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
