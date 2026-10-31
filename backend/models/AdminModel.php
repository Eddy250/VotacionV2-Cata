<?php
// ==========================================
// MÓDULO: ADMINISTRADORES Y DOCENTES
// ==========================================

function adminLogin($email, $password) {
    $stmt = db_query('SELECT * FROM admins WHERE email = :email LIMIT 1', ['email' => trim($email)]);
    $admin = $stmt->fetch();
    if (!$admin) return false;

    if (!password_verify($password, $admin['password_hash'])) {
        return false;
    }

    // Generar token seguro
    $token = bin2hex(random_bytes(32));
    db_query(
        'INSERT INTO admin_tokens (token, admin_id, email) VALUES (:token, :admin_id, :email)',
        ['token' => $token, 'admin_id' => $admin['id'], 'email' => $admin['email']]
    );

    return [
        'token' => $token,
        'admin' => [
            'id' => (int)$admin['id'],
            'email' => $admin['email'],
            'nombre' => $admin['nombre'],
            'rol' => $admin['rol']
        ]
    ];
}

function verifyAdminToken($token) {
    if (!$token) return false;
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

function adminLogout($token) {
    if (!$token) return true;
    db_query('DELETE FROM admin_tokens WHERE token = :token', ['token' => $token]);
    return true;
}

