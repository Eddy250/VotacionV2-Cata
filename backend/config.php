<?php
// config.php - Configuración del Sistema de Votación CATA 2026

define('BASE_DIR', __DIR__);

// Cargar archivo .env automáticamente si existe (compatible con Apache, XAMPP, Docker, cPanel)
$envCandidates = [
    BASE_DIR . '/.env',
    dirname(BASE_DIR) . '/.env',
    BASE_DIR . '/../.env'
];
foreach ($envCandidates as $envFile) {
    if (file_exists($envFile)) {
        $content = @file_get_contents($envFile);
        if ($content !== false && $content !== '') {
            $lines = preg_split('/\r\n|\r|\n/', $content);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($envKey, $envVal) = explode('=', $line, 2);
                    $envKey = trim($envKey);
                    $envVal = trim($envVal, " \t\n\r\0\x0B\"'");
                    putenv("{$envKey}={$envVal}");
                    $_ENV[$envKey] = $envVal;
                    $_SERVER[$envKey] = $envVal;
                }
            }
            break;
        }
    }
}

// Configuración de Motor de Base de Datos
// 'mysql' o 'sqlite' (configurable vía .env)
define('DB_DRIVER', strtolower(trim(getenv('DB_DRIVER') ?: 'sqlite')));

// Configuración para MySQL / MariaDB (Universal: Docker, XAMPP, cPanel, VPS, RDS)
$rawHost = getenv('DB_HOST') ?: '127.0.0.1';
// Si se ejecuta dentro de un contenedor Docker y el host es localhost/127.0.0.1, enrutar a host.docker.internal
if (($rawHost === '127.0.0.1' || $rawHost === 'localhost') && (file_exists('/.dockerenv') || getenv('DOCKER_CONTAINER'))) {
    $rawHost = 'host.docker.internal';
}
define('DB_HOST', $rawHost);
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'votacion_cata');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
// Si DB_SEPARATE_DBS es true, crea votacion_cata_central y votacion_cata_jerusalen.
// Si es false (por defecto), usa una sola base de datos unificada con la columna 'sede'.
define('DB_SEPARATE_DBS', filter_var(getenv('DB_SEPARATE_DBS') ?: false, FILTER_VALIDATE_BOOLEAN));

// Credenciales maestras configurables vía .env
define('ADMIN_ENV_EMAIL', getenv('ADMIN_EMAIL') ?: 'profesor@cata.edu.pe');
define('ADMIN_ENV_PASS', getenv('ADMIN_PASSWORD') ?: 'cata2026');

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
 * Retorna la conexión PDO a la base de datos (MySQL o SQLite)
 * Soporta cualquier servidor MySQL (Docker, XAMPP, cPanel, MariaDB, Remoto)
 * Auto-crea la base de datos si no existe y los permisos del usuario lo permiten.
 */
