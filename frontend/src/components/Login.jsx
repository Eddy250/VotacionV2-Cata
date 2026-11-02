import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getCabinaSede, setCabinaSede } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, AlertCircle, Settings2, CheckCircle2, Building2, Church, X } from 'lucide-react';
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
  const [cabinaSede, setLocalCabinaSede] = useState(getCabinaSede());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const navigate = useNavigate();

  const handleSelectCabinaSede = (sedeKey) => {
    setCabinaSede(sedeKey);
    setLocalCabinaSede(sedeKey);
    setShowConfigModal(false);
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/login', { codigo }, {
        headers: { 'X-Sede': cabinaSede }
      });
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

  const isCentral = cabinaSede === 'central';

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ backgroundColor: '#F5F8FF' }}>

      {/* Header institucional azul centrado y más grande */}
      <div style={{ backgroundColor: BLUE }} className="w-full py-4 px-6 flex flex-col items-center justify-center text-center shadow-md relative">
        <h1 className="text-white font-black text-lg sm:text-2xl tracking-tight uppercase leading-snug">
          Colegio Adventista Túpac Amaru
        </h1>
        <p className="text-blue-200 text-xs sm:text-sm font-semibold tracking-wide mt-1">
          Juliaca · Sistema Electoral Estudiantil 2026
        </p>

        {/* Botón discreto de configuración de cabina para presidente de mesa */}
        <button
          type="button"
          onClick={() => setShowConfigModal(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white/90 bg-white/10 hover:bg-white/20 transition-all border border-white/20 shadow-xs cursor-pointer"
          title="Configurar Sede de esta Cabina"
        >
          <Settings2 size={14} />
          <span className="hidden sm:inline">Configurar Cabina</span>
        </button>
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
          <div className="flex flex-col items-center justify-center mb-5">
            <div className="w-36 h-36 sm:w-44 sm:h-44 p-1 flex items-center justify-center">
              <img 
                src={logoColegioAzul} 
                alt="Logo Colegio Adventista Túpac Amaru" 
                className="w-full h-full object-contain filter drop-shadow-md" 
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 mt-3 text-center">
              Cabina de Votación
            </h2>

            {/* Badge indicador de la Sede asignada a esta Cabina */}
            <div className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold border shadow-xs"
              style={{
                backgroundColor: isCentral ? '#EEF4FF' : '#F0FDF4',
                borderColor: isCentral ? '#C7D9FF' : '#BBF7D0',
                color: isCentral ? BLUE : '#166534'
              }}
            >
              {isCentral ? <Building2 size={14} /> : <Church size={14} />}
              <span>{isCentral ? '🏛️ Cabina Sede Central' : '⛪ Cabina Sede Jerusalén'}</span>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="ml-1 text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer font-bold"
              >
                (Cambiar)
              </button>
            </div>
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
              <span className="font-semibold">{error}</span>
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
                  Verificando en padrón...
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

      {/* Modal para configurar la Sede de la Cabina */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-800">
                    <Settings2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">Asignar Sede a esta PC</h3>
                    <p className="text-xs text-slate-500 font-medium">Configuración de Cabina Electoral</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-5 space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Indica a qué sede pertenece este equipo de votación. Se mantendrá guardado en la memoria de esta computadora para todos los estudiantes:
                </p>

                {/* Opción 1: Central */}
                <button
                  type="button"
                  onClick={() => handleSelectCabinaSede('central')}
                  className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                    isCentral
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-xl font-bold ${isCentral ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">Sede Central</h4>
                      <p className="text-xs text-slate-500">Pabellón Principal (1000 estudiantes aprox.)</p>
                    </div>
                  </div>
                  {isCentral && (
                    <span className="p-1 rounded-full bg-blue-600 text-white">
                      <CheckCircle2 size={18} />
                    </span>
                  )}
                </button>

                {/* Opción 2: Jerusalén */}
                <button
                  type="button"
                  onClick={() => handleSelectCabinaSede('jerusalen')}
                  className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                    !isCentral
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-xl font-bold ${!isCentral ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Church size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">Sede Jerusalén</h4>
                      <p className="text-xs text-slate-500">Anexo Jerusalén (1000 estudiantes aprox.)</p>
                    </div>
                  </div>
                  {!isCentral && (
                    <span className="p-1 rounded-full bg-emerald-600 text-white">
                      <CheckCircle2 size={18} />
                    </span>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Login;
