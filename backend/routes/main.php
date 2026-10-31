<?php
// routes/main.php - Rutas de Votación y Estudiantes CATA 2026
require_once __DIR__ . '/../models.php';

function handle_login() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    // Validar estado general de la elección
    $infoEleccion = getInfoEleccion();
    if (!$infoEleccion['permite_voto']) {
        http_response_code(403);
        echo json_encode([
            'error' => $infoEleccion['mensaje'],
            'estado_eleccion' => $infoEleccion['estado'],
            'bloqueado_por_estado' => true
        ]);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['codigo']) || trim($input['codigo']) === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Por favor, ingresa tu número de DNI o código de estudiante.']);
        return;
    }
    $codigo = trim($input['codigo']);
    $voter = getVoterByCodigo($codigo);
    if (!$voter) {
        http_response_code(404);
        echo json_encode(['error' => 'DNI o código no encontrado en el padrón electoral. Consulta con el docente o mesa de votación.']);
        return;
    }
    if ($voter['ha_votado']) {
        http_response_code(403);
        echo json_encode(['error' => 'Este DNI ya ha sido utilizado para votar. El voto es personal y único.']);
        return;
    }
    echo json_encode([
        'success' => true,
        'message' => 'Login exitoso.',
        'voter' => [
            'codigo' => $voter['codigo'],
            'dni' => $voter['dni'] ?? null,
            'codigo_original' => $voter['codigo_original'] ?? null,
            'nombre' => $voter['nombre'],
            'sede' => $voter['sede'] ?? 'Sede Principal',
            'ngs' => $voter['ngs'] ?? '',
            'email' => $voter['email'] ?? null
        ]
    ]);
}

function handle_get_election_state() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }
    echo json_encode(getInfoEleccion());
}

function handle_get_candidatos() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }
    $sede = isset($_GET['sede']) ? trim($_GET['sede']) : null;
    $candidatos = getAllCandidatos($sede);
    $resultado = [];
    $fotoFields = ['foto', 'logo', 'alcalde_foto', 'teniente_foto',
                   'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_derechos_foto'];
    foreach ($candidatos as $c) {
        $item = [
            'id' => (int)$c['id'],
            'nombre' => $c['nombre'],
            'descripcion' => $c['descripcion'] ?? null,
            'slogan' => $c['slogan'] ?? null,
            'propuestas' => $c['propuestas'] ?? null,
            'alcalde' => $c['alcalde'] ?? null,
            'teniente' => $c['teniente'] ?? null,
            'regidor_educacion' => $c['regidor_educacion'] ?? null,
            'regidor_salud' => $c['regidor_salud'] ?? null,
            'regidor_derechos' => $c['regidor_derechos'] ?? null,
            'sede' => $c['sede'] ?? 'Sede Principal',
            'propuestas_pdf' => !empty($c['propuestas_pdf']) ? ('/static/' . ltrim(preg_replace('#^/*(static/)+#i', '', $c['propuestas_pdf']), '/')) : null,
        ];
        foreach ($fotoFields as $field) {
            $val = $c[$field] ?? null;
            $item[$field] = $val ? ('/static/' . ltrim(preg_replace('#^/*(static/)+#i', '', $val), '/')) : null;
        }
        $resultado[] = $item;
    }
    echo json_encode($resultado);
}

function handle_voto() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    // 1. Validar estado general de la elección
    $infoEleccion = getInfoEleccion();
    if (!$infoEleccion['permite_voto']) {
        http_response_code(403);
        echo json_encode([
            'error' => $infoEleccion['mensaje'],
            'estado_eleccion' => $infoEleccion['estado'],
            'bloqueado_por_estado' => true
        ]);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Faltan datos en la solicitud.']);
        return;
    }
    $voter_codigo = trim($input['voter_codigo'] ?? '');
    $candidato_id = isset($input['candidato_id']) ? (int)$input['candidato_id'] : null;

    if ($voter_codigo === '' || $candidato_id === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Código de votante o candidato faltante.']);
        return;
    }

    $voter = getVoterByCodigo($voter_codigo);
    if (!$voter) {
        http_response_code(403);
        echo json_encode(['error' => 'Estudiante no encontrado en el padrón.']);
        return;
    }
    if ($voter['ha_votado']) {
        http_response_code(403);
        echo json_encode(['error' => 'Este estudiante ya ha ejercido su voto anteriormente.']);
        return;
    }
    $candidato = getCandidatoById($candidato_id);
    if (!$candidato) {
        http_response_code(404);
        echo json_encode(['error' => 'Candidato no válido.']);
        return;
    }

    $codigoReal = $voter['codigo'];
    global $pdo;

    // Protección de Concurrencia y Cola de Reintento Atómico
    // Soporta múltiples PCs escribiendo en simultáneo sin bloqueos de base de datos
    $maxIntentos = 10;
    $votoExitoso = false;

    for ($intento = 1; $intento <= $maxIntentos; $intento++) {
        try {
            if (DB_DRIVER === 'sqlite') {
                $pdo->exec('BEGIN IMMEDIATE TRANSACTION;');
            } else {
                $pdo->beginTransaction();
            }

            // Verificación atómica interna de doble voto
            $stmtCheck = $pdo->prepare('SELECT ha_votado FROM voters WHERE codigo = :c LIMIT 1');
            $stmtCheck->execute(['c' => $codigoReal]);
            if ((int)$stmtCheck->fetchColumn() === 1) {
                $pdo->rollBack();
                http_response_code(403);
                echo json_encode(['error' => 'Este estudiante ya ha ejercido su voto anteriormente.']);
                return;
            }

            insertVoto($codigoReal, $candidato_id, $voter['sede'] ?? null, $voter['ngs'] ?? null);
            setVoterVoted($codigoReal);
            $pdo->commit();
            $votoExitoso = true;
            break;
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $msg = $e->getMessage();
            // Si la base de datos está ocupada con otra PC (busy / locked), esperar turno en cola de reintentos
            if (strpos($msg, 'database is locked') !== false || strpos($msg, 'busy') !== false) {
                usleep(rand(30000, 100000)); // Esperar entre 30ms y 100ms
                continue;
            }
            // Si se detecta llave duplicada (intento concurrente desde dos pestañas/PCs del mismo estudiante)
            if (strpos($msg, 'UNIQUE') !== false || strpos($msg, 'Duplicate') !== false) {
                http_response_code(403);
                echo json_encode(['error' => 'Este estudiante ya ha ejercido su voto anteriormente.']);
                return;
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error de persistencia: ' . $e->getMessage()]);
            return;
        }
    }

    if (!$votoExitoso) {
        http_response_code(503);
        echo json_encode(['error' => 'Servidor con alta demanda temporal. Por favor, intente emitir su voto de nuevo.']);
        return;
    }

    // Disparo asíncrono a n8n si el alumno tiene email registrado
    if (!empty($voter['email']) && defined('N8N_WEBHOOK_URL') && N8N_WEBHOOK_URL) {
        try {
            $payload = json_encode([
                'voter_nombre' => $voter['nombre'],
                'voter_email' => $voter['email'],
                'voter_codigo' => $voter['codigo'],
                'candidato_nombre' => $candidato['nombre'],
                'sede' => $voter['sede'] ?? '',
                'ngs' => $voter['ngs'] ?? ''
            ]);
            $ch = curl_init(N8N_WEBHOOK_URL);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($payload)
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
            curl_exec($ch);
            curl_close($ch);
        } catch (Exception $ex) {
            // Silencioso
        }
    }

    echo json_encode([
        'success' => true,
        'message' => '¡Tu voto ha sido registrado correctamente!'
    ]);
}