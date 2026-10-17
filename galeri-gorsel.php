<?php

require_once __DIR__ . '/galeri-oturum.php';
galeri_giris_gerekli();

$filename = $_GET['file'] ?? '';
$allowedTypes = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'gif' => 'image/gif',
    'webp' => 'image/webp',
];

if (!is_string($filename) || $filename === '' || basename($filename) !== $filename) {
    http_response_code(404);
    exit;
}

$extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
if (!isset($allowedTypes[$extension])) {
    http_response_code(404);
    exit;
}

$imageDirectory = realpath(__DIR__ . '/galeri-private/images');
$imagePath = realpath(__DIR__ . '/galeri-private/images/' . $filename);
if ($imagePath === false || $imageDirectory === false ||
    strpos($imagePath, $imageDirectory . DIRECTORY_SEPARATOR) !== 0 ||
    !is_file($imagePath) || !is_readable($imagePath)) {
    http_response_code(404);
    exit;
}

header('Content-Type: ' . $allowedTypes[$extension]);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Content-Length: ' . filesize($imagePath));
readfile($imagePath);
