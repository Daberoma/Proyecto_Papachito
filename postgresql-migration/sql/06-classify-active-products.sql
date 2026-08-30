BEGIN;

INSERT INTO categories(name, active)
VALUES
  ('Aguas', TRUE),
  ('Bebidas', TRUE),
  ('Cervezas', TRUE),
  ('Licores', TRUE),
  ('Snacks', TRUE),
  ('Cuidado personal', TRUE),
  ('Tabacos', TRUE),
  ('Promociones', TRUE),
  ('Otros', TRUE)
ON CONFLICT(name) DO UPDATE SET active = TRUE;

WITH classified AS (
  SELECT
    p.id,
    CASE
      WHEN lower(p.name) ~ '(promo|promocion|promoción)' THEN 'Promociones'
      WHEN lower(p.name) ~ '(agua|cielo|san luis|san lucio|botellon|botellón)' THEN 'Aguas'
      WHEN lower(p.name) ~ '(cerveza|pilsen|cristal|cuzqueña|cusquena|corona|coronita|mikes|laton|latón|retornable)' THEN 'Cervezas'
      WHEN lower(p.name) ~ '(cigarro|pall mall|lucky strike)' THEN 'Tabacos'
      WHEN lower(p.name) ~ '(colgate|jaboncillo|protex|shampoo|pasta dental|desodorante|pañal|toalla)' THEN 'Cuidado personal'
      WHEN lower(p.name) ~ '(ron |vino |whisky|vodka|pisco|licor|tragos|combo chapito)' THEN 'Licores'
      WHEN lower(p.name) ~ '(chicharron|chicharrón|chipi|chicle|chifles|galleta|halls|papas|wafer|trident|chips|totopos|globo|piqueo|oreo|ritz|soda field)' THEN 'Snacks'
      WHEN lower(p.name) ~ '(coca|inka|inca|gaseosa|sprite|pepsi|fanta|cola|guaranita|guarana|big cola|kr |oro de|frugos|power ade|sporade|volt|pulp)' THEN 'Bebidas'
      ELSE 'Otros'
    END AS category_name
  FROM products p
  WHERE p.active
)
UPDATE products p
SET category_id = c.id,
    updated_at = CURRENT_TIMESTAMP
FROM classified x
JOIN categories c ON c.name = x.category_name
WHERE p.id = x.id;

INSERT INTO audit_log(action, details)
VALUES ('products_classified', jsonb_build_object('scope', 'active_products', 'count', (SELECT COUNT(*) FROM products WHERE active)));

COMMIT;
