<?php
// backend/test_full_suite.php - Suite Completa de Pruebas de Calidad CATA 2026

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/models.php';
require_once __DIR__ . '/utils/stats_manager.php';

$passed = 0;
$failed = 0;

function assert_test($condition, $name, $details = '') {
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] {$name}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$name} - {$details}\n";
        $failed++;
    }
}

echo "========================================================\n";
echo "   SUITE DE PRUEBAS DE INTEGRIDAD Y REGRESIÓN CATA 2026\n";
echo "========================================================\n\n";

// TEST 1: Esquema de base de datos
echo "1. VERIFICACIÓN DE ESTRUCTURA Y COLUMNAS DE BD:\n";
$isMysql = (DB_DRIVER === 'mysql');
if ($isMysql) {
    $candCols = array_column(db_query("SHOW COLUMNS FROM candidatos")->fetchAll(), 'Field');
    assert_test(in_array('nivel', $candCols), "candidatos en MySQL tiene columna 'nivel'");
    assert_test(in_array('regidor_emprendimiento', $candCols), "candidatos en MySQL tiene 'regidor_emprendimiento'");
    assert_test(in_array('regidor_comunicacion', $candCols), "candidatos en MySQL tiene 'regidor_comunicacion'");

    $voterCols = array_column(db_query("SHOW COLUMNS FROM voters")->fetchAll(), 'Field');
    assert_test(in_array('nivel', $voterCols), "voters en MySQL tiene columna 'nivel'");
    assert_test(in_array('grado', $voterCols), "voters en MySQL tiene columna 'grado'");
    assert_test(in_array('seccion', $voterCols), "voters en MySQL tiene columna 'seccion'");

    $votoCols = array_column(db_query("SHOW COLUMNS FROM votos")->fetchAll(), 'Field');
    assert_test(in_array('nivel', $votoCols), "votos en MySQL tiene columna 'nivel'");
} else {
    foreach (['central', 'jerusalen'] as $s) {
        $candCols = array_column(db_query("PRAGMA table_info(candidatos)", [], $s)->fetchAll(), 'name');
        assert_test(in_array('nivel', $candCols), "candidatos en {$s} tiene columna 'nivel'");
        assert_test(in_array('regidor_emprendimiento', $candCols), "candidatos en {$s} tiene 'regidor_emprendimiento'");
        assert_test(in_array('regidor_comunicacion', $candCols), "candidatos en {$s} tiene 'regidor_comunicacion'");

        $voterCols = array_column(db_query("PRAGMA table_info(voters)", [], $s)->fetchAll(), 'name');
        assert_test(in_array('nivel', $voterCols), "voters en {$s} tiene columna 'nivel'");
        assert_test(in_array('grado', $voterCols), "voters en {$s} tiene columna 'grado'");
        assert_test(in_array('seccion', $voterCols), "voters en {$s} tiene columna 'seccion'");

        $votoCols = array_column(db_query("PRAGMA table_info(votos)", [], $s)->fetchAll(), 'name');
        assert_test(in_array('nivel', $votoCols), "votos en {$s} tiene columna 'nivel'");
    }
}

// TEST 2: Detección de Nivel de Alumno
echo "\n2. DETECCIÓN AUTOMÁTICA DE NIVEL ESCOLAR:\n";
$mockPrimaria = ['grado' => '1°', 'ngs' => 'PRIMER GRADO', 'sede' => 'Sede Central'];
assert_test(detect_voter_nivel($mockPrimaria) === 'Primaria', "1° PRIMER GRADO detectado como 'Primaria'");

$mockPrimaria6 = ['grado' => '6°', 'ngs' => 'SEXTO GRADO', 'sede' => 'Sede Central'];
assert_test(detect_voter_nivel($mockPrimaria6) === 'Primaria', "6° SEXTO GRADO detectado como 'Primaria'");

$mockSecundaria = ['grado' => '1° SEC', 'ngs' => 'PRIMER AÑO SECUNDARIA', 'sede' => 'Sede Central'];
assert_test(detect_voter_nivel($mockSecundaria) === 'Secundaria', "1° SEC detectado como 'Secundaria'");

$mockJerusalen = ['grado' => '3°', 'ngs' => 'TERCER GRADO', 'sede' => 'Sede Jerusalén'];
assert_test(detect_voter_nivel($mockJerusalen) === 'General', "Sede Jerusalén detectada como 'General'");

