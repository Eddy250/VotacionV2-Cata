<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/models.php';

$host = (file_exists('/.dockerenv')) ? 'host.docker.internal' : '127.0.0.1';
$pdo = new PDO("mysql:host={$host};port=3307;dbname=votacion_cata", 'root', 'cata_root_secret_pass');

$existsSec = $pdo->query("SELECT 1 FROM candidatos WHERE LOWER(nivel) = 'secundaria'")->fetchColumn();
if (!$existsSec) {
    insertCandidato(
        'Lista Juventud en Acción (Secundaria)',
        'Lista de nivel secundaria para el municipio escolar.',
        'img/cand_6ac8425b9847a2.50632808_f.png',
        [
            'slogan' => '¡Voz y liderazgo estudiantil en secundaria!',
            'alcalde' => 'María Belén González',
            'teniente' => 'José Carlos Flores',
            'regidor_educacion' => 'Lucía Ramos',
            'regidor_salud' => 'David Chura',
            'regidor_emprendimiento' => 'Elena Vargas',
            'regidor_derechos' => 'Sofía Apaza',
            'regidor_comunicacion' => 'Raúl Castro',
            'sede' => 'Sede Central',
            'nivel' => 'Secundaria',
            'color' => '#8B5CF6'
        ]
    );
    echo "Lista de Secundaria agregada.\n";
} else {
    echo "Lista de Secundaria ya existe.\n";
}
