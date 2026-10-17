<?php

$configPath = __DIR__ . '/galeri-private/config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    exit('Galeri yapılandırması eksik. Kurulum için GALERI_KURULUM.md dosyasına bakın.');
}

require_once $configPath;

ini_set('session.use_strict_mode', '1');
session_set_cookie_params([
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Lax',
]);
session_start();
header('Cache-Control: private, no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

function galeri_giris_gerekli(): void
{
    if (empty($_SESSION['galeri_giris'])) {
        header('Location: giris.html');
        exit;
    }
}
