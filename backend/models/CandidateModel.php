<?php
// ==========================================
// MÓDULO: CANDIDATOS (Listas Electorales) - MySQL & SQLite
// ==========================================

function get_candidate_sede($id)
{
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $stmt = db_query('SELECT sede FROM candidatos WHERE id = :id LIMIT 1', ['id' => $id]);
        $s = $stmt->fetchColumn();
        return $s ? normalize_sede_slug($s) : get_active_sede();
    }

    $c = db_query('SELECT id FROM candidatos WHERE id = :id LIMIT 1', ['id' => $id], 'central')->fetch();
    if ($c)
        return 'central';
    $j = db_query('SELECT id FROM candidatos WHERE id = :id LIMIT 1', ['id' => $id], 'jerusalen')->fetch();
    if ($j)
        return 'jerusalen';
    return get_active_sede();
}

function getAllCandidatos($sede = null, $nivel = null, $soloAprobados = false)
{
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $where = [];
        $params = [];
        $slug = ($sede && $sede !== 'todos') ? normalize_sede_slug($sede) : null;

        if ($slug) {
            if ($slug === 'jerusalen') {
                $where[] = "(sede LIKE '%Jerusal%' OR LOWER(nombre) LIKE '%blanco%' OR LOWER(sede) LIKE '%universal%')";
            } else {
                $where[] = "(sede LIKE '%Central%' OR sede IS NULL OR LOWER(nombre) LIKE '%blanco%' OR LOWER(sede) LIKE '%universal%')";
            }
        }

        // Filtrado por nivel: En Sede Central se divide por Primaria y Secundaria.
        // En Sede Jerusalén la elección es unificada (general para todo el anexo).
        if ($nivel && $nivel !== 'todos' && $slug !== 'jerusalen') {
            $where[] = "((LOWER(nivel) = LOWER(:nivel) OR LOWER(nivel) = 'general' OR nivel IS NULL OR nivel = '') OR LOWER(nombre) LIKE '%blanco%')";
            $params['nivel'] = $nivel;
        }

        if ($soloAprobados) {
            $where[] = "(estado_registro = 'aprobado' OR estado_registro IS NULL OR estado_registro = '')";
        }
        $whereSql = !empty($where) ? (' WHERE ' . implode(' AND ', $where)) : '';
        $stmt = db_query('SELECT * FROM candidatos' . $whereSql . ' ORDER BY id ASC', $params);
        return $stmt->fetchAll();
    }

    if ($sede === 'todos') {
        $cCentral = getAllCandidatos('central', $nivel, $soloAprobados);
        $cJeru = getAllCandidatos('jerusalen', $nivel, $soloAprobados);
        return array_merge($cCentral, $cJeru);
    }

    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();

    // En Sede Central podemos filtrar por Nivel (Primaria o Secundaria)
    $aprobadoSql = $soloAprobados ? " AND (estado_registro = 'aprobado' OR estado_registro IS NULL OR estado_registro = '')" : "";
    if ($targetSede === 'central' && $nivel && $nivel !== 'todos') {
        $stmt = db_query(
            "SELECT * FROM candidatos 
             WHERE ((LOWER(nivel) = LOWER(:nivel) OR LOWER(nivel) = 'general' OR nivel IS NULL OR nivel = '') OR LOWER(nombre) LIKE '%blanco%')" . $aprobadoSql . "
             ORDER BY id ASC",
            ['nivel' => $nivel],
            $targetSede
        );
        return $stmt->fetchAll();
    }

    $whereSolo = $soloAprobados ? " WHERE (estado_registro = 'aprobado' OR estado_registro IS NULL OR estado_registro = '')" : "";
    $stmt = db_query('SELECT * FROM candidatos' . $whereSolo . ' ORDER BY id ASC', [], $targetSede);
    return $stmt->fetchAll();
}

function getCandidatoById($id, $sede = null)
{
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $stmt = db_query('SELECT * FROM candidatos WHERE id = :id LIMIT 1', ['id' => $id]);
        return $stmt->fetch();
    }

    $targetSede = $sede ? normalize_sede_slug($sede) : get_candidate_sede($id);
    $stmt = db_query('SELECT * FROM candidatos WHERE id = :id LIMIT 1', ['id' => $id], $targetSede);
    return $stmt->fetch();
}

