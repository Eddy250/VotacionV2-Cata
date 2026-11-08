<?php
// routes/postulacion.php - Auto-Registro Seguro de Candidatos CATA 2026
require_once __DIR__ . '/../models.php';
require_once __DIR__ . '/../utils/file_manager.php';

function _candidato_postulacion_response($c) {
    $baseUrl = get_base_url();
    $fotoFields = [
        'foto', 'logo', 'alcalde_foto', 'teniente_foto',
        'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_emprendimiento_foto',
        'regidor_derechos_foto', 'regidor_comunicacion_foto'
    ];

    $item = [
        'id' => (int)$c['id'],
        'nombre' => $c['nombre'] ?? '',
        'descripcion' => $c['descripcion'] ?? '',
        'slogan' => $c['slogan'] ?? '',
        'propuestas' => $c['propuestas'] ?? '',
        'color' => $c['color'] ?? '#1B3A8C',
        'sede' => $c['sede'] ?? 'Sede Central',
        'nivel' => $c['nivel'] ?? 'Primaria',
        'token_registro' => $c['token_registro'] ?? '',
        'estado_registro' => $c['estado_registro'] ?? 'borrador',
        'numero_lista' => $c['numero_lista'] ?? null,
        'alcalde' => $c['alcalde'] ?? '',
        'alcalde_grado' => $c['alcalde_grado'] ?? '',
        'teniente' => $c['teniente'] ?? '',
        'teniente_grado' => $c['teniente_grado'] ?? '',
        'regidor_educacion' => $c['regidor_educacion'] ?? '',
        'regidor_educacion_grado' => $c['regidor_educacion_grado'] ?? '',
        'regidor_salud' => $c['regidor_salud'] ?? '',
        'regidor_salud_grado' => $c['regidor_salud_grado'] ?? '',
        'regidor_emprendimiento' => $c['regidor_emprendimiento'] ?? '',
        'regidor_emprendimiento_grado' => $c['regidor_emprendimiento_grado'] ?? '',
        'regidor_derechos' => $c['regidor_derechos'] ?? '',
        'regidor_derechos_grado' => $c['regidor_derechos_grado'] ?? '',
        'regidor_comunicacion' => $c['regidor_comunicacion'] ?? '',
        'regidor_comunicacion_grado' => $c['regidor_comunicacion_grado'] ?? '',
        'responsable_entrega' => $c['responsable_entrega'] ?? null,
        'fecha_generacion' => $c['fecha_generacion'] ?? null,
        'es_editable' => ($c['estado_registro'] !== 'aprobado')
    ];

    foreach ($fotoFields as $f) {
        $raw = $c[$f] ?? null;
        if ($raw) {
            $clean = preg_replace('#^/*(static/)+#i', '', trim($raw));
            $clean = ltrim($clean, '/');
            $item[$f] = $clean;
            $item[$f . '_url'] = rtrim($baseUrl, '/') . '/static/' . $clean;
        } else {
            $item[$f] = null;
            $item[$f . '_url'] = null;
        }
    }
    return $item;
}

