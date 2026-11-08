<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/models.php';

$host = (file_exists('/.dockerenv')) ? 'host.docker.internal' : '127.0.0.1';
$pdo = new PDO("mysql:host={$host};port=3307;dbname=votacion_cata", 'root', 'cata_root_secret_pass', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

echo "========================================================\n";
echo "1. LIMPIANDO TABLAS DE PARTIDOS Y VOTOS EN MYSQL...\n";
echo "========================================================\n";

$pdo->exec("DELETE FROM votos");
$pdo->exec("DELETE FROM candidatos");
$pdo->exec("ALTER TABLE candidatos AUTO_INCREMENT = 1");
$pdo->exec("ALTER TABLE votos AUTO_INCREMENT = 1");
$pdo->exec("UPDATE voters SET ha_votado = 0, fecha_voto = NULL");

echo "✅ Todos los partidos y votos eliminados. Base de datos limpia y lista.\n\n";

echo "========================================================\n";
echo "2. CREANDO 2 PARTIDOS CON TODOS SUS CAMPOS COMPLETOS...\n";
echo "========================================================\n";

// Partido 1
$p1Id = insertCandidato(
    'Lista 1: Innovación y Liderazgo CATA',
    'Lista comprometida con el desarrollo académico, cultural, deportivo y ambiental de la comunidad estudiantil CATA.',
    'img/francovidal.png',
    [
        'slogan' => '¡Con paso firme hacia la excelencia y la innovación estudiantil!',
        'logo' => 'img/logo-partido-1.png',
        'propuestas' => "1. Equipamiento de áreas deportivas y recreativas.\n2. Talleres de robótica y tecnología aplicada.\n3. Campaña escolar de reciclaje y cuidado del medio ambiente.\n4. Botiquín de salud y primeros auxilios en cada aula.\n5. Espacio de orientación y defensa de los derechos del estudiante.",
        'alcalde' => 'Valeria Sofía Mendoza Paredes',
        'teniente' => 'Joaquín Ignacio Romero Quispe',
        'regidor_educacion' => 'Diego Alonso Castillo Morales',
        'regidor_salud' => 'Camila Lucía Fernández Vega',
        'regidor_emprendimiento' => 'Mateo Sebastián Huamán Rivas',
        'regidor_derechos' => 'Adriana Belén Rojas Torres',
        'regidor_comunicacion' => 'Lucas Gabriel Benítez Chávez',
        'alcalde_foto' => 'img/francovidal.png',
        'teniente_foto' => 'img/cand_6ac8425b9847a2.50632808_f.png',
        'regidor_educacion_foto' => 'img/cand_6ac84247389103.05975636_Capturadepantalla2026-08-28212638.png',
        'regidor_salud_foto' => 'img/cand_6ac8425b9847a2.50632808_f.png',
        'regidor_emprendimiento_foto' => 'img/francovidal.png',
        'regidor_derechos_foto' => 'img/cand_6ac8425b9847a2.50632808_f.png',
        'regidor_comunicacion_foto' => 'img/cand_6ac84247389103.05975636_Capturadepantalla2026-08-28212638.png',
        'color' => '#1B3A8C',
        'sede' => 'Sede Central',
        'nivel' => 'Primaria'
    ]
);
echo "✅ Partido 1 Creado: ID {$p1Id} - 'Lista 1: Innovación y Liderazgo CATA' (Nivel: Primaria, Sede: Sede Central)\n";

// Partido 2
$p2Id = insertCandidato(
    'Lista 2: Fuerza y Juventud CATA',
    'Representamos la voz de cada estudiante con propuestas reales, transparencia y participación democrática activa.',
    'img/cand_6ac84247389103.05975636_Capturadepantalla2026-08-28212638.png',
    [
        'slogan' => '¡Unidos por el cambio, juntos hacemos historia democrática!',
        'logo' => 'img/logo-partido-2.png',
        'propuestas' => "1. Torneo inter-aulas de fútbol, vóley y ajedrez escolar.\n2. Periódico y radio escolar digital 'Voz CATA'.\n3. Biohuerto escolar y feria de ciencias estudiantil.\n4. Programa de tutoría y apoyo entre compañeros de clase.\n5. Campaña contra el acoso escolar y fortalecimiento de la convivencia.",
        'alcalde' => 'Franco Alejandro Vidal Gutiérrez',
        'teniente' => 'Mariana Nicole Espinoza Sánchez',
        'regidor_educacion' => 'Luciana Beatriz Peña Cruz',
        'regidor_salud' => 'Nicolás Eduardo Silva Ramos',
        'regidor_emprendimiento' => 'Andrea Ximena Vargas León',
        'regidor_derechos' => 'Gabriel Leonardo Cruz Flores',
        'regidor_comunicacion' => 'Zoe Antonella Reyes Díaz',
        'alcalde_foto' => 'img/cand_6ac84247389103.05975636_Capturadepantalla2026-08-28212638.png',
        'teniente_foto' => 'img/cand_6ac8425b9847a2.50632808_f.png',
        'regidor_educacion_foto' => 'img/francovidal.png',
        'regidor_salud_foto' => 'img/cand_6ac8425b9847a2.50632808_f.png',
        'regidor_emprendimiento_foto' => 'img/cand_6ac84247389103.05975636_Capturadepantalla2026-08-28212638.png',
        'regidor_derechos_foto' => 'img/cand_6ac8425b9847a2.50632808_f.png',
        'regidor_comunicacion_foto' => 'img/francovidal.png',
        'color' => '#10B981',
        'sede' => 'Sede Central',
        'nivel' => 'Primaria'
    ]
);
echo "✅ Partido 2 Creado: ID {$p2Id} - 'Lista 2: Fuerza y Juventud CATA' (Nivel: Primaria, Sede: Sede Central)\n";

// Voto en Blanco (opción cívica obligatoria ONPE)
$pBlancoId = insertCandidato(
    'Voto en Blanco',
    'Opción cívica democrática oficial',
    null,
    [
        'sede' => 'Sede Central',
        'nivel' => 'General',
        'color' => '#94A3B8'
    ]
);
echo "✅ Opción Cívica Creada: ID {$pBlancoId} - 'Voto en Blanco' (General)\n\n";

$cands = $pdo->query("SELECT id, nombre, sede, nivel, alcalde, teniente, color FROM candidatos ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
echo "Candidatos registrados en MySQL:\n";
print_r($cands);

