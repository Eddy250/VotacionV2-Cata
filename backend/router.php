<?php
// router.php - Enrutador para el servidor de desarrollo local de PHP (php -S)
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Si es un archivo o recurso estático existente (JS, CSS, imágenes, etc.), servirlo directamente
if ($uri !== '/' && file_exists(__DIR__ . $uri) && !is_dir(__DIR__ . $uri)) {
    return false;
}

// Si es una petición a la API
if (strpos($uri, '/api') !== false) {
    require __DIR__ . '/api.php';
    return true;
}

// Servir la aplicación web React (SPA)
if (is_file(__DIR__ . '/index.html')) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile(__DIR__ . '/index.html');
    return true;
}

return false;