function getCandidatoByToken($token)
{
    if (!$token || trim($token) === '') return null;
    $cleanToken = trim($token);
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $stmt = db_query('SELECT * FROM candidatos WHERE token_registro = :token LIMIT 1', ['token' => $cleanToken]);
        return $stmt->fetch();
    }

    foreach (['central', 'jerusalen'] as $s) {
        $stmt = db_query('SELECT * FROM candidatos WHERE token_registro = :token LIMIT 1', ['token' => $cleanToken], $s);
        $res = $stmt->fetch();
        if ($res) return $res;
    }
    return null;
}

function _generar_slug_token($responsable = '', $nivel = '', $sede = '')
{
    $prefix = (stripos($nivel, 'sec') !== false) ? 'sec' : ((stripos($nivel, 'prim') !== false) ? 'prim' : 'cata');
    $base = trim($responsable);
    
    if (!$base || $base === 'Lista en Postulación' || $base === 'Nueva Lista Postulante') {
        return $prefix . '-' . bin2hex(random_bytes(4));
    }

    // Normalizar texto: quitar tildes, caracteres especiales
    $slug = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $base);
    if (!$slug) {
        $slug = $base;
    }
    $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $slug));
    $slug = trim($slug, '-');
    if (strlen($slug) > 22) {
        $slug = substr($slug, 0, 22);
        $slug = rtrim($slug, '-');
    }
    
    $hash = bin2hex(random_bytes(2)); // 4 caracteres para unicidad
    return $prefix . '-' . ($slug ? ($slug . '-') : '') . $hash;
}

function generarTokenPostulacion($sede = 'Sede Central', $nivel = 'Primaria', $nombre = 'Nueva Lista Postulante', $responsable = null, $telefono = null)
{
    $sedeName = normalize_sede_name($sede);
    $slugResponsable = $responsable ?: $nombre;
    $token = _generar_slug_token($slugResponsable, $nivel, $sedeName);

    $nombreLista = $nombre;
    if (!$nombreLista || $nombreLista === 'Nueva Lista Postulante' || $nombreLista === 'Lista en Postulación') {
        $nombreLista = $responsable ? ("Lista de " . $responsable) : "Lista Postulante";
    }

    $fechaActual = date('d/m/Y H:i');

    $id = insertCandidato($nombreLista, 'Lista en proceso de inscripción', null, [
        'sede' => $sedeName,
        'nivel' => $nivel,
        'estado_registro' => 'borrador',
        'token_registro' => $token,
        'color' => '#1B3A8C',
        'responsable_entrega' => $responsable,
        'telefono_responsable' => $telefono,
        'fecha_generacion' => $fechaActual
    ]);

    return [
        'id' => $id,
        'token' => $token,
        'sede' => $sedeName,
        'nivel' => $nivel,
        'nombre' => $nombreLista,
        'responsable_entrega' => $responsable,
        'telefono_responsable' => $telefono,
        'fecha_generacion' => $fechaActual
    ];
}

function _sanitize_relative_path($path)
{
    if (!$path || !is_string($path))
        return $path;
    $clean = trim($path);
    $clean = preg_replace('#^/*(static/)+#i', '', $clean);
    return ltrim($clean, '/');
}

