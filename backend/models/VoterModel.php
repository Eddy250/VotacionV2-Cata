<?php
// ==========================================
// MÓDULO: VOTANTES (Voters) - MySQL & SQLite
// ==========================================

function detect_voter_nivel($voter) {
    if (!$voter) return 'General';

    // 1. Si la sede es Jerusalén, la elección es general unificada
    $sede = normalize_sede_slug($voter['sede'] ?? '');
    if ($sede === 'jerusalen') {
        return 'General';
    }

    // 2. Si tiene nivel explícito guardado
    if (!empty($voter['nivel'])) {
        $n = trim($voter['nivel']);
        if (stripos($n, 'sec') !== false) return 'Secundaria';
        if (stripos($n, 'prim') !== false) return 'Primaria';
        if (stripos($n, 'gen') !== false) return 'General';
        return $n;
    }

    // 3. En Sede Central: determinar por grado y NGS
    $text = mb_strtoupper(($voter['grado'] ?? '') . ' ' . ($voter['ngs'] ?? ''), 'UTF-8');
    if (strpos($text, 'SEC') !== false || strpos($text, 'AÑO') !== false || strpos($text, 'SECUNDARIA') !== false) {
        return 'Secundaria';
    }

    // Por defecto en Central (1° a 6° grado)
    return 'Primaria';
}

function getVoterByCodigo($codigo, $sede = null) {
    $c = trim((string)$codigo);
    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $sedePattern = ($targetSede === 'jerusalen') ? '%Jerusal%' : '%Central%';
        $stmt = db_query('SELECT * FROM voters WHERE (codigo = :c1 OR dni = :c2 OR codigo_original = :c3) AND (sede LIKE :sede OR sede IS NULL) LIMIT 1', [
            'c1' => $c,
            'c2' => $c,
            'c3' => $c,
            'sede' => $sedePattern
        ]);
        return $stmt->fetch();
    }

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
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $sedePattern = ($targetSede === 'jerusalen') ? '%Jerusal%' : '%Central%';
        $stmt = db_query('SELECT 1 FROM voters WHERE (codigo = :c1 OR dni = :c2) AND (sede LIKE :sede OR sede IS NULL) LIMIT 1', [
            'c1' => $c,
            'c2' => $c,
            'sede' => $sedePattern
        ]);
        return $stmt->fetchColumn() !== false;
    }

    $stmt = db_query('SELECT 1 FROM voters WHERE codigo = :c1 OR dni = :c2 LIMIT 1', [
        'c1' => $c,
        'c2' => $c
    ], $targetSede);
    return $stmt->fetchColumn() !== false;
}

function voterExistsByDni($dni, $sede = null) {
    if (!$dni) return false;
    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $sedePattern = ($targetSede === 'jerusalen') ? '%Jerusal%' : '%Central%';
        $stmt = db_query('SELECT codigo FROM voters WHERE dni = :dni AND (sede LIKE :sede OR sede IS NULL) LIMIT 1', [
            'dni' => trim($dni),
            'sede' => $sedePattern
        ]);
        return $stmt->fetch();
    }

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
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $sedePattern = ($targetSede === 'jerusalen') ? '%Jerusal%' : '%Central%';
        db_query('UPDATE voters SET ha_votado = 1, fecha_voto = CURRENT_TIMESTAMP WHERE codigo = :codigo AND (sede LIKE :sede OR sede IS NULL)', [
            'codigo' => $codigo,
            'sede' => $sedePattern
        ]);
        return;
    }
    db_query('UPDATE voters SET ha_votado = 1, fecha_voto = CURRENT_TIMESTAMP WHERE codigo = :codigo', ['codigo' => $codigo], $targetSede);
}

