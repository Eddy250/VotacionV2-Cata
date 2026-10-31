<?php
// ==========================================
// MÓDULO: CANDIDATOS (Listas Electorales)
// ==========================================

function getAllCandidatos($sede = null) {
    if ($sede && $sede !== 'todos') {
        $stmt = db_query('SELECT * FROM candidatos WHERE sede = :sede OR nombre LIKE "%Blanco%" ORDER BY id ASC', ['sede' => $sede]);
        return $stmt->fetchAll();
    }
    $stmt = db_query('SELECT * FROM candidatos ORDER BY id ASC');
    return $stmt->fetchAll();
}

function getCandidatoById($id) {
    $stmt = db_query('SELECT * FROM candidatos WHERE id = :id LIMIT 1', ['id' => $id]);
    return $stmt->fetch();
}

function _sanitize_relative_path($path) {
    if (!$path || !is_string($path)) return $path;
    $clean = trim($path);
    $clean = preg_replace('#^/*(static/)+#i', '', $clean);
    return ltrim($clean, '/');
}

function insertCandidato($nombre, $descripcion = null, $foto = null, $extras = []) {
    global $pdo;
    $foto      = _sanitize_relative_path($foto);
    $slogan    = $extras['slogan'] ?? null;
    $logo      = _sanitize_relative_path($extras['logo'] ?? null);
    $propuestas = $extras['propuestas'] ?? null;
    $alcalde       = $extras['alcalde'] ?? null;
    $teniente      = $extras['teniente'] ?? null;
    $regidor_edu   = $extras['regidor_educacion'] ?? null;
    $regidor_salud = $extras['regidor_salud'] ?? null;
    $regidor_derechos = $extras['regidor_derechos'] ?? null;
    $alcalde_foto       = _sanitize_relative_path($extras['alcalde_foto'] ?? null);
    $teniente_foto      = _sanitize_relative_path($extras['teniente_foto'] ?? null);
    $regidor_edu_foto   = _sanitize_relative_path($extras['regidor_educacion_foto'] ?? null);
    $regidor_salud_foto = _sanitize_relative_path($extras['regidor_salud_foto'] ?? null);
    $regidor_derechos_foto = _sanitize_relative_path($extras['regidor_derechos_foto'] ?? null);
    $propuestas_pdf     = _sanitize_relative_path($extras['propuestas_pdf'] ?? null);
    $sede               = !empty($extras['sede']) ? trim($extras['sede']) : 'Sede Principal';

    db_query(
        'INSERT INTO candidatos (nombre, descripcion, foto, slogan, logo, propuestas, 
         alcalde, teniente, regidor_educacion, regidor_salud, regidor_derechos,
         alcalde_foto, teniente_foto, regidor_educacion_foto, regidor_salud_foto, regidor_derechos_foto, propuestas_pdf, sede) 
         VALUES (:nombre, :descripcion, :foto, :slogan, :logo, :propuestas,
         :alcalde, :teniente, :regidor_educacion, :regidor_salud, :regidor_derechos,
         :alcalde_foto, :teniente_foto, :regidor_educacion_foto, :regidor_salud_foto, :regidor_derechos_foto, :propuestas_pdf, :sede)',
        [
            'nombre' => $nombre, 'descripcion' => $descripcion, 'foto' => $foto,
            'slogan' => $slogan, 'logo' => $logo, 'propuestas' => $propuestas,
            'alcalde' => $alcalde, 'teniente' => $teniente,
            'regidor_educacion' => $regidor_edu, 'regidor_salud' => $regidor_salud,
            'regidor_derechos' => $regidor_derechos,
            'alcalde_foto' => $alcalde_foto, 'teniente_foto' => $teniente_foto,
            'regidor_educacion_foto' => $regidor_edu_foto, 'regidor_salud_foto' => $regidor_salud_foto,
            'regidor_derechos_foto' => $regidor_derechos_foto,
            'propuestas_pdf' => $propuestas_pdf,
            'sede' => $sede
        ]
    );
    return (int)$pdo->lastInsertId();
}

function updateCandidato($id, $nombre = null, $descripcion = null, $foto = null, $extras = []) {
    $sets = [];
    $params = ['id' => $id];

    $fields = [
        'nombre' => $nombre, 'descripcion' => $descripcion, 'foto' => $foto
    ];

    // Campos de texto extras
    $extraFields = ['slogan', 'logo', 'propuestas', 'alcalde', 'teniente', 
                    'regidor_educacion', 'regidor_salud', 'regidor_derechos',
                    'alcalde_foto', 'teniente_foto', 'regidor_educacion_foto', 
                    'regidor_salud_foto', 'regidor_derechos_foto', 'propuestas_pdf', 'sede'];
    foreach ($extraFields as $ef) {
        if (isset($extras[$ef])) {
            $fields[$ef] = $extras[$ef];
        }
    }

    $assetFields = ['foto', 'logo', 'alcalde_foto', 'teniente_foto',
                    'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_derechos_foto', 'propuestas_pdf'];

    foreach ($fields as $col => $val) {
        if ($val !== null) {
            if (in_array($col, $assetFields, true)) {
                $val = _sanitize_relative_path($val);
            }
            $sets[] = "{$col} = :{$col}";
            $params[$col] = $val;
        }
    }

    if (empty($sets)) return false;
    $sql = 'UPDATE candidatos SET ' . implode(', ', $sets) . ' WHERE id = :id';
    db_query($sql, $params);
    return true;
}

function deleteCandidato($id) {
    db_query('DELETE FROM votos WHERE candidato_id = :id', ['id' => $id]);
    db_query('DELETE FROM candidatos WHERE id = :id', ['id' => $id]);
    return true;
}

function candidatoExists($id) {
    $stmt = db_query('SELECT 1 FROM candidatos WHERE id = :id LIMIT 1', ['id' => $id]);
    return $stmt->fetchColumn() !== false;
}
