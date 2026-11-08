import React, { useState, useEffect, useRef } from 'react';
import api, { getAssetUrl } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, Image as ImageIcon, Edit3, Trash2, X, Users, Megaphone,
  FileText, Camera, Wand2, FileCode, CheckCircle2, Search, Eye, Download,
  ExternalLink, Sparkles, AlertCircle, Share2, Copy, Check, ShieldCheck, Link as LinkIcon, UserCheck,
  ChevronDown, GraduationCap
} from 'lucide-react';
import { extractDominantColor } from '../utils/colorExtractor';

const BLUE = '#1B3A8C';
const BLUE_LIGHT = '#EEF4FF';

const CARGOS = [
  { key: 'alcalde', label: 'Alcalde ó Alcaldesa', desc: 'Líder del Municipio Escolar' },
  { key: 'teniente', label: 'Teniente Alcalde', desc: 'Segunda autoridad del Municipio' },
  { key: 'regidor_educacion', label: 'Regidor(a) de Educación, Cultura y Deporte', desc: 'Coordinación académica, deportiva y recreativa' },
  { key: 'regidor_salud', label: 'Regidor(a) de Salud y Ambiente', desc: 'Higiene, áreas verdes y primeros auxilios' },
  { key: 'regidor_emprendimiento', label: 'Regidor(a) de Emprendimiento y Actividades Productivas', desc: 'Proyectos estudiantiles y actividades pro-fondos' },
  { key: 'regidor_derechos', label: 'Regidor(a) de Derechos del Niño, Niña y Adolescente', desc: 'Convivencia escolar, prevención y tutoría' },
  { key: 'regidor_comunicacion', label: 'Regidor(a) de Comunicación y Tecnologías', desc: 'Periódico mural, redes escolares y tecnología' },
];

const GRADOS_SECUNDARIA = [
  '1° SEC A', '1° SEC B', '1° SEC C',
  '2° SEC A', '2° SEC B', '2° SEC C',
  '3° SEC A', '3° SEC B', '3° SEC C',
  '4° SEC A', '4° SEC B', '4° SEC C',
  '5° SEC A', '5° SEC B', '5° SEC C',
];

