import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle } from 'lucide-react';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

// Paleta de colores del Colegio Adventista Túpac Amaru
const BLUE = '#1B3A8C';
const BLUE_DARK = '#142D6E';
const BLUE_LIGHT = '#EEF4FF';
const BLUE_BORDER = '#C7D9FF';

const Login = ({ setVoter }) => {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/login', { codigo });
      if (response.data.success) {
        setVoter(response.data.voter);
        navigate('/voto');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ backgroundColor: '#F5F8FF' }}>

      {/* Header institucional azul centrado y más grande */}
      <div style={{ backgroundColor: BLUE }} className="w-full py-4 px-6 flex flex-col items-center justify-center text-center shadow-md">
        <h1 className="text-white font-black text-lg sm:text-2xl tracking-tight uppercase leading-snug">
          Colegio Adventista Túpac Amaru
        </h1>
        <p className="text-blue-200 text-xs sm:text-sm font-semibold tracking-wide mt-1">
          Juliaca · Sistema Electoral Estudiantil 2026
        </p>
      </div>

      {/* Contenido central */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          {/* Logo Oficial del Colegio Grande y en Azul Reacomodado */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="w-36 h-36 sm:w-44 sm:h-44 p-1 flex items-center justify-center">
              <img 
                src={logoColegioAzul} 
                alt="Logo Colegio Adventista Túpac Amaru" 
                className="w-full h-full object-contain filter drop-shadow-md" 
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 mt-4 text-center">
              Cabina de Votación
            </h2>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl text-sm"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl text-base font-semibold outline-none transition-all placeholder:text-gray-400"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1.5px solid #D1D5DB`,
                  color: '#111827',
                }}
                onFocus={e => e.target.style.borderColor = BLUE}
                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                placeholder="DNI:000000"
                required
                autoComplete="off"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-base text-white transition-all shadow-md cursor-pointer"
              style={{
                backgroundColor: loading ? '#4A6AB5' : BLUE,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = BLUE_DARK; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = BLUE; }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Verificando...
                </span>
              ) : (
                <>
                  Ingresar a la Urna
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Separador visual */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }}></div>
            <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>CATA · Juliaca · 2026</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }}></div>
          </div>

        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center" style={{ borderTop: `1px solid ${BLUE_BORDER}`, backgroundColor: BLUE_LIGHT }}>
        <p className="text-xs font-medium" style={{ color: BLUE }}>
          Colegio Adventista Túpac Amaru · Sistema de Votación Estudiantil 2026
        </p>
      </div>

    </div>
  );
};

export default Login;
