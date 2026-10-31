<?php
require_once __DIR__ . '/config.php';

try {
    // 1. Limpiar propuestas_pdf
    $stmt = $pdo->query("SELECT id, propuestas_pdf FROM candidatos WHERE propuestas_pdf IS NOT NULL");
    $rows = $stmt->fetchAll();
    foreach ($rows as $r) {
        $val = $r['propuestas_pdf'];
        $clean = preg_replace('#^/*(static/)+#i', '', $val);
        $clean = ltrim($clean, '/');
        if ($val !== $clean) {
            $up = $pdo->prepare("UPDATE candidatos SET propuestas_pdf = :p WHERE id = :id");
            $up->execute(['p' => $clean, 'id' => $r['id']]);
            echo "Actualizado candidato {$r['id']} PDF: '$val' => '$clean'\n";
        }
    }

    // 2. Limpiar fotos
    $fotoCols = ['foto', 'logo', 'alcalde_foto', 'teniente_foto', 'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_derechos_foto'];
    foreach ($fotoCols as $col) {
        $stmt = $pdo->query("SELECT id, {$col} FROM candidatos WHERE {$col} IS NOT NULL");
        $rows = $stmt->fetchAll();
        foreach ($rows as $r) {
            $val = $r[$col];
            $clean = preg_replace('#^/*(static/)+#i', '', $val);
            $clean = ltrim($clean, '/');
            if ($val !== $clean) {
                $up = $pdo->prepare("UPDATE candidatos SET {$col} = :v WHERE id = :id");
                $up->execute(['v' => $clean, 'id' => $r['id']]);
                echo "Actualizado candidato {$r['id']} {$col}: '$val' => '$clean'\n";
            }
        }
    }
    echo "Sanitización completada con éxito.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

