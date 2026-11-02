<?php
// ==========================================
// MÓDULO: VOTOS (Votos)
// ==========================================

function insertVoto($voter_codigo, $candidato_id, $sede = null, $ngs = null) {
    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();
    $db = get_db_connection($targetSede);
    $stmt = $db->prepare('INSERT INTO votos (candidato_id, voter_codigo, sede, ngs) VALUES (:candidato_id, :voter_codigo, :sede, :ngs)');
    $stmt->execute([
        'candidato_id' => $candidato_id,
        'voter_codigo' => $voter_codigo,
        'sede' => normalize_sede_name($targetSede),
        'ngs' => $ngs
    ]);
    return (int)$db->lastInsertId();
}

function voterHasVoted($codigo, $sede = null) {
    $targetSede = $sede ? normalize_sede_slug($sede) : get_active_sede();
    $stmt = db_query('SELECT 1 FROM votos WHERE voter_codigo = :codigo LIMIT 1', ['codigo' => $codigo], $targetSede);
    return $stmt->fetchColumn() !== false;
}
