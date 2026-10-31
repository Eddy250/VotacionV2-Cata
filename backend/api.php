<?php
// api.php - Router Central de la API REST CATA 2026

// Cabeceras CORS globales para permitir consumo desde web o apps móviles
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Token, x-admin-token');

// Responder inmediatamente a solicitudes pre-flight OPTIONS del navegador
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Extraer el endpoint solicitado
$endpoint = '';
if (!empty($_GET['endpoint'])) {
    $endpoint = trim($_GET['endpoint'], '/');
} else {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (strpos($uri, 'api.php') !== false) {
        $parts = explode('api.php', $uri);
        $endpoint = trim(end($parts), '/');
    } elseif (strpos($uri, '/api/') !== false) {
        $parts = explode('/api/', $uri);
        $endpoint = trim(end($parts), '/');
    }
}

// Función para obtener el token Bearer
function getBearerToken() {
    // 1. Query parameter (ej. ?token=...)
    if (!empty($_GET['token'])) {
        return trim($_GET['token']);
    }

    // 2. Custom header X-Admin-Token
    if (!empty($_SERVER['HTTP_X_ADMIN_TOKEN'])) {
        return trim($_SERVER['HTTP_X_ADMIN_TOKEN']);
    }

    // 3. getallheaders()
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $k => $v) {
            if (strtolower($k) === 'authorization') {
                if (preg_match('/Bearer\s+(.*)$/i', $v, $matches)) {
                    return trim($matches[1]);
                }
            }
            if (strtolower($k) === 'x-admin-token') {
                return trim($v);
            }
        }
    }

    // 4. $_SERVER checks
    $possibleKeys = [
        'HTTP_AUTHORIZATION',
        'REDIRECT_HTTP_AUTHORIZATION',
        'Authorization',
        'HTTP_X_ADMIN_TOKEN'
    ];
    foreach ($possibleKeys as $key) {
        if (!empty($_SERVER[$key])) {
            $val = trim($_SERVER[$key]);
            if (preg_match('/Bearer\s+(.*)$/i', $val, $matches)) {
                return trim($matches[1]);
            }
            return $val;
        }
    }

    return null;
}

// Por defecto las respuestas son JSON (salvo la exportación de archivos)
if ($endpoint !== 'admin/export') {
    header('Content-Type: application/json; charset=UTF-8');
}

// Cargar configuración y modelos
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/models.php';

// Separar segmentos del endpoint (ej: admin/candidatos/5)
$segments = $endpoint !== '' ? explode('/', $endpoint) : [];

try {
    if (empty($segments)) {
        echo json_encode([
            'sistema' => 'API de Votación CATA 2026',
            'estado' => 'Activo',
            'version' => '2.5.0'
        ]);
        exit;
    }

    // ==========================================
    // RUTAS PÚBLICAS DE VOTACIÓN (ALUMNOS)
    // ==========================================
    if ($segments[0] === 'login') {
        require_once __DIR__ . '/routes/main.php';
        handle_login();
        exit;
    }

    if ($segments[0] === 'candidatos' && count($segments) === 1) {
        require_once __DIR__ . '/routes/main.php';
        handle_get_candidatos();
        exit;
    }

    if ($segments[0] === 'voto') {
        require_once __DIR__ . '/routes/main.php';
        handle_voto();
        exit;
    }

    if ($segments[0] === 'election-state' || $segments[0] === 'estado-eleccion') {
        require_once __DIR__ . '/routes/main.php';
        handle_get_election_state();
        exit;
    }

    // ==========================================
    // RUTAS ADMINISTRATIVAS Y DOCENTES
    // ==========================================
    if ($segments[0] === 'admin') {
        require_once __DIR__ . '/routes/admin.php';
        $sub = $segments[1] ?? '';

        // Login de Administrador/Docente (PÚBLICA)
        if ($sub === 'login') {
            handle_admin_login();
            exit;
        }

        // --- TODAS LAS RUTAS SIGUIENTES REQUIEREN TOKEN DE AUTENTICACIÓN ---
        $token = getBearerToken();
        $adminActual = verifyAdminToken($token);
        if (!$adminActual) {
            http_response_code(401);
            echo json_encode([
                'error' => 'No autorizado. Se requiere iniciar sesión con correo docente.',
                'requiere_login' => true
            ]);
            exit;
        }

        if ($sub === 'logout') {
            handle_admin_logout($token);
            exit;
        }

        if ($sub === 'me') {
            echo json_encode(['success' => true, 'admin' => $adminActual]);
            exit;
        }

        if ($sub === 'election-state' || $sub === 'estado-eleccion') {
            handle_admin_election_state();
            exit;
        }

        if ($sub === 'stats') {
            handle_admin_stats();
            exit;
        }

        if ($sub === 'alumnos') {
            handle_admin_alumnos();
            exit;
        }

        if ($sub === 'importar-lote') {
            handle_admin_importar_lote();
            exit;
        }

        if ($sub === 'candidatos') {
            if (count($segments) === 2) {
                handle_admin_candidatos();
                exit;
            }
            if (count($segments) === 3) {
                if ($segments[2] === 'parse-pdf') {
                    handle_admin_parse_pdf();
                    exit;
                }
                $candidatoId = $segments[2];
                handle_admin_candidato_manage($candidatoId);
                exit;
            }
        }

        if ($sub === 'export') {
            handle_export_audit();
            exit;
        }
    }

    // Si ninguna ruta coincidió
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint no encontrado: /api/' . $endpoint]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno en el servidor: ' . $e->getMessage()]);
}