function _obtener_grados_disponibles($sede, $nivel) {
    $sedeSlug = normalize_sede_slug($sede ?: 'central');
    $isSecundaria = (stripos($nivel, 'sec') !== false);
    $isPrimaria = (stripos($nivel, 'prim') !== false);

    // 1. Grados base estándares (Perú)
    $gradosBase = [];
    if ($isSecundaria) {
        $gradosBase = [
            '1° SEC A', '1° SEC B', '1° SEC C',
            '2° SEC A', '2° SEC B', '2° SEC C',
            '3° SEC A', '3° SEC B', '3° SEC C',
            '4° SEC A', '4° SEC B', '4° SEC C',
            '5° SEC A', '5° SEC B', '5° SEC C'
        ];
    } elseif ($isPrimaria) {
        $gradosBase = [
            '1° PRIM A', '1° PRIM B',
            '2° PRIM A', '2° PRIM B',
            '3° PRIM A', '3° PRIM B',
            '4° PRIM A', '4° PRIM B',
            '5° PRIM A', '5° PRIM B',
            '6° PRIM A', '6° PRIM B'
        ];
    } else {
        $gradosBase = [
            '1° SEC A', '1° SEC B', '2° SEC A', '2° SEC B', '3° SEC A', '3° SEC B',
            '4° SEC A', '4° SEC B', '5° SEC A', '5° SEC B',
            '5° PRIM A', '6° PRIM A'
        ];
    }

    // 2. Extraer del padrón real de voters si existen secciones importadas
    $gradosPadron = [];
    try {
        $sql = "SELECT DISTINCT grado, seccion, ngs FROM voters WHERE (grado IS NOT NULL AND grado != '') OR (ngs IS NOT NULL AND ngs != '')";
        if ($isSecundaria) {
            $sql .= " AND (LOWER(nivel) = 'secundaria' OR grado LIKE '%SEC%')";
        } elseif ($isPrimaria) {
            $sql .= " AND (LOWER(nivel) = 'primaria' OR grado IN ('1°','2°','3°','4°','5°','6°'))";
        }
        $sql .= " ORDER BY grado ASC, seccion ASC";

        $stmt = db_query($sql, [], $sedeSlug);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $g = trim($r['grado'] ?? '');
            $s = trim($r['seccion'] ?? '');
            $ngs = trim($r['ngs'] ?? '');
            
            $tag = $isSecundaria ? 'SEC' : ($isPrimaria ? 'PRIM' : '');
            $formatted = '';

            if ($g && $s && $s !== 'ÚNICA') {
                $formatted = $tag ? "{$g} {$tag} {$s}" : "{$g} {$s}";
            } elseif ($g) {
                $formatted = $tag ? "{$g} {$tag} A" : "{$g} A";
            } elseif ($ngs) {
                $formatted = $ngs;
            }

            if ($formatted && !in_array($formatted, $gradosPadron)) {
                $gradosPadron[] = $formatted;
            }
        }
    } catch (Exception $e) {}

    if (!empty($gradosPadron) && count($gradosPadron) >= 3) {
        return array_values(array_unique(array_merge($gradosPadron, $gradosBase)));
    }

    return $gradosBase;
}

function handle_postulacion_info() {
    $token = trim($_GET['token'] ?? '');
    if (!$token) {
        http_response_code(400);
        echo json_encode(['error' => 'Se requiere el token de postulación']);
        return;
    }

    $candidato = getCandidatoByToken($token);
    if (!$candidato) {
        http_response_code(404);
        echo json_encode(['error' => 'Enlace de postulación no válido o lista inexistente. Solicita un nuevo enlace al Comité Electoral.']);
        return;
    }

    $gradosSugeridos = _obtener_grados_disponibles($candidato['sede'] ?? '', $candidato['nivel'] ?? '');

    echo json_encode([
        'success' => true,
        'candidato' => _candidato_postulacion_response($candidato),
        'grados_sugeridos' => $gradosSugeridos
    ]);
}

function handle_postulacion_buscar_alumno() {
    $token = trim($_GET['token'] ?? '');
    $query = trim($_GET['query'] ?? '');
    if (!$token) {
        http_response_code(400);
        echo json_encode(['error' => 'Token requerido']);
        return;
    }

    $candidato = getCandidatoByToken($token);
    if (!$candidato) {
        http_response_code(404);
        echo json_encode(['error' => 'Token no válido']);
        return;
    }

    if (strlen($query) < 2) {
        echo json_encode(['alumnos' => []]);
        return;
    }

    $sedeSlug = normalize_sede_slug($candidato['sede'] ?? 'central');
    $nivel = strtolower($candidato['nivel'] ?? 'primaria');

    // Buscar en voters
    $params = [
        'q1' => "%{$query}%",
        'q2' => "%{$query}%",
        'q3' => "%{$query}%"
    ];
    $sql = "SELECT codigo, dni, nombre, ap_paterno, ap_materno, nombres, grado, seccion, ngs, nivel, sede 
            FROM voters 
            WHERE (dni LIKE :q1 OR nombre LIKE :q2 OR ap_paterno LIKE :q3)";
    
    if ($nivel === 'primaria') {
        $sql .= " AND (LOWER(nivel) = 'primaria' OR nivel IS NULL OR grado IN ('1°','2°','3°','4°','5°','6°'))";
    } elseif ($nivel === 'secundaria') {
        $sql .= " AND (LOWER(nivel) = 'secundaria' OR grado LIKE '%SEC%')";
    }

    $sql .= " ORDER BY nombre ASC LIMIT 10";

    $stmt = db_query($sql, $params, $sedeSlug);
    $rows = $stmt->fetchAll();

    // Fallback: si no hay resultados con filtro estricto de nivel (ej. padrón sin catalogar aún), buscar general
    if (empty($rows)) {
        $sqlFallback = "SELECT codigo, dni, nombre, ap_paterno, ap_materno, nombres, grado, seccion, ngs, nivel, sede 
                        FROM voters 
                        WHERE (dni LIKE :q1 OR nombre LIKE :q2 OR ap_paterno LIKE :q3)
                        ORDER BY nombre ASC LIMIT 10";
        $stmt = db_query($sqlFallback, $params, $sedeSlug);
        $rows = $stmt->fetchAll();
    }

    $alumnos = [];
    foreach ($rows as $r) {
        $nom = trim($r['nombre'] ?? '');
        $hasNames = !empty($r['ap_paterno']) || !empty($r['nombres']);
        if (!$hasNames && (!$nom || $nom === '#' || preg_match('/^\d+$/', $nom))) {
            continue;
        }

        $gradoSec = trim(($r['grado'] ?? '') . ' ' . ($r['seccion'] ?? ''));
        if (!$gradoSec && !empty($r['ngs'])) {
            $gradoSec = $r['ngs'];
        }

        $alumnos[] = [
            'codigo' => $r['codigo'],
            'dni' => $r['dni'] ?? $r['codigo'],
            'nombre' => $r['nombre'],
            'apellidos' => trim(($r['ap_paterno'] ?? '') . ' ' . ($r['ap_materno'] ?? '')),
            'nombres' => $r['nombres'] ?? '',
            'grado' => $r['grado'] ?? '',
            'seccion' => $r['seccion'] ?? '',
            'grado_seccion' => $gradoSec
        ];
    }

    echo json_encode(['alumnos' => $alumnos]);
}

