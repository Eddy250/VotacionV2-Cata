<?php
// ==========================================
// MÓDULO: VOTANTES (Voters)
// ==========================================

function getVoterByCodigo($codigo) {
    $c = trim((string)$codigo);
    $stmt = db_query('SELECT * FROM voters WHERE codigo = :c1 OR dni = :c2 OR codigo_original = :c3 LIMIT 1', [
        'c1' => $c,
        'c2' => $c,
        'c3' => $c
    ]);
    return $stmt->fetch();
}

function voterExists($codigo) {
    $c = trim((string)$codigo);
    $stmt = db_query('SELECT 1 FROM voters WHERE codigo = :c1 OR dni = :c2 LIMIT 1', [
        'c1' => $c,
        'c2' => $c
    ]);
    return $stmt->fetchColumn() !== false;
}

function voterExistsByDni($dni) {
    if (!$dni) return false;
    $stmt = db_query('SELECT codigo FROM voters WHERE dni = :dni LIMIT 1', ['dni' => trim($dni)]);
    return $stmt->fetch();
}

function generarCodigoUnicoVotante() {
    do {
        $codigo = (string)mt_rand(100000, 999999);
    } while (voterExists($codigo));
    return $codigo;
}

function setVoterVoted($codigo) {
    db_query('UPDATE voters SET ha_votado = 1, fecha_voto = CURRENT_TIMESTAMP WHERE codigo = :codigo', ['codigo' => $codigo]);
}

function getAllVoters() {
    $stmt = db_query('SELECT * FROM voters ORDER BY sede ASC, ngs ASC, nombre ASC');
    return $stmt->fetchAll();
}

function getDistinctSedesAndNGS() {
    $sedes = db_query('SELECT DISTINCT sede FROM voters WHERE sede IS NOT NULL AND sede != "" ORDER BY sede ASC')->fetchAll(PDO::FETCH_COLUMN);
    $ngs = db_query('SELECT DISTINCT ngs FROM voters WHERE ngs IS NOT NULL AND ngs != "" ORDER BY ngs ASC')->fetchAll(PDO::FETCH_COLUMN);
    return [
        'sedes' => $sedes,
        'ngs' => $ngs
    ];
}

function getStudentsFiltered($sede = null, $ngs = null, $estado = 'todos', $search = null) {
    $where = [];
    $params = [];

    if ($sede && $sede !== 'todos') {
        $where[] = 'sede = :sede';
        $params['sede'] = $sede;
    }

    if ($ngs && $ngs !== 'todos') {
        $where[] = 'ngs = :ngs';
        $params['ngs'] = $ngs;
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
    $sql .= ' ORDER BY sede ASC, ngs ASC, nombre ASC';

    $stmt = db_query($sql, $params);
    $alumnos = $stmt->fetchAll();

    // Contadores para el filtro
    $total = count($alumnos);
    $votaron = 0;
    foreach ($alumnos as $a) {
        if ($a['ha_votado']) $votaron++;
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
 * Importación masiva por lote con generación de códigos aleatorios únicos
 */
function importarLoteAlumnos($listaAlumnos, $sedeDefault = 'Sede Principal') {
    global $pdo;
    $pdo->beginTransaction();

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
            $ngs = isset($al['ngs']) ? strtoupper(trim((string)$al['ngs'])) : null;
            $sede = !empty($al['sede']) ? trim((string)$al['sede']) : $sedeDefault;
            $email = isset($al['email']) ? trim((string)$al['email']) : null;

            // Armar nombre completo
            $nombreCompleto = '';
            if ($apPaterno || $apMaterno) {
                $nombreCompleto = trim("{$apPaterno} {$apMaterno}");
                if ($nombres) $nombreCompleto .= ", {$nombres}";
            } else {
                $nombreCompleto = $nombres ?: ($al['nombre'] ?? 'Sin Nombre');
            }

            // El código de votación es directamente el DNI del alumno.
            // Si no tiene DNI, se usa el código original, o se genera uno numérico de respaldo.
            $codigoVoto = !empty($dni) ? $dni : (!empty($codOriginal) ? $codOriginal : generarCodigoUnicoVotante());

            // Verificar si ya existe por DNI, Código Original o Código
            $existente = null;
            if ($dni) {
                $existente = voterExistsByDni($dni);
            }
            if (!$existente && $codOriginal) {
                $stmt = db_query('SELECT codigo FROM voters WHERE codigo_original = :cod LIMIT 1', ['cod' => $codOriginal]);
                $existente = $stmt->fetch();
            }
            if (!$existente && $codigoVoto) {
                $stmt = db_query('SELECT codigo FROM voters WHERE codigo = :cod LIMIT 1', ['cod' => $codigoVoto]);
                $existente = $stmt->fetch();
            }

            if ($existente) {
                $codigoActual = $existente['codigo'];
                // Si el alumno existe pero su código era distinto al DNI, actualizarlo al DNI
                if ($codigoActual !== $codigoVoto) {
                    $ocupado = db_query('SELECT 1 FROM voters WHERE codigo = :c LIMIT 1', ['c' => $codigoVoto])->fetchColumn();
                    if (!$ocupado) {
                        db_query('UPDATE voters SET codigo = :nuevo WHERE codigo = :antiguo', [
                            'nuevo' => $codigoVoto,
                            'antiguo' => $codigoActual
                        ]);
                        db_query('UPDATE votos SET voter_codigo = :nuevo WHERE voter_codigo = :antiguo', [
                            'nuevo' => $codigoVoto,
                            'antiguo' => $codigoActual
                        ]);
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
                        'ngs' => $ngs,
                        'sede' => $sede,
                        'email' => $email,
                        'codigo' => $codigoVoto
                    ]
                );
                $actualizados++;
            } else {
                db_query('
                    INSERT INTO voters (
                        codigo, codigo_original, dni, nombre, ap_paterno, ap_materno, nombres, sexo, ngs, sede, email, ha_votado
                    ) VALUES (
                        :codigo, :cod_orig, :dni, :nombre, :ap_pat, :ap_mat, :nombres, :sexo, :ngs, :sede, :email, 0
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
                        'ngs' => $ngs,
                        'sede' => $sede,
                        'email' => $email
                    ]
                );
                $insertados++;
            }

            $alumnosProcesados[] = [
                'codigo_voto' => $codigoVoto,
                'codigo_original' => $codOriginal,
                'dni' => $dni,
                'nombre' => $nombreCompleto,
                'ngs' => $ngs,
                'sede' => $sede
            ];
        }

        $pdo->commit();

        return [
            'success' => true,
            'insertados' => $insertados,
            'actualizados' => $actualizados,
            'total' => count($alumnosProcesados),
            'alumnos' => $alumnosProcesados
        ];
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

