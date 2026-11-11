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
        usleep(200000); // Mitigación contra ataques de fuerza bruta automatizados
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
        $nivel = isset($_GET['nivel']) ? trim($_GET['nivel']) : null;
        $stats = StatsManager::get_dashboard_stats($sede, $ngs, $nivel);
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
        $nivel = isset($_GET['nivel']) ? trim($_GET['nivel']) : null;
        $estado = isset($_GET['estado']) ? trim($_GET['estado']) : 'todos';
        $search = isset($_GET['search']) ? trim($_GET['search']) : null;

        $resultado = getStudentsFiltered($sede, $ngs, $estado, $search, $nivel);
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

    $sedeDefault = !empty($input['sede']) ? trim($input['sede']) : (!empty($input['sede_default']) ? trim($input['sede_default']) : 'Sede Central');

    try {
        $resultado = importarLoteAlumnos($input['alumnos'], $sedeDefault);
        echo json_encode([
            'success' => true,
            'message' => "Proceso completado en {$resultado['sede']}: {$resultado['insertados']} alumnos nuevos registrados y {$resultado['actualizados']} actualizados.",
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
                   'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_emprendimiento_foto',
                   'regidor_derechos_foto', 'regidor_comunicacion_foto'];
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
                   'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_emprendimiento_foto',
                   'regidor_derechos_foto', 'regidor_comunicacion_foto'];
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
        'regidor_emprendimiento' => $c['regidor_emprendimiento'] ?? null,
        'regidor_derechos' => $c['regidor_derechos'] ?? null,
        'regidor_comunicacion' => $c['regidor_comunicacion'] ?? null,
        'sede' => $c['sede'] ?? 'Sede Principal',
        'nivel' => $c['nivel'] ?? 'General',
        'color' => $c['color'] ?? null,
        'token_registro' => $c['token_registro'] ?? null,
        'estado_registro' => $c['estado_registro'] ?? 'aprobado',
        'numero_lista' => $c['numero_lista'] ?? null,
        'alcalde_grado' => $c['alcalde_grado'] ?? null,
        'teniente_grado' => $c['teniente_grado'] ?? null,
        'regidor_educacion_grado' => $c['regidor_educacion_grado'] ?? null,
        'regidor_salud_grado' => $c['regidor_salud_grado'] ?? null,
        'regidor_emprendimiento_grado' => $c['regidor_emprendimiento_grado'] ?? null,
        'regidor_derechos_grado' => $c['regidor_derechos_grado'] ?? null,
        'regidor_comunicacion_grado' => $c['regidor_comunicacion_grado'] ?? null,
        'responsable_entrega' => $c['responsable_entrega'] ?? null,
        'telefono_responsable' => $c['telefono_responsable'] ?? null,
        'fecha_generacion' => $c['fecha_generacion'] ?? null,
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
        $sede = isset($_GET['sede']) ? trim($_GET['sede']) : 'todos';
        $nivel = isset($_GET['nivel']) ? trim($_GET['nivel']) : null;
        $candidatos = getAllCandidatos($sede, $nivel);
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
        $textFields = [
            'slogan', 'propuestas', 'alcalde', 'teniente', 
            'regidor_educacion', 'regidor_salud', 'regidor_emprendimiento', 'regidor_derechos', 'regidor_comunicacion', 
            'sede', 'nivel', 'color', 'token_registro', 'estado_registro', 'numero_lista',
            'alcalde_grado', 'teniente_grado', 'regidor_educacion_grado', 'regidor_salud_grado',
            'regidor_emprendimiento_grado', 'regidor_derechos_grado', 'regidor_comunicacion_grado'
        ];
        foreach ($textFields as $tf) {
            if (isset($_POST[$tf])) $extras[$tf] = trim($_POST[$tf]);
        }
        // Fotos de miembros y documentos
        $fotoExtraFields = ['logo', 'alcalde_foto', 'teniente_foto', 
                            'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_emprendimiento_foto',
                            'regidor_derechos_foto', 'regidor_comunicacion_foto', 'propuestas_pdf'];
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
                if (isset($raw['color'])) $extras['color'] = trim($raw['color']);
            }
        }

        // Procesar archivos subidos
        $fotos = _process_candidate_files();
        $fotoRelativa = $fotos['foto'] ?? null;

        // Construir extras
        $extras = [];
        $textFields = [
            'slogan', 'propuestas', 'alcalde', 'teniente', 
            'regidor_educacion', 'regidor_salud', 'regidor_emprendimiento', 'regidor_derechos', 'regidor_comunicacion', 
            'sede', 'nivel', 'color', 'token_registro', 'estado_registro', 'numero_lista',
            'alcalde_grado', 'teniente_grado', 'regidor_educacion_grado', 'regidor_salud_grado',
            'regidor_emprendimiento_grado', 'regidor_derechos_grado', 'regidor_comunicacion_grado'
        ];
        foreach ($textFields as $tf) {
            if (isset($_POST[$tf])) $extras[$tf] = trim($_POST[$tf]);
        }
        $fotoExtraFields = ['logo', 'alcalde_foto', 'teniente_foto', 
                            'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_emprendimiento_foto',
                            'regidor_derechos_foto', 'regidor_comunicacion_foto', 'propuestas_pdf'];
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
        $c = getCandidatoById($id);
        if ($c && (preg_match('/blanco/i', $c['nombre'] ?? '') || preg_match('/nulo/i', $c['nombre'] ?? ''))) {
            http_response_code(400);
            echo json_encode([
                'error' => 'No es posible eliminar la opción oficial del sistema (Voto en Blanco / Nulo), ya que es un requisito electoral obligatorio en todas las cédulas.'
            ]);
            return;
        }
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

