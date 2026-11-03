<?php
// ==========================================
// MÓDULO: VOTANTES (Voters)
// ==========================================

function getVoterByCodigo($codigo, $sede = null) {
    $c = trim((string)$codigo);
    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();
    $stmt = db_query('SELECT * FROM voters WHERE codigo = :c1 OR dni = :c2 OR codigo_original = :c3 LIMIT 1', [
        'c1' => $c,
        'c2' => $c,
        'c3' => $c
    ], $targetSede);
    return $stmt->fetch();
}

function voterExists($codigo, $sede = null) {
    $c = trim((string)$codigo);
    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();
    $stmt = db_query('SELECT 1 FROM voters WHERE codigo = :c1 OR dni = :c2 LIMIT 1', [
        'c1' => $c,
        'c2' => $c
    ], $targetSede);
    return $stmt->fetchColumn() !== false;
}

function voterExistsByDni($dni, $sede = null) {
    if (!$dni) return false;
    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();
    $stmt = db_query('SELECT codigo FROM voters WHERE dni = :dni LIMIT 1', ['dni' => trim($dni)], $targetSede);
    return $stmt->fetch();
}

function generarCodigoUnicoVotante($sede = null) {
    do {
        $codigo = (string)mt_rand(100000, 999999);
    } while (voterExists($codigo, $sede));
    return $codigo;
}

function setVoterVoted($codigo, $sede = null) {
    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();
    db_query('UPDATE voters SET ha_votado = 1, fecha_voto = CURRENT_TIMESTAMP WHERE codigo = :codigo', ['codigo' => $codigo], $targetSede);
}

function getAllVoters($sede = null, $ngs = null) {
    $where = ["(ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%')"];
    $params = [];
    if ($ngs && $ngs !== 'todos') {
        $where[] = 'ngs = :ngs';
        $params['ngs'] = $ngs;
    }
    $whereClause = ' WHERE ' . implode(' AND ', $where);

    if ($sede === 'todos' || $sede === null) {
        $vCentral = db_query('SELECT * FROM voters' . $whereClause . ' ORDER BY ngs ASC, nombre ASC', $params, 'central')->fetchAll();
        $vJeru = db_query('SELECT * FROM voters' . $whereClause . ' ORDER BY ngs ASC, nombre ASC', $params, 'jerusalen')->fetchAll();
        return array_merge($vCentral, $vJeru);
    }
    $slug = normalize_sede_slug($sede);
    $stmt = db_query('SELECT * FROM voters' . $whereClause . ' ORDER BY ngs ASC, nombre ASC', $params, $slug);
    return $stmt->fetchAll();
}

function getDistinctSedesAndNGS() {
    $ngsCentral = db_query("SELECT DISTINCT ngs FROM voters WHERE ngs IS NOT NULL AND ngs != '' AND ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%' ORDER BY ngs ASC", [], 'central')->fetchAll(PDO::FETCH_COLUMN);
    $ngsJeru = db_query("SELECT DISTINCT ngs FROM voters WHERE ngs IS NOT NULL AND ngs != '' AND ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%' ORDER BY ngs ASC", [], 'jerusalen')->fetchAll(PDO::FETCH_COLUMN);

    return [
        'sedes' => ['Sede Central', 'Sede Jerusalén'],
        'ngs' => array_values(array_unique(array_merge($ngsCentral, $ngsJeru)))
    ];
}

function _getStudentsFilteredFromDB($sedeSlug, $ngs = null, $estado = 'todos', $search = null) {
    $where = [];
    $params = [];

    if ($ngs && $ngs !== 'todos') {
        $where[] = 'ngs = :ngs';
        $params['ngs'] = $ngs;
    } else {
        $where[] = "(ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%')";
    }

    if ($estado === 'votaron') {
        $where[] = 'ha_votado = 1';
    } elseif ($estado === 'pendientes') {
        $where[] = 'ha_votado = 0';
    }

    if ($search && trim($search) !== '') {
        $where[] = '(nombre LIKE :search OR dni LIKE :search OR codigo_original LIKE :search OR codigo LIKE :search)';
        $params['search'] = '%' . trim($search) . '%';
    }

    $sql = 'SELECT * FROM voters';
    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY ngs ASC, nombre ASC';

    return db_query($sql, $params, $sedeSlug)->fetchAll();
}

