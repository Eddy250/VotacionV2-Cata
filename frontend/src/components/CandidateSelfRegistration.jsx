import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api, { getAssetUrl } from '../api';
import { extractDominantColor } from '../utils/colorExtractor';
import { 
  Users, CheckCircle2, AlertCircle, Save, Send, Image as ImageIcon, 
  Search, X, Camera, Sparkles, Shield, UserCheck, ArrowRight, RefreshCw, Check,
  ChevronDown, GraduationCap
} from 'lucide-react';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

// Definición oficial de los 7 cargos según normativa ONPE/MINEDU
const CARGOS_LISTA = [
  { key: 'alcalde', label: 'Alcalde(sa)', placeholder: 'Nombres y Apellidos completos del candidato a Alcalde(sa)', req: true },
  { key: 'teniente', label: 'Teniente Alcalde(sa)', placeholder: 'Nombres y Apellidos completos del Teniente Alcalde', req: true },
  { key: 'regidor_educacion', label: 'Regidor(a) de Educación, Cultura, Recreación y Deporte', placeholder: 'Nombres y Apellidos completos', req: true },
  { key: 'regidor_salud', label: 'Regidor(a) de Salud y Medio Ambiente', placeholder: 'Nombres y Apellidos completos', req: true },
  { key: 'regidor_emprendimiento', label: 'Regidor(a) de Emprendimiento y Actividades Productivas', placeholder: 'Nombres y Apellidos completos', req: true },
  { key: 'regidor_derechos', label: 'Regidor(a) de Derechos del Niño, Niña y Adolescente', placeholder: 'Nombres y Apellidos completos', req: true },
  { key: 'regidor_comunicacion', label: 'Regidor(a) de Comunicación y Tecnologías de la Información', placeholder: 'Nombres y Apellidos completos', req: true },
];