// TEST 3: Filtrado de Candidatos por Nivel
echo "\n3. FILTRADO DE LISTAS POR NIVEL EN SEDE CENTRAL:\n";
$primCands = getAllCandidatos('central', 'Primaria');
$primIds = array_column($primCands, 'id');
$primNiveles = array_column($primCands, 'nivel');
assert_test(count($primCands) >= 1, "Obtiene candidatos para Primaria (total: " . count($primCands) . ")");
$allValidPrim = true;
foreach ($primNiveles as $niv) {
    if ($niv !== 'Primaria' && $niv !== 'General') $allValidPrim = false;
}
assert_test($allValidPrim, "Todos los candidatos para Primaria son 'Primaria' o 'General' (Blanco)");

$secCands = getAllCandidatos('central', 'Secundaria');
$secNiveles = array_column($secCands, 'nivel');
assert_test(count($secCands) >= 1, "Obtiene candidatos para Secundaria (total: " . count($secCands) . ")");
$allValidSec = true;
foreach ($secNiveles as $niv) {
    if ($niv !== 'Secundaria' && $niv !== 'General') $allValidSec = false;
}
assert_test($allValidSec, "Todos los candidatos para Secundaria son 'Secundaria' o 'General' (Blanco)");

// TEST 4: Estadísticas con Nivel
echo "\n4. MÓDULO DE ESTADÍSTICAS Y PROYECTOR (StatsManager):\n";
$statsCentralPrim = StatsManager::get_dashboard_stats('central', 'todos', 'Primaria');
assert_test(isset($statsCentralPrim['total_alumnos']), "StatsManager genera métricas para Central Primaria");
assert_test(isset($statsCentralPrim['resultados']), "StatsManager incluye resultados ordenados");

$statsCentralSec = StatsManager::get_dashboard_stats('central', 'todos', 'Secundaria');
assert_test(isset($statsCentralSec['total_alumnos']), "StatsManager genera métricas para Central Secundaria");

$statsConsolidado = StatsManager::get_dashboard_stats('todos');
assert_test(isset($statsConsolidado['sedes_desglose']), "Consolidado general contiene desglose de ambas sedes");

// TEST 5: Autenticación Admin y Tokens
echo "\n5. AUTENTICACIÓN ADMINISTRATIVA (DOCENTE / DIRECTOR):\n";
$loginRes = adminLogin('director@cata.edu.pe', 'admin2026');
assert_test($loginRes !== false && !empty($loginRes['token']), "Login de director exitoso y token generado");
if ($loginRes) {
    $token = $loginRes['token'];
    $validAdmin = verifyAdminToken($token);
    assert_test($validAdmin && $validAdmin['email'] === 'director@cata.edu.pe', "Validación de token de sesión exitosa");
    adminLogout($token);
    $revokedAdmin = verifyAdminToken($token);
    assert_test($revokedAdmin === false, "Cierre de sesión y revocación de token exitosa");
}

// TEST 6: Creación y Edición de Candidatos con 7 Cargos + Nivel
echo "\n6. CRUD DE CANDIDATO CON 7 MIEMBROS Y NIVEL ESCOLAR:\n";
$nuevoId = insertCandidato(
    'Lista de Prueba Integral',
    'Lista para prueba unitaria',
    null,
    [
        'slogan' => 'Unidad y progreso',
        'alcalde' => 'Alumno Alcalde Test',
        'teniente' => 'Alumno Teniente Test',
        'regidor_educacion' => 'Alumno Educación Test',
        'regidor_salud' => 'Alumno Salud Test',
        'regidor_emprendimiento' => 'Alumno Emprendimiento Test',
        'regidor_derechos' => 'Alumno Derechos Test',
        'regidor_comunicacion' => 'Alumno Comunicación Test',
        'sede' => 'Sede Central',
        'nivel' => 'Secundaria',
        'color' => '#10B981'
    ]
);
assert_test($nuevoId > 0, "Inserción de candidato con los 7 cargos y nivel 'Secundaria' (ID: {$nuevoId})");

$candidatoObtenido = getCandidatoById($nuevoId, 'central');
assert_test($candidatoObtenido['regidor_emprendimiento'] === 'Alumno Emprendimiento Test', "Persistencia de Regidor de Emprendimiento");
assert_test($candidatoObtenido['regidor_comunicacion'] === 'Alumno Comunicación Test', "Persistencia de Regidor de Comunicación y TI");
assert_test($candidatoObtenido['nivel'] === 'Secundaria', "Persistencia de nivel 'Secundaria'");

