<?php
// config.php - Configuración del Sistema de Votación CATA 2026

define('BASE_DIR', __DIR__);

// Configuración de Base de Datos
// Opciones: 'sqlite' (por defecto) o 'mysql'
define('DB_DRIVER', getenv('DB_DRIVER') ?: 'sqlite');

// Configuración para MySQL / MariaDB (si el servidor lo requiere)
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'votacion_cata');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

// Archivos SQLite protegidos en carpeta data/
define('DATA_DIR', BASE_DIR . '/data');
define('DB_FILE_CENTRAL', DATA_DIR . '/central.db');
define('DB_FILE_JERUSALEN', DATA_DIR . '/jerusalen.db');
define('DB_FILE_LEGACY', DATA_DIR . '/votes.db');

// Crear carpeta data/ si no existe
if (!is_dir(DATA_DIR)) {
    @mkdir(DATA_DIR, 0755, true);
}

/**
 * Normaliza el slug de la sede: 'central' o 'jerusalen'
 */
function normalize_sede_slug($sede) {
    if (!$sede || !is_string($sede)) return 'central';
    $s = strtolower(trim($sede));
    if (strpos($s, 'jeru') !== false) {
        return 'jerusalen';
    }
    return 'central';
}

/**
 * Nombre oficial para mostrar
 */
function normalize_sede_name($sede) {
    $slug = normalize_sede_slug($sede);
    return ($slug === 'jerusalen') ? 'Sede Jerusalén' : 'Sede Central';
}

/**
 * Detecta la sede solicitada en la petición actual
 */
function get_active_sede() {
    static $activeSede = null;
    if ($activeSede !== null) return $activeSede;

    // 1. Cabecera HTTP X-Sede (cabina o módulo frontend)
    if (!empty($_SERVER['HTTP_X_SEDE'])) {
        $activeSede = normalize_sede_slug($_SERVER['HTTP_X_SEDE']);
        return $activeSede;
    }
    // 2. Query param ?sede=...
    if (!empty($_GET['sede'])) {
        $activeSede = normalize_sede_slug($_GET['sede']);
        return $activeSede;
    }
    // 3. POST param
    if (!empty($_POST['sede'])) {
        $activeSede = normalize_sede_slug($_POST['sede']);
        return $activeSede;
    }

    $activeSede = 'central';
    return $activeSede;
}

/**
 * Retorna la conexión PDO a la base de datos de una sede específica ('central' o 'jerusalen')
 */
function get_db_connection($sede = null) {
    static $connections = [];

    $slug = normalize_sede_slug($sede ?: get_active_sede());

    if (isset($connections[$slug])) {
        return $connections[$slug];
    }

    try {
        if (DB_DRIVER === 'mysql') {
            $dbName = (DB_NAME) . ($slug === 'jerusalen' ? '_jerusalen' : '_central');
            $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . $dbName . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } else {
            // SQLite modular por sede
            $filePath = ($slug === 'jerusalen') ? DB_FILE_JERUSALEN : DB_FILE_CENTRAL;

            // Si no existe central.db pero existe votes.db, migrarlo
            if (!file_exists($filePath) && $slug === 'central' && file_exists(DB_FILE_LEGACY)) {
                @copy(DB_FILE_LEGACY, $filePath);
            }

            $pdo = new PDO('sqlite:' . $filePath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $pdo->exec('PRAGMA journal_mode = WAL;');
            $pdo->exec('PRAGMA busy_timeout = 5000;');
            $pdo->exec('PRAGMA foreign_keys = ON;');
        }

        $connections[$slug] = $pdo;
        return $pdo;
    } catch (PDOException $e) {
        if (php_sapi_name() === 'cli') {
            die("Error de conexión a la base de datos ($slug): " . $e->getMessage() . "\n");
        }
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => "Error de conexión a la base de datos ({$slug}): " . $e->getMessage()]);
        exit;
    }
}

// Conexión activa por defecto
$pdo = get_db_connection(get_active_sede());

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

// Webhook de n8n para notificaciones
define('N8N_WEBHOOK_URL', getenv('N8N_WEBHOOK_URL') ?: 'http://localhost:5678/webhook/nuevo-voto');

// Iniciar sesión segura solo si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}
