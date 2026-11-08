import React, { useState, useEffect } from 'react';
import api, { getAssetUrl } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, Megaphone, FileText, ChevronDown, ChevronUp,
  Star, ArrowLeft, FileCode, Download, X, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

const BLUE = '#1B3A8C';
const BLUE_LIGHT = '#EEF4FF';

const OrgChart = ({ candidato }) => {
  const members = [
    { role: 'Alcalde ó Alcaldesa', name: candidato.alcalde, grado: candidato.alcalde_grado, foto: candidato.alcalde_foto, primary: true },
    { role: 'Teniente Alcalde', name: candidato.teniente, grado: candidato.teniente_grado, foto: candidato.teniente_foto },
    { role: 'Reg. Educación, Cultura y Deporte', name: candidato.regidor_educacion, grado: candidato.regidor_educacion_grado, foto: candidato.regidor_educacion_foto },
    { role: 'Reg. Salud y Ambiente', name: candidato.regidor_salud, grado: candidato.regidor_salud_grado, foto: candidato.regidor_salud_foto },
    { role: 'Reg. Emprendimiento y Actividades Productivas', name: candidato.regidor_emprendimiento, grado: candidato.regidor_emprendimiento_grado, foto: candidato.regidor_emprendimiento_foto },
    { role: 'Reg. Derechos del Niño, Niña y Adolescente', name: candidato.regidor_derechos, grado: candidato.regidor_derechos_grado, foto: candidato.regidor_derechos_foto },
    { role: 'Reg. Comunicación y Tecnologías', name: candidato.regidor_comunicacion, grado: candidato.regidor_comunicacion_grado, foto: candidato.regidor_comunicacion_foto },
  ].filter(m => m.name);

  if (members.length === 0) return null;

  const alcalde = members.find(m => m.primary);
  const rest = members.filter(m => !m.primary);

  return (
    <div className="mt-6">
      <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Users size={16} style={{ color: BLUE }} /> Junta Directiva Oficial
      </h4>

      {/* Alcalde arriba (destacado) */}
      {alcalde && (
        <div className="flex justify-center mb-4">
          <div className="text-center p-5 bg-white rounded-2xl border-2 shadow-md w-64" style={{ borderColor: candidato.color || BLUE }}>
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-3 mb-3 bg-slate-100" style={{ borderColor: candidato.color || BLUE }}>
              {alcalde.foto ? (
                <img src={getAssetUrl(alcalde.foto)} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ color: BLUE, backgroundColor: BLUE_LIGHT }}>
                  {alcalde.name.charAt(0)}
                </div>
              )}
            </div>
            <p className="font-black text-sm text-slate-800">{alcalde.name}</p>
            {alcalde.grado && (
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">Grado: {alcalde.grado}</p>
            )}
            <span className="inline-block mt-2 px-3 py-0.5 text-xs font-bold rounded-full text-white" style={{ backgroundColor: candidato.color || BLUE }}>
              {alcalde.role}
            </span>
          </div>
        </div>
      )}

      {/* Línea conectora */}
      {alcalde && rest.length > 0 && (
        <div className="flex justify-center mb-4">
          <div className="w-0.5 h-6" style={{ backgroundColor: candidato.color || BLUE }}></div>
        </div>
      )}

      {/* Regidores en fila */}
      {rest.length > 0 && (
        <div className="relative">
          <div className="absolute top-0 left-[10%] right-[10%] h-0.5" style={{ backgroundColor: '#C7D9FF' }}></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
            {rest.map((m, i) => (
              <div key={i} className="text-center p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 mx-auto rounded-full overflow-hidden mb-2 bg-slate-100 border-2" style={{ borderColor: '#C7D9FF' }}>
                  {m.foto ? (
                    <img src={getAssetUrl(m.foto)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-black" style={{ color: BLUE, backgroundColor: BLUE_LIGHT }}>
                      {m.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="font-bold text-xs text-slate-800 leading-tight">{m.name}</p>
                {m.grado && (
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{m.grado}</p>
                )}
                <p className="text-[10px] font-semibold mt-1 px-1" style={{ color: BLUE }}>{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ListaCard = ({ candidato, onOpenPdf }) => {
  const [expanded, setExpanded] = useState(false);
  const isBlank = candidato.nombre.toLowerCase().includes('blanco');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Header de la lista */}
      <div className="relative">
        {candidato.foto ? (
          <div className="h-52 sm:h-64 overflow-hidden">
            <img src={getAssetUrl(candidato.foto)} className="w-full h-full object-cover" alt={candidato.nombre} />
          </div>
        ) : candidato.logo ? (
          <div className="h-52 sm:h-64 flex items-center justify-center p-8" style={{ backgroundColor: BLUE_LIGHT }}>
            <img src={getAssetUrl(candidato.logo)} className="max-h-full max-w-full object-contain" alt={candidato.nombre} />
          </div>
        ) : !isBlank ? (
          <div className="h-40 flex items-center justify-center" style={{ backgroundColor: BLUE_LIGHT }}>
            <Users className="w-16 h-16" style={{ color: '#C7D9FF' }} />
          </div>
        ) : null}

        {/* Eslogan overlay */}
        {candidato.slogan && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-4 pt-10">
            <p className="text-white text-sm font-semibold italic">"{candidato.slogan}"</p>
          </div>
        )}

        {/* Badge PDF si existe */}
        {candidato.propuestas_pdf && (
          <div className="absolute top-3 right-3 bg-red-600/95 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
            <FileCode size={13} /> Plan en PDF
          </div>
        )}

        {/* Badges de Sede y Nivel */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className="bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
            {candidato.sede?.includes('Jerusal') ? '⛪ Jerusalén' : '🏛️ Central'}
          </span>
          {(!candidato.sede || !candidato.sede.includes('Jerusal')) && (
            <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm ${
              candidato.nivel === 'Primaria' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
              candidato.nivel === 'Secundaria' ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' :
              'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              {candidato.nivel || 'General'}
            </span>
          )}
          {candidato.color && (
            <span
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: candidato.color }}
              title={`Color representativo: ${candidato.color}`}
            />
          )}
        </div>
      </div>

      {/* Info principal */}
      <div className="p-6">
        <h3 className="text-xl font-black text-slate-800">{candidato.nombre}</h3>
        {candidato.descripcion && (
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">{candidato.descripcion}</p>
        )}

        {/* Botón para ver el PDF oficial si existe */}
        {candidato.propuestas_pdf && (
          <button
            onClick={() => onOpenPdf(candidato)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors shadow-sm"
          >
            <FileCode size={15} />
            <span>Ver Plan de Trabajo y Tríptico Oficial (PDF)</span>
          </button>
        )}

        {/* Alcalde destacado */}
        {candidato.alcalde && !expanded && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border" style={{ borderColor: '#C7D9FF' }}>
              {candidato.alcalde_foto ? (
                <img src={getAssetUrl(candidato.alcalde_foto)} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-black" style={{ color: BLUE, backgroundColor: BLUE_LIGHT }}>
                  {candidato.alcalde.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{candidato.alcalde}</p>
              <p className="text-[10px] font-semibold" style={{ color: BLUE }}>Candidato(a) a Alcalde Estudiantil</p>
            </div>
          </div>
        )}

        {/* Botón expandir */}
        {!isBlank && (candidato.alcalde || candidato.propuestas) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors"
            style={{ backgroundColor: expanded ? BLUE : BLUE_LIGHT, color: expanded ? '#FFFFFF' : BLUE }}
          >
            {expanded ? (
              <><ChevronUp size={16} /> Ocultar detalles</>
            ) : (
              <><ChevronDown size={16} /> Ver directiva y propuestas en texto</>
            )}
          </button>
        )}

        {/* Contenido expandido */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {/* Organigrama */}
              <OrgChart candidato={candidato} />

              {/* Propuestas */}
              {candidato.propuestas && (
                <div className="mt-6">
                  <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText size={16} style={{ color: BLUE }} /> Ejes de Gestión / Propuestas
                  </h4>
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-1.5">
                    {candidato.propuestas.split('\n').map((line, i) => (
                      <p key={i} className="text-sm text-slate-700 leading-relaxed">
                        {line.trim().startsWith('•') || line.trim().startsWith('-') ? (
                          <span className="flex items-start gap-2">
                            <Star size={13} className="mt-1 flex-shrink-0" style={{ color: BLUE }} />
                            <span>{line.replace(/^[•\-]\s*/, '')}</span>
                          </span>
                        ) : line.trim() ? line : null}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const Portal = () => {
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdfCandidate, setSelectedPdfCandidate] = useState(null);
  const [activeSede, setActiveSede] = useState('Central - Primaria');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/candidatos', { params: { sede: 'todos' } });
        setCandidatos(res.data);
      } catch (err) {
        console.error('Error cargando candidatos', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden" style={{ backgroundColor: '#F5F8FF' }}>
      {/* Marca de Agua: Logo Institucional Gigante de Fondo (Casi toda la pantalla) */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden select-none">
        <img
          src={logoColegioAzul}
          alt=""
          className="w-[85vw] max-w-[850px] max-h-[85vh] h-auto object-contain opacity-[0.11] filter drop-shadow select-none"
        />
      </div>

      {/* Header Institucional Azul Centrado */}
      <div style={{ backgroundColor: BLUE }} className="w-full py-4 px-6 text-center shadow-md relative z-10">
        <h1 className="text-white font-black text-lg sm:text-2xl tracking-tight uppercase leading-snug">
          Colegio Adventista Túpac Amaru
        </h1>
        <p className="text-blue-200 text-xs sm:text-sm font-semibold tracking-wide mt-1">
          Juliaca · Portal Oficial de Campaña Estudiantil 2026
        </p>
      </div>

      {/* Título de la Sección */}
      <div className="max-w-4xl mx-auto px-6 pt-7 pb-3 text-center relative z-10">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
          Conoce a las Listas Candidatas
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-1.5 max-w-xl mx-auto">
          Infórmate sobre las propuestas, equipos y planes de trabajo oficiales en PDF antes de emitir tu voto cívico.
        </p>
      </div>

      {/* Selector Modular de Sede y Nivel */}
      <div className="max-w-4xl mx-auto px-6 mb-7 flex justify-center relative z-10">
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSede('Central - Primaria')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${activeSede === 'Central - Primaria'
                ? 'bg-[#1B3A8C] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            🎒 Central · Primaria (Alcaldía)
          </button>
          <button
            type="button"
            onClick={() => setActiveSede('Central - Secundaria')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${activeSede === 'Central - Secundaria'
                ? 'bg-[#1B3A8C] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            🎓 Central · Secundaria (Alcaldía)
          </button>
          <button
            type="button"
            onClick={() => setActiveSede('Sede Jerusalén')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${activeSede === 'Sede Jerusalén'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            ⛪ Sede Jerusalén (Alcaldía)
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-6 pb-12 relative z-10">
        {loading ? (
          <div className="py-16 text-center text-slate-400 font-bold animate-pulse">
            Cargando listas candidatas...
          </div>
        ) : (
          (() => {
            const sedeCandidatos = candidatos.filter(c => {
              if (c.nombre?.toLowerCase().includes('blanco')) return false;
              if (activeSede === 'Central - Primaria') {
                const isCentral = !c.sede || c.sede.includes('Principal') || c.sede.includes('Central');
                return isCentral && (c.nivel === 'Primaria' || c.nivel === 'General' || !c.nivel);
              }
              if (activeSede === 'Central - Secundaria') {
                const isCentral = !c.sede || c.sede.includes('Principal') || c.sede.includes('Central');
                return isCentral && (c.nivel === 'Secundaria' || c.nivel === 'General' || !c.nivel);
              }
              return c.sede && c.sede.includes('Jerusal');
            });

            if (sedeCandidatos.length === 0) {
              return (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-700">Aún no hay listas registradas para esta sede.</p>
                  <p className="text-xs text-slate-400 mt-1">El comité electoral publicará los planes de trabajo en breve.</p>
                </div>
              );
            }

            return (
              <div className="space-y-6 mt-4">
                {sedeCandidatos.map(c => (
                  <ListaCard key={c.id} candidato={c} onOpenPdf={(cand) => setSelectedPdfCandidate(cand)} />
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* Modal Visor de PDF Integrado */}
      <AnimatePresence>
        {selectedPdfCandidate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header del visor */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="font-black text-sm text-slate-800 leading-tight">
                      Plan de Trabajo - {selectedPdfCandidate.nombre}
                    </h3>
                    <p className="text-[11px] text-slate-400">Documento oficial de campaña electoral CATA 2026</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getAssetUrl(selectedPdfCandidate.propuestas_pdf)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors shadow-sm"
                  >
                    <ExternalLink size={13} />
                    <span className="hidden sm:inline">Abrir en pestaña</span>
                  </a>
                  <a
                    href={getAssetUrl(selectedPdfCandidate.propuestas_pdf)}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors shadow-sm"
                  >
                    <Download size={13} />
                    <span className="hidden sm:inline">Descargar</span>
                  </a>
                  <button
                    onClick={() => setSelectedPdfCandidate(null)}
                    className="p-2 hover:bg-slate-200/70 rounded-xl transition-colors text-slate-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Visor PDF (Object con Iframe de Alta Compatibilidad) */}
              <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex flex-col">
                <object
                  data={`${getAssetUrl(selectedPdfCandidate.propuestas_pdf)}#toolbar=1&navpanes=0`}
                  type="application/pdf"
                  className="w-full h-full rounded-2xl border border-slate-200 bg-white shadow-inner"
                >
                  <iframe
                    src={`${getAssetUrl(selectedPdfCandidate.propuestas_pdf)}#toolbar=1&navpanes=0`}
                    title={`PDF ${selectedPdfCandidate.nombre}`}
                    className="w-full h-full rounded-2xl border-0"
                  >
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl">
                      <FileCode className="w-16 h-16 text-blue-600 mb-3" />
                      <h4 className="font-bold text-slate-800 text-base mb-1">Visualizador de Documentos</h4>
                      <p className="text-slate-500 text-xs max-w-sm mb-4">
                        Tu navegador requiere abrir este archivo en una pestaña separada para leerlo con comodidad.
                      </p>
                      <a
                        href={getAssetUrl(selectedPdfCandidate.propuestas_pdf)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700 flex items-center gap-2"
                      >
                        <ExternalLink size={15} /> Ver Documento Oficial Completo
                      </a>
                    </div>
                  </iframe>
                </object>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="py-4 text-center" style={{ borderTop: '1px solid #C7D9FF', backgroundColor: BLUE_LIGHT }}>
        <p className="text-xs font-medium" style={{ color: BLUE }}>
          Colegio Adventista Túpac Amaru · Portal Informativo Electoral 2026
        </p>
      </div>
    </div>
  );
};

export default Portal;
