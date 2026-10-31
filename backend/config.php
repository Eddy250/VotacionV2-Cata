<?php
// config.php - Configuración del Sistema de Votación CATA 2026

define('BASE_DIR', __DIR__);

// Configuración de Base de Datos
// Opciones: 'sqlite' (por defecto) o 'mysql'
define('DB_DRIVER', getenv('DB_DRIVER') ?: 'sqlite');

// Configuración para MySQL / MariaDB (si el servidor del ingeniero lo requiere)
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'votacion_cata');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

// Archivo SQLite protegido en carpeta data/
define('DATA_DIR', BASE_DIR . '/data');
define('DB_FILE', DATA_DIR . '/votes.db');

// Crear carpeta data/ si no existe
if (!is_dir(DATA_DIR)) {
    @mkdir(DATA_DIR, 0755, true);
}

// Conexión PDO
try {
    if (DB_DRIVER === 'mysql') {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } else {
        // SQLite
        $pdo = new PDO('sqlite:' . DB_FILE);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        // Optimizaciones de concurrencia para SQLite (evita "database is locked" con votos simultáneos)
        $pdo->exec('PRAGMA journal_mode = WAL;');
        $pdo->exec('PRAGMA busy_timeout = 5000;');
        $pdo->exec('PRAGMA foreign_keys = ON;');
    }
} catch (PDOException $e) {
    if (php_sapi_name() === 'cli') {
        die("Error de conexión a la base de datos: " . $e->getMessage() . "\n");
    }
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Error de conexión a la base de datos: ' . $e->getMessage()]);
    exit;
}

// Subida de imágenes
define('UPLOAD_DIR', BASE_DIR . '/static/img');
if (!is_dir(UPLOAD_DIR)) {
    @mkdir(UPLOAD_DIR, 0755, true);
}
define('ALLOWED_IMG_EXT', ['png', 'jpg', 'jpeg', 'gif', 'webp']);

// Subida de documentos (PDF de planes de trabajo)
define('DOCS_DIR', BASE_DIR . '/static/docs');
if (!is_dir(DOCS_DIR)) {
    @mkdir(DOCS_DIR, 0777, true);
}
define('ALLOWED_DOC_EXT', ['pdf']);

// Webhook de n8n para notificaciones (ajustar si está en la nube o local)
define('N8N_WEBHOOK_URL', getenv('N8N_WEBHOOK_URL') ?: 'http://localhost:5678/webhook/nuevo-voto');

// Iniciar sesión segura solo si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}