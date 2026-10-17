<?php

require_once __DIR__ . '/galeri-oturum.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: giris.html');
    exit;
}

if (!defined('GALERI_SIFRE_SALT') || GALERI_SIFRE_SALT === 'TUZ_DEGERINI_BURAYA_YAPISTIRIN' ||
    !defined('GALERI_SIFRE_HASH') || GALERI_SIFRE_HASH === 'HASH_DEGERINI_BURAYA_YAPISTIRIN') {
    http_response_code(500);
    exit('Galeri şifresi yapılandırılmamış. Kurulum için GALERI_KURULUM.md dosyasına bakın.');
}

$password = $_POST['password'] ?? '';
if (!is_string($password)) {
    header('Location: giris.html?error=1');
    exit;
}

$salt = hex2bin(GALERI_SIFRE_SALT);
$submittedHash = $salt === false
    ? false
    : hash_pbkdf2('sha256', $password, $salt, GALERI_SIFRE_ITERATIONS, 32);

if ($submittedHash === false || !hash_equals(GALERI_SIFRE_HASH, $submittedHash)) {
    header('Location: giris.html?error=1');
    exit;
}

session_regenerate_id(true);
$_SESSION['galeri_giris'] = true;
header('Location: galeri.php');
exit;