function handle_admin_candidato_generar_token() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $responsable = !empty($input['responsable']) ? trim($input['responsable']) : (!empty($input['responsable_entrega']) ? trim($input['responsable_entrega']) : null);
    $telefono = !empty($input['telefono']) ? trim($input['telefono']) : (!empty($input['telefono_responsable']) ? trim($input['telefono_responsable']) : null);
    $sede = !empty($input['sede']) ? trim($input['sede']) : 'Sede Central';
    $nivel = !empty($input['nivel']) ? trim($input['nivel']) : 'Primaria';
    $nombre = !empty($input['nombre']) ? trim($input['nombre']) : ($responsable ? "Lista de {$responsable}" : 'Lista en Postulación');

    $resultado = generarTokenPostulacion($sede, $nivel, $nombre, $responsable, $telefono);

    $baseUrl = get_base_url();
    $enlace = rtrim($baseUrl, '/') . '/postular/' . $resultado['token'];

    echo json_encode([
        'success' => true,
        'message' => 'Enlace de postulación generado con éxito',
        'candidato_id' => $resultado['id'],
        'token' => $resultado['token'],
        'enlace' => $enlace,
        'sede' => $resultado['sede'],
        'nivel' => $resultado['nivel'],
        'nombre' => $resultado['nombre'],
        'responsable_entrega' => $resultado['responsable_entrega'],
        'telefono_responsable' => $resultado['telefono_responsable'],
        'fecha_generacion' => $resultado['fecha_generacion']
    ]);
}

