<?php
// migrate_sqlite_to_mysql.php - Migrador Universal de SQLite a MySQL para CATA 2026
// Puede ejecutarse desde CLI: php backend/migrate_sqlite_to_mysql.php
// O invocarse desde la API de administración.

require_once __DIR__ . '/config.php';

function ejecutarMigracionSqliteAMysql($options = []) {
    $verbose = $options['verbose'] ?? (php_sapi_name() === 'cli');
    $log = [];
    $addLog = function($msg) use (&$log, $verbose) {
        $log[] = $msg;
        if ($verbose) echo $msg . "\n";
    };

    $addLog("====================================================");
    $addLog("🚀 INICIANDO MIGRACIÓN OFICIAL: SQLITE -> MYSQL CATA 2026");
    $addLog("====================================================");

    // 1. Verificar archivos SQLite origen
    $centralFile = DB_FILE_CENTRAL;
    $jeruFile = DB_FILE_JERUSALEN;

    if (!file_exists($centralFile) && file_exists(DB_FILE_LEGACY)) {
        @copy(DB_FILE_LEGACY, $centralFile);
    }

    if (!file_exists($centralFile)) {
        throw new Exception("No se encontró el archivo SQLite origen: {$centralFile}");
    }

    $addLog("📂 Origen Central: {$centralFile}");
    if (file_exists($jeruFile)) {
        $addLog("📂 Origen Jerusalén: {$jeruFile}");
    }

    // 2. Conectar a MySQL destino
    $host = DB_HOST;
    $port = DB_PORT;
    $dbName = DB_NAME;
    $user = DB_USER;
    $pass = DB_PASS;

    $addLog("🔌 Conectando a MySQL en {$host}:{$port} (BD: '{$dbName}')...");

    // Conectar a MySQL y crear la BD si no existe
    try {
        $rootPdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        unset($rootPdo);
        $addLog("✅ Base de datos '{$dbName}' verificada / creada con UTF-8 MB4.");
    } catch (PDOException $e) {
        $addLog("⚠️ Conexión directa a servidor (sin BD) falló o no tiene permiso CREATE DATABASE. Intentando conectar a la BD existente...");
    }

    $mysqlPdo = new PDO("mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]);
    $addLog("✅ Conexión PDO a MySQL establecida con éxito.");

    // 3. Crear tablas en MySQL si no existen
    $addLog("🛠️ Creando / verificando tablas en MySQL...");
    $mysqlPdo->exec("
        CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(150) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            nombre VARCHAR(150) NOT NULL,
            rol VARCHAR(50) DEFAULT 'profesor',
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS admin_tokens (
            token VARCHAR(100) PRIMARY KEY,
            admin_id INT NOT NULL,
            email VARCHAR(150) NOT NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_admin_id (admin_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS voters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            codigo VARCHAR(50) NOT NULL,
            codigo_original VARCHAR(50) NULL,
            dni VARCHAR(20) NULL,
            nombre VARCHAR(200) NOT NULL,
            ap_paterno VARCHAR(100) NULL,
            ap_materno VARCHAR(100) NULL,
            nombres VARCHAR(100) NULL,
            sexo VARCHAR(10) NULL,
            grado VARCHAR(50) NULL,
            seccion VARCHAR(20) NULL,
            ngs VARCHAR(50) NULL,
            nivel VARCHAR(50) DEFAULT 'Primaria',
            sede VARCHAR(100) DEFAULT 'Sede Central',
            email VARCHAR(150) NULL,
            ha_votado TINYINT(1) DEFAULT 0,
            fecha_voto TIMESTAMP NULL,
            UNIQUE KEY uq_voter_codigo_sede (codigo, sede),
            INDEX idx_codigo (codigo),
            INDEX idx_dni (dni),
            INDEX idx_sede (sede),
            INDEX idx_nivel (nivel),
            INDEX idx_ngs (ngs)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS candidatos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            descripcion TEXT NULL,
            foto VARCHAR(255) NULL,
            slogan VARCHAR(255) NULL,
            logo VARCHAR(255) NULL,
            propuestas TEXT NULL,
            alcalde VARCHAR(200) NULL,
            teniente VARCHAR(200) NULL,
            regidor_educacion VARCHAR(200) NULL,
            regidor_salud VARCHAR(200) NULL,
            regidor_emprendimiento VARCHAR(200) NULL,
            regidor_derechos VARCHAR(200) NULL,
            regidor_comunicacion VARCHAR(200) NULL,
            alcalde_foto VARCHAR(255) NULL,
            teniente_foto VARCHAR(255) NULL,
            regidor_educacion_foto VARCHAR(255) NULL,
            regidor_salud_foto VARCHAR(255) NULL,
            regidor_emprendimiento_foto VARCHAR(255) NULL,
            regidor_derechos_foto VARCHAR(255) NULL,
            regidor_comunicacion_foto VARCHAR(255) NULL,
            propuestas_pdf VARCHAR(255) NULL,
            sede VARCHAR(100) DEFAULT 'Sede Central',
            nivel VARCHAR(50) DEFAULT 'General',
            color VARCHAR(50) NULL,
            INDEX idx_sede (sede),
            INDEX idx_nivel (nivel)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS votos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            candidato_id INT NOT NULL,
            voter_codigo VARCHAR(50) NOT NULL,
            sede VARCHAR(100) NULL,
            ngs VARCHAR(50) NULL,
            nivel VARCHAR(50) NULL,
            fecha_voto TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_voto_voter_sede (voter_codigo, sede),
            INDEX idx_candidato (candidato_id),
            INDEX idx_voter (voter_codigo),
            INDEX idx_sede (sede)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS configuracion (
            clave VARCHAR(50) PRIMARY KEY,
            valor TEXT NOT NULL,
            descripcion TEXT NULL,
            fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 4. Migración de datos: Admins
    $addLog("\n👤 Migrando Docentes y Administradores...");
    $sqliteCentral = new PDO('sqlite:' . $centralFile);
    $sqliteCentral->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $adminsSqlite = $sqliteCentral->query("SELECT * FROM admins")->fetchAll(PDO::FETCH_ASSOC);
    $adminStmt = $mysqlPdo->prepare("
        INSERT INTO admins (email, password_hash, nombre, rol)
        VALUES (:email, :hash, :nombre, :rol)
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), nombre = VALUES(nombre), rol = VALUES(rol)
    ");
    $adminsMigrados = 0;
    foreach ($adminsSqlite as $adm) {
        $adminStmt->execute([
            'email' => $adm['email'],
            'hash' => $adm['password_hash'],
            'nombre' => $adm['nombre'],
            'rol' => $adm['rol'] ?? 'profesor'
        ]);
        $adminsMigrados++;
    }
    $addLog("   -> {$adminsMigrados} administradores migrados.");

    // 5. Migración de Candidatos (Central y Jerusalén)
    $addLog("\n🗳️ Migrando Listas Electorales y Candidatos...");
    $candidateMap = []; // [$sedeSlug][$oldId] = $newId

    $sedesSource = [
        'central' => ['file' => $centralFile, 'name' => 'Sede Central'],
        'jerusalen' => ['file' => $jeruFile, 'name' => 'Sede Jerusalén']
    ];

    $candInsertStmt = $mysqlPdo->prepare("
        INSERT INTO candidatos (
            nombre, descripcion, foto, slogan, logo, propuestas,
            alcalde, teniente, regidor_educacion, regidor_salud, regidor_emprendimiento, regidor_derechos, regidor_comunicacion,
            alcalde_foto, teniente_foto, regidor_educacion_foto, regidor_salud_foto, regidor_emprendimiento_foto, regidor_derechos_foto, regidor_comunicacion_foto,
            propuestas_pdf, sede, nivel, color
        ) VALUES (
            :nombre, :descripcion, :foto, :slogan, :logo, :propuestas,
            :alcalde, :teniente, :regidor_educacion, :regidor_salud, :regidor_emprendimiento, :regidor_derechos, :regidor_comunicacion,
            :alcalde_foto, :teniente_foto, :regidor_educacion_foto, :regidor_salud_foto, :regidor_emprendimiento_foto, :regidor_derechos_foto, :regidor_comunicacion_foto,
            :propuestas_pdf, :sede, :nivel, :color
        )
    ");

    $candidatosMigrados = 0;
    foreach ($sedesSource as $slug => $sInfo) {
        if (!file_exists($sInfo['file'])) continue;
        $dbLite = new PDO('sqlite:' . $sInfo['file']);
        $dbLite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $colsStmt = $dbLite->query("PRAGMA table_info(candidatos)");
        $cols = array_column($colsStmt->fetchAll(PDO::FETCH_ASSOC), 'name');

        $candList = $dbLite->query("SELECT * FROM candidatos ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($candList as $c) {
            $oldId = $c['id'];
            $nombre = $c['nombre'];
            $sede = !empty($c['sede']) ? $c['sede'] : $sInfo['name'];
            $nivel = !empty($c['nivel']) ? $c['nivel'] : 'General';

            // Verificar si este candidato ya existe en MySQL
            $chkStmt = $mysqlPdo->prepare("SELECT id FROM candidatos WHERE nombre = :nombre AND sede = :sede AND nivel = :nivel LIMIT 1");
            $chkStmt->execute(['nombre' => $nombre, 'sede' => $sede, 'nivel' => $nivel]);
            $existingId = $chkStmt->fetchColumn();

            if ($existingId) {
                $newId = (int)$existingId;
                // Actualizar datos
                $updateCand = $mysqlPdo->prepare("
                    UPDATE candidatos SET
                        descripcion = :descripcion, foto = :foto, slogan = :slogan, logo = :logo, propuestas = :propuestas,
                        alcalde = :alcalde, teniente = :teniente, regidor_educacion = :regidor_educacion, regidor_salud = :regidor_salud,
                        regidor_emprendimiento = :regidor_emprendimiento, regidor_derechos = :regidor_derechos, regidor_comunicacion = :regidor_comunicacion,
                        alcalde_foto = :alcalde_foto, teniente_foto = :teniente_foto, regidor_educacion_foto = :regidor_educacion_foto,
                        regidor_salud_foto = :regidor_salud_foto, regidor_emprendimiento_foto = :regidor_emprendimiento_foto,
                        regidor_derechos_foto = :regidor_derechos_foto, regidor_comunicacion_foto = :regidor_comunicacion_foto,
                        propuestas_pdf = :propuestas_pdf, color = :color
                    WHERE id = :id
                ");
                $updateCand->execute([
                    'descripcion' => $c['descripcion'] ?? null,
                    'foto' => $c['foto'] ?? null,
                    'slogan' => $c['slogan'] ?? null,
                    'logo' => $c['logo'] ?? null,
                    'propuestas' => $c['propuestas'] ?? null,
                    'alcalde' => $c['alcalde'] ?? null,
                    'teniente' => $c['teniente'] ?? null,
                    'regidor_educacion' => $c['regidor_educacion'] ?? null,
                    'regidor_salud' => $c['regidor_salud'] ?? null,
                    'regidor_emprendimiento' => $c['regidor_emprendimiento'] ?? null,
                    'regidor_derechos' => $c['regidor_derechos'] ?? null,
                    'regidor_comunicacion' => $c['regidor_comunicacion'] ?? null,
                    'alcalde_foto' => $c['alcalde_foto'] ?? null,
                    'teniente_foto' => $c['teniente_foto'] ?? null,
                    'regidor_educacion_foto' => $c['regidor_educacion_foto'] ?? null,
                    'regidor_salud_foto' => $c['regidor_salud_foto'] ?? null,
                    'regidor_emprendimiento_foto' => $c['regidor_emprendimiento_foto'] ?? null,
                    'regidor_derechos_foto' => $c['regidor_derechos_foto'] ?? null,
                    'regidor_comunicacion_foto' => $c['regidor_comunicacion_foto'] ?? null,
                    'propuestas_pdf' => $c['propuestas_pdf'] ?? null,
                    'color' => $c['color'] ?? null,
                    'id' => $newId
                ]);
            } else {
                $candInsertStmt->execute([
                    'nombre' => $nombre,
                    'descripcion' => $c['descripcion'] ?? null,
                    'foto' => $c['foto'] ?? null,
                    'slogan' => $c['slogan'] ?? null,
                    'logo' => $c['logo'] ?? null,
                    'propuestas' => $c['propuestas'] ?? null,
                    'alcalde' => $c['alcalde'] ?? null,
                    'teniente' => $c['teniente'] ?? null,
                    'regidor_educacion' => $c['regidor_educacion'] ?? null,
                    'regidor_salud' => $c['regidor_salud'] ?? null,
                    'regidor_emprendimiento' => $c['regidor_emprendimiento'] ?? null,
                    'regidor_derechos' => $c['regidor_derechos'] ?? null,
                    'regidor_comunicacion' => $c['regidor_comunicacion'] ?? null,
                    'alcalde_foto' => $c['alcalde_foto'] ?? null,
                    'teniente_foto' => $c['teniente_foto'] ?? null,
                    'regidor_educacion_foto' => $c['regidor_educacion_foto'] ?? null,
                    'regidor_salud_foto' => $c['regidor_salud_foto'] ?? null,
                    'regidor_emprendimiento_foto' => $c['regidor_emprendimiento_foto'] ?? null,
                    'regidor_derechos_foto' => $c['regidor_derechos_foto'] ?? null,
                    'regidor_comunicacion_foto' => $c['regidor_comunicacion_foto'] ?? null,
                    'propuestas_pdf' => $c['propuestas_pdf'] ?? null,
                    'sede' => $sede,
                    'nivel' => $nivel,
                    'color' => $c['color'] ?? null
                ]);
                $newId = (int)$mysqlPdo->lastInsertId();
            }

            $candidateMap[$slug][$oldId] = $newId;
            $candidatosMigrados++;
            $addLog("   [{$sede}] '{$nombre}' ({$nivel}) -> ID MySQL: {$newId}");
        }
    }

    // 6. Migración del Padrón Electoral de Votantes
    $addLog("\n👥 Migrando Padrón Electoral (Estudiantes)...");
    $voterStmt = $mysqlPdo->prepare("
        INSERT INTO voters (
            codigo, codigo_original, dni, nombre, ap_paterno, ap_materno, nombres,
            sexo, grado, seccion, ngs, nivel, sede, email, ha_votado, fecha_voto
        ) VALUES (
            :codigo, :codigo_original, :dni, :nombre, :ap_paterno, :ap_materno, :nombres,
            :sexo, :grado, :seccion, :ngs, :nivel, :sede, :email, :ha_votado, :fecha_voto
        )
        ON DUPLICATE KEY UPDATE
            codigo_original = VALUES(codigo_original),
            dni = VALUES(dni),
            nombre = VALUES(nombre),
            ap_paterno = VALUES(ap_paterno),
            ap_materno = VALUES(ap_materno),
            nombres = VALUES(nombres),
            sexo = VALUES(sexo),
            grado = VALUES(grado),
            seccion = VALUES(seccion),
            ngs = VALUES(ngs),
            nivel = VALUES(nivel),
            email = VALUES(email),
            ha_votado = VALUES(ha_votado),
            fecha_voto = VALUES(fecha_voto)
    ");

    $votersMigrados = 0;
    foreach ($sedesSource as $slug => $sInfo) {
        if (!file_exists($sInfo['file'])) continue;
        $dbLite = new PDO('sqlite:' . $sInfo['file']);
        $dbLite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $votersList = $dbLite->query("SELECT * FROM voters ORDER BY nombre ASC")->fetchAll(PDO::FETCH_ASSOC);
        $sedeVoters = 0;
        foreach ($votersList as $v) {
            $voterStmt->execute([
                'codigo' => $v['codigo'],
                'codigo_original' => $v['codigo_original'] ?? null,
                'dni' => $v['dni'] ?? null,
                'nombre' => $v['nombre'],
                'ap_paterno' => $v['ap_paterno'] ?? null,
                'ap_materno' => $v['ap_materno'] ?? null,
                'nombres' => $v['nombres'] ?? null,
                'sexo' => $v['sexo'] ?? null,
                'grado' => $v['grado'] ?? null,
                'seccion' => $v['seccion'] ?? null,
                'ngs' => $v['ngs'] ?? null,
                'nivel' => !empty($v['nivel']) ? $v['nivel'] : detect_voter_nivel($v),
                'sede' => !empty($v['sede']) ? $v['sede'] : $sInfo['name'],
                'email' => $v['email'] ?? null,
                'ha_votado' => (int)($v['ha_votado'] ?? 0),
                'fecha_voto' => !empty($v['fecha_voto']) ? $v['fecha_voto'] : null
            ]);
            $sedeVoters++;
            $votersMigrados++;
        }
        $addLog("   -> {$sedeVoters} estudiantes migrados desde {$sInfo['name']}.");
    }

    // 7. Migración de Votos
    $addLog("\n✉️ Migrando Votos Emitidos...");
    $votoStmt = $mysqlPdo->prepare("
        INSERT INTO votos (candidato_id, voter_codigo, sede, ngs, nivel, fecha_voto)
        VALUES (:candidato_id, :voter_codigo, :sede, :ngs, :nivel, :fecha_voto)
        ON DUPLICATE KEY UPDATE candidato_id = VALUES(candidato_id), fecha_voto = VALUES(fecha_voto)
    ");

    $votosMigrados = 0;
    foreach ($sedesSource as $slug => $sInfo) {
        if (!file_exists($sInfo['file'])) continue;
        $dbLite = new PDO('sqlite:' . $sInfo['file']);
        $dbLite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $votosList = $dbLite->query("SELECT * FROM votos ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($votosList as $vt) {
            $oldCandId = $vt['candidato_id'];
            $newCandId = $candidateMap[$slug][$oldCandId] ?? $oldCandId;
            $votoStmt->execute([
                'candidato_id' => $newCandId,
                'voter_codigo' => $vt['voter_codigo'],
                'sede' => !empty($vt['sede']) ? $vt['sede'] : $sInfo['name'],
                'ngs' => $vt['ngs'] ?? null,
                'nivel' => $vt['nivel'] ?? null,
                'fecha_voto' => !empty($vt['fecha_voto']) ? $vt['fecha_voto'] : date('Y-m-d H:i:s')
            ]);
            $votosMigrados++;
        }
    }
    $addLog("   -> {$votosMigrados} votos emitidos migrados.");

    // 8. Migración de Configuración
    $addLog("\n⚙️ Migrando Configuración...");
    $cfgList = $sqliteCentral->query("SELECT * FROM configuracion")->fetchAll(PDO::FETCH_ASSOC);
    $cfgStmt = $mysqlPdo->prepare("
        INSERT INTO configuracion (clave, valor, descripcion)
        VALUES (:clave, :valor, :descripcion)
        ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = VALUES(descripcion)
    ");
    $cfgCount = 0;
    foreach ($cfgList as $cf) {
        $cfgStmt->execute([
            'clave' => $cf['clave'],
            'valor' => $cf['valor'],
            'descripcion' => $cf['descripcion'] ?? ''
        ]);
        $cfgCount++;
    }
    $addLog("   -> {$cfgCount} parámetros de configuración migrados.");

    // 9. Resumen Final de Verificación
    $totalVotersMySQL = (int)$mysqlPdo->query("SELECT COUNT(*) FROM voters")->fetchColumn();
    $totalCandMySQL = (int)$mysqlPdo->query("SELECT COUNT(*) FROM candidatos")->fetchColumn();
    $totalVotosMySQL = (int)$mysqlPdo->query("SELECT COUNT(*) FROM votos")->fetchColumn();
    $totalAdminsMySQL = (int)$mysqlPdo->query("SELECT COUNT(*) FROM admins")->fetchColumn();

    $addLog("\n====================================================");
    $addLog("✨ MIGRACIÓN A MYSQL COMPLETADA CON ÉXITO");
    $addLog("====================================================");
    $addLog("📊 Resumen en MySQL ('{$dbName}'):");
    $addLog("   - Total Docentes / Admins: {$totalAdminsMySQL}");
    $addLog("   - Total Estudiantes en Padrón: {$totalVotersMySQL}");
    $addLog("   - Total Listas Electorales: {$totalCandMySQL}");
    $addLog("   - Total Votos Emitidos: {$totalVotosMySQL}");
    $addLog("====================================================\n");

    return [
        'success' => true,
        'message' => 'Migración completada exitosamente a MySQL',
        'database' => $dbName,
        'host' => $host,
        'port' => $port,
        'admins' => $totalAdminsMySQL,
        'voters' => $totalVotersMySQL,
        'candidates' => $totalCandMySQL,
        'votes' => $totalVotosMySQL,
        'log' => $log
    ];
}

// Ejecutar directamente si se llama desde la terminal
if (php_sapi_name() === 'cli' && isset($argv[0]) && realpath($argv[0]) === realpath(__FILE__)) {
    try {
        ejecutarMigracionSqliteAMysql();
    } catch (Exception $e) {
        echo "[ERROR FATAL]: " . $e->getMessage() . "\n";
        exit(1);
    }
}
