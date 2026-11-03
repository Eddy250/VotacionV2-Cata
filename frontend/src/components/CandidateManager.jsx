import React, { useState, useEffect, useRef } from 'react';
import api, { getAssetUrl } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, Image as ImageIcon, Edit3, Trash2, X, Users, Megaphone,
  FileText, Camera, Wand2, FileCode, CheckCircle2, Search, Eye, Download,
  ExternalLink, Sparkles, AlertCircle
} from 'lucide-react';

const BLUE = '#1B3A8C';
const BLUE_LIGHT = '#EEF4FF';

const FileUploadField = ({
  label,
  file,
  existingUrl,
  onChange,
  onClear,
  accept = "image/*",
  isPdf = false,
  helperText = null
}) => {
  const [localPreview, setLocalPreview] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (file && !isPdf && file.type?.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setLocalPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLocalPreview(null);
    }
  }, [file, isPdf]);

  // 1. Estado: Nuevo archivo seleccionado (Verde Esmeralda Vibrante con Checkmark)
  if (file) {
    return (
      <div className="space-y-1.5">
        {label && <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</label>}
        <div className="p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/90 shadow-sm flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            {localPreview ? (
              <img
                src={localPreview}
                alt="Vista previa"
                className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400 shadow-sm flex-shrink-0 bg-white"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                {isPdf ? <FileCode size={20} /> : <CheckCircle2 size={20} />}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs">
                  <CheckCircle2 size={12} /> Archivo Seleccionado
                </span>
                <span className="text-[10px] text-emerald-800 font-bold">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-950 truncate mt-0.5" title={file.name}>
                {file.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-xl transition-colors shadow-xs"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Quitar archivo"
            >
              <X size={16} />
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                onChange(e.target.files[0]);
              }
            }}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  // 2. Estado: Archivo previamente guardado en el servidor (Verde / Teal Permanente)
  if (existingUrl) {
    return (
      <div className="space-y-1.5">
        {label && <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</label>}
        <div className="p-3 rounded-2xl border-2 border-teal-500 bg-teal-50/80 shadow-sm flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            {!isPdf ? (
              <img
                src={getAssetUrl(existingUrl)}
                alt="Foto actual"
                className="w-12 h-12 rounded-xl object-cover border-2 border-teal-400 shadow-sm flex-shrink-0 bg-white"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <FileCode size={20} />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-700 text-white shadow-xs">
                  <CheckCircle2 size={12} /> {isPdf ? 'PDF Oficial Guardado' : 'Foto Guardada en Sistema'}
                </span>
              </div>
              <p className="text-[11px] text-teal-900 font-semibold mt-0.5 truncate">
                {isPdf ? (
                  <a
                    href={getAssetUrl(existingUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-teal-800 hover:text-teal-950 inline-flex items-center gap-1"
                  >
                    Ver archivo PDF actual <ExternalLink size={10} />
                  </a>
                ) : (
                  'Foto activa en el sistema (se mantendrá intacta).'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-bold text-teal-900 bg-white border border-teal-300 hover:bg-teal-100 rounded-xl transition-colors shadow-xs"
            >
              Reemplazar
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                onChange(e.target.files[0]);
              }
            }}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  // 3. Estado: Vacío / Sin selección (Caja interactiva moderna con hover)
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        className="p-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 bg-white cursor-pointer transition-all flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
            {isPdf ? <FileCode size={20} /> : <ImageIcon size={20} />}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition-colors">
              {isPdf ? 'Subir Plan de Trabajo en PDF' : 'Seleccionar fotografía'}
            </p>
            <p className="text-[10px] text-slate-400">
              {helperText || (isPdf ? 'Documento PDF (máx. 25MB)' : 'Formatos recomendados: PNG, JPG o WEBP')}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white rounded-xl transition-colors shadow-xs"
        >
          Examinar
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              onChange(e.target.files[0]);
            }
          }}
          className="hidden"
        />
      </div>
    </div>
  );
};

