BEGIN;

INSERT INTO payment_methods (legacy_id, code, name)
VALUES
    (11, 'cash', 'EFECTIVO'),
    (12, 'digital_wallet', 'YAPE / PLIN')
ON CONFLICT (code) DO UPDATE
SET legacy_id = EXCLUDED.legacy_id,
    name = EXCLUDED.name,
    active = TRUE;

COMMIT;

