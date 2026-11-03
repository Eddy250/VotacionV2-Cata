import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getAssetUrl } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, LogOut, CheckCircle2 } from 'lucide-react';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

const BLUE = '#1B3A8C';
const BLUE_DARK = '#142D6E';

const Voting = ({ voter, setVoter }) => {
  const [candidatos, setCandidatos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCandidatos = async () => {
      try {
        const url = voter?.sede ? `/candidatos?sede=${encodeURIComponent(voter.sede)}` : '/candidatos';
        const response = await api.get(url);
        setCandidatos(response.data);
      } catch (err) {
        console.error("Error cargando candidatos", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidatos();
  }, []);

  const getReturnUrna = () => {
    if (voter?.sede && voter.sede.toLowerCase().includes('jeru')) {
      return '/Urna-Jerusalen';
    }
    return '/Urna-Central';
  };

  // Temporizador de inactividad (90 segundos de seguridad en la cabina)
  useEffect(() => {
    let timer = setTimeout(() => {
      alert("La sesión se cerró por inactividad para proteger tu voto.");
      setVoter(null);
      navigate(getReturnUrna());
    }, 90000);

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        alert("La sesión se cerró por inactividad para proteger tu voto.");
        setVoter(null);
        navigate(getReturnUrna());
      }, 90000);
    };

    window.addEventListener('click', resetTimer);
    window.addEventListener('keydown', resetTimer);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, []);

  const handleVote = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post('/voto', {
        voter_codigo: voter.codigo,
        candidato_id: selected,
      });
      setSuccess(true);
      setTimeout(() => {
        setVoter(null);
        navigate(getReturnUrna());
      }, 3500);
    } catch (err) {
      alert(err.response?.data?.error || "Hubo un error al guardar tu voto.");
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div 
        className="fixed inset-0 min-h-screen w-full flex items-center justify-center p-4 sm:p-6 z-50 overflow-hidden"
        style={{ backgroundColor: '#F3F6FD' }}
      >
        {/* Marca de agua / Logo de fondo gigante */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden select-none">
          <img 
            src={logoColegioAzul} 
            alt="" 
            className="w-[70vw] max-w-[600px] max-h-[70vh] h-auto object-contain opacity-[0.08] filter drop-shadow select-none" 
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="rounded-3xl p-8 sm:p-10 max-w-lg w-full text-center shadow-2xl relative z-10 border border-slate-200"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          {/* Barra superior de acento azul */}
          <div className="absolute top-0 left-0 w-full h-2.5 rounded-t-3xl" style={{ backgroundColor: BLUE }}></div>

          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 p-1 flex items-center justify-center">
              <img src={logoColegioAzul} alt="Logo CATA" className="w-full h-full object-contain filter drop-shadow-sm" />
            </div>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-sm"
            style={{ backgroundColor: '#EEF4FF' }}
          >
            <CheckCircle2 className="w-12 h-12" style={{ color: BLUE }} />
          </motion.div>

          <span className="inline-block text-[10px] font-black uppercase tracking-wider text-blue-900 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-200 mb-2">
            Colegio Adventista Túpac Amaru
          </span>

          <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight" style={{ color: '#111827' }}>
            ¡Voto Registrado Exitosamente!
          </h2>

          <p className="text-base sm:text-lg mb-8 leading-relaxed" style={{ color: '#4B5563' }}>
            Gracias por cumplir con tu deber cívico, <strong className="font-extrabold" style={{ color: BLUE }}>{voter?.nombre}</strong>.
          </p>

          <div className="w-full rounded-full h-2.5 overflow-hidden bg-slate-100 p-0.5 border border-slate-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 3.5, ease: "linear" }}
              className="h-full rounded-full"
              style={{ backgroundColor: BLUE }}
            />
          </div>

          <p className="text-xs font-semibold mt-3 text-slate-400">
            Cerrando sesión automáticamente...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-24">
      {/* Header de la cédula */}
      <div
        className="flex flex-col md:flex-row justify-between items-center p-4 md:px-8 rounded-2xl mb-10 gap-4 shadow-sm"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #C7D9FF' }}
      >
        <div className="flex items-center gap-4">
          <img src={logoColegioAzul} alt="Logo CATA" className="w-14 h-14 object-contain flex-shrink-0 drop-shadow-sm" />
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#111827' }}>
              Cédula de Sufragio Digital
            </h2>
            <p className="text-xs font-bold tracking-widest uppercase mt-0.5" style={{ color: BLUE }}>
              Colegio Adventista Túpac Amaru · Elecciones 2026
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="py-1.5 px-4 rounded-full font-extrabold text-xs"
            style={{ backgroundColor: '#EEF4FF', color: BLUE, border: `1px solid #C7D9FF` }}
          >
            {voter.nombre}
          </span>
          {voter.ngs && (
            <span
              className="py-1.5 px-3 rounded-full font-bold text-xs"
              style={{ backgroundColor: '#EEF4FF', color: BLUE, border: `1px solid #C7D9FF` }}
            >
              Salón: {voter.ngs}
            </span>
          )}
          {voter.sede && (
            <span
              className="py-1.5 px-3 rounded-full font-bold text-xs"
              style={{ backgroundColor: '#EEF4FF', color: BLUE, border: `1px solid #C7D9FF` }}
            >
              {voter.sede}
            </span>
          )}
          <button
            onClick={() => { setVoter(null); navigate(getReturnUrna()); }}
            title="Cerrar y Salir"
            className="p-2 rounded-full transition-colors"
            style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEE2E2'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid de candidatos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <p className="text-center md:col-span-2 lg:col-span-3 py-20 animate-pulse font-bold text-xl" style={{ color: '#9CA3AF' }}>
            Descargando padrón de candidatos...
          </p>
        ) : (
          candidatos.map((c) => (
            <motion.div
              key={c.id}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(c.id)}
              className="cursor-pointer rounded-2xl overflow-hidden shadow-md transition-all duration-300 relative group"
              style={{
                backgroundColor: '#FFFFFF',
                border: selected === c.id
                  ? `3px solid ${BLUE}`
                  : '3px solid transparent',
                boxShadow: selected === c.id
                  ? `0 8px 30px rgba(27,58,140,0.2)`
                  : '0 2px 12px rgba(0,0,0,0.08)',
              }}
            >
              <div className="h-64 bg-slate-100 relative overflow-hidden border-b" style={{ borderColor: '#E5E7EB' }}>
                {c.foto ? (
                  <img src={getAssetUrl(c.foto)} alt={c.nombre} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#EEF4FF' }}>
                    <span className="text-6xl font-black opacity-20" style={{ color: BLUE }}>{c.nombre.charAt(0)}</span>
                  </div>
                )}

                {/* Marca X animada al seleccionar */}
                <AnimatePresence>
                  {selected === c.id && (
                    <motion.div
                      initial={{ opacity: 0, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center z-10"
                      style={{ backgroundColor: 'rgba(27,58,140,0.15)' }}
                    >
                      <svg className="w-full h-full p-8 drop-shadow-2xl" fill="none" stroke={BLUE} viewBox="0 0 24 24" strokeWidth="1.5">
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                          strokeLinecap="round" strokeLinejoin="round" d="M4 20L20 4M4 4l16 16"
                        />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-6 text-center relative z-20" style={{ backgroundColor: '#FFFFFF' }}>
                <h3 className="text-2xl font-black tracking-tight" style={{ color: '#111827' }}>{c.nombre}</h3>
                <p className="text-sm mt-2 font-medium line-clamp-2" style={{ color: '#6B7280' }}>
                  {c.descripcion || "Postulante a la Alcaldía"}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Botón flotante de confirmar */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
        <motion.button
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: selected ? 1 : 0 }}
          onClick={handleVote}
          disabled={!selected || submitting}
          className="pointer-events-auto flex items-center justify-center gap-3 px-12 py-5 rounded-full font-black text-xl text-white shadow-2xl transition-all"
          style={{
            backgroundColor: selected && !submitting ? BLUE : '#9CA3AF',
            cursor: !selected || submitting ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (selected && !submitting) e.currentTarget.style.backgroundColor = BLUE_DARK; }}
          onMouseLeave={e => { if (selected && !submitting) e.currentTarget.style.backgroundColor = BLUE; }}
        >
          {submitting ? 'Asegurando Voto...' : (
            <>Confirmar Sufragio <Check className="w-6 h-6 stroke-[3px]" /></>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default Voting;
