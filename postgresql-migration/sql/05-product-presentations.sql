BEGIN;

CREATE TABLE IF NOT EXISTS product_presentations (
    product_id BIGINT PRIMARY KEY,
    presentation_type VARCHAR(40) NOT NULL DEFAULT 'unit',
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    label VARCHAR(80) NOT NULL DEFAULT 'Unidad',
    color_key VARCHAR(30) NOT NULL DEFAULT 'unit',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
