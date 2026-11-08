<?php
// perform_10_votes.php - Simula 10 votos reales mediante la API REST HTTP
$baseUrl = 'http://localhost:8001/api';

$votersToVote = [
    ['dni' => '90793699', 'nombre' => 'ALAN MULLISACA, HAYLEN CELESTE', 'cand_id' => 1, 'cand_nombre' => 'Lista 1: Innovación y Liderazgo CATA'],
    ['dni' => '91155441', 'nombre' => 'ALARCON CONDORI, Deysi Yamileth', 'cand_id' => 1, 'cand_nombre' => 'Lista 1: Innovación y Liderazgo CATA'],
    ['dni' => '91155595', 'nombre' => 'ALARCON CONDORI, Mileth Jazmin', 'cand_id' => 2, 'cand_nombre' => 'Lista 2: Fuerza y Juventud CATA'],
    ['dni' => '90511101', 'nombre' => 'ALARCON QUISPE, JUAN MANUEL', 'cand_id' => 2, 'cand_nombre' => 'Lista 2: Fuerza y Juventud CATA'],
    ['dni' => '90976788', 'nombre' => 'ALATA QUISPE, Brayan Max', 'cand_id' => 1, 'cand_nombre' => 'Lista 1: Innovación y Liderazgo CATA'],
    ['dni' => '79609178', 'nombre' => 'ALATA QUISPE, Jhordan Liam', 'cand_id' => 1, 'cand_nombre' => 'Lista 1: Innovación y Liderazgo CATA'],
    ['dni' => '91657180', 'nombre' => 'ALATA QUISPE, Mark Olger', 'cand_id' => 2, 'cand_nombre' => 'Lista 2: Fuerza y Juventud CATA'],
    ['dni' => '78669164', 'nombre' => 'ALAY PARI, ANDRE GAEL', 'cand_id' => 1, 'cand_nombre' => 'Lista 1: Innovación y Liderazgo CATA'],
    ['dni' => '79552433', 'nombre' => 'ALCANTARA CHAMBI, Joseph Lionel', 'cand_id' => 2, 'cand_nombre' => 'Lista 2: Fuerza y Juventud CATA'],
    ['dni' => '90423736', 'nombre' => 'ALVAREZ CCALLA, ANDRE PAUL', 'cand_id' => 1, 'cand_nombre' => 'Lista 1: Innovación y Liderazgo CATA']
];

echo "========================================================\n";
echo "PROCESANDO 10 SUFRAGIOS REALES VÍA HTTP API EN LA URNA...\n";
echo "========================================================\n";

$votosProcesados = 0;

foreach ($votersToVote as $idx => $v) {
    $num = $idx + 1;
    $dni = $v['dni'];
    $nombre = $v['nombre'];
    $candId = $v['cand_id'];
    $candNombre = $v['cand_nombre'];

    // 1. Paso 1: Autenticación del alumno en la cabina
    $chLogin = curl_init("{$baseUrl}/login");
    curl_setopt($chLogin, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chLogin, CURLOPT_POST, true);
    curl_setopt($chLogin, CURLOPT_POSTFIELDS, json_encode(['codigo' => $dni]));
    curl_setopt($chLogin, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'X-Sede: central']);
    $loginResp = curl_exec($chLogin);
    $loginCode = curl_getinfo($chLogin, CURLINFO_HTTP_CODE);
    curl_close($chLogin);

    $loginData = json_decode($loginResp, true);
    if ($loginCode !== 200 || empty($loginData['success'])) {
        echo "❌ [{$num}/10] Error en login para {$nombre} ({$dni}): " . ($loginData['error'] ?? 'Fallo HTTP') . "\n";
        continue;
    }

    $voterCodigo = $loginData['voter']['codigo'];
    $voterNivel = $loginData['voter']['nivel'];

    // 2. Paso 2: Emisión del voto secreto
    $chVote = curl_init("{$baseUrl}/voto");
    curl_setopt($chVote, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chVote, CURLOPT_POST, true);
    curl_setopt($chVote, CURLOPT_POSTFIELDS, json_encode([
        'voter_codigo' => $voterCodigo,
        'candidato_id' => $candId
    ]));
    curl_setopt($chVote, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'X-Sede: central']);
    $voteResp = curl_exec($chVote);
    $voteCode = curl_getinfo($chVote, CURLINFO_HTTP_CODE);
    curl_close($chVote);

    $voteData = json_decode($voteResp, true);
    if ($voteCode === 200 && !empty($voteData['success'])) {
        echo "🗳️ [{$num}/10] VOTO EXITOSO: {$nombre} (DNI: {$dni}, Nivel: {$voterNivel}) -> {$candNombre}\n";
        $votosProcesados++;
    } else {
        echo "❌ [{$num}/10] Error al votar para {$nombre}: " . ($voteData['error'] ?? 'Fallo HTTP') . "\n";
    }
}

echo "\n========================================================\n";
echo "RESULTADOS DE LA VOTACIÓN EN TIEMPO REAL:\n";
echo "========================================================\n";
echo "Total de votos emitidos y procesados: {$votosProcesados} de 10\n\n";

// Consultar estadísticas de la elección vía API
$chAuth = curl_init("{$baseUrl}/admin/login");
curl_setopt($chAuth, CURLOPT_RETURNTRANSFER, true);
curl_setopt($chAuth, CURLOPT_POST, true);
curl_setopt($chAuth, CURLOPT_POSTFIELDS, json_encode(['email' => 'director@cata.edu.pe', 'password' => 'admin2026']));
curl_setopt($chAuth, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$authResp = curl_exec($chAuth);
$authData = json_decode($authResp, true);
$token = $authData['token'] ?? '';
curl_close($chAuth);

$chStats = curl_init("{$baseUrl}/admin/stats?sede=central&nivel=Primaria");
curl_setopt($chStats, CURLOPT_RETURNTRANSFER, true);
curl_setopt($chStats, CURLOPT_HTTPHEADER, ["Authorization: Bearer {$token}"]);
$statsResp = curl_exec($chStats);
curl_close($chStats);

$stats = json_decode($statsResp, true);
echo "Resultados Oficiales Sede Central (Primaria):\n";
echo " - Total Padrón Primaria: {$stats['total_alumnos']} alumnos\n";
echo " - Votos Emitidos en Urna: {$stats['votos_emitidos']}\n";
echo " - Participación: {$stats['porcentaje_participacion']}%\n\n";
echo "Desglose por Lista Electoral:\n";
foreach ($stats['resultados'] as $r) {
    echo " 🥇 {$r['nombre']}: {$r['votos']} votos ({$r['porcentaje']}%)\n";
}

