<?php
declare(strict_types=1);
function pg(): PDO {
    static $db;
    if ($db instanceof PDO) return $db;
    $pw = getenv('PAPACHITO_PG_PASSWORD');
    if (!$pw) throw new RuntimeException('PAPACHITO_PG_PASSWORD no configurada');
    $db = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=papachito_app', 'papachito_app', $pw, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    return $db;
}
function out(array $data, int $status=200): void { http_response_code($status); header('Content-Type: application/json; charset=utf-8'); header('Access-Control-Allow-Origin: *'); header('Access-Control-Allow-Headers: Content-Type'); header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS'); echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function body(): array { $v=json_decode(file_get_contents('php://input')?:'{}',true); return is_array($v)?$v:[]; }
function ensure_product_columns(): void {
    static $done = false;
    if ($done) return;
    $stmt = pg()->query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name IN ('barcode','description')");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('barcode', $columns, true) || !in_array('description', $columns, true)) {
        pg()->exec('ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(80), ADD COLUMN IF NOT EXISTS description TEXT');
    }
    $done = true;
}
function stable_uuid(string $seed): string {
    if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $seed)) return strtolower($seed);
    $hex = substr(sha1('papachito-mobile-'.$seed), 0, 32);
    return substr($hex,0,8).'-'.substr($hex,8,4).'-'.substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20,12);
}