const CandidateManager = () => {
  const [candidatos, setCandidatos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [existingFiles, setExistingFiles] = useState({});
  const [filterSede, setFilterSede] = useState('todos');

  // Form state
  const emptyForm = {
    nombre: '', descripcion: '', slogan: '', propuestas: '',
    alcalde: '', teniente: '', regidor_educacion: '', regidor_salud: '', regidor_derechos: '',
    foto: null, logo: null,
    alcalde_foto: null, teniente_foto: null,
    regidor_educacion_foto: null, regidor_salud_foto: null, regidor_derechos_foto: null,
    propuestas_pdf: null,
    propuestas_pdf_path: '',
    sede: 'Sede Principal',
    color: '#1B3A8C'
  };

  const [formData, setFormData] = useState({ ...emptyForm });

  // Asistente PDF state
  const [analyzingPdf, setAnalyzingPdf] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // Student autocomplete state
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [activeSearchField, setActiveSearchField] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const loadCandidatos = async () => {
    try {
      const res = await api.get('/admin/candidatos');
      setCandidatos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadCandidatos(); }, []);

  const openCreate = (targetSede = 'Sede Central') => {
    setEditMode(null);
    setExistingFiles({});
    setFormData({ ...emptyForm, sede: targetSede });
    setAnalysisResult(null);
    setAnalysisError(null);
    setActiveTab('general');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditMode(c.id);
    setExistingFiles({
      foto: c.foto || null,
      logo: c.logo || null,
      alcalde_foto: c.alcalde_foto || null,
      teniente_foto: c.teniente_foto || null,
      regidor_educacion_foto: c.regidor_educacion_foto || null,
      regidor_salud_foto: c.regidor_salud_foto || null,
      regidor_derechos_foto: c.regidor_derechos_foto || null,
      propuestas_pdf: c.propuestas_pdf || null,
    });
    setFormData({
      nombre: c.nombre || '', descripcion: c.descripcion || '',
      slogan: c.slogan || '', propuestas: c.propuestas || '',
      alcalde: c.alcalde || '', teniente: c.teniente || '',
      regidor_educacion: c.regidor_educacion || '', regidor_salud: c.regidor_salud || '',
      regidor_derechos: c.regidor_derechos || '',
      foto: null, logo: null,
      alcalde_foto: null, teniente_foto: null,
      regidor_educacion_foto: null, regidor_salud_foto: null, regidor_derechos_foto: null,
      propuestas_pdf: null,
      propuestas_pdf_path: c.propuestas_pdf || '',
      sede: c.sede || 'Sede Principal',
      color: c.color || '#1B3A8C'
    });
    setAnalysisResult(null);
    setAnalysisError(null);
    setActiveTab('general');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.nombre || formData.nombre.trim() === '') {
      alert("Por favor, ingresa o verifica el Nombre de la Lista en la pestaña Datos Generales antes de guardar.");
      setActiveTab('general');
      return;
    }

    const data = new FormData();

    // Campos de texto
    const textFields = ['nombre', 'descripcion', 'slogan', 'propuestas',
      'alcalde', 'teniente', 'regidor_educacion', 'regidor_salud', 'regidor_derechos', 'sede', 'color'];
    textFields.forEach(f => { if (formData[f]) data.append(f, formData[f]); });

    // Ruta de PDF si ya fue pre-guardado por el asistente
    if (formData.propuestas_pdf_path && !formData.propuestas_pdf) {
      data.append('propuestas_pdf_path', formData.propuestas_pdf_path);
    }

    // Archivos de imagen
    const fileFields = ['foto', 'logo', 'alcalde_foto', 'teniente_foto',
      'regidor_educacion_foto', 'regidor_salud_foto', 'regidor_derechos_foto'];
    fileFields.forEach(f => { if (formData[f]) data.append(f, formData[f]); });

    // Archivo PDF
    if (formData.propuestas_pdf) {
      data.append('propuestas_pdf', formData.propuestas_pdf);
    }

    try {
      if (editMode) {
        await api.post(`/admin/candidatos/${editMode}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/admin/candidatos', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setShowModal(false);
      setFormData({ ...emptyForm });
      setEditMode(null);
      loadCandidatos();
    } catch (err) {
      alert("Error guardando candidato: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este candidato y todos sus votos asociados?")) return;
    try {
      await api.delete(`/admin/candidatos/${id}`);
      loadCandidatos();
    } catch (err) {
      alert("Error al eliminar");
    }
  };

  // Helper para cambios de texto y archivo
  const setFile = (field, file) => setFormData(prev => ({ ...prev, [field]: file }));
  const setText = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  // Autocomplete de Alumnos con el Padrón
  const handleStudentSearch = (field, query) => {
    setText(field, query);
    setActiveSearchField(field);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query || query.trim().length < 2) {
      setStudentSuggestions([]);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/admin/alumnos?search=${encodeURIComponent(query.trim())}`);
        const list = res.data?.alumnos || [];
        setStudentSuggestions(list.slice(0, 5));
      } catch (err) {
        setStudentSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
  };

  const selectStudent = (field, student) => {
    setText(field, student.nombre);
    setStudentSuggestions([]);
    setActiveSearchField(null);
  };

  // Asistente PDF: Subir y analizar localmente
  const handlePdfUploadAndAnalyze = async (file) => {
    if (!file) return;
    setFile('propuestas_pdf', file);
    setAnalyzingPdf(true);
    setAnalysisError(null);

    const pdfData = new FormData();
    pdfData.append('pdf', file);

    try {
      const res = await api.post('/admin/candidatos/parse-pdf', pdfData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setAnalysisResult(data);

        // Guardar la ruta del PDF si el backend ya lo almacenó
        if (data.pdf_path) {
          setText('propuestas_pdf_path', data.pdf_path);
          setExistingFiles(prev => ({ ...prev, propuestas_pdf: data.pdf_url || data.pdf_path }));
        }
      } else {
        setAnalysisError("No se pudo extraer texto del documento PDF.");
      }
    } catch (err) {
      setAnalysisError(err.response?.data?.error || "Error al procesar el archivo PDF.");
    } finally {
      setAnalyzingPdf(false);
    }
  };

  // Aplicar sugerencias del asistente
  const applyAllSuggestions = () => {
    if (!analysisResult) return;
    setFormData(prev => {
      const next = { ...prev };
      if (analysisResult.nombre) next.nombre = analysisResult.nombre;
      if (analysisResult.slogan) next.slogan = analysisResult.slogan;
      if (analysisResult.propuestas) next.propuestas = analysisResult.propuestas;

      // Asignar candidatos detectados
      (analysisResult.alumnos_detectados || []).forEach(a => {
        const rol = a.rol_sugerido;
        if (rol && ['alcalde', 'teniente', 'regidor_educacion', 'regidor_salud', 'regidor_derechos'].includes(rol)) {
          next[rol] = a.nombre;
        }
      });
      return next;
    });
    alert("¡Sugerencias aplicadas! Se cargaron los datos de la lista, junta directiva y propuestas.");
  };

  const tabs = [
    { id: 'general', label: 'Datos Generales', icon: Megaphone },
    { id: 'asistente', label: 'Asistente PDF', icon: Wand2, badge: 'Smart' },
    { id: 'directiva', label: 'Junta Directiva', icon: Users },
    { id: 'propuestas', label: 'Plan de Trabajo', icon: FileText },
    { id: 'preview', label: 'Vista Previa', icon: Eye }
  ];

  const getCandidatoForEdit = (id) => candidatos.find(c => c.id === id);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Listas / Candidatos Oficiales</h3>
          <p className="text-slate-500 text-xs mt-0.5">Gestiona las listas electorales, directivas y planes de trabajo en PDF</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openCreate('Sede Central')}
            className="flex items-center gap-2 text-white font-bold py-2.5 px-4 rounded-2xl shadow-sm hover:shadow transition-all text-xs sm:text-sm cursor-pointer"
            style={{ backgroundColor: BLUE }}
          >
            <PlusCircle size={17} /> + Nueva Lista Sede Central
          </button>
          <button
            onClick={() => openCreate('Sede Jerusalén')}
            className="flex items-center gap-2 text-white font-bold py-2.5 px-4 rounded-2xl shadow-sm hover:shadow transition-all text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
          >
            <PlusCircle size={17} /> + Nueva Lista Sede Jerusalén
          </button>
        </div>
      </div>

      {/* Selector de Módulo / Sede */}
      <div className="flex flex-wrap items-center gap-2 mb-6 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setFilterSede('todos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterSede === 'todos' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🌐 Todas las Sedes ({candidatos.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterSede('Sede Central')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterSede === 'Sede Central' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🏛️ Sede Central ({candidatos.filter(c => !c.sede || c.sede.includes('Central') || c.sede.includes('Principal')).length})
        </button>
        <button
          type="button"
          onClick={() => setFilterSede('Sede Jerusalén')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterSede === 'Sede Jerusalén' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ⛪ Sede Jerusalén ({candidatos.filter(c => c.sede && c.sede.includes('Jerusal')).length})
        </button>
      </div>

      {/* Grid de Candidatos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {candidatos
          .filter(c => {
            if (filterSede === 'todos') return true;
            if (filterSede === 'Sede Central') return !c.sede || c.sede.includes('Central') || c.sede.includes('Principal');
            if (filterSede === 'Sede Jerusalén') return c.sede && c.sede.includes('Jerusal');
            return true;
          })
          .map(c => (
          <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
            <div className="h-44 bg-slate-100 relative">
              {c.foto ? (
                <img src={getAssetUrl(c.foto)} className="w-full h-full object-cover" alt="foto" />
              ) : c.logo ? (
                <div className="w-full h-full flex items-center justify-center p-6">
                  <img src={getAssetUrl(c.logo)} className="max-h-full max-w-full object-contain" alt="logo" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={40} /></div>
              )}
              {c.slogan && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-3 py-1.5">
                  <p className="text-white text-xs font-semibold italic truncate">"{c.slogan}"</p>
                </div>
              )}
              {c.propuestas_pdf && (
                <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                  <FileCode size={11} /> PDF Adjunto
                </div>
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-700 shadow-sm">
                  {c.sede === 'Sede Jerusalén' ? '🏛️ Jerusalén' : '🏛️ Central'}
                </span>
                {c.color && (
                  <span 
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-sm flex-shrink-0" 
                    style={{ backgroundColor: c.color }}
                    title={`Color de la lista: ${c.color}`}
                  />
                )}
              </div>
            </div>
            <div className="p-5 flex-grow">
              <h4 className="font-bold text-lg text-slate-800">{c.nombre}</h4>
              <p className="text-slate-500 text-sm mt-1 line-clamp-2">{c.descripcion}</p>
              {c.alcalde && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md font-bold" style={{ backgroundColor: BLUE_LIGHT, color: BLUE }}>Alcalde</span>
                  <span className="font-semibold text-slate-600 truncate">{c.alcalde}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 border-t border-slate-100">
              <button
                onClick={() => openEdit(c)}
                className="py-3 px-4 text-center font-bold text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors border-r border-slate-100 text-xs"
                onMouseEnter={e => e.currentTarget.style.color = BLUE}
                onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
              >
                <Edit3 size={15} /> Editar
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="py-3 px-4 text-center font-bold text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 transition-colors text-xs"
              >
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Principal de Edición / Creación */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-800">{editMode ? 'Editar Lista' : 'Nueva Lista Electoral'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Completa la información o usa el asistente para escanear el PDF</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Pestañas (Tabs) */}
              <div className="flex gap-1 px-8 pt-3 pb-2 border-b border-slate-100 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                    style={activeTab === tab.id
                      ? { backgroundColor: BLUE_LIGHT, color: BLUE }
                      : { backgroundColor: 'transparent', color: '#94A3B8' }
                    }
                  >
                    <tab.icon size={14} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-black text-white" style={{ backgroundColor: BLUE }}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Contenido scrolleable */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-8 py-5 space-y-5">

                {/* TAB 1: DATOS GENERALES */}
                {activeTab === 'general' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Nombre de la Lista</label>
                        <input
                          type="text" value={formData.nombre} onChange={e => setText('nombre', e.target.value)}
                          placeholder="Ej: Lista Fuerza CATA"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:border-blue-600"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Sede Electoral</label>
                        <select
                          value={formData.sede && formData.sede.includes('Jerusal') ? 'Sede Jerusalén' : 'Sede Central'}
                          onChange={e => setText('sede', e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-800 focus:border-blue-600 cursor-pointer"
                        >
                          <option value="Sede Central">🏛️ Sede Central</option>
                          <option value="Sede Jerusalén">⛪ Sede Jerusalén</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Eslogan de Campaña</label>
                      <input
                        type="text" value={formData.slogan} onChange={e => setText('slogan', e.target.value)}
                        placeholder="Ej: ¡Unidos por un CATA innovador y democrático!"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Descripción Breve</label>
                      <textarea
                        value={formData.descripcion} onChange={e => setText('descripcion', e.target.value)}
                        placeholder="Breve reseña sobre los valores e ideales de la lista..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:border-blue-600"
                        rows="3"
                      />
                    </div>

                    {/* Color Representativo del Partido / Lista */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                          Color Oficial del Partido (Barras y Resultados)
                        </label>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: formData.color || '#1B3A8C' }}>
                          {formData.color || '#1B3A8C'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        {[
                          { name: 'Azul CATA', hex: '#1B3A8C' },
                          { name: 'Azul Real', hex: '#2563EB' },
                          { name: 'Rojo Pasión', hex: '#E11D48' },
                          { name: 'Amarillo / Dorado', hex: '#F59E0B' },
                          { name: 'Verde Esmeralda', hex: '#10B981' },
                          { name: 'Morado / Violeta', hex: '#8B5CF6' },
                          { name: 'Naranja', hex: '#F97316' },
                          { name: 'Celeste / Cian', hex: '#06B6D4' },
                          { name: 'Rosa Vibrante', hex: '#EC4899' },
                          { name: 'Gris Neutro', hex: '#64748B' },
                        ].map((swatch, idx) => {
                          const isSelected = formData.color?.toLowerCase() === swatch.hex.toLowerCase();
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setText('color', swatch.hex)}
                              title={swatch.name}
                              className={`w-7 h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                                isSelected
                                  ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-sm'
                                  : 'hover:scale-105 opacity-80 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: swatch.hex }}
                            >
                              {isSelected && (
                                <CheckCircle2 size={14} className="text-white drop-shadow" />
                              )}
                            </button>
                          );
                        })}
                        
                        {/* Selector de color nativo libre */}
                        <div className="flex items-center gap-2 pl-3 border-l border-slate-200 ml-auto">
                          <label className="text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-1.5">
                            <input
                              type="color"
                              value={formData.color || '#1B3A8C'}
                              onChange={e => setText('color', e.target.value)}
                              className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer p-0 overflow-hidden"
                            />
                            <span className="text-[11px]">Otro Color</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <FileUploadField
                        label="Foto de Portada"
                        file={formData.foto}
                        existingUrl={existingFiles.foto}
                        onChange={f => setFile('foto', f)}
                        onClear={() => setFile('foto', null)}
                        helperText="Banner o afiche de la lista"
                      />
                      <FileUploadField
                        label="Logo / Símbolo"
                        file={formData.logo}
                        existingUrl={existingFiles.logo}
                        onChange={f => setFile('logo', f)}
                        onClear={() => setFile('logo', null)}
                        helperText="Insignia para la cédula de votación"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: ASISTENTE INTELIGENTE PDF (100% LOCAL Y GRATUITO) */}
                {activeTab === 'asistente' && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl border" style={{ backgroundColor: BLUE_LIGHT, borderColor: '#C7D9FF' }}>
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: BLUE }} />
                        <div>
                          <h4 className="text-sm font-bold" style={{ color: BLUE }}>Asistente Electoral de Documentos (100% Local)</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Sube el PDF o tríptico de la lista. El sistema leerá el texto localmente y <strong>cruzará los nombres con el padrón del colegio</strong> para detectar automáticamente quién es el alcalde, regidores y sus propuestas sin que tengas que transcribir todo a mano.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors">
                      <FileCode className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-700">Arrastra o selecciona el Plan de Trabajo en formato PDF</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Compatible con documentos de Word, Canva o folletos oficiales (.pdf)</p>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={e => handlePdfUploadAndAnalyze(e.target.files[0])}
                        className="mt-3 text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>

                    {analyzingPdf && (
                      <div className="p-4 text-center text-xs font-bold text-blue-700 animate-pulse bg-blue-50 rounded-xl">
                        🔍 Analizando documento PDF y cruzando datos con el padrón escolar...
                      </div>
                    )}

                    {analysisError && (
                      <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle size={15} /> {analysisError}
                      </div>
                    )}

                    {analysisResult && (
                      <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Resultados del Análisis</h4>
                          <button
                            type="button"
                            onClick={applyAllSuggestions}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow transition-colors flex items-center gap-1.5"
                            style={{ backgroundColor: BLUE }}
                          >
                            <Sparkles size={13} /> Aplicar todas las sugerencias
                          </button>
                        </div>

                        {/* Sede Asignada */}
                        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-500 text-[10px] uppercase block">Sede Asignada por Administrador:</span>
                            <span className="font-black text-blue-950 text-sm mt-0.5 block">
                              {formData.sede && formData.sede.includes('Jerusal') ? '⛪ Sede Jerusalén' : '🏛️ Sede Central'}
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5 block">
                              El asistente no altera la sede para garantizar la separación de padrones.
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 font-semibold">Cambiar:</span>
                            <select
                              value={formData.sede && formData.sede.includes('Jerusal') ? 'Sede Jerusalén' : 'Sede Central'}
                              onChange={e => setText('sede', e.target.value)}
                              className="px-3 py-1.5 rounded-xl border border-blue-300 bg-white text-xs font-bold text-slate-800 shadow-sm outline-none cursor-pointer"
                            >
                              <option value="Sede Central">🏛️ Sede Central</option>
                              <option value="Sede Jerusalén">⛪ Sede Jerusalén</option>
                            </select>
                          </div>
                        </div>

                        {/* Nombre de la lista detectado */}
                        {analysisResult.nombre && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-slate-500 block text-[10px] uppercase">Nombre de Lista Detectado:</span>
                              <span className="font-bold text-slate-800">{analysisResult.nombre}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setText('nombre', analysisResult.nombre)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              Usar
                            </button>
                          </div>
                        )}

                        {/* Eslogan detectado */}
                        {analysisResult.slogan && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-slate-500 block text-[10px] uppercase">Eslogan Detectado:</span>
                              <span className="font-semibold text-slate-800 italic">"{analysisResult.slogan}"</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setText('slogan', analysisResult.slogan)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              Usar
                            </button>
                          </div>
                        )}

                        {/* Integrantes detectados en el PDF */}
                        <div className="space-y-2">
                          <span className="font-bold text-slate-500 block text-[11px] uppercase">
                            Integrantes Detectados en el Documento ({analysisResult.alumnos_detectados?.length || 0}):
                          </span>
                          {(!analysisResult.alumnos_detectados || analysisResult.alumnos_detectados.length === 0) ? (
                            <p className="text-xs text-slate-400 italic">No se identificaron integrantes en el documento.</p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {analysisResult.alumnos_detectados.map((a, i) => (
                                <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-slate-800">{a.nombre}</p>
                                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${a.verificado_padron ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {a.verificado_padron ? '✓ Padrón' : 'Detectado'}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">DNI: {a.dni || 'Sin DNI'} · {a.grado} · Rol: <strong className="text-blue-700 uppercase">{a.rol_sugerido}</strong></p>
                                  </div>
                                  <div className="flex gap-1 flex-wrap justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setText(a.rol_sugerido || 'alcalde', a.nombre)}
                                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                    >
                                      Asignar ({a.rol_sugerido})
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Propuestas detectadas */}
                        {analysisResult.propuestas && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-500 block text-[10px] uppercase">Propuestas Identificadas:</span>
                              <button
                                type="button"
                                onClick={() => setText('propuestas', analysisResult.propuestas)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                              >
                                Copiar a Plan de Trabajo
                              </button>
                            </div>
                            <pre className="text-[11px] text-slate-600 font-sans whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {analysisResult.propuestas}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: JUNTA DIRECTIVA (CON AUTOCOMPLETADO VINCULADO AL PADRÓN) */}
                {activeTab === 'directiva' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 font-semibold">
                      Escribe el nombre o DNI del alumno para autocompletar con los datos oficiales del padrón escolar.
                    </p>

                    {[
                      { label: 'Alcalde(sa)', nameField: 'alcalde', photoField: 'alcalde_foto' },
                      { label: 'Teniente Alcalde(sa)', nameField: 'teniente', photoField: 'teniente_foto' },
                      { label: 'Regidor(a) de Educación, Cultura y Deporte', nameField: 'regidor_educacion', photoField: 'regidor_educacion_foto' },
                      { label: 'Regidor(a) de Salud y Medio Ambiente', nameField: 'regidor_salud', photoField: 'regidor_salud_foto' },
                      { label: 'Regidor(a) de Derechos del Niño y Adolescente', nameField: 'regidor_derechos', photoField: 'regidor_derechos_foto' }
                    ].map(member => (
                      <div key={member.nameField} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{member.label}</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={formData[member.nameField]}
                              onChange={e => handleStudentSearch(member.nameField, e.target.value)}
                              placeholder={`Buscar por nombre o DNI del ${member.label.toLowerCase()}...`}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:border-blue-600"
                            />
                            {searchLoading && activeSearchField === member.nameField && (
                              <div className="absolute right-3 top-3 text-[10px] text-blue-600 font-bold animate-pulse">Buscando...</div>
                            )}
                          </div>

                          {/* Menú de Autocompletado */}
                          {activeSearchField === member.nameField && studentSuggestions.length > 0 && (
                            <div className="absolute left-4 right-4 z-30 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                              {studentSuggestions.map((st, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => selectStudent(member.nameField, st)}
                                  className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors flex justify-between items-center"
                                >
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">{st.nombre}</p>
                                    <p className="text-[10px] text-slate-400">DNI: {st.dni} · {st.ngs || st.grado || 'Matriculado'}</p>
                                  </div>
                                  <span className="text-[10px] px-2 py-0.5 rounded font-bold text-blue-700 bg-blue-100">Seleccionar</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <FileUploadField
                          label="Foto del integrante"
                          file={formData[member.photoField]}
                          existingUrl={existingFiles[member.photoField]}
                          onChange={f => setFile(member.photoField, f)}
                          onClear={() => setFile(member.photoField, null)}
                          helperText={`Foto de perfil de ${member.label}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 4: PLAN DE TRABAJO & DOCUMENTO PDF */}
                {activeTab === 'propuestas' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Propuestas Principales (Viñetas para Celular)</label>
                      <textarea
                        value={formData.propuestas} onChange={e => setText('propuestas', e.target.value)}
                        placeholder="• Mejoras continuas en la biblioteca escolar&#10;• Creación de comités deportivos inter-aulas&#10;• Talleres de robótica y tecnología..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-sans focus:border-blue-600"
                        rows="6"
                      />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <FileUploadField
                        label="Documento PDF Oficial (Plan de Trabajo Completo)"
                        file={formData.propuestas_pdf}
                        existingUrl={formData.propuestas_pdf_path || existingFiles.propuestas_pdf}
                        onChange={f => {
                          setFile('propuestas_pdf', f);
                        }}
                        onClear={() => {
                          setFile('propuestas_pdf', null);
                          setText('propuestas_pdf_path', '');
                          setExistingFiles(prev => ({ ...prev, propuestas_pdf: null }));
                        }}
                        accept="application/pdf"
                        isPdf={true}
                        helperText="Se mostrará con visor interactivo en el portal público de los estudiantes"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 5: VISTA PREVIA EN VIVO */}
                {activeTab === 'preview' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 font-semibold">Así verán los estudiantes esta lista en el portal oficial:</p>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                      <h4 className="text-lg font-black text-slate-800">{formData.nombre || 'Nombre de la Lista'}</h4>
                      {formData.slogan && <p className="text-xs text-slate-500 italic">"{formData.slogan}"</p>}
                      {formData.alcalde && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800">Alcalde</span>
                          <span className="font-bold text-slate-700">{formData.alcalde}</span>
                        </div>
                      )}
                      {formData.teniente && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">Teniente</span>
                          <span className="font-semibold text-slate-600">{formData.teniente}</span>
                        </div>
                      )}
                      {formData.propuestas && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Propuestas:</span>
                          <p className="text-xs text-slate-600 whitespace-pre-wrap mt-1 leading-relaxed">{formData.propuestas}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 text-white font-bold rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
                    style={{ backgroundColor: BLUE }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#142D6E'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = BLUE}
                  >
                    <CheckCircle2 size={16} />
                    {editMode ? 'Actualizar Lista' : 'Guardar Lista Oficial'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CandidateManager;