const GRADOS_PRIMARIA = [
  '1° PRIM A', '1° PRIM B',
  '2° PRIM A', '2° PRIM B',
  '3° PRIM A', '3° PRIM B',
  '4° PRIM A', '4° PRIM B',
  '5° PRIM A', '5° PRIM B',
  '6° PRIM A', '6° PRIM B',
];

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
    alcalde: '', alcalde_grado: '',
    teniente: '', teniente_grado: '',
    regidor_educacion: '', regidor_educacion_grado: '',
    regidor_salud: '', regidor_salud_grado: '',
    regidor_emprendimiento: '', regidor_emprendimiento_grado: '',
    regidor_derechos: '', regidor_derechos_grado: '',
    regidor_comunicacion: '', regidor_comunicacion_grado: '',
    foto: null, logo: null,
    alcalde_foto: null, teniente_foto: null,
    regidor_educacion_foto: null, regidor_salud_foto: null,
    regidor_emprendimiento_foto: null, regidor_derechos_foto: null, regidor_comunicacion_foto: null,
    propuestas_pdf: null,
    propuestas_pdf_path: '',
    sede: 'Sede Central',
    nivel: 'Primaria',
    color: '#1B3A8C',
    estado_registro: 'aprobado'
  };

  const [formData, setFormData] = useState({ ...emptyForm });

  // Modal para revisar ficha completa de postulación
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewCandidate, setReviewCandidate] = useState(null);

  const openReview = (c) => {
    setReviewCandidate(c);
    setShowReviewModal(true);
  };

  // Modal para generar enlace de postulación a candidatos
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkConfig, setLinkConfig] = useState({ sede: 'Sede Central', nivel: 'Primaria', nombre: '', responsable: '', telefono: '' });
  const [generatedLink, setGeneratedLink] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Asistente PDF state
  const [analyzingPdf, setAnalyzingPdf] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // Student autocomplete state
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [activeSearchField, setActiveSearchField] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [openGradoAccordion, setOpenGradoAccordion] = useState(null);
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

  const openCreate = (targetSede = 'Sede Central', targetNivel = 'Primaria') => {
    setEditMode(null);
    setExistingFiles({});
    setFormData({
      ...emptyForm,
      sede: targetSede,
      nivel: targetSede.includes('Jerusal') ? 'General' : targetNivel
    });
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
      regidor_emprendimiento_foto: c.regidor_emprendimiento_foto || null,
      regidor_derechos_foto: c.regidor_derechos_foto || null,
      regidor_comunicacion_foto: c.regidor_comunicacion_foto || null,
      propuestas_pdf: c.propuestas_pdf || null,
    });
    setFormData({
      nombre: c.nombre || '', descripcion: c.descripcion || '',
      slogan: c.slogan || '', propuestas: c.propuestas || '',
      alcalde: c.alcalde || '', alcalde_grado: c.alcalde_grado || '',
      teniente: c.teniente || '', teniente_grado: c.teniente_grado || '',
      regidor_educacion: c.regidor_educacion || '', regidor_educacion_grado: c.regidor_educacion_grado || '',
      regidor_salud: c.regidor_salud || '', regidor_salud_grado: c.regidor_salud_grado || '',
      regidor_emprendimiento: c.regidor_emprendimiento || '', regidor_emprendimiento_grado: c.regidor_emprendimiento_grado || '',
      regidor_derechos: c.regidor_derechos || '', regidor_derechos_grado: c.regidor_derechos_grado || '',
      regidor_comunicacion: c.regidor_comunicacion || '', regidor_comunicacion_grado: c.regidor_comunicacion_grado || '',
      foto: null, logo: null,
      alcalde_foto: null, teniente_foto: null,
      regidor_educacion_foto: null, regidor_salud_foto: null,
      regidor_emprendimiento_foto: null, regidor_derechos_foto: null, regidor_comunicacion_foto: null,
      propuestas_pdf: null,
      propuestas_pdf_path: c.propuestas_pdf || '',
      sede: c.sede || 'Sede Central',
      nivel: c.nivel || 'General',
      color: c.color || '#1B3A8C',
      estado_registro: c.estado_registro || 'aprobado'
    });
    setAnalysisResult(null);
    setAnalysisError(null);
    setActiveTab('general');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.nombre || formData.nombre.trim() === '') {
      alert("Por favor, ingresa o verifica el Nombre del Partido en la pestaña Datos Generales antes de guardar.");
      setActiveTab('general');
      return;
    }

    const data = new FormData();

    // Campos de texto
    const textFields = [
      'nombre', 'descripcion', 'slogan', 'propuestas',
      'alcalde', 'alcalde_grado',
      'teniente', 'teniente_grado',
      'regidor_educacion', 'regidor_educacion_grado',
      'regidor_salud', 'regidor_salud_grado',
      'regidor_emprendimiento', 'regidor_emprendimiento_grado',
      'regidor_derechos', 'regidor_derechos_grado',
      'regidor_comunicacion', 'regidor_comunicacion_grado',
      'sede', 'nivel', 'color', 'estado_registro'
    ];
    textFields.forEach(f => { if (formData[f]) data.append(f, formData[f]); });

    // Ruta de PDF si ya fue pre-guardado por el asistente
    if (formData.propuestas_pdf_path && !formData.propuestas_pdf) {
      data.append('propuestas_pdf_path', formData.propuestas_pdf_path);
    }

    // Archivos de imagen
    const fileFields = ['foto', 'logo', 'alcalde_foto', 'teniente_foto',
      'regidor_educacion_foto', 'regidor_salud_foto',
      'regidor_emprendimiento_foto', 'regidor_derechos_foto', 'regidor_comunicacion_foto'];
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

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await api.post('/admin/candidatos/generar-token', linkConfig);
      if (res.data?.success && res.data?.token) {
        // Garantizar que la URL siempre tenga el host y puerto exactos del navegador (ej. :8001 o :8002)
        const fullUrl = `${window.location.origin}/postular/${res.data.token}`;
        setGeneratedLink(fullUrl);
        loadCandidatos();
      }
    } catch (err) {
      alert("Error al generar enlace: " + (err.response?.data?.error || err.message));
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleApproveCandidate = async (candidateId) => {
    if (!window.confirm("¿Aprobar oficialmente esta lista para la cédula de votación y el portal escolar?")) return;
    try {
      await api.post(`/admin/candidatos/${candidateId}/aprobar`, {});
      await loadCandidatos();
      if (reviewCandidate && reviewCandidate.id === candidateId) {
        setReviewCandidate(prev => ({ ...prev, estado_registro: 'aprobado' }));
      }
      alert("¡Lista aprobada exitosamente! Ya está activa y visible en el portal y en la cédula.");
    } catch (err) {
      alert("Error al aprobar lista: " + (err.response?.data?.error || err.message));
    }
  };

  // Helper para cambios de texto y archivo
  const setFile = (field, file) => setFormData(prev => ({ ...prev, [field]: file }));
  const setText = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  // Subida de logo oficial y extracción automática de color dominante
  const handleLogoChange = async (file) => {
    if (!file) return;
    setFile('logo', file);
    try {
      const detected = await extractDominantColor(file);
      if (detected) {
        setText('color', detected);
      }
    } catch (e) {
      console.warn("No se pudo extraer color del logo", e);
    }
  };

  // Autocomplete de Alumnos con el Padrón
  const handleStudentSearch = (field, query) => {
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
        setStudentSuggestions(list.slice(0, 6));
      } catch (err) {
        setStudentSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
  };

  const selectStudent = (field, student) => {
    const grado = student.ngs || (student.grado ? `${student.grado} ${student.seccion || ''}`.trim() : '');
    const nombre = student.nombre || `${student.ap_paterno || ''} ${student.ap_materno || ''}, ${student.nombres || ''}`.trim();
    setFormData(prev => ({
      ...prev,
      [field]: nombre,
      [`${field}_grado`]: grado
    }));
    setStudentSuggestions([]);
    setActiveSearchField(null);
  };

  const tabs = [
    { id: 'general', label: '1. Datos de la Lista', icon: Megaphone },
    { id: 'directiva', label: '2. Junta Directiva (7 Integrantes)', icon: Users },
    { id: 'propuestas', label: '3. Plan de Trabajo / Propuestas', icon: FileText }
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
            onClick={() => {
              setGeneratedLink(null);
              setLinkConfig({ sede: 'Sede Central', nivel: 'Primaria', nombre: '', responsable: '', telefono: '' });
              setShowLinkModal(true);
            }}
            className="flex items-center gap-2 text-slate-950 bg-amber-400 hover:bg-amber-300 font-black py-2.5 px-4 rounded-2xl shadow-sm hover:shadow transition-all text-xs cursor-pointer"
            title="Generar enlace seguro para que el candidato llene su lista desde su celular"
          >
            <Share2 size={15} /> Generar Enlace de Postulación
          </button>
          <button
            onClick={() => openCreate('Sede Central', 'Primaria')}
            className="flex items-center gap-2 text-white font-bold py-2.5 px-3.5 rounded-2xl shadow-sm hover:shadow transition-all text-xs cursor-pointer"
            style={{ backgroundColor: BLUE }}
          >
            <PlusCircle size={15} /> + Lista Central (Primaria)
          </button>
          <button
            onClick={() => openCreate('Sede Central', 'Secundaria')}
            className="flex items-center gap-2 text-white font-bold py-2.5 px-3.5 rounded-2xl shadow-sm hover:shadow transition-all text-xs bg-indigo-700 hover:bg-indigo-800 cursor-pointer"
          >
            <PlusCircle size={15} /> + Lista Central (Secundaria)
          </button>
          <button
            onClick={() => openCreate('Sede Jerusalén', 'General')}
            className="flex items-center gap-2 text-white font-bold py-2.5 px-3.5 rounded-2xl shadow-sm hover:shadow transition-all text-xs bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
          >
            <PlusCircle size={15} /> + Lista Jerusalén
          </button>
        </div>
      </div>

      {/* Selector de Módulo / Sede y Nivel */}
      <div className="flex flex-wrap items-center gap-2 mb-6 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setFilterSede('todos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${filterSede === 'todos' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          🌐 Todas ({candidatos.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterSede('Central - Primaria')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${filterSede === 'Central - Primaria' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          🎒 Central - Primaria ({candidatos.filter(c => (!c.sede || c.sede.includes('Central') || c.sede.includes('Principal')) && (c.nivel === 'Primaria' || c.nivel === 'General' || !c.nivel)).length})
        </button>
        <button
          type="button"
          onClick={() => setFilterSede('Central - Secundaria')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${filterSede === 'Central - Secundaria' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          🎓 Central - Secundaria ({candidatos.filter(c => (!c.sede || c.sede.includes('Central') || c.sede.includes('Principal')) && (c.nivel === 'Secundaria' || c.nivel === 'General' || !c.nivel)).length})
        </button>
        <button
          type="button"
          onClick={() => setFilterSede('Sede Jerusalén')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${filterSede === 'Sede Jerusalén' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          ⛪ Jerusalén ({candidatos.filter(c => c.sede && c.sede.includes('Jerusal')).length})
        </button>
      </div>

      {/* Grid de Candidatos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {candidatos
          .filter(c => {
            if (filterSede === 'todos') return true;
            if (filterSede === 'Central - Primaria') {
              const isCentral = !c.sede || c.sede.includes('Central') || c.sede.includes('Principal');
              return isCentral && (c.nivel === 'Primaria' || c.nivel === 'General' || !c.nivel);
            }
            if (filterSede === 'Central - Secundaria') {
              const isCentral = !c.sede || c.sede.includes('Central') || c.sede.includes('Principal');
              return isCentral && (c.nivel === 'Secundaria' || c.nivel === 'General' || !c.nivel);
            }
            if (filterSede === 'Sede Central') return !c.sede || c.sede.includes('Central') || c.sede.includes('Principal');
            if (filterSede === 'Sede Jerusalén') return c.sede && c.sede.includes('Jerusal');
            return true;
          })
          .map(c => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              <div className="h-44 bg-slate-100 relative">
                {c.logo ? (
                  <div className="w-full h-full flex items-center justify-center p-5 bg-slate-50">
                    <img src={getAssetUrl(c.logo)} className="max-h-full max-w-full object-contain" alt="logo" />
                  </div>
                ) : c.foto ? (
                  <img src={getAssetUrl(c.foto)} className="w-full h-full object-cover" alt="foto" />
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
                <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-700 shadow-sm">
                    {c.sede === 'Sede Jerusalén' ? '⛪ Jerusalén' : '🏛️ Central'}
                  </span>
                  {(!c.sede || !c.sede.includes('Jerusal')) && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                      c.nivel === 'Primaria' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      c.nivel === 'Secundaria' ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' :
                      'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {c.nivel || 'General'}
                    </span>
                  )}
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
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-lg text-slate-800 leading-tight">{c.nombre}</h4>
                  <div>
                    {c.estado_registro === 'aprobado' || !c.estado_registro ? (
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Aprobado
                      </span>
                    ) : c.estado_registro === 'en_revision' ? (
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
                        En Revisión
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                        Borrador
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-slate-500 text-sm mt-1 line-clamp-2">{c.descripcion}</p>

                {/* Resumen de integrantes y directiva */}
                {c.responsable_entrega && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    <UserCheck size={13} className="text-amber-700 shrink-0" />
                    <span className="truncate">
                      Entregado a: <strong>{c.responsable_entrega}</strong>
                      {c.telefono_responsable && <span className="text-[11px] text-amber-700 ml-1">({c.telefono_responsable})</span>}
                    </span>
                  </div>
                )}
                {(() => {
                  const directiva = [
                    { cargo: 'Alcalde', nombre: c.alcalde, grado: c.alcalde_grado },
                    { cargo: 'Teniente', nombre: c.teniente, grado: c.teniente_grado },
                    { cargo: 'Reg. Educación', nombre: c.regidor_educacion, grado: c.regidor_educacion_grado },
                    { cargo: 'Reg. Salud', nombre: c.regidor_salud, grado: c.regidor_salud_grado },
                    { cargo: 'Reg. Emprendimiento', nombre: c.regidor_emprendimiento, grado: c.regidor_emprendimiento_grado },
                    { cargo: 'Reg. Derechos', nombre: c.regidor_derechos, grado: c.regidor_derechos_grado },
                    { cargo: 'Reg. Comunicación', nombre: c.regidor_comunicacion, grado: c.regidor_comunicacion_grado },
                  ];
                  const filledCount = directiva.filter(d => d.nombre).length;
                  return (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                        <span className="flex items-center gap-1 font-bold text-slate-700">
                          <Users size={13} className="text-blue-600" />
                          {filledCount > 0 ? `${filledCount} de 7 directivos` : 'Sin directivos'}
                        </span>
                        {c.propuestas && (
                          <span className="flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <FileText size={11} /> Plan redactado
                          </span>
                        )}
                      </div>

                      {c.alcalde && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 truncate">
                          <span className="font-black text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">Alcalde</span>
                          <span className="font-bold truncate">{c.alcalde}</span>
                          {c.alcalde_grado && <span className="text-[10px] text-slate-400 font-bold">({c.alcalde_grado})</span>}
                        </div>
                      )}
                      {c.teniente && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                          <span className="font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Teniente</span>
                          <span className="truncate">{c.teniente}</span>
                          {c.teniente_grado && <span className="text-[10px] text-slate-400 font-bold">({c.teniente_grado})</span>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Acciones de Token / WhatsApp */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  {c.token_registro ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${window.location.origin}/postular/${c.token_registro}`)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Copiar enlace para enviar por WhatsApp al candidato"
                      >
                        <Copy size={12} /> Copiar Link
                      </button>
                      <a
                        href={(() => {
                          const fullUrl = `${window.location.origin}/postular/${c.token_registro}`;
                          const msg = `¡Hola${c.responsable_entrega ? ' ' + c.responsable_entrega : ''}! Te compartimos el enlace oficial para inscribir tu lista electoral (Municipio Escolar CATA 2026):\n\n🔗 ${fullUrl}\n\nPuedes ingresar desde tu celular o computadora. ¡Muchos éxitos!`;
                          return c.telefono_responsable
                            ? `https://wa.me/51${c.telefono_responsable.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
                            : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors"
                        title="Abrir chat de WhatsApp con el mensaje y enlace listos"
                      >
                        <Share2 size={11} /> WhatsApp
                      </a>
                    </div>
                  ) : <div />}

                  {c.estado_registro !== 'aprobado' && (
                    <button
                      type="button"
                      onClick={() => handleApproveCandidate(c.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                      title="Aprobar para que aparezca en la cédula de votación"
                    >
                      <ShieldCheck size={12} /> Aprobar Lista
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 border-t border-slate-100 divide-x divide-slate-100">
                <button
                  onClick={() => openReview(c)}
                  className="py-3 px-2 text-center font-bold text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer"
                  title="Ver ficha completa de inscripción y directiva"
                >
                  <Eye size={14} /> Ficha
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="py-3 px-2 text-center font-bold text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer"
                  onMouseEnter={e => e.currentTarget.style.color = BLUE}
                  onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
                >
                  <Edit3 size={14} /> Editar
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="py-3 px-2 text-center font-bold text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer"
                >
                  <Trash2 size={14} /> Eliminar
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
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nombre del Partido</label>
                        <input
                          type="text" value={formData.nombre} onChange={e => setText('nombre', e.target.value)}
                          placeholder="Ej: Partido Fuerza CATA"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:border-blue-600"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Sede Electoral</label>
                        <select
                          value={formData.sede && formData.sede.includes('Jerusal') ? 'Sede Jerusalén' : 'Sede Central'}
                          onChange={e => {
                            const val = e.target.value;
                            setText('sede', val);
                            if (val.includes('Jerusal')) setText('nivel', 'General');
                          }}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-800 focus:border-blue-600 cursor-pointer"
                        >
                          <option value="Sede Central">🏛️ Sede Central</option>
                          <option value="Sede Jerusalén">⛪ Sede Jerusalén</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Nivel Escolar</label>
                        {formData.sede && formData.sede.includes('Jerusal') ? (
                          <select
                            value="General"
                            disabled
                            className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
                          >
                            <option value="General">Unificado (Jerusalén)</option>
                          </select>
                        ) : (
                          <select
                            value={formData.nivel || 'Primaria'}
                            onChange={e => setText('nivel', e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-800 focus:border-blue-600 cursor-pointer"
                          >
                            <option value="Primaria">🎒 Primaria (1° a 6°)</option>
                            <option value="Secundaria">🎓 Secundaria (1° a 5°)</option>
                            <option value="General">🌐 Ambos / General</option>
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Eslogan de Campaña</label>
                        <input
                          type="text" value={formData.slogan} onChange={e => setText('slogan', e.target.value)}
                          placeholder="Ej: ¡Unidos por un CATA innovador y democrático!"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Estado de Inscripción</label>
                        <select
                          value={formData.estado_registro || 'aprobado'}
                          onChange={e => setText('estado_registro', e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-800 focus:border-blue-600 cursor-pointer"
                        >
                          <option value="aprobado">Aprobado (Visible en Cédula y Portal)</option>
                          <option value="en_revision">En Revisión (Pendiente de Visto Bueno)</option>
                          <option value="borrador">Borrador (Incompleto)</option>
                        </select>
                      </div>
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
                              className={`w-7 h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center ${isSelected
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
                    {/* Símbolo o Logo Oficial de la Lista con Auto-Detección de Color */}
                    <div className="pt-2 space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Símbolo o Logo de la Lista
                      </label>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                          {(formData.logo || existingFiles.logo) ? (
                            <div className="w-16 h-16 rounded-xl border border-slate-300 bg-white p-1 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                              <img
                                src={formData.logo ? URL.createObjectURL(formData.logo) : getAssetUrl(existingFiles.logo)}
                                alt="Logo"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 flex-shrink-0">
                              <ImageIcon size={24} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {formData.logo ? formData.logo.name : existingFiles.logo ? 'Logo cargado en el sistema' : 'Sin logo seleccionado'}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Color del partido: <span className="font-mono font-bold" style={{ color: formData.color }}>{formData.color || '#1B3A8C'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <label className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-xs transition-colors">
                            Seleccionar Logo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => e.target.files?.[0] && handleLogoChange(e.target.files[0])}
                              className="hidden"
                            />
                          </label>
                          {(formData.logo || existingFiles.logo) && (
                            <button
                              type="button"
                              onClick={() => {
                                setFile('logo', null);
                                setExistingFiles(prev => ({ ...prev, logo: null }));
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                              title="Quitar logo"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: JUNTA DIRECTIVA (7 CARGOS CON PADRÓN INTEGRADO) */}
                {activeTab === 'directiva' && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
                      <span className="font-semibold">
                        Escribe el <strong>DNI o Apellidos</strong> en el buscador de cada cargo para autocompletar con los datos oficiales del padrón. El nombre y grado quedan 100% editables.
                      </span>
                    </div>

                    <div className="space-y-4">
                      {CARGOS.map((cargo, idx) => {
                        const nameField = cargo.key;
                        const gradoField = `${cargo.key}_grado`;
                        const photoField = `${cargo.key}_foto`;

                        return (
                          <div key={cargo.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] font-black flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                  {cargo.label}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 italic">
                                {cargo.desc}
                              </span>
                            </div>

                            {/* Buscador en el padrón */}
                            <div className="relative">
                              <input
                                type="text"
                                placeholder={`Buscar por DNI o apellidos en padrón para ${cargo.label}...`}
                                onChange={e => handleStudentSearch(nameField, e.target.value)}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-blue-600"
                              />
                              {searchLoading && activeSearchField === nameField && (
                                <div className="absolute right-3 top-2.5 text-[10px] text-blue-600 font-bold animate-pulse">
                                  Buscando...
                                </div>
                              )}

                              {/* Menú de Autocompletado */}
                              {activeSearchField === nameField && studentSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 z-30 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                                  {studentSuggestions.map((st, sIdx) => (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() => selectStudent(nameField, st)}
                                      className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors flex justify-between items-center cursor-pointer"
                                    >
                                      <div>
                                        <p className="text-xs font-bold text-slate-800">{st.nombre}</p>
                                        <p className="text-[10px] text-slate-400">DNI: {st.dni} · {st.ngs || st.grado || 'Matriculado'}</p>
                                      </div>
                                      <span className="text-[10px] px-2 py-0.5 rounded font-bold text-blue-700 bg-blue-100">
                                        Seleccionar
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Campos Editables: Nombre y Grado */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                  Nombre Completo del Alumno
                                </label>
                                <input
                                  type="text"
                                  value={formData[nameField] || ''}
                                  onChange={e => setText(nameField, e.target.value)}
                                  placeholder="Nombre y apellidos del estudiante"
                                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                                    Grado y Sección
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setOpenGradoAccordion(openGradoAccordion === gradoField ? null : gradoField)}
                                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <GraduationCap size={11} /> Sugerencias <ChevronDown size={10} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={formData[gradoField] || ''}
                                  onChange={e => setText(gradoField, e.target.value)}
                                  placeholder="Ej: 5° SEC A"
                                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                                />
                                {openGradoAccordion === gradoField && (
                                  <div className="mt-1.5 p-2 bg-white rounded-xl border border-blue-200 shadow-lg flex flex-wrap gap-1 max-h-36 overflow-y-auto z-30 relative">
                                    {((formData.nivel || '').toLowerCase().includes('sec') ? GRADOS_SECUNDARIA : GRADOS_PRIMARIA).map(g => (
                                      <button
                                        key={g}
                                        type="button"
                                        onClick={() => {
                                          setText(gradoField, g);
                                          setOpenGradoAccordion(null);
                                        }}
                                        className="px-2 py-1 bg-slate-50 hover:bg-blue-600 hover:text-white rounded text-[10px] font-bold text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                                      >
                                        {g}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Foto individual del integrante */}
                            <FileUploadField
                              label="Foto del Integrante (Opcional)"
                              file={formData[photoField]}
                              existingUrl={existingFiles[photoField]}
                              onChange={f => setFile(photoField, f)}
                              onClear={() => setFile(photoField, null)}
                              helperText={`Foto de perfil de ${cargo.label}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 3: PLAN DE TRABAJO Y PROPUESTAS */}
                {activeTab === 'propuestas' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Propuestas Principales y Ejes de Gestión
                      </label>
                      <p className="text-xs text-slate-500 mb-2">
                        Redacta las propuestas que se mostrarán en la ficha oficial y en el portal escolar para los estudiantes.
                      </p>
                      <textarea
                        value={formData.propuestas}
                        onChange={e => setText('propuestas', e.target.value)}
                        placeholder="1. Fomentar torneos deportivos y recreativos inter-aulas&#10;2. Implementación de talleres de robótica y tecnología&#10;3. Campañas de reciclaje y cuidado de áreas verdes..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-sans focus:border-blue-600"
                        rows="8"
                      />
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

      {/* MODAL PARA GENERAR ENLACE DE POSTULACIÓN (WHATSAPP / LINK MÁGICO) */}
      <AnimatePresence>
        {showLinkModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                    <Share2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Generar Enlace de Postulación</h3>
                    <p className="text-[11px] text-slate-500">Crea un enlace para que los candidatos llenen su propia lista.</p>
                  </div>
                </div>
                <button onClick={() => setShowLinkModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              {!generatedLink ? (
                <div className="space-y-3.5 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                        Sede
                      </label>
                      <select
                        value={linkConfig.sede}
                        onChange={e => setLinkConfig(prev => ({ ...prev, sede: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs outline-none focus:border-blue-500"
                      >
                        <option value="Sede Central">🏛️ Sede Central</option>
                        <option value="Sede Jerusalén">⛪ Sede Jerusalén</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                        Nivel Educativo
                      </label>
                      <select
                        value={linkConfig.nivel}
                        onChange={e => setLinkConfig(prev => ({ ...prev, nivel: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs outline-none focus:border-blue-500"
                      >
                        <option value="Primaria">🎒 Primaria</option>
                        <option value="Secundaria">🎓 Secundaria</option>
                        <option value="General">🌐 General (Jerusalén)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1 flex items-center justify-between">
                      <span>Alumno o Personero Responsable</span>
                      <span className="text-[10px] text-blue-600 font-bold">Identificador del Link</span>
                    </label>
                    <input
                      type="text"
                      value={linkConfig.responsable}
                      onChange={e => setLinkConfig(prev => ({ ...prev, responsable: e.target.value }))}
                      placeholder="Ejemplo: Diego Quispe (5° Sec B)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 bg-blue-50/20 font-bold text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      El enlace se personalizará con este nombre para saber con exactitud a quién se le entregó.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                        WhatsApp de Contacto (Opcional)
                      </label>
                      <input
                        type="tel"
                        value={linkConfig.telefono}
                        onChange={e => setLinkConfig(prev => ({ ...prev, telefono: e.target.value }))}
                        placeholder="Ejemplo: 987654321"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-xs outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                        Nombre Preliminar (Opcional)
                      </label>
                      <input
                        type="text"
                        value={linkConfig.nombre}
                        onChange={e => setLinkConfig(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder={linkConfig.responsable ? `Lista de ${linkConfig.responsable}` : "Ej: Lista Postulante 1"}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLinkModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateLink}
                      disabled={generatingLink}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {generatingLink ? 'Generando...' : 'Crear y Obtener Enlace'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-2 text-emerald-800 font-black text-xs">
                        <CheckCircle2 size={16} /> ¡Enlace Identificado y Generado con Éxito!
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                        {linkConfig.sede} · {linkConfig.nivel}
                      </span>
                    </div>

                    {linkConfig.responsable && (
                      <div className="mb-2 text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-500">Asignado a:</span>
                        <span className="text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                          👤 {linkConfig.responsable}
                        </span>
                        {linkConfig.telefono && (
                          <span className="text-slate-600 font-mono text-[11px]">📱 {linkConfig.telefono}</span>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-emerald-700 leading-relaxed mb-3">
                      Envía este enlace por WhatsApp al responsable de la lista. Podrá llenarlo desde su celular o PC.
                    </p>
                    <div className="p-3 bg-white rounded-xl border border-emerald-300 font-mono text-xs text-slate-900 break-all select-all font-bold shadow-2xs">
                      {generatedLink}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <a
                      href={(() => {
                        const msg = `¡Hola${linkConfig.responsable ? ' ' + linkConfig.responsable : ''}! El Comité Electoral del Colegio te hace entrega del enlace oficial para registrar tu lista electoral (Municipio Escolar CATA 2026):\n\n🔗 ${generatedLink}\n\nPuedes ingresar desde tu celular para completar los 7 cargos y subir el logo de tu lista. ¡Muchos éxitos!`;
                        return linkConfig.telefono
                          ? `https://wa.me/51${linkConfig.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
                          : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Share2 size={16} /> Enviar por WhatsApp
                    </a>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedLink)}
                      className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-black text-xs shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      {linkCopied ? (
                        <>
                          <Check size={16} /> ¡Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={16} /> Copiar Link
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLinkModal(false)}
                      className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                    >
                      Listo / Cerrar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Revisión Completa de Postulación */}
      <AnimatePresence>
        {showReviewModal && reviewCandidate && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Header Modal */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between" style={{ backgroundColor: BLUE_LIGHT }}>
                <div className="flex items-center gap-3 min-w-0">
                  {reviewCandidate.logo ? (
                    <img src={getAssetUrl(reviewCandidate.logo)} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white p-1 border shadow-xs flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-xs flex-shrink-0">
                      {reviewCandidate.nombre.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-slate-900 truncate">{reviewCandidate.nombre}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-slate-700 shadow-xs border">
                        {reviewCandidate.sede?.includes('Jerusal') ? '⛪ Sede Jerusalén' : '🏛️ Sede Central'} - {reviewCandidate.nivel || 'General'}
                      </span>
                      {reviewCandidate.estado_registro === 'aprobado' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Aprobado Oficial
                        </span>
                      ) : reviewCandidate.estado_registro === 'en_revision' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 border border-blue-300 animate-pulse flex items-center gap-1">
                          <AlertCircle size={12} /> En Revisión
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                          Borrador
                        </span>
                      )}
                    </div>
                    {reviewCandidate.slogan && (
                      <p className="text-xs text-slate-600 italic mt-0.5 truncate">"{reviewCandidate.slogan}"</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white/80 transition-colors cursor-pointer flex-shrink-0 ml-2"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Contenido scrolleable */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                {/* Fila de Color y Enlace */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600 uppercase text-[10px]">Color Oficial:</span>
                    <span className="w-5 h-5 rounded-full border border-slate-300 shadow-xs flex-shrink-0" style={{ backgroundColor: reviewCandidate.color || '#1B3A8C' }} />
                    <span className="font-mono font-bold text-slate-700">{reviewCandidate.color || '#1B3A8C'}</span>
                  </div>

                  {reviewCandidate.responsable_entrega && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-bold text-xs">
                      <UserCheck size={13} className="text-amber-700 shrink-0" />
                      <span>Entregado a: {reviewCandidate.responsable_entrega} {reviewCandidate.telefono_responsable && `(${reviewCandidate.telefono_responsable})`}</span>
                    </div>
                  )}
                  {reviewCandidate.token_registro && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-semibold">Enlace Postulación:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${window.location.origin}/postular/${reviewCandidate.token_registro}`)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 font-bold border border-slate-300 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Copy size={12} /> Copiar Link WhatsApp
                      </button>
                    </div>
                  )}
                </div>

                {/* Junta Directiva (7 Cargos) */}
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users size={16} className="text-blue-600" /> Miembros de la Junta Directiva Oficial (7 Cargos)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { role: 'Alcalde ó Alcaldesa', name: reviewCandidate.alcalde, grado: reviewCandidate.alcalde_grado, foto: reviewCandidate.alcalde_foto, highlight: true },
                      { role: 'Teniente Alcalde', name: reviewCandidate.teniente, grado: reviewCandidate.teniente_grado, foto: reviewCandidate.teniente_foto },
                      { role: 'Reg. Educación, Cultura y Deporte', name: reviewCandidate.regidor_educacion, grado: reviewCandidate.regidor_educacion_grado, foto: reviewCandidate.regidor_educacion_foto },
                      { role: 'Reg. Salud y Ambiente', name: reviewCandidate.regidor_salud, grado: reviewCandidate.regidor_salud_grado, foto: reviewCandidate.regidor_salud_foto },
                      { role: 'Reg. Emprendimiento y Actividades Productivas', name: reviewCandidate.regidor_emprendimiento, grado: reviewCandidate.regidor_emprendimiento_grado, foto: reviewCandidate.regidor_emprendimiento_foto },
                      { role: 'Reg. Derechos del Niño, Niña y Adolescente', name: reviewCandidate.regidor_derechos, grado: reviewCandidate.regidor_derechos_grado, foto: reviewCandidate.regidor_derechos_foto },
                      { role: 'Reg. Comunicación y Tecnologías', name: reviewCandidate.regidor_comunicacion, grado: reviewCandidate.regidor_comunicacion_grado, foto: reviewCandidate.regidor_comunicacion_foto },
                    ].map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                          m.highlight
                            ? 'bg-blue-50/80 border-blue-300 shadow-xs sm:col-span-2'
                            : m.name
                            ? 'bg-white border-slate-200 shadow-xs'
                            : 'bg-slate-50 border-dashed border-slate-300 opacity-60'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {m.foto ? (
                            <img src={getAssetUrl(m.foto)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-black text-sm text-slate-400">
                              {m.name ? m.name.charAt(0) : '?'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block">
                            {m.role}
                          </span>
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {m.name || <span className="italic text-slate-400 font-normal">No registrado</span>}
                          </p>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            {m.grado ? `Grado y Sección: ${m.grado}` : <span className="text-slate-400">Grado no especificado</span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Propuestas y Plan de Trabajo */}
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" /> Plan de Trabajo y Propuestas
                  </h4>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    {reviewCandidate.propuestas ? (
                      <div className="space-y-1.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-medium">
                        {reviewCandidate.propuestas}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No se redactaron propuestas para esta lista.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      openEdit(reviewCandidate);
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Edit3 size={14} /> Editar Datos
                  </button>

                  {reviewCandidate.estado_registro !== 'aprobado' ? (
                    <button
                      type="button"
                      onClick={() => handleApproveCandidate(reviewCandidate.id)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 transition-colors cursor-pointer shadow-md"
                    >
                      <ShieldCheck size={16} /> Dar Visto Bueno / Aprobar Lista Oficialmente
                    </button>
                  ) : (
                    <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1.5 border border-emerald-300">
                      <CheckCircle2 size={15} /> Lista Aprobada Oficialmente (Activa en Portal y Cédula)
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CandidateManager;