function insertCandidato($nombre, $descripcion = null, $foto = null, $extras = [])
{
    $foto = _sanitize_relative_path($foto);
    $slogan = $extras['slogan'] ?? null;
    $logo = _sanitize_relative_path($extras['logo'] ?? null);
    $propuestas = $extras['propuestas'] ?? null;
    $alcalde = $extras['alcalde'] ?? null;
    $teniente = $extras['teniente'] ?? null;
    $regidor_edu = $extras['regidor_educacion'] ?? null;
    $regidor_salud = $extras['regidor_salud'] ?? null;
    $regidor_emp = $extras['regidor_emprendimiento'] ?? null;
    $regidor_derechos = $extras['regidor_derechos'] ?? null;
    $regidor_com = $extras['regidor_comunicacion'] ?? null;
    $alcalde_foto = _sanitize_relative_path($extras['alcalde_foto'] ?? null);
    $teniente_foto = _sanitize_relative_path($extras['teniente_foto'] ?? null);
    $regidor_edu_foto = _sanitize_relative_path($extras['regidor_educacion_foto'] ?? null);
    $regidor_salud_foto = _sanitize_relative_path($extras['regidor_salud_foto'] ?? null);
    $regidor_emp_foto = _sanitize_relative_path($extras['regidor_emprendimiento_foto'] ?? null);
    $regidor_derechos_foto = _sanitize_relative_path($extras['regidor_derechos_foto'] ?? null);
    $regidor_com_foto = _sanitize_relative_path($extras['regidor_comunicacion_foto'] ?? null);
    $propuestas_pdf = _sanitize_relative_path($extras['propuestas_pdf'] ?? null);
    $color = !empty($extras['color']) ? trim($extras['color']) : null;
    $nivel = !empty($extras['nivel']) ? trim($extras['nivel']) : 'General';

    $sedeName = !empty($extras['sede']) ? normalize_sede_name($extras['sede']) : normalize_sede_name(get_active_sede());
    $targetSlug = normalize_sede_slug($sedeName);
    $db = get_db_connection($targetSlug);

    $stmt = $db->prepare(
        'INSERT INTO candidatos (nombre, descripcion, foto, slogan, logo, propuestas, 
         alcalde, teniente, regidor_educacion, regidor_salud, regidor_emprendimiento, regidor_derechos, regidor_comunicacion,
         alcalde_foto, teniente_foto, regidor_educacion_foto, regidor_salud_foto, regidor_emprendimiento_foto, regidor_derechos_foto, regidor_comunicacion_foto, propuestas_pdf, sede, nivel, color,
         token_registro, estado_registro, numero_lista, alcalde_grado, teniente_grado, regidor_educacion_grado, regidor_salud_grado, regidor_emprendimiento_grado, regidor_derechos_grado, regidor_comunicacion_grado,
         responsable_entrega, telefono_responsable, fecha_generacion) 
         VALUES (:nombre, :descripcion, :foto, :slogan, :logo, :propuestas,
         :alcalde, :teniente, :regidor_educacion, :regidor_salud, :regidor_emprendimiento, :regidor_derechos, :regidor_comunicacion,
         :alcalde_foto, :teniente_foto, :regidor_educacion_foto, :regidor_salud_foto, :regidor_emprendimiento_foto, :regidor_derechos_foto, :regidor_comunicacion_foto, :propuestas_pdf, :sede, :nivel, :color,
         :token_registro, :estado_registro, :numero_lista, :alcalde_grado, :teniente_grado, :regidor_educacion_grado, :regidor_salud_grado, :regidor_emprendimiento_grado, :regidor_derechos_grado, :regidor_comunicacion_grado,
         :responsable_entrega, :telefono_responsable, :fecha_generacion)'
    );

    $stmt->execute([
        'nombre' => $nombre,
        'descripcion' => $descripcion,
        'foto' => $foto,
        'slogan' => $slogan,
        'logo' => $logo,
        'propuestas' => $propuestas,
        'alcalde' => $alcalde,
        'teniente' => $teniente,
        'regidor_educacion' => $regidor_edu,
        'regidor_salud' => $regidor_salud,
        'regidor_emprendimiento' => $regidor_emp,
        'regidor_derechos' => $regidor_derechos,
        'regidor_comunicacion' => $regidor_com,
        'alcalde_foto' => $alcalde_foto,
        'teniente_foto' => $teniente_foto,
        'regidor_educacion_foto' => $regidor_edu_foto,
        'regidor_salud_foto' => $regidor_salud_foto,
        'regidor_emprendimiento_foto' => $regidor_emp_foto,
        'regidor_derechos_foto' => $regidor_derechos_foto,
        'regidor_comunicacion_foto' => $regidor_com_foto,
        'propuestas_pdf' => $propuestas_pdf,
        'sede' => $sedeName,
        'nivel' => $nivel,
        'color' => $color,
        'token_registro' => $extras['token_registro'] ?? null,
        'estado_registro' => $extras['estado_registro'] ?? 'aprobado',
        'numero_lista' => isset($extras['numero_lista']) ? (int)$extras['numero_lista'] : null,
        'alcalde_grado' => $extras['alcalde_grado'] ?? null,
        'teniente_grado' => $extras['teniente_grado'] ?? null,
        'regidor_educacion_grado' => $extras['regidor_educacion_grado'] ?? null,
        'regidor_salud_grado' => $extras['regidor_salud_grado'] ?? null,
        'regidor_emprendimiento_grado' => $extras['regidor_emprendimiento_grado'] ?? null,
        'regidor_derechos_grado' => $extras['regidor_derechos_grado'] ?? null,
        'regidor_comunicacion_grado' => $extras['regidor_comunicacion_grado'] ?? null,
        'responsable_entrega' => $extras['responsable_entrega'] ?? null,
        'telefono_responsable' => $extras['telefono_responsable'] ?? null,
        'fecha_generacion' => $extras['fecha_generacion'] ?? null
    ]);

    return (int) $db->lastInsertId();
}

