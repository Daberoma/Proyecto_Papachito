<?php
declare(strict_types=1);

// Importa únicamente datos usados por Papachito Móvil. No modifica MySQL.
$root = 'C:\\laragon\\www\\wilcatsystems_papachito';
$env = [];
foreach (file($root . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
    [$k, $v] = explode('=', $line, 2);
    $env[trim($k)] = trim(trim($v), "'\"");
}
$pgPassword = getenv('PAPACHITO_PG_PASSWORD');
if (!$pgPassword) throw new RuntimeException('Define PAPACHITO_PG_PASSWORD antes de ejecutar.');
$mysql = new PDO(sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $env['DB_HOST'], $env['DB_PORT'], $env['DB_DATABASE']), $env['DB_USERNAME'], $env['DB_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pg = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=papachito_app', 'papachito_app', $pgPassword, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pg->beginTransaction();
try {
    $cat = $pg->prepare('INSERT INTO categories (legacy_id,name) VALUES (?,?) ON CONFLICT (legacy_id) DO UPDATE SET name=EXCLUDED.name,active=TRUE');
    foreach ($mysql->query("SELECT cat_id, cat_nom FROM categorias WHERE cat_nom IS NOT NULL") as $r) $cat->execute([(int)$r['cat_id'], trim((string)$r['cat_nom']) ?: 'Otros']);
    $cats = $pg->query('SELECT legacy_id,id FROM categories')->fetchAll(PDO::FETCH_KEY_PAIR);
    $columns = $pg->query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name IN ('barcode','description')")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('barcode', $columns, true) || !in_array('description', $columns, true)) {
        $pg->exec('ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(80), ADD COLUMN IF NOT EXISTS description TEXT');
    }
    $prod = $pg->prepare('INSERT INTO products (legacy_id,category_id,sku,barcode,name,description,unit_code,sale_price,active) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT (legacy_id) DO UPDATE SET category_id=EXCLUDED.category_id,sku=EXCLUDED.sku,barcode=EXCLUDED.barcode,name=EXCLUDED.name,description=EXCLUDED.description,unit_code=EXCLUDED.unit_code,sale_price=EXCLUDED.sale_price,active=EXCLUDED.active');
    foreach ($mysql->query("SELECT IdProducto,cat_id,pronom,procod,codigo_barra,marca,modelo,ubicacion,lote,vencimiento,unidad_medida_des,umecod,propun,proest FROM productos WHERE pronom IS NOT NULL") as $r) {
        $parts = [];
        foreach (['marca' => 'Marca', 'modelo' => 'Modelo', 'unidad_medida_des' => 'Unidad', 'ubicacion' => 'Ubicacion', 'lote' => 'Lote', 'vencimiento' => 'Vence'] as $field => $label) {
            $value = trim((string)($r[$field] ?? ''));
            if ($value !== '' && $value !== '0000-00-00') $parts[] = $label . ': ' . $value;
        }
        $description = $parts ? implode(' | ', $parts) : 'Producto de venta';
        $prod->execute([(int)$r['IdProducto'], $cats[(int)$r['cat_id']] ?? null, $r['procod'] ?? null, $r['codigo_barra'] ?? null, trim((string)$r['pronom']), $description, $r['umecod'] ?: 'NIU', max(0,(float)$r['propun']), (($r['proest'] ?? '') === 'Activo')]);
    }
    $ids = $pg->query('SELECT legacy_id,id FROM products')->fetchAll(PDO::FETCH_KEY_PAIR);
    $stock = $pg->prepare('INSERT INTO product_stock (product_id,warehouse_id,quantity) VALUES (?,?,?) ON CONFLICT (product_id,warehouse_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=CURRENT_TIMESTAMP');
    foreach ($mysql->query("SELECT IdProducto,stock FROM producto_stock WHERE id_almacen=20") as $r) if(isset($ids[(int)$r['IdProducto']])) $stock->execute([$ids[(int)$r['IdProducto']],20,(float)$r['stock']]);
    $pay = $pg->prepare('INSERT INTO payment_methods (legacy_id,code,name) VALUES (?,?,?) ON CONFLICT (legacy_id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,active=TRUE');
    foreach ($mysql->query("SELECT id_med_pag,nom_med_pag FROM medios_pagos") as $r) $pay->execute([(int)$r['id_med_pag'], 'legacy_'.$r['id_med_pag'], trim((string)$r['nom_med_pag']) ?: 'SIN ESPECIFICAR']);
    $pg->commit();
    echo json_encode(['ok'=>true,'categories'=>count($cats),'products'=>count($ids)], JSON_UNESCAPED_UNICODE), PHP_EOL;
} catch (Throwable $e) { $pg->rollBack(); fwrite(STDERR,$e->getMessage().PHP_EOL); exit(1); }