function getAllVoters($sede = null, $ngs = null) {
    $where = ["(ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%')"];
    $params = [];
    if ($ngs && $ngs !== 'todos') {
        $where[] = 'ngs = :ngs';
        $params['ngs'] = $ngs;
    }

    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        if ($sede && $sede !== 'todos') {
            $slug = normalize_sede_slug($sede);
            $where[] = ($slug === 'jerusalen') ? "sede LIKE '%Jerusal%'" : "sede LIKE '%Central%'";
        }
        $whereClause = ' WHERE ' . implode(' AND ', $where);
        return db_query('SELECT * FROM voters' . $whereClause . ' ORDER BY ngs ASC, nombre ASC', $params)->fetchAll();
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
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $ngs = db_query("SELECT DISTINCT ngs FROM voters WHERE ngs IS NOT NULL AND ngs != '' AND ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%' ORDER BY ngs ASC")->fetchAll(PDO::FETCH_COLUMN);
        return [
            'sedes' => ['Sede Central', 'Sede Jerusalén'],
            'ngs' => array_values(array_unique($ngs))
        ];
    }

    $ngsCentral = db_query("SELECT DISTINCT ngs FROM voters WHERE ngs IS NOT NULL AND ngs != '' AND ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%' ORDER BY ngs ASC", [], 'central')->fetchAll(PDO::FETCH_COLUMN);
    $ngsJeru = db_query("SELECT DISTINCT ngs FROM voters WHERE ngs IS NOT NULL AND ngs != '' AND ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%' ORDER BY ngs ASC", [], 'jerusalen')->fetchAll(PDO::FETCH_COLUMN);

    return [
        'sedes' => ['Sede Central', 'Sede Jerusalén'],
        'ngs' => array_values(array_unique(array_merge($ngsCentral, $ngsJeru)))
    ];
}

