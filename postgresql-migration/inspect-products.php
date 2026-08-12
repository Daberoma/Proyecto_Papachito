<?php
declare(strict_types=1);

$root = 'C:\\laragon\\www\\wilcatsystems_papachito';
$env = [];
foreach (file($root . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
    [$key, $value] = explode('=', $line, 2);
    $env[trim($key)] = trim(trim($value), "'\"");
}

$mysql = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $env['DB_HOST'], $env['DB_PORT'], $env['DB_DATABASE']),
    $env['DB_USERNAME'],
    $env['DB_PASSWORD'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

echo "[productos]\n";
foreach ($mysql->query('DESCRIBE productos') as $row) {
    echo $row['Field'] . ' ' . $row['Type'] . "\n";
}

echo "[sample]\n";
$sample = $mysql->query('SELECT * FROM productos WHERE pronom IS NOT NULL LIMIT 1')->fetch();
foreach (array_keys($sample ?: []) as $field) {
    echo $field . "\n";
}