const CandidateSelfRegistration = () => {
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = paramToken || searchParams.get('token');

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Formulario de la lista
  const [formData, setFormData] = useState({
    id: null,
    nombre: '',
    slogan: '',
    propuestas: '',
    color: '#1B3A8C',
    sede: 'Sede Central',
    nivel: 'Primaria',
    estado_registro: 'borrador',
    alcalde: '', alcalde_grado: '',
    teniente: '', teniente_grado: '',
    regidor_educacion: '', regidor_educacion_grado: '',
    regidor_salud: '', regidor_salud_grado: '',
    regidor_emprendimiento: '', regidor_emprendimiento_grado: '',
    regidor_derechos: '', regidor_derechos_grado: '',
    regidor_comunicacion: '', regidor_comunicacion_grado: '',
    responsable_entrega: '',
  });

  // Archivos seleccionados localmente
  const [selectedFiles, setSelectedFiles] = useState({});
  const [existingUrls, setExistingUrls] = useState({});

  // Autocompletado de alumnos
  const [activeSearchField, setActiveSearchField] = useState(null);
  const [searchQueries, setSearchQueries] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Acordeón de grados y secciones sugeridas del colegio
  const [gradosSugeridos, setGradosSugeridos] = useState([]);
  const [openGradoAccordion, setOpenGradoAccordion] = useState(null);
  const accordionRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accordionRef.current && !accordionRef.current.contains(e.target)) {
        setOpenGradoAccordion(null);
      }
    };
    if (openGradoAccordion) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openGradoAccordion]);

  // Cargar datos iniciales de la lista con el token
  const loadListaData = async () => {
    if (!token) {
      setError("No se proporcionó ningún token o enlace de inscripción válido.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/postulacion/info?token=${encodeURIComponent(token)}`);
      if (res.data?.success && res.data?.candidato) {
        const c = res.data.candidato;

        if (res.data?.grados_sugeridos && Array.isArray(res.data.grados_sugeridos)) {
          setGradosSugeridos(res.data.grados_sugeridos);
        } else {
          // Grados por defecto si el servidor no los envía
          const isSec = (c.nivel || '').toLowerCase().includes('sec');
          setGradosSugeridos(isSec ? [
            '1° SEC A', '1° SEC B', '1° SEC C',
            '2° SEC A', '2° SEC B', '2° SEC C',
            '3° SEC A', '3° SEC B', '3° SEC C',
            '4° SEC A', '4° SEC B', '4° SEC C',
            '5° SEC A', '5° SEC B', '5° SEC C'
          ] : [
            '1° PRIM A', '1° PRIM B',
            '2° PRIM A', '2° PRIM B',
            '3° PRIM A', '3° PRIM B',
            '4° PRIM A', '4° PRIM B',
            '5° PRIM A', '5° PRIM B',
            '6° PRIM A', '6° PRIM B'
          ]);
        }
        setFormData({
          id: c.id,
          nombre: c.nombre || '',
          slogan: c.slogan || '',
          propuestas: c.propuestas || '',
          color: c.color || '#1B3A8C',
          sede: c.sede || 'Sede Central',
          nivel: c.nivel || 'Primaria',
          estado_registro: c.estado_registro || 'borrador',
          alcalde: c.alcalde || '',
          alcalde_grado: c.alcalde_grado || '',
          teniente: c.teniente || '',
          teniente_grado: c.teniente_grado || '',
          regidor_educacion: c.regidor_educacion || '',
          regidor_educacion_grado: c.regidor_educacion_grado || '',
          regidor_salud: c.regidor_salud || '',
          regidor_salud_grado: c.regidor_salud_grado || '',
          regidor_emprendimiento: c.regidor_emprendimiento || '',
          regidor_emprendimiento_grado: c.regidor_emprendimiento_grado || '',
          regidor_derechos: c.regidor_derechos || '',
          regidor_derechos_grado: c.regidor_derechos_grado || '',
          regidor_comunicacion: c.regidor_comunicacion || '',
          regidor_comunicacion_grado: c.regidor_comunicacion_grado || '',
          responsable_entrega: c.responsable_entrega || '',
        });

        // Guardar URLs de fotos existentes
        const urls = {};
        const fotoKeys = ['logo', 'alcalde_foto', 'teniente_foto', 'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_emprendimiento_foto', 'regidor_derechos_foto', 'regidor_comunicacion_foto'];
        fotoKeys.forEach(k => {
          if (c[`${k}_url`]) urls[k] = c[`${k}_url`];
          else if (c[k]) urls[k] = getAssetUrl(c[k]);
        });
        setExistingUrls(urls);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error al cargar la ficha de postulación. Verifica el enlace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListaData();
  }, [token]);

  // Manejar cambio en campos de texto
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Manejar selección de archivos (imágenes)
  const handleFileChange = async (field, file) => {
    if (!file) return;
    setSelectedFiles(prev => ({ ...prev, [field]: file }));

    // Si es el logo, extraer el color representativo automáticamente
    if (field === 'logo') {
      try {
        const detectedColor = await extractDominantColor(file);
        if (detectedColor) {
          setFormData(prev => ({ ...prev, color: detectedColor }));
        }
      } catch (e) {
        console.error("Error al extraer color del logo", e);
      }
    }
  };

  const handleClearFile = (field) => {
    setSelectedFiles(prev => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setExistingUrls(prev => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  // Búsqueda de estudiantes en el padrón para sugerencias
  const handleStudentSearch = (fieldKey, query) => {
    setSearchQueries(prev => ({ ...prev, [fieldKey]: query }));
    setActiveSearchField(fieldKey);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/postulacion/buscar-alumno?token=${encodeURIComponent(token)}&query=${encodeURIComponent(query.trim())}`);
        setSuggestions(res.data?.alumnos || []);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  // Al seleccionar una sugerencia: llena nombre y grado, dejando ambos 100% editables
  const handleSelectStudent = (fieldKey, alumno) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: alumno.nombre || `${alumno.apellidos}, ${alumno.nombres}`.trim(),
      [`${fieldKey}_grado`]: alumno.grado_seccion || ''
    }));
    setActiveSearchField(null);
    setSuggestions([]);
    setSearchQueries(prev => ({ ...prev, [fieldKey]: '' }));
  };

  // Guardar (como borrador o para enviar a revisión)
  const handleSave = async (accion = 'borrador') => {
    if (accion === 'enviar') {
      if (!formData.nombre || formData.nombre.trim() === '') {
        alert("Por favor, ingresa el Nombre del Partido antes de enviarlo a revisión oficial.");
        return;
      }

      const faltantes = [];
      const nombresIncompletos = [];
      const gradosFaltantes = [];

      CARGOS_LISTA.forEach(cargo => {
        const nombreVal = (formData[cargo.key] || '').trim();
        const gradoVal = (formData[`${cargo.key}_grado`] || '').trim();

        if (!nombreVal) {
          faltantes.push(cargo.label);
        } else {
          const partes = nombreVal.split(/\s+/).filter(Boolean);
          if (partes.length < 2) {
            nombresIncompletos.push(`${cargo.label} ("${nombreVal}")`);
          }
        }

        if (!gradoVal) {
          gradosFaltantes.push(cargo.label);
        }
      });

      if (faltantes.length > 0) {
        alert(`Para enviar la lista a revisión oficial es obligatorio registrar a todos los candidatos:\n\n• Faltan completar:\n${faltantes.map(f => '  - ' + f).join('\n')}`);
        return;
      }

      if (nombresIncompletos.length > 0) {
        alert(`Es obligatorio ingresar el Nombre Completo (nombres y apellidos) de cada candidato:\n\n• Nombre incompleto detectado:\n${nombresIncompletos.map(n => '  - ' + n).join('\n')}`);
        return;
      }

      if (gradosFaltantes.length > 0) {
        alert(`Por favor selecciona o escribe el Grado y Sección de todos los integrantes:\n\n• Grado pendiente:\n${gradosFaltantes.map(g => '  - ' + g).join('\n')}`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const postData = new FormData();
    postData.append('token', token);
    postData.append('accion', accion);

    // Campos de texto
    const textFields = [
      'nombre', 'slogan', 'propuestas', 'color',
      'alcalde', 'alcalde_grado',
      'teniente', 'teniente_grado',
      'regidor_educacion', 'regidor_educacion_grado',
      'regidor_salud', 'regidor_salud_grado',
      'regidor_emprendimiento', 'regidor_emprendimiento_grado',
      'regidor_derechos', 'regidor_derechos_grado',
      'regidor_comunicacion', 'regidor_comunicacion_grado'
    ];
    textFields.forEach(f => {
      if (formData[f] !== undefined && formData[f] !== null) {
        postData.append(f, formData[f]);
      }
    });

    // Archivos seleccionados
    Object.keys(selectedFiles).forEach(key => {
      if (selectedFiles[key]) {
        postData.append(key, selectedFiles[key]);
      }
    });

    try {
      const res = await api.post('/postulacion/guardar', postData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message || "Guardado exitosamente.");
        if (res.data.estado) {
          setFormData(prev => ({ ...prev, estado_registro: res.data.estado }));
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setSuccessMsg(null), 6000);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar los datos de la lista.");
    } finally {
      setSaving(false);
    }
  };

  const isAprobado = formData.estado_registro === 'aprobado';
  const isEnRevision = formData.estado_registro === 'en_revision';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <RefreshCw size={44} className="text-blue-600 animate-spin mx-auto mb-3" />
          <h3 className="text-lg font-black text-slate-800">Cargando Formulario de Inscripción...</h3>
          <p className="text-xs text-slate-500 mt-1">Verificando enlace oficial de la lista.</p>
        </div>
      </div>
    );
  }

  if (error && !formData.id) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-red-200">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-black text-slate-900">Enlace No Válido o Expirado</h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{error}</p>
          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Comunícate con el Comité Electoral o tu Docente Asesor para recibir un enlace actualizado.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-28">
      {/* CABECERA INSTITUCIONAL */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logoColegioAzul} alt="CATA" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                Inscripción Oficial de Lista Electoral
              </h1>
              <p className="text-[11px] font-bold text-slate-500">
                Municipio Escolar CATA 2026 · {formData.sede} ({formData.nivel})
                {formData.responsable_entrega && (
                  <span className="block text-blue-700 font-black text-[11px] mt-0.5">
                    👤 Asignado a: {formData.responsable_entrega}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Badge de Estado */}
          <div>
            {isAprobado ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 size={13} /> Lista Aprobada Oficialmente
              </span>
            ) : isEnRevision ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
                <Sparkles size={13} /> En Revisión del Comité
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                Borrador / En Llenado
              </span>
            )}
          </div>
        </div>
      </header>

      {/* MENSAJES DE ESTADO FLOTANTES */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        {successMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-lg flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-lg flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {isAprobado && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-medium flex items-center gap-3">
            <Shield size={24} className="text-emerald-600 shrink-0" />
            <div>
              <strong className="font-black block text-emerald-950">¡Felicidades! Esta lista ya ha sido aprobada oficialmente.</strong>
              Los datos se encuentran bloqueados para edición. Tu lista aparecerá en la cédula electrónica de votación escolar.
            </div>
          </div>
        )}
      </div>

      <main className="max-w-4xl mx-auto px-4 space-y-6">
        {/* ======================================================== */}
        {/* SECCIÓN 1: IDENTIDAD VISUAL DE LA LISTA                  */}
        {/* ======================================================== */}
        <section className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              1
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Identidad de la Lista</h2>
              <p className="text-xs text-slate-500">Nombre, lema y símbolo que te representará ante los estudiantes.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nombre del Partido */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                Nombre del Partido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => handleInputChange('nombre', e.target.value)}
                disabled={isAprobado}
                placeholder="Ejemplo: Partido Juventud y Liderazgo CATA"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-sm outline-none transition-all disabled:bg-slate-50"
              />
            </div>

            {/* Lema / Slogan */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Lema o Slogan de Campaña
              </label>
              <input
                type="text"
                value={formData.slogan}
                onChange={e => handleInputChange('slogan', e.target.value)}
                disabled={isAprobado}
                placeholder="Ejemplo: Juntos por un colegio más limpio, unido y participativo"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm font-medium outline-none transition-all disabled:bg-slate-50"
              />
            </div>

            {/* Subida de Logo / Símbolo con Extracción Automática de Color */}
            <div className="space-y-2 md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                    Símbolo o Logo de la Lista
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Este icono aparecerá en la pantalla táctil para que los electores voten por tu lista.
                  </p>
                </div>

                {/* Muestra del Color Automático Extraído */}
                {formData.color && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="w-4 h-4 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: formData.color }} />
                    <span className="text-[10px] font-black uppercase text-slate-700">
                      Color Identificativo
                    </span>
                  </div>
                )}
              </div>

              {/* Vista previa o Caja de subida */}
              {(selectedFiles.logo || existingUrls.logo) ? (
                <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-emerald-300">
                  <div className="flex items-center gap-3">
                    <img 
                      src={selectedFiles.logo ? URL.createObjectURL(selectedFiles.logo) : existingUrls.logo} 
                      alt="Logo" 
                      className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1 bg-white"
                    />
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Check size={12} /> Logo Seleccionado
                      </span>
                      <p className="text-xs text-slate-600 mt-1 font-bold">
                        Color representativo auto-detectado: <span className="font-mono" style={{ color: formData.color }}>{formData.color}</span>
                      </p>
                    </div>
                  </div>

                  {!isAprobado ? (
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors">
                        Cambiar
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => e.target.files?.[0] && handleFileChange('logo', e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleClearFile('logo')}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Símbolo Oficial Registrado
                    </span>
                  )}
                </div>
              ) : (
                <label className="block p-5 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl cursor-pointer text-center transition-all">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                    <ImageIcon size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 block">Subir Símbolo o Logo (PNG / JPG / WEBP)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">El sistema detectará el color principal de tu lista automáticamente</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isAprobado}
                    onChange={e => e.target.files?.[0] && handleFileChange('logo', e.target.files[0])}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECCIÓN 2: LOS 7 INTEGRANTES OFICIALES                   */}
        {/* ======================================================== */}
        <section className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              2
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Equipo de Candidatos (7 Miembros)</h2>
              <p className="text-xs text-slate-500">
                Puedes buscar por DNI/Apellido para autocompletar, y luego editar los campos con total libertad.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {CARGOS_LISTA.map((cargo, index) => {
              const fotoKey = `${cargo.key}_foto`;
              const gradoKey = `${cargo.key}_grado`;
              const previewUrl = selectedFiles[fotoKey] 
                ? URL.createObjectURL(selectedFiles[fotoKey]) 
                : existingUrls[fotoKey];

              return (
                <div 
                  key={cargo.key}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black">
                        {index + 1}
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                        {cargo.label}
                        {cargo.req && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                    </div>

                    {/* Buscador inteligente en Padrón */}
                    {!isAprobado && (
                      <div className="relative min-w-[200px] sm:min-w-[260px]">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="🔍 Buscar por DNI o Apellido..."
                            value={searchQueries[cargo.key] || ''}
                            onChange={e => handleStudentSearch(cargo.key, e.target.value)}
                            className="w-full text-[11px] px-3 py-1.5 pl-7 rounded-lg border border-slate-300 bg-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                          />
                          <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                          {isSearching && activeSearchField === cargo.key && (
                            <RefreshCw size={12} className="absolute right-2.5 top-2.5 text-blue-500 animate-spin" />
                          )}
                        </div>

                        {/* Desplegable de Sugerencias */}
                        {activeSearchField === cargo.key && suggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100">
                            {suggestions.map((alum) => (
                              <button
                                key={alum.codigo}
                                type="button"
                                onClick={() => handleSelectStudent(cargo.key, alum)}
                                className="w-full p-2.5 text-left hover:bg-blue-50 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {alum.nombre}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    DNI: {alum.dni}
                                  </p>
                                </div>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 shrink-0">
                                  {alum.grado_seccion}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fila de Campos: Foto + Nombres (Editable) + Grado (Editable) */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
                    {/* Foto del Candidato */}
                    <div className="shrink-0 flex items-center gap-2">
                      {previewUrl ? (
                        <div className="relative group">
                          <img 
                            src={previewUrl} 
                            alt={cargo.label}
                            className="w-14 h-16 object-cover rounded-xl border-2 border-blue-400 shadow-xs bg-slate-200"
                          />
                          {!isAprobado && (
                            <button
                              type="button"
                              onClick={() => handleClearFile(fotoKey)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600"
                              title="Quitar foto"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <label className={`w-14 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white flex flex-col items-center justify-center cursor-pointer transition-colors ${isAprobado ? 'opacity-40 cursor-not-allowed' : ''}`}>
                          <Camera size={18} className="text-slate-400" />
                          <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isAprobado}
                            onChange={e => e.target.files?.[0] && handleFileChange(fotoKey, e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Nombres y Apellidos Completos (Obligatorio) */}
                    <div className="flex-1 min-w-0 w-full space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700">
                        Nombres y Apellidos Completos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData[cargo.key] || ''}
                        onChange={e => handleInputChange(cargo.key, e.target.value)}
                        disabled={isAprobado}
                        placeholder={cargo.placeholder}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-xs sm:text-sm font-bold outline-none transition-all disabled:bg-slate-50"
                      />
                    </div>

                    {/* Grado y Sección con Acordeón Desplegable de Sugerencias */}
                    <div className="w-full sm:w-[210px] space-y-1 shrink-0 relative">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700">
                          Grado y Sección <span className="text-red-500">*</span>
                        </label>
                        {!isAprobado && (
                          <button
                            type="button"
                            onClick={() => setOpenGradoAccordion(openGradoAccordion === cargo.key ? null : cargo.key)}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Elegir</span>
                            <ChevronDown size={11} className={`transition-transform duration-200 ${openGradoAccordion === cargo.key ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={formData[gradoKey] || ''}
                          onChange={e => handleInputChange(gradoKey, e.target.value)}
                          disabled={isAprobado}
                          placeholder={formData.nivel?.includes('Sec') ? 'Ej: 5° SEC A' : 'Ej: 6° PRIM A'}
                          className="w-full px-3 py-2 pr-8 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 text-xs sm:text-sm font-black text-blue-900 outline-none transition-all disabled:bg-slate-50"
                        />
                        {!isAprobado && (
                          <button
                            type="button"
                            onClick={() => setOpenGradoAccordion(openGradoAccordion === cargo.key ? null : cargo.key)}
                            title="Desplegar grados y secciones oficiales"
                            className="absolute right-2 top-2.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            <ChevronDown size={14} className={`transition-transform duration-200 ${openGradoAccordion === cargo.key ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      {/* Acordeón desplegable de sugerencias oficiales */}
                      {openGradoAccordion === cargo.key && (
                        <div 
                          ref={accordionRef}
                          className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 p-3 bg-white rounded-2xl shadow-2xl border border-blue-200 z-30 animate-fade-in"
                        >
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                            <div>
                              <p className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                                <GraduationCap size={13} className="text-blue-600" />
                                Grados y Secciones Oficiales
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {formData.nivel} · Selecciona el formato estándar
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOpenGradoAccordion(null)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            <div className="grid grid-cols-2 gap-1.5">
                              {gradosSugeridos.map((gradoItem) => {
                                const isSelected = formData[gradoKey]?.trim().toUpperCase() === gradoItem.trim().toUpperCase();
                                return (
                                  <button
                                    key={gradoItem}
                                    type="button"
                                    onClick={() => {
                                      handleInputChange(gradoKey, gradoItem);
                                      setOpenGradoAccordion(null);
                                    }}
                                    className={`px-2.5 py-1.5 rounded-xl text-left text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                                      isSelected
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200'
                                    }`}
                                  >
                                    <span className="truncate">{gradoItem}</span>
                                    {isSelected && <Check size={12} className="shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                            <span>También puedes escribirlo libremente.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECCIÓN 3: PROPUESTAS DE GOBIERNO ESTUDIANTIL            */}
        {/* ======================================================== */}
        <section className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              3
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Propuestas y Compromisos</h2>
              <p className="text-xs text-slate-500">
                Escribe las principales iniciativas que tu lista ofrece a los estudiantes.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <textarea
              rows={5}
              value={formData.propuestas}
              onChange={e => handleInputChange('propuestas', e.target.value)}
              disabled={isAprobado}
              placeholder="1. Fomentar torneos deportivos mensuales...
2. Mejorar la biblioteca escolar con internet libre...
3. Crear buzón de sugerencias estudiantiles..."
              className="w-full p-4 rounded-2xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm outline-none transition-all resize-y disabled:bg-slate-50 font-medium leading-relaxed"
            />
          </div>
        </section>
      </main>

      {/* ======================================================== */}
      {/* BARRA INFERIOR FIJA DE ACCIONES                          */}
      {/* ======================================================== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 z-40 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {isAprobado ? (
            <div className="flex items-center justify-between w-full py-1">
              <div className="flex items-center gap-2.5 text-emerald-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-black text-emerald-950">
                    Lista Aprobada Oficialmente · Formulario Bloqueado
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Los datos de esta lista ya fueron certificados para la cédula de votación y no pueden modificarse.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs shrink-0">
                <CheckCircle2 size={14} /> Cédula Oficial Lista
              </span>
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-slate-500">
                  {isEnRevision 
                    ? "Tu lista está en revisión por el Comité. Si realizas cambios, vuelve a presionar Enviar."
                    : "Puedes guardar tu avance y continuar en cualquier momento con este mismo enlace."}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Botón Guardar Borrador */}
                <button
                  type="button"
                  onClick={() => handleSave('borrador')}
                  disabled={saving}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{saving ? 'Guardando...' : 'Guardar Avance'}</span>
                </button>

                {/* Botón Enviar a Revisión */}
                <button
                  type="button"
                  onClick={() => handleSave('enviar')}
                  disabled={saving}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send size={16} />
                  <span>{saving ? 'Enviando...' : 'Enviar a Revisión'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateSelfRegistration;

