<?php
// ==========================================
// MÓDULO: CONFIGURACIÓN Y ESTADO DE ELECCIÓN
// ==========================================

function getEstadoEleccion() {
    try {
        $stmt = db_query("SELECT valor FROM configuracion WHERE clave = 'estado_eleccion' LIMIT 1");
        $estado = $stmt->fetchColumn();
        if (!$estado) {
            setEstadoEleccion('EN_CURSO', 'Estado inicial de la elección');
            return 'EN_CURSO';
        }
        return $estado;
    } catch (Exception $e) {
        return 'EN_CURSO';
    }
}

function getInfoEleccion() {
    $estado = getEstadoEleccion();
    $stmt = db_query("SELECT descripcion, fecha_actualizacion FROM configuracion WHERE clave = 'estado_eleccion' LIMIT 1");
    $info = $stmt->fetch();
    return [
        'estado' => $estado,
        'descripcion' => $info['descripcion'] ?? '',
        'mensaje' => getMensajeSegunEstado($estado),
        'fecha_actualizacion' => $info['fecha_actualizacion'] ?? date('Y-m-d H:i:s'),
        'permite_voto' => ($estado === 'EN_CURSO'),
        'jornadas' => getJornadasConfig()
    ];
}

function setEstadoEleccion($nuevoEstado, $descripcion = '') {
    $validos = ['CONFIGURACION', 'EN_CURSO', 'PAUSADA', 'FINALIZADA'];
    if (!in_array($nuevoEstado, $validos)) {
        throw new InvalidArgumentException("Estado de elección no válido: {$nuevoEstado}");
    }
    
    foreach (['central', 'jerusalen'] as $s) {
        try {
            $exists = db_query("SELECT 1 FROM configuracion WHERE clave = 'estado_eleccion'", [], $s)->fetchColumn();
            if ($exists) {
                db_query("UPDATE configuracion SET valor = :v, descripcion = :d, fecha_actualizacion = CURRENT_TIMESTAMP WHERE clave = 'estado_eleccion'", [
                    'v' => $nuevoEstado,
                    'd' => $descripcion
                ], $s);
            } else {
                db_query("INSERT INTO configuracion (clave, valor, descripcion) VALUES ('estado_eleccion', :v, :d)", [
                    'v' => $nuevoEstado,
                    'd' => $descripcion
                ], $s);
            }
        } catch (Exception $e) {}
    }
    return true;
}

function getMensajeSegunEstado($estado) {
    switch ($estado) {
        case 'CONFIGURACION':
            return 'La jornada electoral se encuentra en fase de configuración previa. El acceso de votación aún no ha sido habilitado.';
        case 'PAUSADA':
            return 'La votación se encuentra temporalmente pausada por la mesa electoral. Por favor, espera indicaciones del docente de mesa.';
        case 'FINALIZADA':
            return 'La jornada electoral ha finalizado. Las urnas electrónicas están cerradas.';
        case 'EN_CURSO':
        default:
            return 'Votación habilitada y en curso.';
    }
}

function getJornadasConfig() {
    try {
        $keys = [
            'jornada_central_primaria' => '1',
            'jornada_jerusalen' => '1',
            'jornada_central_secundaria' => '0' // Desactivado por defecto para el Día 1 (solo Primaria y Jerusalén)
        ];
        $config = [];
        foreach ($keys as $k => $default) {
            $stmt = db_query("SELECT valor FROM configuracion WHERE clave = :k LIMIT 1", ['k' => $k]);
            $val = $stmt->fetchColumn();
            if ($val === false || $val === null) {
                db_query("INSERT INTO configuracion (clave, valor, descripcion) VALUES (:k, :v, :d)", [
                    'k' => $k,
                    'v' => $default,
                    'd' => "Control dinámico de jornada electoral: {$k}"
                ]);
                $val = $default;
            }
            $config[$k] = ($val === '1' || $val === 'true');
        }
        return [
            'central_primaria' => $config['jornada_central_primaria'],
            'jerusalen' => $config['jornada_jerusalen'],
            'central_secundaria' => $config['jornada_central_secundaria']
        ];
    } catch (Exception $e) {
        return [
            'central_primaria' => true,
            'jerusalen' => true,
            'central_secundaria' => false
        ];
    }
}

function setJornadaStatus($jornadaKey, $activo) {
    $validKeys = [
        'central_primaria' => 'jornada_central_primaria',
        'jerusalen' => 'jornada_jerusalen',
        'central_secundaria' => 'jornada_central_secundaria'
    ];
    if (!isset($validKeys[$jornadaKey])) {
        throw new InvalidArgumentException("Jornada inválida: {$jornadaKey}");
    }
    $dbKey = $validKeys[$jornadaKey];
    $val = $activo ? '1' : '0';
    $desc = "Control dinámico de jornada: {$jornadaKey}";

    foreach (['central', 'jerusalen'] as $s) {
        try {
            $exists = db_query("SELECT 1 FROM configuracion WHERE clave = :k", ['k' => $dbKey], $s)->fetchColumn();
            if ($exists) {
                db_query("UPDATE configuracion SET valor = :v, fecha_actualizacion = CURRENT_TIMESTAMP WHERE clave = :k", [
                    'k' => $dbKey,
                    'v' => $val
                ], $s);
            } else {
                db_query("INSERT INTO configuracion (clave, valor, descripcion) VALUES (:k, :v, :d)", [
                    'k' => $dbKey,
                    'v' => $val,
                    'd' => $desc
                ], $s);
            }
        } catch (Exception $e) {}
    }
    return true;
}

function isVoterJornadaHabilitada($voter) {
    $jornadas = getJornadasConfig();
    $sede = normalize_sede_slug($voter['sede'] ?? 'central');
    $nivel = detect_voter_nivel($voter);

    if ($sede === 'jerusalen') {
        if (!$jornadas['jerusalen']) {
            return [
                'habilitado' => false,
                'jornada' => 'jerusalen',
                'mensaje' => 'La jornada de sufragio para Sede Jerusalén se encuentra pausada temporalmente por la mesa electoral.'
            ];
        }
        return ['habilitado' => true];
    }

    // Sede Central
    if (strtolower($nivel) === 'primaria') {
        if (!$jornadas['central_primaria']) {
            return [
                'habilitado' => false,
                'jornada' => 'central_primaria',
                'mensaje' => 'La votación para Primaria (Sede Central) se encuentra pausada temporalmente por la mesa electoral.'
            ];
        }
        return ['habilitado' => true];
    }

    if (strtolower($nivel) === 'secundaria') {
        if (!$jornadas['central_secundaria']) {
            return [
                'habilitado' => false,
                'jornada' => 'central_secundaria',
                'mensaje' => 'Estimado(a) estudiante de Secundaria: La jornada de hoy está reservada para Primaria y Sede Jerusalén. Tu votación será habilitada el día de mañana según el cronograma electoral.'
            ];
        }
        return ['habilitado' => true];
    }

    return ['habilitado' => true];
}