function handle_admin_candidato_aprobar($id) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    $id = (int)$id;
    if (!candidatoExists($id)) {
        http_response_code(404);
        echo json_encode(['error' => 'Candidato no encontrado']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $extras = [
        'estado_registro' => 'aprobado'
    ];
    if (isset($input['numero_lista'])) {
        $extras['numero_lista'] = (int)$input['numero_lista'];
    }
    if (!empty($input['color'])) {
        $extras['color'] = trim($input['color']);
    }

    updateCandidato($id, null, null, null, $extras);

    $c = getCandidatoById($id);
    echo json_encode([
        'success' => true,
        'message' => 'Lista aprobada oficialmente para la Cédula de Votación',
        'candidato' => _candidato_to_response($c)
    ]);
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

    $sede = isset($_GET['sede']) ? trim($_GET['sede']) : 'todos';
    $ngs = isset($_GET['ngs']) ? trim($_GET['ngs']) : 'todos';

    $safeNgs = ($ngs !== 'todos') ? preg_replace('/[^a-zA-Z0-9_-]/', '_', $ngs) : 'TODOS';
    $filename = 'padron_auditoria_' . strtolower($safeNgs) . '_' . date('Y-m-d_His') . '.csv';

    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Pragma: no-cache');
    header('Expires: 0');

    $salida = fopen('php://output', 'w');
    // BOM UTF-8 para Excel
    fprintf($salida, chr(0xEF).chr(0xBB).chr(0xBF));

    // Usar punto y coma (;) como delimitador estándar para que Excel en Windows/Español lo divida en columnas automáticamente
    fputcsv($salida, ['N°', 'ESTADO_VOTO', 'FECHA_HORA_VOTO', 'APELLIDOS_Y_NOMBRES', 'DNI', 'SALON_NGS', 'GRADO', 'SECCION', 'SEDE'], ';');

    $voters = getAllVoters($sede, $ngs);
    $num = 1;
    foreach ($voters as $v) {
        $grado = $v['grado'] ?? '';
        $seccion = $v['seccion'] ?? '';
        if (!$grado || !$seccion) {
            $ngsUpper = mb_strtoupper($v['ngs'] ?? '', 'UTF-8');
            if (!$grado) {
                if (strpos($ngsUpper, 'PRIMER') !== false || preg_match('/\b1\b|1°|1º/u', $ngsUpper)) $grado = '1°';
                elseif (strpos($ngsUpper, 'SEGUND') !== false || preg_match('/\b2\b|2°|2º/u', $ngsUpper)) $grado = '2°';
                elseif (strpos($ngsUpper, 'TERCER') !== false || preg_match('/\b3\b|3°|3º/u', $ngsUpper)) $grado = '3°';
                elseif (strpos($ngsUpper, 'CUART') !== false || preg_match('/\b4\b|4°|4º/u', $ngsUpper)) $grado = '4°';
                elseif (strpos($ngsUpper, 'QUINT') !== false || preg_match('/\b5\b|5°|5º/u', $ngsUpper)) $grado = '5°';
                elseif (strpos($ngsUpper, 'SEXT') !== false || preg_match('/\b6\b|6°|6º/u', $ngsUpper)) $grado = '6°';
            }
            if (!$seccion) {
                if (preg_match('/(?:SECCI[OÓ]N|SEC\.?|AULA)\s*[:\-]?\s*([A-E])\b/u', $ngsUpper, $sm)) {
                    $seccion = $sm[1];
                } elseif (preg_match('/[1-6]\s*[\-_°º]?\s*([A-E])\b/u', $ngsUpper, $sm)) {
                    $seccion = $sm[1];
                } else {
                    $seccion = 'ÚNICA';
                }
            }
        }

        fputcsv($salida, [
            $num++,
            $v['ha_votado'] ? 'YA VOTO' : 'PENDIENTE',
            $v['fecha_voto'] ?? '-',
            $v['nombre'],
            $v['dni'] ?? ($v['codigo'] ?? '-'),
            $v['ngs'] ?? '',
            $grado,
            $seccion,
            $v['sede'] ?? 'Sede Central'
        ], ';');
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

function handle_admin_jornadas() {
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        echo json_encode([
            'success' => true,
            'jornadas' => getJornadasConfig()
        ]);
        return;
    }
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $jornada = trim($input['jornada'] ?? '');
        $activo = !empty($input['activo']);
        try {
            setJornadaStatus($jornada, $activo);
            echo json_encode([
                'success' => true,
                'message' => "Jornada '{$jornada}' actualizada correctamente.",
                'jornadas' => getJornadasConfig()
            ]);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        }
        return;
    }
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}

// ---------- MANTENIMIENTO Y PUESTA A CERO ELECTORAL ----------

function handle_admin_reset($adminActual) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos de solicitud inválidos.']);
        return;
    }

    $password = $input['password'] ?? '';
    $confirmPhrase = trim($input['confirm_phrase'] ?? '');
    $action = strtolower(trim($input['action'] ?? '')); // 'urna', 'candidatos', 'padron', 'total'
    $sedeTarget = strtolower(trim($input['sede'] ?? 'central')); // 'central', 'jerusalen', 'ambas'

    // 1. Doble autenticación de seguridad: Validar contraseña del administrador actual
    $adminDb = db_query('SELECT password_hash FROM admins WHERE id = :id', ['id' => $adminActual['id']])->fetch();
    if (!$adminDb || !password_verify($password, $adminDb['password_hash'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Contraseña docente incorrecta. Operación cancelada por seguridad.']);
        return;
    }

    // 2. Doble autenticación de seguridad: Validar frase de confirmación exacta "Eliminar"
    if ($confirmPhrase !== 'Eliminar') {
        http_response_code(400);
        echo json_encode(['error' => 'Frase de confirmación incorrecta. Debe escribir exactamente "Eliminar" (con la E mayúscula y el resto en minúsculas).']);
        return;
    }

    // 3. Validar acción
    if (!in_array($action, ['urna', 'candidatos', 'padron', 'total'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Acción de limpieza no reconocida.']);
        return;
    }

    // 4. Determinar sedes a procesar
    $sedes = [];
    if ($sedeTarget === 'ambas' || $sedeTarget === 'todos') {
        $sedes = ['central', 'jerusalen'];
    } elseif ($sedeTarget === 'jerusalen') {
        $sedes = ['jerusalen'];
    } else {
        $sedes = ['central'];
    }

    // 5. Generar Respaldo Automático Previo (Salvavidas)
    $backupDir = DATA_DIR . '/backups';
    if (!is_dir($backupDir)) {
        @mkdir($backupDir, 0777, true);
    }
    $ts = date('Ymd_His');
    foreach ($sedes as $s) {
        $dbFile = ($s === 'jerusalen') ? DB_FILE_JERUSALEN : DB_FILE_CENTRAL;
        if (file_exists($dbFile)) {
            $backupFile = "{$backupDir}/backup_{$s}_pre_{$action}_{$ts}.db";
            @copy($dbFile, $backupFile);
        }
    }

    // 6. Ejecutar la acción solicitada por cada sede
    $mensajes = [];

    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    foreach ($sedes as $s) {
        $sedeNombre = normalize_sede_name($s);
        $sedePat = ($s === 'jerusalen') ? '%Jerusal%' : '%Central%';

        if ($action === 'urna') {
            if ($isMysql && !$separateDbs) {
                db_query('DELETE FROM votos WHERE sede LIKE :pat OR sede IS NULL', ['pat' => $sedePat]);
                db_query('UPDATE voters SET ha_votado = 0, fecha_voto = NULL WHERE sede LIKE :pat OR sede IS NULL', ['pat' => $sedePat]);
            } else {
                db_query('DELETE FROM votos', [], $s);
                db_query('UPDATE voters SET ha_votado = 0, fecha_voto = NULL', [], $s);
                if (DB_DRIVER !== 'mysql') { db_query('VACUUM', [], $s); }
            }
            $mensajes[] = "Urna vaciada en {$sedeNombre}: votos en cero y padrón listo para votar.";
        }

        if ($action === 'candidatos' || $action === 'total') {
            if ($isMysql && !$separateDbs) {
                db_query('DELETE FROM votos WHERE sede LIKE :pat OR sede IS NULL', ['pat' => $sedePat]);
                db_query('UPDATE voters SET ha_votado = 0, fecha_voto = NULL WHERE sede LIKE :pat OR sede IS NULL', ['pat' => $sedePat]);
                if ($action === 'total') {
                    db_query('DELETE FROM voters WHERE sede LIKE :pat OR sede IS NULL', ['pat' => $sedePat]);
                }
                // Eliminar listas de candidatos preservando la opción de Voto en Blanco
                if ($sedeTarget === 'ambas' || $sedeTarget === 'todos' || $sedeTarget === 'todas') {
                    db_query("DELETE FROM candidatos WHERE LOWER(nombre) NOT LIKE '%blanco%' AND LOWER(nombre) NOT LIKE '%nulo%'");
                } else {
                    db_query("DELETE FROM candidatos WHERE (sede LIKE :pat OR sede IS NULL) AND LOWER(nombre) NOT LIKE '%blanco%' AND LOWER(nombre) NOT LIKE '%nulo%'", ['pat' => $sedePat]);
                }
            } else {
                db_query('DELETE FROM votos', [], $s);
                db_query('UPDATE voters SET ha_votado = 0, fecha_voto = NULL', [], $s);
                if ($action === 'total') {
                    db_query('DELETE FROM voters', [], $s);
                }
                db_query("DELETE FROM candidatos WHERE LOWER(nombre) NOT LIKE '%blanco%' AND LOWER(nombre) NOT LIKE '%nulo%'", [], $s);
                if (DB_DRIVER !== 'mysql') { db_query('VACUUM', [], $s); }
            }

            // Garantizar que exista EXACTAMENTE UN único Voto en Blanco universal (sin duplicados)
            $blancos = db_query("SELECT id FROM candidatos WHERE LOWER(nombre) LIKE '%blanco%' ORDER BY (CASE WHEN logo IS NOT NULL AND logo != '' THEN 0 ELSE 1 END), id ASC")->fetchAll(PDO::FETCH_COLUMN);
            if (empty($blancos)) {
                insertCandidato('Voto en Blanco', 'Opción cívica democrática', null, [
                    'sede' => 'Universal',
                    'nivel' => 'General',
                    'color' => '#1B3A8C'
                ]);
            } else {
                // Si hubiera más de uno, conservar el primero (con logo preferente) y podar los demás
                if (count($blancos) > 1) {
                    $keepId = array_shift($blancos);
                    foreach ($blancos as $delId) {
                        db_query("DELETE FROM candidatos WHERE id = :id", ['id' => $delId]);
                    }
                }
                db_query("UPDATE candidatos SET sede = 'Universal', nivel = 'General' WHERE LOWER(nombre) LIKE '%blanco%'");
            }

            if ($action === 'candidatos') {
                $mensajes[] = "Candidatos eliminados en {$sedeNombre}. Se conservó únicamente el Voto en Blanco oficial.";
            } else {
                $mensajes[] = "Reset Total ejecutado en {$sedeNombre}: sistema limpio y virgen para la elección.";
            }
        }

        if ($action === 'padron') {
            if ($isMysql && !$separateDbs) {
                db_query('DELETE FROM votos WHERE sede LIKE :pat OR sede IS NULL', ['pat' => $sedePat]);
                db_query('DELETE FROM voters WHERE sede LIKE :pat OR sede IS NULL', ['pat' => $sedePat]);
            } else {
                db_query('DELETE FROM votos', [], $s);
                db_query('DELETE FROM voters', [], $s);
                if (DB_DRIVER !== 'mysql') { db_query('VACUUM', [], $s); }
            }
            $mensajes[] = "Padrón electoral vaciado por completo en {$sedeNombre}.";
        }
    }

    echo json_encode([
        'success' => true,
        'action' => $action,
        'sede' => $sedeTarget,
        'timestamp' => $ts,
        'mensajes' => $mensajes,
        'message' => implode(' | ', $mensajes)
    ]);
}

// ---------- ESTADO Y MIGRACIÓN UNIVERSAL MYSQL ----------

function handle_admin_db_status() {
    $driver = DB_DRIVER;
    $info = [
        'driver' => $driver,
        'separate_dbs' => defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS,
        'mysql_configured' => [
            'host' => DB_HOST,
            'port' => DB_PORT,
            'database' => DB_NAME,
            'user' => DB_USER
        ]
    ];

    try {
        $votersCount = (int)db_query("SELECT COUNT(*) FROM voters")->fetchColumn();
        $candidatesCount = (int)db_query("SELECT COUNT(*) FROM candidatos")->fetchColumn();
        $votesCount = (int)db_query("SELECT COUNT(*) FROM votos")->fetchColumn();
        $adminsCount = (int)db_query("SELECT COUNT(*) FROM admins")->fetchColumn();

        $info['status'] = 'CONNECTED';
        $info['counts'] = [
            'voters' => $votersCount,
            'candidates' => $candidatesCount,
            'votes' => $votesCount,
            'admins' => $adminsCount
        ];
    } catch (Exception $e) {
        $info['status'] = 'ERROR';
        $info['error'] = $e->getMessage();
    }

    echo json_encode($info);
}

function handle_admin_migrate_mysql() {
    require_once __DIR__ . '/../migrate_sqlite_to_mysql.php';
    try {
        $resultado = ejecutarMigracionSqliteAMysql(['verbose' => false]);
        echo json_encode($resultado);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Error durante la migración a MySQL: ' . $e->getMessage()
        ]);
    }
}

/**
 * Genera los datos oficiales para las Actas Electorales (Sufragio y Escrutinio)
 * según el estándar oficial ONPE / MINEDU.
 */
function handle_admin_acta() {
    $ambito = strtolower(trim($_GET['ambito'] ?? 'central_primaria'));

    // Configuración según ámbito y comités oficiales
    $configAmbito = [
        'central_primaria' => [
            'id' => 'central_primaria',
            'sede' => 'central',
            'nivel' => 'Primaria',
            'titulo' => 'ELECCIONES MUNICIPIO ESCOLAR 2026',
            'subtitulo' => 'SEDE CENTRAL · NIVEL PRIMARIA',
            'mesa' => '030391-PRI',
            'jornada_label' => 'DÍA 1 (PRIMARIA CENTRAL)',
            'comite_docente' => [
                ['cargo' => 'PRESIDENTE', 'nombre' => 'LIC. ADEMER HUAHUACONDORI ARANDA'],
                ['cargo' => 'VICEPRESIDENTE', 'nombre' => 'LIC. VERONICA QUISPE NINA'],
                ['cargo' => 'SECRETARIA', 'nombre' => 'LIC. LISBETH OLARTE QUISPE'],
                ['cargo' => 'VOCAL', 'nombre' => 'LIC. BERTHA CHAMBI CONDORI']
            ],
            'comite_estudiantil' => [
                ['cargo' => 'PRESIDENTE DE MESA', 'nombre' => ''],
                ['cargo' => 'VICEPRESIDENTE', 'nombre' => ''],
                ['cargo' => 'SECRETARIO(A)', 'nombre' => ''],
                ['cargo' => 'VOCAL', 'nombre' => '']
            ]
        ],
        'jerusalen' => [
            'id' => 'jerusalen',
            'sede' => 'jerusalen',
            'nivel' => 'General',
            'titulo' => 'ELECCIONES MUNICIPIO ESCOLAR 2026',
            'subtitulo' => 'SEDE JERUSALÉN · ELECCIÓN GENERAL',
            'mesa' => '030392-JER',
            'jornada_label' => 'DÍA 1 (SEDE JERUSALÉN)',
            'comite_docente' => [
                ['cargo' => 'PRESIDENTE', 'nombre' => 'LIC. CARLOS ALBERTO JUÁREZ LUQUE'],
                ['cargo' => 'SECRETARIA', 'nombre' => 'LIC. SARA LIZBETH HANCCO SANCHO']
            ],
            'comite_estudiantil' => [
                ['cargo' => 'PRESIDENTE DE MESA', 'nombre' => ''],
                ['cargo' => 'SECRETARIA', 'nombre' => ''],
                ['cargo' => 'VOCAL', 'nombre' => '']
            ]
        ],
        'central_secundaria' => [
            'id' => 'central_secundaria',
            'sede' => 'central',
            'nivel' => 'Secundaria',
            'titulo' => 'ELECCIONES MUNICIPIO ESCOLAR 2026',
            'subtitulo' => 'SEDE CENTRAL · NIVEL SECUNDARIA',
            'mesa' => '030393-SEC',
            'jornada_label' => 'DÍA 2 (COLEGIO SECUNDARIA)',
            'comite_docente' => [
                ['cargo' => 'PRESIDENTE', 'nombre' => 'LIC. DUBERLY ENRIQUE PARI PARI'],
                ['cargo' => 'VICEPRESIDENTE', 'nombre' => 'LIC. MOISÉS CONDORI CUSI'],
                ['cargo' => 'SECRETARIO', 'nombre' => 'LIC. JHON DENNYS RODRIGO LÓPEZ'],
                ['cargo' => 'VOCAL', 'nombre' => 'LIC. IRIS VANESA QUISPE LARICO']
            ],
            'comite_estudiantil' => [
                ['cargo' => 'PRESIDENTE DE MESA', 'nombre' => 'HEYDI LUZ CHAMBI MAMANI'],
                ['cargo' => 'VICEPRESIDENTE', 'nombre' => 'VIVIAN MENDOZA CABRERA'],
                ['cargo' => 'SECRETARIO(A)', 'nombre' => 'HELEN EVOLETH MOSCAIRO CHALLAPA'],
                ['cargo' => 'VOCAL', 'nombre' => 'ARTHUR HANDE ARAPA MOLLOCONDO']
            ]
        ]
    ];

    if (!isset($configAmbito[$ambito])) {
        $ambito = 'central_primaria';
    }

    $cfg = $configAmbito[$ambito];
    $slug = $cfg['sede'];
    $nivel = $cfg['nivel'];
    set_active_db($slug);

    // Electores hábiles y sufragantes
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $sedePattern = ($slug === 'jerusalen') ? '%Jerusal%' : '%Central%';
        $nivelCondition = ($slug === 'jerusalen') ? "1=1" : "LOWER(nivel) = '" . strtolower($nivel) . "'";

        $totalHabiles = (int)db_query("SELECT COUNT(*) FROM voters WHERE (sede LIKE :s OR sede IS NULL) AND {$nivelCondition}", ['s' => $sedePattern])->fetchColumn();
        $totalVotaron = (int)db_query("SELECT COUNT(*) FROM voters WHERE (sede LIKE :s OR sede IS NULL) AND {$nivelCondition} AND ha_votado = 1", ['s' => $sedePattern])->fetchColumn();
    } else {
        $nivelCondition = ($slug === 'jerusalen') ? "1=1" : "LOWER(nivel) = '" . strtolower($nivel) . "'";
        $totalHabiles = (int)db_query("SELECT COUNT(*) FROM voters WHERE {$nivelCondition}")->fetchColumn();
        $totalVotaron = (int)db_query("SELECT COUNT(*) FROM voters WHERE {$nivelCondition} AND ha_votado = 1")->fetchColumn();
    }

    $noUtilizadas = max(0, $totalHabiles - $totalVotaron);

    // Obtener listas y votos
    $candFilter = [
        'sede' => ($slug === 'jerusalen') ? 'Sede Jerusalén' : 'Sede Central',
        'nivel' => $nivel
    ];
    $candidatosRaw = getAllCandidatos($candFilter['sede'], $candFilter['nivel']);

    $listas = [];
    $votoBlanco = 0;
    $votoNulo = 0;
    $logoBlanco = null;
    $logoNulo = null;
    $votosEmitidosTotal = 0;

    foreach ($candidatosRaw as $c) {
        $cid = (int)$c['id'];
        
        $whereV = ['candidato_id = :cid'];
        $paramsV = ['cid' => $cid];

        if ($isMysql && !$separateDbs) {
            $whereV[] = ($slug === 'jerusalen') ? "sede LIKE '%Jerusal%'" : "(sede LIKE '%Central%' OR sede IS NULL)";
            if ($slug === 'central' && $nivel && $nivel !== 'todos') {
                $whereV[] = "LOWER(nivel) = :v_nivel";
                $paramsV['v_nivel'] = strtolower($nivel);
            }
        } else {
            if ($slug === 'central' && $nivel && $nivel !== 'todos') {
                $whereV[] = "LOWER(nivel) = :v_nivel";
                $paramsV['v_nivel'] = strtolower($nivel);
            }
        }

        $votosCount = (int)db_query(
            "SELECT COUNT(*) FROM votos WHERE " . implode(' AND ', $whereV),
            $paramsV,
            $slug
        )->fetchColumn();

        $nombreCand = trim($c['nombre'] ?? '');
        $votosEmitidosTotal += $votosCount;

        if (preg_match('/blanco/i', $nombreCand)) {
            $votoBlanco += $votosCount;
            if (!empty($c['logo'])) {
                $logoBlanco = $c['logo'];
            } elseif (!empty($c['foto'])) {
                $logoBlanco = $c['foto'];
            }
        } elseif (preg_match('/nulo/i', $nombreCand)) {
            $votoNulo += $votosCount;
            if (!empty($c['logo'])) {
                $logoNulo = $c['logo'];
            } elseif (!empty($c['foto'])) {
                $logoNulo = $c['foto'];
            }
        } else {
            $listas[] = [
                'id' => $c['id'],
                'numero' => $c['numero_lista'] ?: (count($listas) + 1),
                'nombre' => $c['nombre'],
                'alcalde' => $c['alcalde'] ?? '',
                'slogan' => $c['slogan'] ?? '',
                'logo' => $c['logo'] ?? $c['foto'] ?? null,
                'votos' => $votosCount
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'ambito' => $cfg,
        'fecha' => date('d/m/Y'),
        'fecha_texto' => date('d') . ' de Noviembre de 2026',
        'cifras' => [
            'electores_habiles' => $totalHabiles,
            'ciudadanos_votaron' => $totalVotaron,
            'cedulas_no_utilizadas' => $noUtilizadas,
            'votos_blanco' => $votoBlanco,
            'votos_nulo' => $votoNulo,
            'votos_impugnados' => 0,
            'logo_blanco' => $logoBlanco,
            'logo_nulo' => $logoNulo,
            'total_votos_emitidos' => $votosEmitidosTotal
        ],
        'listas' => $listas,
        'comite_docente' => $cfg['comite_docente'],
        'comite_estudiantil' => $cfg['comite_estudiantil']
    ]);
}