<?php
// ==========================================
// MÓDULO: VOTOS (Votos) - MySQL & SQLite
// ==========================================

function insertVoto($voter_codigo, $candidato_id, $sede = null, $ngs = null, $nivel = null) {
    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();
    $db = get_db_connection($targetSede);
    $stmt = $db->prepare('INSERT INTO votos (candidato_id, voter_codigo, sede, ngs, nivel) VALUES (:candidato_id, :voter_codigo, :sede, :ngs, :nivel)');
    $stmt->execute([
        'candidato_id' => $candidato_id,
        'voter_codigo' => $voter_codigo,
        'sede' => normalize_sede_name($targetSede),
        'ngs' => $ngs,
        'nivel' => $nivel
    ]);
    return (int)$db->lastInsertId();
}

function voterHasVoted($codigo, $sede = null) {
    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();
    $isMysql = (DB_DRIVER === 'mysql');
    $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

    if ($isMysql && !$separateDbs) {
        $sedePattern = ($targetSede === 'jerusalen') ? '%Jerusal%' : '%Central%';
        $stmt = db_query('SELECT 1 FROM votos WHERE voter_codigo = :codigo AND (sede LIKE :sede OR sede IS NULL) LIMIT 1', [
            'codigo' => $codigo,
            'sede' => $sedePattern
        ]);
        return $stmt->fetchColumn() !== false;
    }

    $stmt = db_query('SELECT 1 FROM votos WHERE voter_codigo = :codigo LIMIT 1', ['codigo' => $codigo], $targetSede);
    return $stmt->fetchColumn() !== false;
}
