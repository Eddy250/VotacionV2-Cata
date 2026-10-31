<?php
// routes/admin.php - Rutas de Administración y Gestión Docente CATA 2026
require_once __DIR__ . '/../models.php';
require_once __DIR__ . '/../utils/file_manager.php';
require_once __DIR__ . '/../utils/stats_manager.php';

// ---------- AUTENTICACIÓN DOCENTE ----------

function handle_admin_login() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $email = trim($input['email'] ?? '');
    $password = trim($input['password'] ?? '');

    if ($email === '' || $password === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Por favor, ingresa correo y contraseña.']);
        return;
    }

    $res = adminLogin($email, $password);
    if (!$res) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales inválidas. Verifica tu correo y contraseña docente.']);
        return;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Acceso autorizado',
        'token' => $res['token'],
        'admin' => $res['admin']
    ]);
}

function handle_admin_logout($token) {
    adminLogout($token);
    echo json_encode(['success' => true, 'message' => 'Sesión cerrada']);
}

// ---------- ESTADÍSTICAS Y ANALÍTICA FILTRABLE ----------

function handle_admin_stats() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }
    try {
        $sede = isset($_GET['sede']) ? trim($_GET['sede']) : null;
        $ngs = isset($_GET['ngs']) ? trim($_GET['ngs']) : null;
        $stats = StatsManager::get_dashboard_stats($sede, $ngs);
        echo json_encode($stats);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// ---------- PADRÓN DE ESTUDIANTES Y ESTADO DE SUFRAGIO ----------

function handle_admin_alumnos() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }
    try {
        $sede = isset($_GET['sede']) ? trim($_GET['sede']) : null;
        $ngs = isset($_GET['ngs']) ? trim($_GET['ngs']) : null;
        $estado = isset($_GET['estado']) ? trim($_GET['estado']) : 'todos';
        $search = isset($_GET['search']) ? trim($_GET['search']) : null;

        $resultado = getStudentsFiltered($sede, $ngs, $estado, $search);
        echo json_encode($resultado);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// ---------- IMPORTADOR MASIVO CON CÓDIGOS SECRETOS ----------

function handle_admin_importar_lote() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['alumnos']) || !is_array($input['alumnos'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No se recibieron datos de estudiantes para importar.']);
        return;
    }

    $sedeDefault = !empty($input['sede_default']) ? trim($input['sede_default']) : 'Sede Principal';

    try {
        $resultado = importarLoteAlumnos($input['alumnos'], $sedeDefault);
        echo json_encode([
            'success' => true,
            'message' => "Proceso completado: {$resultado['insertados']} alumnos nuevos registrados con códigos secretos y {$resultado['actualizados']} actualizados.",
            'resultado' => $resultado
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al importar alumnos: ' . $e->getMessage()]);
    }
}

// ---------- GESTIÓN DE CANDIDATOS (EXPANDIDA) ----------

function _process_candidate_files() {
    $fotos = [];
    $fotoFields = ['foto', 'logo', 'alcalde_foto', 'teniente_foto', 
                   'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_derechos_foto'];
    foreach ($fotoFields as $field) {
        if (!empty($_FILES[$field]['name'])) {
            $result = FileManager::save_candidate_photo($_FILES[$field]);
            if ($result) {
                $fotos[$field] = $result;
            }
        }
    }

    // Procesar documento PDF si fue subido
    if (!empty($_FILES['propuestas_pdf']['name'])) {
        $pdfResult = FileManager::save_candidate_doc($_FILES['propuestas_pdf']);
        if ($pdfResult) {
            $fotos['propuestas_pdf'] = $pdfResult;
        }
    }

    return $fotos;
}

function _candidato_to_response($c) {
    $fotoFields = ['foto', 'logo', 'alcalde_foto', 'teniente_foto',
                   'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_derechos_foto'];
    $resp = [
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
        'propuestas_pdf' => !empty($c['propuestas_pdf']) ? ('/static/' . ltrim(preg_replace('#^/*(static/)+#i', '', $c['propuestas_pdf']), '/')) : null
    ];
    foreach ($fotoFields as $field) {
        $val = $c[$field] ?? null;
        $resp[$field] = $val ? ('/static/' . ltrim(preg_replace('#^/*(static/)+#i', '', $val), '/')) : null;
    }
    return $resp;
}

function handle_admin_candidatos() {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $candidatos = getAllCandidatos();
        $resultado = [];
        foreach ($candidatos as $c) {
            $resultado[] = _candidato_to_response($c);
        }
        echo json_encode($resultado);
        return;
    }

    if ($method === 'POST') {
        $nombre = trim($_POST['nombre'] ?? '');
        $descripcion = isset($_POST['descripcion']) ? trim($_POST['descripcion']) : null;

        if ($nombre === '') {
            http_response_code(400);
            echo json_encode(['error' => 'El nombre es obligatorio']);
            return;
        }

        // Procesar archivos subidos
        $fotos = _process_candidate_files();
        $fotoRelativa = $fotos['foto'] ?? null;

        // Construir extras
        $extras = [];
        $textFields = ['slogan', 'propuestas', 'alcalde', 'teniente', 
                       'regidor_educacion', 'regidor_salud', 'regidor_derechos', 'sede'];
        foreach ($textFields as $tf) {
            if (isset($_POST[$tf])) $extras[$tf] = trim($_POST[$tf]);
        }
        // Fotos de miembros y documentos
        $fotoExtraFields = ['logo', 'alcalde_foto', 'teniente_foto', 
                            'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_derechos_foto', 'propuestas_pdf'];
        foreach ($fotoExtraFields as $ff) {
            if (isset($fotos[$ff])) $extras[$ff] = $fotos[$ff];
        }
        if (isset($_POST['propuestas_pdf_path']) && !isset($extras['propuestas_pdf'])) {
            $extras['propuestas_pdf'] = trim($_POST['propuestas_pdf_path']);
        }

        $nuevoId = insertCandidato($nombre, $descripcion, $fotoRelativa, $extras);
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Candidato agregado exitosamente',
            'id' => $nuevoId
        ]);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}