function handle_postulacion_guardar() {
    $token = trim($_POST['token'] ?? '');
    if (!$token) {
        http_response_code(400);
        echo json_encode(['error' => 'Token requerido']);
        return;
    }

    $candidato = getCandidatoByToken($token);
    if (!$candidato) {
        http_response_code(404);
        echo json_encode(['error' => 'Lista no encontrada o token no válido']);
        return;
    }

    // Bloqueo estricto una vez que el Comité Electoral aprobó la lista
    if (($candidato['estado_registro'] ?? '') === 'aprobado') {
        http_response_code(403);
        echo json_encode([
            'error' => 'Esta lista ya fue aprobada oficialmente por el Comité Electoral y sus datos están bloqueados para la votación. Si necesitas una corrección extraordinaria, comunícate con tu docente asesor.'
        ]);
        return;
    }

    $accion = trim($_POST['accion'] ?? 'borrador');
    $nuevoEstado = ($accion === 'enviar') ? 'en_revision' : 'borrador';

    // Subida de archivos
    $fotos = [];
    $fotoFields = [
        'foto', 'logo', 'alcalde_foto', 'teniente_foto',
        'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_emprendimiento_foto',
        'regidor_derechos_foto', 'regidor_comunicacion_foto'
    ];
    foreach ($fotoFields as $field) {
        if (!empty($_FILES[$field]['name'])) {
            $res = FileManager::save_candidate_photo($_FILES[$field]);
            if ($res) {
                $fotos[$field] = $res;
            }
        }
    }

    // Campos de texto editables
    $extras = [
        'estado_registro' => $nuevoEstado
    ];

    $textFields = [
        'slogan', 'propuestas', 'color',
        'alcalde', 'alcalde_grado',
        'teniente', 'teniente_grado',
        'regidor_educacion', 'regidor_educacion_grado',
        'regidor_salud', 'regidor_salud_grado',
        'regidor_emprendimiento', 'regidor_emprendimiento_grado',
        'regidor_derechos', 'regidor_derechos_grado',
        'regidor_comunicacion', 'regidor_comunicacion_grado'
    ];

    foreach ($textFields as $tf) {
        if (isset($_POST[$tf])) {
            $extras[$tf] = trim($_POST[$tf]);
        }
    }

    foreach ($fotoFields as $ff) {
        if (isset($fotos[$ff])) {
            $extras[$ff] = $fotos[$ff];
        }
    }

    $nombre = !empty($_POST['nombre']) ? trim($_POST['nombre']) : ($candidato['nombre'] ?? 'Lista Postulante');
    $descripcion = isset($_POST['descripcion']) ? trim($_POST['descripcion']) : ($candidato['descripcion'] ?? '');
    $foto = $fotos['foto'] ?? null;

    updateCandidato($candidato['id'], $nombre, $descripcion, $foto, $extras);

    $actualizado = getCandidatoById($candidato['id']);

    echo json_encode([
        'success' => true,
        'message' => ($nuevoEstado === 'en_revision') 
            ? '¡Ficha enviada con éxito a revisión del Comité Electoral!' 
            : 'Avance guardado correctamente.',
        'estado' => $nuevoEstado,
        'candidato' => _candidato_postulacion_response($actualizado)
    ]);
}

