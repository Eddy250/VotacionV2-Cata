import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Voting from './components/Voting';
import Admin from './components/Admin';
import Portal from './components/Portal';

const HashRedirectHandler = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const hash = (window.location.hash || '').toLowerCase();
    if (hash.includes('admin')) {
      navigate('/admin', { replace: true });
    } else if (hash.includes('portal') || hash.includes('candidatos')) {
      navigate('/portal', { replace: true });
    }
  }, [navigate]);
  return null;
};

const AppContent = ({ voter, setVoter }) => {
  return (
    <Routes>
      <Route path="/" element={<Login setVoter={setVoter} />} />
      <Route path="/portal" element={<Portal />} />
      <Route path="/portal/*" element={<Portal />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route 
        path="/voto" 
        element={voter ? <Voting voter={voter} setVoter={setVoter} /> : <Navigate to="/" replace />} 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  const [voter, setVoter] = useState(null);

  return (
    <BrowserRouter>
      <HashRedirectHandler />
      <AppContent voter={voter} setVoter={setVoter} />
    </BrowserRouter>
  );
};

export default App;
