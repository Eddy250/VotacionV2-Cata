import React, { useState } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { ShieldCheck, LogIn, Lock, Mail, AlertCircle } from 'lucide-react';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

const BLUE = '#1B3A8C';
const BLUE_DARK = '#142D6E';

const AdminLogin = ({ onLoginSuccess, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/admin/login', { email, password });
      if (res.data.success && res.data.token) {
        localStorage.setItem('cata_admin_token', res.data.token);
        localStorage.setItem('cata_admin_user', JSON.stringify(res.data.admin));
        onLoginSuccess(res.data.admin);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden" style={{ backgroundColor: '#F3F6FD' }}>
      {/* Marca de agua / Logo de fondo gigante */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden select-none">
        <img 
          src={logoColegioAzul} 
          alt="" 
          className="w-[85vw] max-w-[850px] max-h-[85vh] h-auto object-contain opacity-[0.11] filter drop-shadow select-none" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl p-8 md:p-10 max-w-md w-full mx-auto my-auto shadow-2xl relative overflow-hidden z-10 border border-slate-200"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div className="absolute top-0 left-0 w-full h-2.5" style={{ backgroundColor: BLUE }}></div>

      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto p-1 flex items-center justify-center mb-3">
          <img src={logoColegioAzul} alt="Logo CATA" className="w-full h-full object-contain filter drop-shadow-sm" />
        </div>
        <span className="inline-block text-[10px] font-black uppercase tracking-wider text-blue-900 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200 mb-2">
          Colegio Adventista Túpac Amaru
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: '#111827' }}>Acceso Docente</h2>
        <p className="mt-1 text-sm font-medium" style={{ color: '#6B7280' }}>Panel de Control Electoral y Auditoría</p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="p-3 mb-6 rounded-xl text-sm font-bold flex items-center gap-2"
          style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#374151' }}>Correo Institucional</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border rounded-xl outline-none transition-all font-semibold shadow-sm"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D5DB', color: '#111827' }}
              onFocus={e => e.target.style.borderColor = BLUE}
              onBlur={e => e.target.style.borderColor = '#D1D5DB'}
              placeholder="*****@cata.edu.pe"
              required
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#374151' }}>Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border rounded-xl outline-none transition-all font-semibold shadow-sm"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D5DB', color: '#111827' }}
              onFocus={e => e.target.style.borderColor = BLUE}
              onBlur={e => e.target.style.borderColor = '#D1D5DB'}
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-white font-extrabold text-base py-3.5 rounded-xl transition-all"
          style={{ backgroundColor: loading ? '#4A6AB5' : BLUE, cursor: loading ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = BLUE_DARK; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = BLUE; }}
        >
          {loading ? 'Verificando...' : (
            <>Iniciar Sesión <LogIn className="w-5 h-5" /></>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full mt-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-center"
          >
            ← Volver al modo votación / portal
          </button>
        )}
      </form>
    </motion.div>
  </div>
  );
};

export default AdminLogin;

