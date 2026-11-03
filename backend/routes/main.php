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

    // Sede de la cabina actual
    $activeSede = get_active_sede();
    $slug = normalize_sede_slug($activeSede);
    $sedeName = normalize_sede_name($slug);
    set_active_db($slug);

    $voter = getVoterByCodigo($codigo, $slug);
    if (!$voter) {
        // Verificar si el alumno pertenece a la otra sede para guiarlo
        $otherSlug = ($slug === 'central') ? 'jerusalen' : 'central';
        $otherName = normalize_sede_name($otherSlug);
        $otherVoter = getVoterByCodigo($codigo, $otherSlug);
        if ($otherVoter) {
            http_response_code(403);
            echo json_encode([
                'error' => "El estudiante {$otherVoter['nombre']} está registrado en {$otherName}. Por favor dirígete a una cabina asignada a {$otherName} para emitir tu voto."
            ]);
            return;
        }
        http_response_code(404);
        echo json_encode(['error' => "DNI no encontrado en el padrón de {$sedeName}. Consulta con la mesa de votación."]);
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
            'sede' => $sedeName,
            'sede_slug' => $slug,
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
    $sede = isset($_GET['sede']) ? trim($_GET['sede']) : get_active_sede();
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
            'propuestas_pdf' => $c['propuestas_pdf'] ?? null,
            'sede' => $c['sede'] ?? normalize_sede_name($sede),
        ];
        foreach ($fotoFields as $ff) {
            $val = $c[$ff] ?? null;
            $item[$ff] = $val ? (strpos($val, 'static/') === 0 ? "/{$val}" : "/static/{$val}") : null;
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
    if (!isset($input['voter_codigo']) || !isset($input['candidato_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Faltan parámetros requeridos']);
        return;
    }

    $voter_codigo = trim($input['voter_codigo']);
    $candidato_id = (int)$input['candidato_id'];

    // Determinar la sede del votante
    $activeSede = get_active_sede();
    $voter = getVoterByCodigo($voter_codigo, $activeSede);
    if (!$voter) {
        // Chequear la otra sede
        $otherSlug = ($activeSede === 'central') ? 'jerusalen' : 'central';
        $voter = getVoterByCodigo($voter_codigo, $otherSlug);
        if ($voter) {
            $activeSede = $otherSlug;
        }
    }

    if (!$voter) {
        http_response_code(404);
        echo json_encode(['error' => 'Estudiante no encontrado.']);
        return;
    }

    $voterSedeSlug = normalize_sede_slug($voter['sede'] ?? $activeSede);
    set_active_db($voterSedeSlug);
    $pdo = get_db_connection($voterSedeSlug);

    if ($voter['ha_votado']) {
        http_response_code(403);
        echo json_encode(['error' => 'Este estudiante ya ha ejercido su voto anteriormente.']);
        return;
    }

    $candidato = getCandidatoById($candidato_id, $voterSedeSlug);
    if (!$candidato) {
        http_response_code(404);
        echo json_encode(['error' => 'Candidato no válido para esta sede.']);
        return;
    }

    $codigoReal = $voter['codigo'];

    // Protección de Concurrencia y Cola de Reintento Atómico
    $maxIntentos = 10;
    $votoExitoso = false;

    for ($intento = 1; $intento <= $maxIntentos; $intento++) {
        try {
            $pdo->beginTransaction();

            // Verificación atómica interna de doble voto
            $stmtCheck = $pdo->prepare('SELECT ha_votado FROM voters WHERE codigo = :c LIMIT 1');
            $stmtCheck->execute(['c' => $codigoReal]);
            if ((int)$stmtCheck->fetchColumn() === 1) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                http_response_code(403);
                echo json_encode(['error' => 'Este estudiante ya ha ejercido su voto anteriormente.']);
                return;
            }

            insertVoto($codigoReal, $candidato_id, $voterSedeSlug, $voter['ngs'] ?? null);
            setVoterVoted($codigoReal, $voterSedeSlug);
            $pdo->commit();
            $votoExitoso = true;
            break;
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $msg = $e->getMessage();
            if (strpos($msg, 'database is locked') !== false || strpos($msg, 'busy') !== false) {
                usleep(rand(30000, 100000));
                continue;
            }
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
                'sede' => normalize_sede_name($voterSedeSlug),
                'ngs' => $voter['ngs'] ?? '',
                'fecha' => date('Y-m-d H:i:s')
            ]);
            $ch = curl_init(N8N_WEBHOOK_URL);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT_MS, 500);
            curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
            @curl_exec($ch);
            @curl_close($ch);
        } catch (Exception $ignored) {}
    }

    echo json_encode([
        'success' => true,
        'message' => 'Voto registrado exitosamente.',
        'voter' => [
            'codigo' => $voter['codigo'],
            'nombre' => $voter['nombre'],
            'sede' => normalize_sede_name($voterSedeSlug),
            'ha_votado' => true
        ]
    ]);
}
