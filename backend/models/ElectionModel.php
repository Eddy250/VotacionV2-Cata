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
        'permite_voto' => ($estado === 'EN_CURSO')
    ];
}

function setEstadoEleccion($nuevoEstado, $descripcion = '') {
    $validos = ['CONFIGURACION', 'EN_CURSO', 'PAUSADA', 'FINALIZADA'];
    if (!in_array($nuevoEstado, $validos)) {
        throw new InvalidArgumentException("Estado de elección no válido: {$nuevoEstado}");
    }
    
    $exists = db_query("SELECT 1 FROM configuracion WHERE clave = 'estado_eleccion'")->fetchColumn();
    if ($exists) {
        db_query("UPDATE configuracion SET valor = :v, descripcion = :d, fecha_actualizacion = CURRENT_TIMESTAMP WHERE clave = 'estado_eleccion'", [
            'v' => $nuevoEstado,
            'd' => $descripcion
        ]);
    } else {
        db_query("INSERT INTO configuracion (clave, valor, descripcion) VALUES ('estado_eleccion', :v, :d)", [
            'v' => $nuevoEstado,
            'd' => $descripcion
        ]);
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
