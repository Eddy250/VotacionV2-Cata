import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, CalendarClock, PauseCircle, Lock, Megaphone } from 'lucide-react';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

// Paleta de colores del Colegio Adventista Túpac Amaru
const BLUE = '#1B3A8C';
const BLUE_DARK = '#142D6E';
const BLUE_LIGHT = '#EEF4FF';
const BLUE_BORDER = '#C7D9FF';

const Login = ({ setVoter }) => {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [errorData, setErrorData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [urnaActiva, setUrnaActiva] = useState(true);
  const [urnaMensaje, setUrnaMensaje] = useState('');
  const [estadoClave, setEstadoClave] = useState('EN_CURSO');
  const navigate = useNavigate();

  // Monitoreo en tiempo real del estado de la urna (cada 2 segundos)
  useEffect(() => {
    let isMounted = true;
    const checkElectionState = async () => {
      try {
        const res = await api.get('/estado-eleccion');
        if (isMounted && res.data) {
          const estado = res.data.estado || 'EN_CURSO';
          setEstadoClave(estado);
          const activa = (estado === 'EN_CURSO');
          setUrnaActiva(activa);
          if (res.data.mensaje) {
            setUrnaMensaje(res.data.mensaje);
          }
        }
      } catch (err) {
        // En caso de fallo de red puntual, conservar estado previo
      }
    };

    checkElectionState();
    const interval = setInterval(checkElectionState, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setErrorData(null);
    setLoading(true);
    try {
      // Cabina Universal: el backend detecta sede y nivel según el DNI
      const response = await api.post('/login', { codigo }, {
        headers: { 'X-Sede': 'universal' }
      });
      if (response.data.success) {
        setVoter(response.data.voter);
        navigate('/voto');
      }
    } catch (err) {
      const respData = err.response?.data;
      setError(respData?.error || 'Error de conexión con el servidor.');
      setErrorData(respData || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ backgroundColor: '#F5F8FF' }}>

      {/* Header institucional azul centrado y limpio (sin botones para curiosos) */}
      <div style={{ backgroundColor: BLUE }} className="w-full py-4 px-6 flex flex-col items-center justify-center text-center shadow-md relative">
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
          </div>

          {/* AVISO INSTITUCIONAL SI LA URNA ESTÁ DESACTIVADA / EN PAUSA */}
          {!urnaActiva && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-4 rounded-2xl border-2 border-amber-300 bg-amber-50 text-amber-900 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-200 text-amber-900 rounded-xl flex-shrink-0 mt-0.5">
                  <PauseCircle className="w-6 h-6 animate-pulse text-amber-800" />
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-900 mb-1">
                    Urna Electoral en Pausa Temporal
                  </h4>
                  <p className="font-medium text-xs leading-relaxed text-amber-800">
                    {urnaMensaje || 'La mesa electoral docente ha pausado temporalmente las urnas. Por favor, toma asiento y espera las indicaciones de los profesores veedores.'}
                  </p>
                  <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                    Sincronizando con la mesa de control en vivo...
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error o Aviso de Jornada */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-5 p-4 rounded-2xl border text-sm leading-relaxed ${
                errorData?.bloqueado_por_jornada
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <div className="flex items-start gap-3">
                {errorData?.bloqueado_por_jornada ? (
                  <div className="p-1.5 bg-amber-200/80 text-amber-900 rounded-lg flex-shrink-0 mt-0.5">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                ) : (
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
                )}
                <div>
                  {errorData?.bloqueado_por_jornada && (
                    <h4 className="font-black text-xs uppercase tracking-wider text-amber-900 mb-1">
                      Cronograma Electoral CATA 2026
                    </h4>
                  )}
                  <span className="font-semibold text-xs sm:text-sm">{error}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                disabled={!urnaActiva}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={`w-full px-4 py-3.5 rounded-xl text-base font-semibold outline-none transition-all placeholder:text-gray-400 ${
                  !urnaActiva
                    ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                style={{
                  border: `1.5px solid ${!urnaActiva ? '#CBD5E1' : '#D1D5DB'}`
                }}
                onFocus={e => { if (urnaActiva) e.target.style.borderColor = BLUE; }}
                onBlur={e => { if (urnaActiva) e.target.style.borderColor = '#D1D5DB'; }}
                placeholder={urnaActiva ? "DNI:000000" : "Votación temporalmente pausada..."}
                required
                autoComplete="off"
                autoFocus={urnaActiva}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !urnaActiva}
              className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-base text-white transition-all shadow-md ${
                !urnaActiva
                  ? 'bg-slate-400 cursor-not-allowed opacity-80'
                  : (loading ? 'bg-[#4A6AB5] cursor-not-allowed' : 'bg-[#1B3A8C] hover:bg-[#142D6E] cursor-pointer')
              }`}
            >
              {!urnaActiva ? (
                <span className="flex items-center gap-2 font-bold">
                  <PauseCircle size={18} /> Votación en Pausa
                </span>
              ) : loading ? (
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
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }}></div>
            <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>CATA · Juliaca · 2026</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }}></div>
          </div>

          {/* Enlace al Portal Informativo de Campaña y Propuestas */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 shadow-2xs transition-all cursor-pointer"
            >
              <Megaphone size={15} className="text-blue-600 shrink-0" />
              <span>Ver Listas y Propuestas (Portal Escolar)</span>
            </button>
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