function getStudentsFiltered($sede = null, $ngs = null, $estado = 'todos', $search = null) {
    if (!$sede || $sede === 'todos') {
        $resCentral = _getStudentsFilteredFromDB('central', $ngs, $estado, $search);
        $resJeru = _getStudentsFilteredFromDB('jerusalen', $ngs, $estado, $search);
        $alumnos = array_merge($resCentral, $resJeru);
    } else {
        $slug = normalize_sede_slug($sede);
        $alumnos = _getStudentsFilteredFromDB($slug, $ngs, $estado, $search);
    }

    // Contadores para el filtro
    $total = count($alumnos);
    $votaron = 0;
    foreach ($alumnos as $a) {
        if (!empty($a['ha_votado'])) $votaron++;
    }
    $pendientes = $total - $votaron;
    $pct = $total > 0 ? round(($votaron / $total) * 100, 1) : 0;

    return [
        'alumnos' => $alumnos,
        'resumen' => [
            'total' => $total,
            'votaron' => $votaron,
            'pendientes' => $pendientes,
            'porcentaje' => $pct
        ]
    ];
}

/**
 * Importación masiva por lote con aislamiento total por sede en su propia base de datos
 */
function importarLoteAlumnos($listaAlumnos, $sedeDefault = 'Sede Central') {
    $targetSedeName = normalize_sede_name($sedeDefault);
    $slug = normalize_sede_slug($targetSedeName);
    
    // Activar conexión de la base de datos de esa sede
    $db = get_db_connection($slug);
    $db->beginTransaction();

    try {
        $insertados = 0;
        $actualizados = 0;
        $alumnosProcesados = [];

        foreach ($listaAlumnos as $al) {
            $dni = isset($al['dni']) ? trim((string)$al['dni']) : null;
            $codOriginal = isset($al['codigo_original']) ? trim((string)$al['codigo_original']) : null;
            $apPaterno = isset($al['ap_paterno']) ? trim((string)$al['ap_paterno']) : '';
            $apMaterno = isset($al['ap_materno']) ? trim((string)$al['ap_materno']) : '';
            $nombres = isset($al['nombres']) ? trim((string)$al['nombres']) : '';
            $sexo = isset($al['sexo']) ? strtoupper(trim((string)$al['sexo'])) : null;
            $grado = isset($al['grado']) ? trim((string)$al['grado']) : null;
            $seccion = isset($al['seccion']) ? trim((string)$al['seccion']) : null;
            $ngs = isset($al['ngs']) ? strtoupper(trim((string)$al['ngs'])) : null;
            $sede = $targetSedeName; // La sede es fijada estrictamente por el botón seleccionado
            $email = isset($al['email']) ? trim((string)$al['email']) : null;

            // Extraer grado y sección si no vienen explícitos pero ngs tiene formato (ej: "1° A - PRIMARIA" o "CUARTO GRADO")
            if ((!$grado || !$seccion) && !empty($ngs)) {
                $ngsUpper = mb_strtoupper($ngs, 'UTF-8');
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

            // Armar nombre completo
            $nombreCompleto = '';
            if ($apPaterno || $apMaterno) {
                $nombreCompleto = trim("{$apPaterno} {$apMaterno}");
                if ($nombres) $nombreCompleto .= ", {$nombres}";
            } else {
                $nombreCompleto = $nombres ?: ($al['nombre'] ?? 'Sin Nombre');
            }

            // El código de votación es directamente el DNI del alumno.
            $codigoVoto = !empty($dni) ? $dni : (!empty($codOriginal) ? $codOriginal : generarCodigoUnicoVotante($slug));

            // Verificar si ya existe en esta base de datos
            $existente = null;
            if ($dni) {
                $existente = voterExistsByDni($dni, $slug);
            }
            if (!$existente && $codOriginal) {
                $stmt = db_query('SELECT codigo FROM voters WHERE codigo_original = :cod LIMIT 1', ['cod' => $codOriginal], $slug);
                $existente = $stmt->fetch();
            }
            if (!$existente && $codigoVoto) {
                $stmt = db_query('SELECT codigo FROM voters WHERE codigo = :cod LIMIT 1', ['cod' => $codigoVoto], $slug);
                $existente = $stmt->fetch();
            }

            if ($existente) {
                $codigoActual = $existente['codigo'];
                if ($codigoActual !== $codigoVoto) {
                    $ocupado = db_query('SELECT 1 FROM voters WHERE codigo = :c LIMIT 1', ['c' => $codigoVoto], $slug)->fetchColumn();
                    if (!$ocupado) {
                        db_query('UPDATE voters SET codigo = :nuevo WHERE codigo = :antiguo', [
                            'nuevo' => $codigoVoto,
                            'antiguo' => $codigoActual
                        ], $slug);
                        db_query('UPDATE votos SET voter_codigo = :nuevo WHERE voter_codigo = :antiguo', [
                            'nuevo' => $codigoVoto,
                            'antiguo' => $codigoActual
                        ], $slug);
                    } else {
                        $codigoVoto = $codigoActual;
                    }
                }

                db_query('
                    UPDATE voters SET 
                        codigo_original = :cod_orig,
                        dni = :dni,
                        nombre = :nombre,
                        ap_paterno = :ap_pat,
                        ap_materno = :ap_mat,
                        nombres = :nombres,
                        sexo = :sexo,
                        grado = :grado,
                        seccion = :seccion,
                        ngs = :ngs,
                        sede = :sede,
                        email = :email
                    WHERE codigo = :codigo',
                    [
                        'cod_orig' => $codOriginal,
                        'dni' => $dni,
                        'nombre' => $nombreCompleto,
                        'ap_pat' => $apPaterno,
                        'ap_mat' => $apMaterno,
                        'nombres' => $nombres,
                        'sexo' => $sexo,
                        'grado' => $grado,
                        'seccion' => $seccion,
                        'ngs' => $ngs,
                        'sede' => $sede,
                        'email' => $email,
                        'codigo' => $codigoVoto
                    ],
                    $slug
                );
                $actualizados++;
            } else {
                db_query('
                    INSERT INTO voters (
                        codigo, codigo_original, dni, nombre, ap_paterno, ap_materno, nombres, sexo, grado, seccion, ngs, sede, email, ha_votado
                    ) VALUES (
                        :codigo, :cod_orig, :dni, :nombre, :ap_pat, :ap_mat, :nombres, :sexo, :grado, :seccion, :ngs, :sede, :email, 0
                    )',
                    [
                        'codigo' => $codigoVoto,
                        'cod_orig' => $codOriginal,
                        'dni' => $dni,
                        'nombre' => $nombreCompleto,
                        'ap_pat' => $apPaterno,
                        'ap_mat' => $apMaterno,
                        'nombres' => $nombres,
                        'sexo' => $sexo,
                        'grado' => $grado,
                        'seccion' => $seccion,
                        'ngs' => $ngs,
                        'sede' => $sede,
                        'email' => $email
                    ],
                    $slug
                );
                $insertados++;
            }

            $alumnosProcesados[] = [
                'codigo_voto' => $codigoVoto,
                'codigo_original' => $codOriginal,
                'dni' => $dni,
                'nombre' => $nombreCompleto,
                'grado' => $grado,
                'seccion' => $seccion,
                'ngs' => $ngs,
                'sede' => $sede
            ];
        }

        $db->commit();

        return [
            'success' => true,
            'insertados' => $insertados,
            'actualizados' => $actualizados,
            'total' => count($alumnosProcesados),
            'sede' => $targetSedeName,
            'alumnos' => $alumnosProcesados
        ];
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}
