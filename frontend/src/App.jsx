import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Voting from './components/Voting';
import Admin from './components/Admin';
import Portal from './components/Portal';
import ProjectorView from './components/ProjectorView';
import CandidateSelfRegistration from './components/CandidateSelfRegistration';

// Componente que escucha si se accede por ruta secreta /panel-Docente y camufla la URL
const SecretRouteCloaker = ({ setIsDocenteMode }) => {
  const location = useLocation();

  useEffect(() => {
    // 1. Detección sensible estricta a mayúsculas: /panel-Docente
    const path = window.location.pathname;
    const hash = window.location.hash || '';

    // Debe ser exactamente panel-Docente con 'D' mayúscula
    const isSecretPath = path === '/panel-Docente' || path.startsWith('/panel-Docente/');
    const isSecretHash = hash === '#/panel-Docente' || hash === '#panel-Docente';

    if (isSecretPath || isSecretHash) {
      sessionStorage.setItem('cata_docente_mode', 'true');
      setIsDocenteMode(true);
      // Camuflar la URL inmediatamente a la raíz limpia sin /panel-Docente
      window.history.replaceState(null, '', window.location.origin + '/');
      return;
    }

    // 2. Si alguien curioso intenta variantes de admin: /admin, etc.
    const lowerPath = path.toLowerCase();
    const lowerHash = hash.toLowerCase();
    const isSuspicious = 
      lowerPath.includes('/admin') || 
      lowerPath.includes('/panel-docente') || 
      lowerHash.includes('admin') || 
      lowerHash.includes('panel-docente');

    if (isSuspicious) {
      // Rebotar a la raíz limpia (Portal informativo) sin dar pistas
      window.history.replaceState(null, '', window.location.origin + '/');
      window.location.href = window.location.origin + '/';
    }
  }, [location, setIsDocenteMode]);

  return null;
};

const AppContent = ({ voter, setVoter, isDocenteMode, setIsDocenteMode }) => {
  const handleLogoutDocente = () => {
    sessionStorage.removeItem('cata_docente_mode');
    localStorage.removeItem('cata_admin_user');
    localStorage.removeItem('cata_admin_token');
    setIsDocenteMode(false);
  };

  return (
    <Routes>
      {/* 
        1. URNA PRINCIPAL UNIVERSAL (Página Principal Directa para el Estudiante)
        El portal informativo se conserva en /portal para futuras elecciones.
      */}
      <Route 
        path="/" 
        element={
          isDocenteMode ? (
            <Admin onLogoutDocente={handleLogoutDocente} />
          ) : (
            <Login setVoter={setVoter} forcedSede="universal" />
          )
        } 
      />
      <Route path="/portal" element={<Portal />} />
      <Route path="/portal/*" element={<Portal />} />

      {/* 
        2. CABINA DE VOTACIÓN UNIVERSAL
      */}
      <Route 
        path="/Urna" 
        element={<Login setVoter={setVoter} forcedSede="universal" />} 
      />
      <Route 
        path="/urna" 
        element={<Login setVoter={setVoter} forcedSede="universal" />} 
      />
      <Route 
        path="/Urna-Universal" 
        element={<Login setVoter={setVoter} forcedSede="universal" />} 
      />

      {/* 
        3. URNA SEDE JERUSALÉN (Mesa de votación en Sede Jerusalén)
      */}
      <Route 
        path="/Urna-Jerusalen" 
        element={<Login setVoter={setVoter} forcedSede="jerusalen" />} 
      />
      <Route 
        path="/Urna-Jerusalén" 
        element={<Login setVoter={setVoter} forcedSede="jerusalen" />} 
      />

      {/* 
        4. PANEL DOCENTE CENTRALIZADO (Centro de Control Electoral)
      */}
      <Route 
        path="/panel-Docente" 
        element={<Admin onLogoutDocente={handleLogoutDocente} />} 
      />
      <Route 
        path="/panel-Docente/*" 
        element={<Admin onLogoutDocente={handleLogoutDocente} />} 
      />

      {/* 
        5. MODO PROYECTOR / PANTALLA GIGANTE (Visualización en tiempo real)
      */}
      <Route 
        path="/Proyector" 
        element={<ProjectorView onClose={() => window.location.href = '/'} />} 
      />
      <Route 
        path="/proyector" 
        element={<ProjectorView onClose={() => window.location.href = '/'} />} 
      />

      {/* Emisión de voto del estudiante logueado */}
      <Route 
        path="/voto" 
        element={voter ? <Voting voter={voter} setVoter={setVoter} /> : <Navigate to="/" replace />} 
      />

      {/* Auto-registro de listas y candidatos por enlace seguro */}
      <Route path="/postular" element={<CandidateSelfRegistration />} />
      <Route path="/postular/:token" element={<CandidateSelfRegistration />} />
      <Route path="/inscripcion" element={<CandidateSelfRegistration />} />
      <Route path="/inscripcion/:token" element={<CandidateSelfRegistration />} />

      {/* Trampas para curiosos */}
      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="/admin/*" element={<Navigate to="/" replace />} />
      <Route path="/panel-docente" element={<Navigate to="/" replace />} />
      <Route path="/panel-docente/*" element={<Navigate to="/" replace />} />

      {/* Cualquier otra ruta inexistente cae en la raíz (Portal) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  const [voter, setVoter] = useState(null);
  const [isDocenteMode, setIsDocenteMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const inSession = sessionStorage.getItem('cata_docente_mode') === 'true';
    const isSecretUrl = (
      window.location.pathname === '/panel-Docente' || 
      window.location.pathname.startsWith('/panel-Docente/') ||
      (window.location.hash || '').includes('panel-Docente')
    );
    if (isSecretUrl) {
      sessionStorage.setItem('cata_docente_mode', 'true');
      window.history.replaceState(null, '', window.location.origin + '/');
      return true;
    }
    return inSession;
  });

  return (
    <BrowserRouter>
      <SecretRouteCloaker setIsDocenteMode={setIsDocenteMode} />
      <AppContent 
        voter={voter} 
        setVoter={setVoter} 
        isDocenteMode={isDocenteMode} 
        setIsDocenteMode={setIsDocenteMode} 
      />
    </BrowserRouter>
  );
};

export default App;