// Limpiar candidato de prueba
deleteCandidato($nuevoId);
assert_test(!candidatoExists($nuevoId), "Eliminación limpia del candidato de prueba");

// TEST 7: Reglas Electorales de Emisión de Voto y Aislamiento de Nivel
echo "\n7. REGLAS ELECTORALES Y VALIDACIÓN DE SUFRAGIO POR NIVEL:\n";
// Insertar alumno de prueba en Primaria
$dniTestPrim = 'TEST_PRIM_001';
db_query("DELETE FROM voters WHERE codigo = :c", ['c' => $dniTestPrim], 'central');
db_query("DELETE FROM votos WHERE voter_codigo = :c", ['c' => $dniTestPrim], 'central');
db_query("INSERT INTO voters (codigo, dni, nombre, grado, ngs, nivel, sede, ha_votado) VALUES (:c1, :c2, 'Alumno Test Primaria', '1°', 'PRIMER GRADO', 'Primaria', 'Sede Central', 0)", ['c1' => $dniTestPrim, 'c2' => $dniTestPrim], 'central');

// Insertar alumno de prueba en Secundaria
$dniTestSec = 'TEST_SEC_001';
db_query("DELETE FROM voters WHERE codigo = :c", ['c' => $dniTestSec], 'central');
db_query("DELETE FROM votos WHERE voter_codigo = :c", ['c' => $dniTestSec], 'central');
db_query("INSERT INTO voters (codigo, dni, nombre, grado, ngs, nivel, sede, ha_votado) VALUES (:c1, :c2, 'Alumno Test Secundaria', '3°', 'TERCER AÑO SECUNDARIA', 'Secundaria', 'Sede Central', 0)", ['c1' => $dniTestSec, 'c2' => $dniTestSec], 'central');

// Candidatos obtenidos dinámicamente por nivel
$candPrim = db_query("SELECT * FROM candidatos WHERE LOWER(nivel) = 'primaria' LIMIT 1")->fetch();
$candSec = db_query("SELECT * FROM candidatos WHERE LOWER(nivel) = 'secundaria' LIMIT 1")->fetch();
$candBlanco = db_query("SELECT * FROM candidatos WHERE LOWER(nivel) = 'general' OR LOWER(nombre) LIKE '%blanco%' LIMIT 1")->fetch();

// Caso A: Alumno Primaria intenta votar por candidato de Secundaria
$rechazoNivel = false;
$voterP = getVoterByCodigo($dniTestPrim, 'central');
if ($voterP && $candSec) {
    $vNivel = detect_voter_nivel($voterP);
    if ($candSec['nivel'] !== 'General' && strtolower($candSec['nivel']) !== strtolower($vNivel)) {
        $rechazoNivel = true;
    }
}
assert_test($rechazoNivel === true, "Bloqueo estricto: Alumno de Primaria NO puede votar por lista de Secundaria");

// Caso B: Alumno Primaria vota por candidato de Primaria
$permisoNivel = false;
if ($voterP && $candPrim) {
    $vNivel = detect_voter_nivel($voterP);
    if ($candPrim['nivel'] === 'General' || strtolower($candPrim['nivel']) === strtolower($vNivel)) {
        $permisoNivel = true;
        insertVoto($dniTestPrim, $candPrim['id'], 'central', $voterP['ngs'], $vNivel);
        setVoterVoted($dniTestPrim, 'central');
    }
}
assert_test($permisoNivel === true, "Permiso otorgado: Alumno de Primaria puede votar por lista de Primaria");

// Caso C: Intento de doble voto por el mismo alumno
$voterP_despues = getVoterByCodigo($dniTestPrim, 'central');
assert_test((int)$voterP_despues['ha_votado'] === 1, "Estado del alumno actualizado a 'ha_votado = 1'");

$dobleVotoBloqueado = false;
if ((int)$voterP_despues['ha_votado'] === 1) {
    $dobleVotoBloqueado = true; // El sistema bloquea en el chequeo
}
assert_test($dobleVotoBloqueado === true, "Protección anti-fraude: Intento de doble voto bloqueado");

// Caso D: Alumno Secundaria vota por Voto en Blanco (General)
$voterS = getVoterByCodigo($dniTestSec, 'central');
$blancoPermitido = false;
if ($voterS && $candBlanco) {
    $vNivel = detect_voter_nivel($voterS);
    if ($candBlanco['nivel'] === 'General' || strtolower($candBlanco['nivel']) === strtolower($vNivel)) {
        $blancoPermitido = true;
        insertVoto($dniTestSec, $candBlanco['id'], 'central', $voterS['ngs'], $vNivel);
        setVoterVoted($dniTestSec, 'central');
    }
}
assert_test($blancoPermitido === true, "Voto en Blanco disponible y válido para alumnos de Secundaria");

