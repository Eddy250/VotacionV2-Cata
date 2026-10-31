<?php
// models.php - Capa de datos principal
require_once __DIR__ . '/config.php';

function db_query($sql, $params = []) {
    global $pdo;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

require_once __DIR__ . '/models/AdminModel.php';
require_once __DIR__ . '/models/VoterModel.php';
require_once __DIR__ . '/models/CandidateModel.php';
require_once __DIR__ . '/models/VoteModel.php';
require_once __DIR__ . '/models/Schema.php';
require_once __DIR__ . '/models/ElectionModel.php';

// Inicializar esquema automáticamente
actualizarEsquemaBD();
sembrarDatosDePrueba();