function get_db_connection($sede = null) {
    static $connections = [];

    $driver = DB_DRIVER;
    $slug = normalize_sede_slug($sede ?: get_active_sede());

    if ($driver === 'mysql') {
        $connKey = DB_SEPARATE_DBS ? "mysql_{$slug}" : 'mysql_unified';
        if (isset($connections[$connKey])) {
            return $connections[$connKey];
        }

        $host = DB_HOST;
        $port = DB_PORT;
        $dbName = DB_SEPARATE_DBS ? (DB_NAME . ($slug === 'jerusalen' ? '_jerusalen' : '_central')) : DB_NAME;
        $user = DB_USER;
        $pass = DB_PASS;

        try {
            // 1. Intentar conectar directamente a la base de datos solicitada
            $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ]);
        } catch (PDOException $e) {
            // 2. Si la base de datos no existe (código 1049), intentar crearla automáticamente
            if ($e->getCode() == 1049 || stripos($e->getMessage(), 'Unknown database') !== false) {
                try {
                    $rootDsn = "mysql:host={$host};port={$port};charset=utf8mb4";
                    $serverPdo = new PDO($rootDsn, $user, $pass, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_EMULATE_PREPARES => false
                    ]);
                    $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    unset($serverPdo);

                    // Reintentar conexión con la base ya creada
                    $pdo = new PDO($dsn, $user, $pass, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
                    ]);
                } catch (PDOException $createEx) {
                    if (php_sapi_name() === 'cli') {
                        die("[ERROR MYSQL] No se pudo crear ni conectar a la BD '{$dbName}' en {$host}:{$port}. " . $createEx->getMessage() . "\n");
                    }
                    http_response_code(500);
                    header('Content-Type: application/json; charset=UTF-8');
                    echo json_encode([
                        'error' => "No se pudo crear ni conectar a la base de datos MySQL '{$dbName}'",
                        'host' => $host,
                        'port' => $port,
                        'detalle' => $createEx->getMessage()
                    ]);
                    exit;
                }
            } else {
                if (php_sapi_name() === 'cli') {
                    die("[ERROR MYSQL] Error de conexión a MySQL ({$host}:{$port}, BD: '{$dbName}'): " . $e->getMessage() . "\n");
                }
                http_response_code(500);
                header('Content-Type: application/json; charset=UTF-8');
                echo json_encode([
                    'error' => "Error de conexión al servidor MySQL en {$host}:{$port}",
                    'host' => $host,
                    'port' => $port,
                    'database' => $dbName,
                    'detalle' => $e->getMessage()
                ]);
                exit;
            }
        }

        $connections[$connKey] = $pdo;
        return $pdo;
    } else {
        // SQLite modular por sede
        if (isset($connections[$slug])) {
            return $connections[$slug];
        }

        $filePath = ($slug === 'jerusalen') ? DB_FILE_JERUSALEN : DB_FILE_CENTRAL;

        // Si no existe central.db pero existe votes.db, migrarlo
        if (!file_exists($filePath) && $slug === 'central' && file_exists(DB_FILE_LEGACY)) {
            @copy(DB_FILE_LEGACY, $filePath);
        }

        try {
            $pdo = new PDO('sqlite:' . $filePath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $pdo->exec('PRAGMA journal_mode = WAL;');
            $pdo->exec('PRAGMA busy_timeout = 5000;');
            $pdo->exec('PRAGMA foreign_keys = ON;');
        } catch (PDOException $e) {
            if (php_sapi_name() === 'cli') {
                die("Error de conexión a la base de datos SQLite ($slug): " . $e->getMessage() . "\n");
            }
            http_response_code(500);
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode(['error' => "Error de conexión a la base de datos SQLite ({$slug}): " . $e->getMessage()]);
            exit;
        }

        $connections[$slug] = $pdo;
        return $pdo;
    }
}

// Conexión activa por defecto
$pdo = get_db_connection(get_active_sede());

// Subida de imágenes
define('UPLOAD_DIR', BASE_DIR . '/static/img');
if (!is_dir(UPLOAD_DIR)) {
    @mkdir(UPLOAD_DIR, 0777, true);
}
@chmod(UPLOAD_DIR, 0777);
define('ALLOWED_IMG_EXT', ['png', 'jpg', 'jpeg', 'gif', 'webp']);

// Subida de documentos (PDF de planes de trabajo)
define('DOCS_DIR', BASE_DIR . '/static/docs');
if (!is_dir(DOCS_DIR)) {
    @mkdir(DOCS_DIR, 0777, true);
}
@chmod(DOCS_DIR, 0777);
define('ALLOWED_DOC_EXT', ['pdf']);

// Webhook de n8n para notificaciones
define('N8N_WEBHOOK_URL', getenv('N8N_WEBHOOK_URL') ?: 'http://localhost:5678/webhook/nuevo-voto');

// Iniciar sesión segura solo si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

// URL base del sistema para enlaces absolutos
function get_base_url() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8001';
    return "{$scheme}://{$host}";
}
