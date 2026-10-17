<?php

require_once __DIR__ . '/galeri-oturum.php';
galeri_giris_gerekli();

$imageDirectory = __DIR__ . '/galeri-private/images';
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
$images = [];

foreach ($allowedExtensions as $extension) {
    foreach ([$extension, strtoupper($extension)] as $patternExtension) {
        $matches = glob($imageDirectory . '/*.' . $patternExtension);
        if ($matches !== false) {
            $images = array_merge($images, $matches);
        }
    }
}

sort($images, SORT_NATURAL | SORT_FLAG_CASE);
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title>Özel Fotoğraf Galerisi | SDÜ Yazılım ve Siber Güvenlik Topluluğu</title>
    <link rel="stylesheet" href="galeri.css">
</head>
<body>
    <header class="gallery-header">
        <h1>Özel Fotoğraf Galerisi</h1>
        <a href="galeri-cikis.php">Güvenli çıkış</a>
    </header>
    <main class="gallery-grid">
        <?php foreach ($images as $image):
            $filename = basename($image);
            $encodedFilename = rawurlencode($filename);
            $label = htmlspecialchars(pathinfo($filename, PATHINFO_FILENAME), ENT_QUOTES, 'UTF-8');
        ?>
            <figure>
                <img src="galeri-gorsel.php?file=<?= $encodedFilename ?>" alt="<?= $label ?>" draggable="false">
                <figcaption><?= $label ?></figcaption>
            </figure>
        <?php endforeach; ?>
        <?php if (!$images): ?>
            <p class="empty-message">Henüz galeriye fotoğraf eklenmemiş. Görselleri galeri-private/images klasörüne yükleyin.</p>
        <?php endif; ?>
    </main>
</body>
</html>
