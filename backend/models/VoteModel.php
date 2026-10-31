<?php
// ==========================================
// MÓDULO: VOTOS (Votos)
// ==========================================

function insertVoto($voter_codigo, $candidato_id, $sede = null, $ngs = null) {
    global $pdo;
    db_query(
        'INSERT INTO votos (candidato_id, voter_codigo, sede, ngs) VALUES (:candidato_id, :voter_codigo, :sede, :ngs)',
        ['candidato_id' => $candidato_id, 'voter_codigo' => $voter_codigo, 'sede' => $sede, 'ngs' => $ngs]
    );
    return (int)$pdo->lastInsertId();
}

function voterHasVoted($codigo) {
    $stmt = db_query('SELECT 1 FROM votos WHERE voter_codigo = :codigo LIMIT 1', ['codigo' => $codigo]);
    return $stmt->fetchColumn() !== false;
}