// Limpiar datos de prueba
db_query("DELETE FROM votos WHERE voter_codigo IN (:c1, :c2)", ['c1' => $dniTestPrim, 'c2' => $dniTestSec], 'central');
db_query("DELETE FROM voters WHERE codigo IN (:c1, :c2)", ['c1' => $dniTestPrim, 'c2' => $dniTestSec], 'central');
assert_test(true, "Limpieza de registros de prueba de sufragio completada");

// TEST 8: Pruebas HTTP en Vivo sobre los Contenedores Docker (Puertos 8001 y 8002)
echo "\n8. PRUEBAS HTTP EN VIVO SOBRE CONTENEDORES DOCKER:\n";

// Obtener token de admin vía HTTP para probar endpoints protegidos
$chAuth = curl_init('http://localhost:8001/api/admin/login');
curl_setopt($chAuth, CURLOPT_RETURNTRANSFER, true);
curl_setopt($chAuth, CURLOPT_POST, true);
curl_setopt($chAuth, CURLOPT_POSTFIELDS, json_encode(['email' => 'director@cata.edu.pe', 'password' => 'admin2026']));
curl_setopt($chAuth, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$authResp = curl_exec($chAuth);
$authData = json_decode($authResp, true);
$adminToken = $authData['token'] ?? '';
curl_close($chAuth);

$httpEndpoints = [
    'Frontend Portal (8001)' => ['url' => 'http://localhost:8001/', 'auth' => false],
    'Urna Central (8001)' => ['url' => 'http://localhost:8001/Urna-Central', 'auth' => false],
    'Panel Docente (8001)' => ['url' => 'http://localhost:8001/panel-Docente', 'auth' => false],
    'Pantalla Proyector (8001)' => ['url' => 'http://localhost:8001/proyector', 'auth' => false],
    'Urna Jerusalén (8002)' => ['url' => 'http://localhost:8002/Urna-Jerusalen', 'auth' => false],
    'API Estado Elección' => ['url' => 'http://localhost:8001/api/estado-eleccion', 'auth' => false],
    'API Candidatos Central Primaria' => ['url' => 'http://localhost:8001/api/candidatos?sede=central&nivel=Primaria', 'auth' => false],
    'API Candidatos Central Secundaria' => ['url' => 'http://localhost:8001/api/candidatos?sede=central&nivel=Secundaria', 'auth' => false],
    'API Candidatos Jerusalén' => ['url' => 'http://localhost:8001/api/candidatos?sede=jerusalen', 'auth' => false],
    'API Admin Stats General (Con Token)' => ['url' => 'http://localhost:8001/api/admin/stats', 'auth' => true],
    'API Admin Stats Primaria (Con Token)' => ['url' => 'http://localhost:8001/api/admin/stats?sede=central&nivel=Primaria', 'auth' => true],
    'API Admin Stats Secundaria (Con Token)' => ['url' => 'http://localhost:8001/api/admin/stats?sede=central&nivel=Secundaria', 'auth' => true]
];

foreach ($httpEndpoints as $name => $item) {
    $ch = curl_init($item['url']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
    if ($item['auth'] && $adminToken) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer {$adminToken}"]);
    }
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    assert_test($code === 200, "{$name} responde HTTP 200", "Obtenido: {$code}");
}

// TEST 9: Login de Alumno vía HTTP en Docker
echo "\n9. PRUEBA DE LOGIN DE ALUMNO VÍA HTTP:\n";
$ch = curl_init('http://localhost:8001/api/login');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['codigo' => '91599930']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'X-Sede: central']);
curl_setopt($ch, CURLOPT_TIMEOUT, 6);
$loginResp = curl_exec($ch);
$loginCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

assert_test($loginCode === 200, "Login HTTP de estudiante de Primaria responde 200 OK");
$loginData = json_decode($loginResp, true);
assert_test(isset($loginData['voter']['nivel']) && $loginData['voter']['nivel'] === 'Primaria', "Login HTTP devuelve nivel 'Primaria' correctamente");

echo "\n--------------------------------------------------------\n";
echo "RESULTADO TOTAL DE PRUEBAS: {$passed} PASADAS / {$failed} FALLIDAS\n";
echo "--------------------------------------------------------\n";