function updateCandidato($id, $nombre = null, $descripcion = null, $foto = null, $extras = [])
{
    $targetSede = get_candidate_sede($id);
    $sets = [];
    $params = ['id' => $id];

    $fields = [
        'nombre' => $nombre,
        'descripcion' => $descripcion,
        'foto' => $foto
    ];

    $extraFields = [
        'slogan',
        'logo',
        'propuestas',
        'alcalde',
        'teniente',
        'regidor_educacion',
        'regidor_salud',
        'regidor_emprendimiento',
        'regidor_derechos',
        'regidor_comunicacion',
        'alcalde_foto',
        'teniente_foto',
        'regidor_educacion_foto',
        'regidor_salud_foto',
        'regidor_emprendimiento_foto',
        'regidor_derechos_foto',
        'regidor_comunicacion_foto',
        'propuestas_pdf',
        'sede',
        'nivel',
        'color',
        'token_registro',
        'estado_registro',
        'numero_lista',
        'alcalde_grado',
        'teniente_grado',
        'regidor_educacion_grado',
        'regidor_salud_grado',
        'regidor_emprendimiento_grado',
        'regidor_derechos_grado',
        'regidor_comunicacion_grado',
        'responsable_entrega',
        'telefono_responsable',
        'fecha_generacion'
    ];
    foreach ($extraFields as $ef) {
        if (isset($extras[$ef])) {
            $fields[$ef] = ($ef === 'sede') ? normalize_sede_name($extras[$ef]) : $extras[$ef];
        }
    }

    $assetFields = [
        'foto',
        'logo',
        'alcalde_foto',
        'teniente_foto',
        'regidor_educacion_foto',
        'regidor_salud_foto',
        'regidor_emprendimiento_foto',
        'regidor_derechos_foto',
        'regidor_comunicacion_foto',
        'propuestas_pdf'
    ];

    foreach ($fields as $col => $val) {
        if ($val !== null) {
            if (in_array($col, $assetFields, true)) {
                $val = _sanitize_relative_path($val);
            }
            $sets[] = "{$col} = :{$col}";
            $params[$col] = $val;
        }
    }

    if (empty($sets))
        return false;
    $sql = 'UPDATE candidatos SET ' . implode(', ', $sets) . ' WHERE id = :id';
    db_query($sql, $params, $targetSede);
    return true;
}

function deleteCandidato($id)
{
    $targetSede = get_candidate_sede($id);
    db_query('DELETE FROM votos WHERE candidato_id = :id', ['id' => $id], $targetSede);
    db_query('DELETE FROM candidatos WHERE id = :id', ['id' => $id], $targetSede);
    return true;
}

function candidatoExists($id)
{
    $targetSede = get_candidate_sede($id);
    $stmt = db_query('SELECT 1 FROM candidatos WHERE id = :id LIMIT 1', ['id' => $id], $targetSede);
    return $stmt->fetchColumn() !== false;
}