function _getStudentsFilteredFromDB($sedeSlug, $ngs = null, $estado = 'todos', $search = null, $nivel = null) {
    $where = [];
    $params = [];

    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs && $sedeSlug) {
        $where[] = ($sedeSlug === 'jerusalen') ? "sede LIKE '%Jerusal%'" : "sede LIKE '%Central%'";
    }

    if ($ngs && $ngs !== 'todos') {
        $where[] = 'ngs = :ngs';
        $params['ngs'] = $ngs;
    } else {
        $where[] = "(ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%')";
    }

    if ($nivel && $nivel !== 'todos') {
        if (strtolower($nivel) === 'secundaria') {
            $where[] = "(LOWER(nivel) = 'secundaria' OR ((nivel IS NULL OR nivel = '') AND (grado LIKE '%SEC%' OR ngs LIKE '%SEC%' OR ngs LIKE '%AÑO%' OR ngs LIKE '%ANO%')))";
        } elseif (strtolower($nivel) === 'primaria') {
            $where[] = "(LOWER(nivel) = 'primaria' OR ((nivel IS NULL OR nivel = '') AND (grado NOT LIKE '%SEC%' AND ngs NOT LIKE '%SEC%' AND ngs NOT LIKE '%AÑO%' AND ngs NOT LIKE '%ANO%')))";
        }
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

function getStudentsFiltered($sede = null, $ngs = null, $estado = 'todos', $search = null, $nivel = null) {
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs && (!$sede || $sede === 'todos')) {
        // En MySQL unificado podemos consultar directamente todos los alumnos en una sola query
        $alumnos = _getStudentsFilteredFromDB(null, $ngs, $estado, $search, $nivel);
    } elseif (!$sede || $sede === 'todos') {
        $resCentral = _getStudentsFilteredFromDB('central', $ngs, $estado, $search, $nivel);
        $resJeru = _getStudentsFilteredFromDB('jerusalen', $ngs, $estado, $search, $nivel);
        $alumnos = array_merge($resCentral, $resJeru);
    } else {
        $slug = normalize_sede_slug($sede);
        $alumnos = _getStudentsFilteredFromDB($slug, $ngs, $estado, $search, $nivel);
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
 * Importación masiva por lote con aislamiento total por sede
 */
function importarLoteAlumnos($listaAlumnos, $sedeDefault = 'Sede Central') {
    $targetSedeName = normalize_sede_name($sedeDefault);
    $slug = normalize_sede_slug($targetSedeName);
    
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
            $sede = $targetSedeName;
            $email = isset($al['email']) ? trim((string)$al['email']) : null;
            $nivel = isset($al['nivel']) ? trim((string)$al['nivel']) : null;

            // Extraer grado, sección y nivel si no vienen explícitos o ngs tiene formato corto tipo P2B, S3A, C1B
            if ((!$grado || !$seccion || strtoupper($grado) === 'GENERAL') && !empty($ngs)) {
                $ngsUpper = mb_strtoupper($ngs, 'UTF-8');
                $cleanNgsCode = preg_replace('/[\s\-_.]/u', '', $ngsUpper);

                // 1. Patrón oficial 3 caracteres: P2B, S3A, C1B, I3A, K4B
                if (preg_match('/^([PSCIK])([1-6])([A-ZÚ])$/iu', $cleanNgsCode, $m3)) {
                    $pfx = strtoupper($m3[1]);
                    $gNum = $m3[2];
                    $sec = strtoupper($m3[3]);
                    if ($pfx === 'I' || $pfx === 'K') {
                        continue; // Omitir inicial
                    }
                    $grado = "{$gNum}°";
                    $seccion = ($sec === 'U' || $sec === 'Ú') ? 'ÚNICA' : $sec;
                    if (!$nivel || strtoupper($nivel) === 'GENERAL') {
                        $nivel = ($pfx === 'P') ? 'Primaria' : 'Secundaria';
                    }
                    $ngs = "{$grado} {$seccion} - " . strtoupper($nivel);
                }
                // 2. Patrón 2 caracteres: 2B, 3A, 4C
                elseif (preg_match('/^([1-6])([A-ZÚ])$/iu', $cleanNgsCode, $m2)) {
                    $gNum = $m2[1];
                    $sec = strtoupper($m2[2]);
                    $grado = "{$gNum}°";
                    $seccion = ($sec === 'U' || $sec === 'Ú') ? 'ÚNICA' : $sec;
                    if (!$nivel || strtoupper($nivel) === 'GENERAL') {
                        $nivel = ($gNum === '6') ? 'Primaria' : 'Primaria';
                    }
                    $ngs = "{$grado} {$seccion} - " . strtoupper($nivel);
                }
                else {
                    if (!$grado || strtoupper($grado) === 'GENERAL') {
                        if (strpos($ngsUpper, 'PRIMER') !== false || preg_match('/\b1\b|1°|1º/u', $ngsUpper)) $grado = '1°';
                        elseif (strpos($ngsUpper, 'SEGUND') !== false || preg_match('/\b2\b|2°|2º/u', $ngsUpper)) $grado = '2°';
                        elseif (strpos($ngsUpper, 'TERCER') !== false || preg_match('/\b3\b|3°|3º/u', $ngsUpper)) $grado = '3°';
                        elseif (strpos($ngsUpper, 'CUART') !== false || preg_match('/\b4\b|4°|4º/u', $ngsUpper)) $grado = '4°';
                        elseif (strpos($ngsUpper, 'QUINT') !== false || preg_match('/\b5\b|5°|5º/u', $ngsUpper)) $grado = '5°';
                        elseif (strpos($ngsUpper, 'SEXT') !== false || preg_match('/\b6\b|6°|6º/u', $ngsUpper)) $grado = '6°';
                    }
                    if (!$seccion || strtoupper($seccion) === 'ÚNICA') {
                        if (preg_match('/(?:SECCI[OÓ]N|SEC\.?|AULA)\s*[:\-]?\s*([A-E])\b/u', $ngsUpper, $sm)) {
                            $seccion = $sm[1];
                        } elseif (preg_match('/[1-6]\s*[\-_°º]?\s*([A-E])\b/u', $ngsUpper, $sm)) {
                            $seccion = $sm[1];
                        } else {
                            $seccion = 'ÚNICA';
                        }
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

            // Detectar nivel escolar (Primaria / Secundaria / General)
            $nivel = isset($al['nivel']) ? trim((string)$al['nivel']) : null;
            if (!$nivel) {
                if ($slug === 'jerusalen') {
                    $nivel = 'General';
                } else {
                    $txt = mb_strtoupper("{$grado} {$ngs}", 'UTF-8');
                    if (strpos($txt, 'SEC') !== false || strpos($txt, 'AÑO') !== false || strpos($txt, 'SECUNDARIA') !== false) {
                        $nivel = 'Secundaria';
                    } else {
                        $nivel = 'Primaria';
                    }
                }
            }

            // El código de votación es el DNI o el código asignado
            $codigoVoto = !empty($dni) ? $dni : (!empty($codOriginal) ? $codOriginal : generarCodigoUnicoVotante($slug));

            $existente = null;
            if ($dni) {
                $existente = voterExistsByDni($dni, $slug);
            }
            if (!$existente && $codOriginal) {
                $existente = getVoterByCodigo($codOriginal, $slug);
            }
            if (!$existente && $codigoVoto) {
                $existente = getVoterByCodigo($codigoVoto, $slug);
            }

            if ($existente) {
                $codigoActual = $existente['codigo'];
                if ($codigoActual !== $codigoVoto) {
                    $ocupado = voterExists($codigoVoto, $slug);
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
                        nivel = :nivel,
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
                        'nivel' => $nivel,
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
                        codigo, codigo_original, dni, nombre, ap_paterno, ap_materno, nombres, sexo, grado, seccion, ngs, nivel, sede, email, ha_votado
                    ) VALUES (
                        :codigo, :cod_orig, :dni, :nombre, :ap_pat, :ap_mat, :nombres, :sexo, :grado, :seccion, :ngs, :nivel, :sede, :email, 0
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
                        'nivel' => $nivel,
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
                'nivel' => $nivel,
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
