<?php
// ==========================================
// INICIALIZACIÓN, MIGRACIÓN Y TABLAS
// ==========================================

function crearTablasSiNoExisten()
{
    global $pdo;
    $isMysql = (DB_DRIVER === 'mysql');

    if ($isMysql) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                nombre VARCHAR(150) NOT NULL,
                rol VARCHAR(50) DEFAULT 'profesor',
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS admin_tokens (
                token VARCHAR(100) PRIMARY KEY,
                admin_id INT NOT NULL,
                email VARCHAR(150) NOT NULL,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS voters (
                codigo VARCHAR(50) PRIMARY KEY,
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
                sede VARCHAR(100) DEFAULT 'Sede Principal',
                email VARCHAR(150) NULL,
                ha_votado TINYINT(1) DEFAULT 0,
                fecha_voto TIMESTAMP NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
                regidor_derechos VARCHAR(200) NULL,
                alcalde_foto VARCHAR(255) NULL,
                teniente_foto VARCHAR(255) NULL,
                regidor_educacion_foto VARCHAR(255) NULL,
                regidor_salud_foto VARCHAR(255) NULL,
                regidor_derechos_foto VARCHAR(255) NULL,
                propuestas_pdf VARCHAR(255) NULL,
                color VARCHAR(50) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS votos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                candidato_id INT NOT NULL,
                voter_codigo VARCHAR(50) NOT NULL UNIQUE,
                sede VARCHAR(100) NULL,
                ngs VARCHAR(50) NULL,
                fecha_voto TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
                FOREIGN KEY (voter_codigo) REFERENCES voters(codigo) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS configuracion (
                clave VARCHAR(50) PRIMARY KEY,
                valor TEXT NOT NULL,
                descripcion TEXT NULL,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    } else {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                nombre TEXT NOT NULL,
                rol TEXT DEFAULT 'profesor',
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS admin_tokens (
                token TEXT PRIMARY KEY,
                admin_id INTEGER NOT NULL,
                email TEXT NOT NULL,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS voters (
                codigo TEXT PRIMARY KEY,
                codigo_original TEXT,
                dni TEXT,
                nombre TEXT NOT NULL,
                ap_paterno TEXT,
                ap_materno TEXT,
                nombres TEXT,
                sexo TEXT,
                grado TEXT,
                seccion TEXT,
                ngs TEXT,
                sede TEXT DEFAULT 'Sede Principal',
                email TEXT,
                ha_votado INTEGER DEFAULT 0,
                fecha_voto DATETIME
            );

            CREATE TABLE IF NOT EXISTS candidatos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                foto TEXT,
                slogan TEXT,
                logo TEXT,
                propuestas TEXT,
                alcalde TEXT,
                teniente TEXT,
                regidor_educacion TEXT,
                regidor_salud TEXT,
                regidor_derechos TEXT,
                alcalde_foto TEXT,
                teniente_foto TEXT,
                regidor_educacion_foto TEXT,
                regidor_salud_foto TEXT,
                regidor_derechos_foto TEXT,
                propuestas_pdf TEXT,
                color TEXT
            );

            CREATE TABLE IF NOT EXISTS votos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidato_id INTEGER NOT NULL,
                voter_codigo TEXT NOT NULL UNIQUE,
                sede TEXT,
                ngs TEXT,
                fecha_voto DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidato_id) REFERENCES candidatos(id),
                FOREIGN KEY (voter_codigo) REFERENCES voters(codigo)
            );

            CREATE TABLE IF NOT EXISTS configuracion (
                clave TEXT PRIMARY KEY,
                valor TEXT NOT NULL,
                descripcion TEXT,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");
    }
}

function _actualizarEsquemaBDSede()
{
    global $pdo;
    crearTablasSiNoExisten();

    if (DB_DRIVER !== 'mysql') {
        // Migrar tabla voters
        $colsStmt = $pdo->query("PRAGMA table_info(voters)");
        $cols = array_column($colsStmt->fetchAll(), 'name');

        $columnasNuevas = [
            'codigo_original' => 'TEXT',
            'dni' => 'TEXT',
            'ap_paterno' => 'TEXT',
            'ap_materno' => 'TEXT',
            'nombres' => 'TEXT',
            'sexo' => 'TEXT',
            'grado' => 'TEXT',
            'seccion' => 'TEXT',
            'ngs' => 'TEXT',
            'sede' => "TEXT DEFAULT 'Sede Central'",
            'fecha_voto' => 'DATETIME'
        ];

        foreach ($columnasNuevas as $col => $tipo) {
            if (!in_array($col, $cols)) {
                $pdo->exec("ALTER TABLE voters ADD COLUMN {$col} {$tipo}");
            }
        }

        // Migrar tabla votos
        $votosColsStmt = $pdo->query("PRAGMA table_info(votos)");
        $votosCols = array_column($votosColsStmt->fetchAll(), 'name');
        if (!in_array('sede', $votosCols)) {
            $pdo->exec("ALTER TABLE votos ADD COLUMN sede TEXT");
        }
        if (!in_array('ngs', $votosCols)) {
            $pdo->exec("ALTER TABLE votos ADD COLUMN ngs TEXT");
        }

        // Migrar tabla candidatos (nuevos campos)
        $candColsStmt = $pdo->query("PRAGMA table_info(candidatos)");
        $candCols = array_column($candColsStmt->fetchAll(), 'name');
        $nuevasCandidato = [
            'slogan' => 'TEXT',
            'logo' => 'TEXT',
            'propuestas' => 'TEXT',
            'alcalde' => 'TEXT',
            'teniente' => 'TEXT',
            'regidor_educacion' => 'TEXT',
            'regidor_salud' => 'TEXT',
            'regidor_derechos' => 'TEXT',
            'alcalde_foto' => 'TEXT',
            'teniente_foto' => 'TEXT',
            'regidor_educacion_foto' => 'TEXT',
            'regidor_salud_foto' => 'TEXT',
            'regidor_derechos_foto' => 'TEXT',
            'propuestas_pdf' => 'TEXT',
            'sede' => "TEXT DEFAULT 'Sede Central'"
        ];
        foreach ($nuevasCandidato as $col => $tipo) {
            if (!in_array($col, $candCols)) {
                $pdo->exec("ALTER TABLE candidatos ADD COLUMN {$col} {$tipo}");
            }
        }
    } else {
        // MySQL: agregar columnas si no existen
        try {
            $candColsStmt = $pdo->query("SHOW COLUMNS FROM candidatos");
            $candCols = array_column($candColsStmt->fetchAll(), 'Field');
            $nuevasCandidato = [
                'slogan' => 'VARCHAR(255) NULL',
                'logo' => 'VARCHAR(255) NULL',
                'propuestas' => 'TEXT NULL',
                'alcalde' => 'VARCHAR(200) NULL',
                'teniente' => 'VARCHAR(200) NULL',
                'regidor_educacion' => 'VARCHAR(200) NULL',
                'regidor_salud' => 'VARCHAR(200) NULL',
                'regidor_derechos' => 'VARCHAR(200) NULL',
                'alcalde_foto' => 'VARCHAR(255) NULL',
                'teniente_foto' => 'VARCHAR(255) NULL',
                'regidor_educacion_foto' => 'VARCHAR(255) NULL',
                'regidor_salud_foto' => 'VARCHAR(255) NULL',
                'regidor_derechos_foto' => 'VARCHAR(255) NULL',
                'propuestas_pdf' => 'VARCHAR(255) NULL',
                'sede' => "VARCHAR(100) DEFAULT 'Sede Central'",
                'color' => 'VARCHAR(50) NULL'
            ];
            foreach ($nuevasCandidato as $col => $tipo) {
                if (!in_array($col, $candCols)) {
                    $pdo->exec("ALTER TABLE candidatos ADD COLUMN {$col} {$tipo}");
                }
            }
        } catch (Exception $e) {
            // Silently ignore if columns already exist
        }
    }

    sembrarAdminsPorDefecto();
}

function actualizarEsquemaBD()
{
    $originalSede = get_active_sede();
    foreach (['central', 'jerusalen'] as $s) {
        set_active_db($s);
        _actualizarEsquemaBDSede();
    }
    set_active_db($originalSede);
}

function sembrarAdminsPorDefecto()
{
    $count = (int) db_query('SELECT COUNT(*) FROM admins')->fetchColumn();
    if ($count > 0)
        return;

    $admins = [
        [
            'email' => 'profesor@cata.edu.pe',
            'pass' => 'cata2026',
            'nombre' => 'Profesor Asignado',
            'rol' => 'profesor'
        ],
        [
            'email' => 'coordinacion@cata.edu.pe',
            'pass' => 'cata2026',
            'nombre' => 'Coordinación Académica',
            'rol' => 'coordinador'
        ],
        [
            'email' => 'director@cata.edu.pe',
            'pass' => 'admin2026',
            'nombre' => 'Dirección General CATA',
            'rol' => 'director'
        ]
    ];

    foreach ($admins as $adm) {
        $hash = password_hash($adm['pass'], PASSWORD_DEFAULT);
        db_query(
            'INSERT INTO admins (email, password_hash, nombre, rol) VALUES (:email, :hash, :nombre, :rol)',
            ['email' => $adm['email'], 'hash' => $hash, 'nombre' => $adm['nombre'], 'rol' => $adm['rol']]
        );
    }
}

function sembrarDatosDePrueba()
{
    $originalSede = get_active_sede();

    // Sede Central
    set_active_db('central');
    $countCentral = (int) db_query('SELECT COUNT(*) FROM candidatos')->fetchColumn();
    if ($countCentral === 0) {
        insertCandidato('Lista Fuerza CATA', 'Trabajamos por un colegio mejor', null, [
            'slogan' => '¡Juntos hacemos la diferencia!',
            'alcalde' => 'Franco Vidal',
            'teniente' => 'Ana Torres',
            'regidor_educacion' => 'Carlos Quispe',
            'regidor_salud' => 'María López',
            'regidor_derechos' => 'Pedro Mamani',
            'sede' => 'Sede Central'
        ]);
        insertCandidato('Lista Juventud en Acción', 'Innovación y compromiso estudiantil', null, [
            'slogan' => '¡Tu voz, nuestro compromiso!',
            'alcalde' => 'María González',
            'teniente' => 'José Flores',
            'regidor_educacion' => 'Lucía Ramos',
            'regidor_salud' => 'David Chura',
            'regidor_derechos' => 'Sofía Apaza',
            'sede' => 'Sede Central'
        ]);
        insertCandidato('Voto en Blanco', 'Opción cívica democrática', null, ['sede' => 'Sede Central']);
    }

    // Sede Jerusalén
    set_active_db('jerusalen');
    $countJeru = (int) db_query('SELECT COUNT(*) FROM candidatos')->fetchColumn();
    if ($countJeru === 0) {
        insertCandidato('Voto en Blanco', 'Opción cívica democrática', null, ['sede' => 'Sede Jerusalén']);
    }

    set_active_db($originalSede);
}
