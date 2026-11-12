<?php
// models.php - Capa de datos principal y router de base de datos modular
require_once __DIR__ . '/config.php';

function set_active_db($sede) {
    global $pdo;
    $pdo = get_db_connection($sede);
    return $pdo;
}

function db_query($sql, $params = [], $sede = null) {
    global $pdo;
    $db = $sede ? get_db_connection($sede) : ($pdo ?: get_db_connection());
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

require_once __DIR__ . '/models/AdminModel.php';
require_once __DIR__ . '/models/VoterModel.php';
require_once __DIR__ . '/models/CandidateModel.php';
require_once __DIR__ . '/models/VoteModel.php';
require_once __DIR__ . '/models/Schema.php';
require_once __DIR__ . '/models/ElectionModel.php';

// Inicializar esquema automáticamente en ambas sedes
actualizarEsquemaBD();
// sembrarDatosDePrueba(); // Desactivado: El administrador gestiona los candidatos de forma 100% manual