function handle_admin_candidato_manage($id) {
    $id = (int)$id;
    if (!candidatoExists($id)) {
        http_response_code(404);
        echo json_encode(['error' => 'Candidato no encontrado']);
        return;
    }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $c = getCandidatoById($id);
        echo json_encode(_candidato_to_response($c));
        return;
    }

    if ($method === 'POST' || $method === 'PUT') {
        $nombre = isset($_POST['nombre']) ? trim($_POST['nombre']) : null;
        $descripcion = isset($_POST['descripcion']) ? trim($_POST['descripcion']) : null;

        if ($nombre === null && empty($_FILES) && empty($_POST)) {
            $raw = json_decode(file_get_contents('php://input'), true);
            if ($raw) {
                $nombre = isset($raw['nombre']) ? trim($raw['nombre']) : null;
                $descripcion = isset($raw['descripcion']) ? trim($raw['descripcion']) : null;
            }
        }

        // Procesar archivos subidos
        $fotos = _process_candidate_files();
        $fotoRelativa = $fotos['foto'] ?? null;

        // Construir extras
        $extras = [];
        $textFields = ['slogan', 'propuestas', 'alcalde', 'teniente', 
                       'regidor_educacion', 'regidor_salud', 'regidor_derechos', 'sede'];
        foreach ($textFields as $tf) {
            if (isset($_POST[$tf])) $extras[$tf] = trim($_POST[$tf]);
        }
        $fotoExtraFields = ['logo', 'alcalde_foto', 'teniente_foto', 
                            'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_derechos_foto', 'propuestas_pdf'];
        foreach ($fotoExtraFields as $ff) {
            if (isset($fotos[$ff])) $extras[$ff] = $fotos[$ff];
        }
        if (isset($_POST['propuestas_pdf_path']) && !isset($extras['propuestas_pdf'])) {
            $extras['propuestas_pdf'] = trim($_POST['propuestas_pdf_path']);
        }

        updateCandidato($id, $nombre, $descripcion, $fotoRelativa, $extras);
        echo json_encode([
            'success' => true,
            'message' => 'Candidato actualizado exitosamente'
        ]);
        return;
    }

    if ($method === 'DELETE') {
        deleteCandidato($id);
        echo json_encode([
            'success' => true,
            'message' => 'Candidato y sus votos asociados eliminados correctamente'
        ]);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}

// ---------- ASISTENTE ELECTORAL DE PDF LOCAL ----------

function handle_admin_parse_pdf() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    if (empty($_FILES['pdf']['tmp_name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No se subió ningún archivo PDF para analizar.']);
        return;
    }

    require_once __DIR__ . '/../utils/pdf_extractor.php';
    $tmpFile = $_FILES['pdf']['tmp_name'];

    // 1. Extraer texto plano nativo
    $rawText = PdfExtractor::extract_text($tmpFile);

    // 2. Analizar y cruzar con padrón
    $analysis = PdfExtractor::analyze_document($rawText);

    // 3. Guardar el archivo PDF localmente en static/docs
    $savedPath = FileManager::save_candidate_doc($_FILES['pdf']);
    if ($savedPath) {
        $analysis['pdf_url'] = "/static/{$savedPath}";
        $analysis['pdf_path'] = $savedPath;
    } else {
        $analysis['pdf_url'] = null;
        $analysis['pdf_path'] = null;
    }

    echo json_encode([
        'success' => true,
        'data' => $analysis
    ]);
}

// ---------- EXPORTACIÓN AUDITORÍA Y TICKETS ----------

function handle_export_audit() {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="padron_auditoria_cata_' . date('Y-m-d_His') . '.csv"');
    header('Pragma: no-cache');
    header('Expires: 0');

    $salida = fopen('php://output', 'w');
    fprintf($salida, chr(0xEF).chr(0xBB).chr(0xBF));

    fputcsv($salida, ['CÓDIGO_SECRETO', 'DNI', 'CÓD_ORIGINAL', 'APELLIDOS_Y_NOMBRES', 'SEDE', 'SALON_NGS', 'ESTADO_VOTO', 'FECHA_HORA_VOTO']);

    $voters = getAllVoters();
    foreach ($voters as $v) {
        fputcsv($salida, [
            $v['codigo'],
            $v['dni'] ?? '',
            $v['codigo_original'] ?? '',
            $v['nombre'],
            $v['sede'] ?? 'Sede Principal',
            $v['ngs'] ?? '',
            $v['ha_votado'] ? 'YA VOTO' : 'PENDIENTE',
            $v['fecha_voto'] ?? ''
        ]);
    }

    fclose($salida);
    exit;
}

// ---------- GESTIÓN DEL ESTADO DE LA ELECCIÓN ----------

function handle_admin_election_state() {
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        echo json_encode(getInfoEleccion());
        return;
    }
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $nuevoEstado = strtoupper(trim($input['estado'] ?? ''));
        $descripcion = trim($input['descripcion'] ?? '');

        try {
            setEstadoEleccion($nuevoEstado, $descripcion);
            echo json_encode([
                'success' => true,
                'message' => "Estado de elección actualizado a: {$nuevoEstado}",
                'info' => getInfoEleccion()
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        }
        return;
    }
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}