<?php
// ==========================================
// MÓDULO: ADMINISTRADORES Y DOCENTES
// ==========================================

function adminLogin($email, $password)
{
    $rawEmail = strtolower(trim((string)$email));
    $rawPass = trim((string)$password);

    if ($rawEmail === '' || $rawPass === '') {
        return false;
    }

    // Normalizar usuario o alias (si no colocaron @cata.edu.pe)
    if (strpos($rawEmail, '@') === false) {
        if ($rawEmail === 'admin') {
            $rawEmail = 'admin@cata.edu.pe';
        } else {
            $rawEmail = $rawEmail . '@cata.edu.pe';
        }
    }

    // Credenciales maestras con contraseñas universales (acepta cata2026 y admin2026)
    $masterCreds = [
        'profesor@cata.edu.pe' => [
            'passes' => ['cata2026', 'admin2026'],
            'nombre' => 'Profesor Asignado',
            'rol' => 'profesor'
        ],
        'coordinacion@cata.edu.pe' => [
            'passes' => ['cata2026', 'admin2026'],
            'nombre' => 'Coordinación Académica',
            'rol' => 'coordinador'
        ],
        'director@cata.edu.pe' => [
            'passes' => ['admin2026', 'cata2026'],
            'nombre' => 'Dirección General CATA',
            'rol' => 'director'
        ],
        'admin@cata.edu.pe' => [
            'passes' => ['admin2026', 'cata2026'],
            'nombre' => 'Administrador General CATA',
            'rol' => 'director'
        ]
    ];

    if (defined('ADMIN_ENV_EMAIL') && defined('ADMIN_ENV_PASS') && ADMIN_ENV_EMAIL !== '') {
        $envEmail = strtolower(trim(ADMIN_ENV_EMAIL));
        $masterCreds[$envEmail] = [
            'passes' => [ADMIN_ENV_PASS, 'cata2026', 'admin2026'],
            'nombre' => 'Administrador del Sistema',
            'rol' => 'director'
        ];
    }

    // Buscar si ya existe en la base de datos por email insensible a mayúsculas
    $stmt = db_query('SELECT * FROM admins WHERE LOWER(email) = :email LIMIT 1', ['email' => $rawEmail]);
    $admin = $stmt->fetch();

    $isMasterMatch = false;
    if (isset($masterCreds[$rawEmail])) {
        if (in_array($rawPass, $masterCreds[$rawEmail]['passes'], true)) {
            $isMasterMatch = true;
        }
    }

    if ($isMasterMatch) {
        $hash = password_hash($rawPass, PASSWORD_DEFAULT);
        $nombre = $masterCreds[$rawEmail]['nombre'];
        $rol = $masterCreds[$rawEmail]['rol'];

        if (!$admin) {
            $isMysql = (DB_DRIVER === 'mysql');
            if ($isMysql) {
                db_query('INSERT INTO admins (email, password_hash, nombre, rol) VALUES (:e, :h, :n, :r) ON DUPLICATE KEY UPDATE password_hash = :h2, nombre = :n2, rol = :r2', [
                    'e' => $rawEmail,
                    'h' => $hash,
                    'n' => $nombre,
                    'r' => $rol,
                    'h2' => $hash,
                    'n2' => $nombre,
                    'r2' => $rol
                ]);
            } else {
                db_query('INSERT OR REPLACE INTO admins (email, password_hash, nombre, rol) VALUES (:e, :h, :n, :r)', [
                    'e' => $rawEmail,
                    'h' => $hash,
                    'n' => $nombre,
                    'r' => $rol
                ]);
            }
            $stmt = db_query('SELECT * FROM admins WHERE LOWER(email) = :email LIMIT 1', ['email' => $rawEmail]);
            $admin = $stmt->fetch();
        } else {
            // Actualizar contraseña al día para sincronización inmediata
            db_query('UPDATE admins SET password_hash = :h, nombre = :n, rol = :r WHERE id = :id', [
                'h' => $hash,
                'n' => $nombre,
                'r' => $rol,
                'id' => $admin['id']
            ]);
            $admin['nombre'] = $nombre;
            $admin['rol'] = $rol;
        }
    } else {
        // Validación con hash almacenado en base de datos
        if (!$admin || empty($admin['password_hash']) || !password_verify($rawPass, $admin['password_hash'])) {
            return false;
        }
    }

    if (!$admin) {
        return false;
    }

    // Generar token seguro
    $token = bin2hex(random_bytes(32));
    try {
        db_query(
            'INSERT INTO admin_tokens (token, admin_id, email) VALUES (:token, :admin_id, :email)',
            ['token' => $token, 'admin_id' => $admin['id'], 'email' => $admin['email']]
        );
    } catch (Exception $e) {
        if (function_exists('crearTablasSiNoExisten')) {
            crearTablasSiNoExisten();
        }
        db_query(
            'INSERT INTO admin_tokens (token, admin_id, email) VALUES (:token, :admin_id, :email)',
            ['token' => $token, 'admin_id' => $admin['id'], 'email' => $admin['email']]
        );
    }

    return [
        'token' => $token,
        'admin' => [
            'id' => (int) $admin['id'],
            'email' => $admin['email'],
            'nombre' => $admin['nombre'],
            'rol' => $admin['rol']
        ]
    ];
}

function verifyAdminToken($token)
{
    if (!$token)
        return false;
    $stmt = db_query('
        SELECT a.id, a.email, a.nombre, a.rol 
        FROM admin_tokens t 
        JOIN admins a ON t.admin_id = a.id 
        WHERE t.token = :token 
        LIMIT 1',
        ['token' => $token]
    );
    return $stmt->fetch();
}

function adminLogout($token)
{
    if (!$token)
        return true;
    db_query('DELETE FROM admin_tokens WHERE token = :token', ['token' => $token]);
    return true;
}

