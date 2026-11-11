import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../api';
import { Search, Filter, CheckCircle2, Clock, Copy, Check, RefreshCw, Users, School, Download, FileSpreadsheet, X, CheckCheck, Printer } from 'lucide-react';
import OnpePadronModal from './OnpePadronModal';

const BLUE = '#1B3A8C';

// Función robusta para deducir Grado y Sección a partir del objeto alumno o su NGS
const parseGradoSeccion = (alumno) => {
  let grado = alumno.grado ? String(alumno.grado).trim() : '';
  let seccion = alumno.seccion ? String(alumno.seccion).trim() : '';

  if (!grado || !seccion || grado.toUpperCase() === 'GENERAL') {
    const raw = (alumno.ngs || '').trim();
    const upper = raw.toUpperCase();
    const cleanNgs = upper.replace(/[\s\-_.]/g, '');

    // 1. Detección de código oficial de 3 caracteres (ej: P2B, S3A, C1B)
    const m3 = cleanNgs.match(/^([PSCIK])([1-6])([A-ZÚ])$/i);
    if (m3) {
      return {
        grado: `${m3[2]}°`,
        seccion: (m3[3] === 'U' || m3[3] === 'Ú') ? 'ÚNICA' : m3[3]
      };
    }

    // 2. Detección de código de 2 caracteres (ej: 2B, 3A)
    const m2 = cleanNgs.match(/^([1-6])([A-ZÚ])$/i);
    if (m2) {
      return {
        grado: `${m2[1]}°`,
        seccion: (m2[2] === 'U' || m2[2] === 'Ú') ? 'ÚNICA' : m2[2]
      };
    }

    // 3. Detección de Grado
    if (!grado || grado.toUpperCase() === 'GENERAL') {
      if (upper.includes('PRIMER') || /\b1\b|1°|1º/.test(upper)) grado = '1°';
      else if (upper.includes('SEGUND') || /\b2\b|2°|2º/.test(upper)) grado = '2°';
      else if (upper.includes('TERCER') || /\b3\b|3°|3º/.test(upper)) grado = '3°';
      else if (upper.includes('CUART') || /\b4\b|4°|4º/.test(upper)) grado = '4°';
      else if (upper.includes('QUINT') || /\b5\b|5°|5º/.test(upper)) grado = '5°';
      else if (upper.includes('SEXT') || /\b6\b|6°|6º/.test(upper)) grado = '6°';
      else {
        const m = upper.match(/([1-6])\s*(?:°|º|RO|DO|TO|MO|VO|ERO)?/i);
        if (m) grado = `${m[1]}°`;
      }
    }

    // 4. Detección de Sección
    if (!seccion || seccion.toUpperCase() === 'ÚNICA') {
      const secLetterMatch = upper.match(/(?:SECCI[OÓ]N|SEC\.?|AULA)\s*[:\-]?\s*([A-E])\b/i) ||
        upper.match(/[1-6]\s*(?:°|º)?\s*([A-E])\b/i);
      if (secLetterMatch) {
        seccion = secLetterMatch[1].toUpperCase();
      } else if (upper.includes('UNIC')) {
        seccion = 'ÚNICA';
      }
    }
  }

  return {
    grado: (grado && grado.toUpperCase() !== 'GENERAL') ? grado : 'GENERAL',
    seccion: seccion || 'ÚNICA'
  };
};

// Formateador limpio para las filas de Excel (Sin columna duplicada de código, solo DNI)
const formatAlumnosToExcelRows = (lista) => {
  return lista.map((a, index) => {
    const { grado, seccion } = parseGradoSeccion(a);

    return {
      'N°': index + 1,
      'ESTADO DE VOTO': a.ha_votado ? '✅ YA VOTÓ' : '⏳ PENDIENTE',
      'FECHA Y HORA': a.fecha_voto || '-',
      'APELLIDOS Y NOMBRES': a.nombre,
      'DNI': a.dni || a.codigo || '-',
      'SALÓN': a.ngs || 'GENERAL',
      'GRADO': grado,
      'SECCIÓN': seccion,
      'SEDE': a.sede || 'Sede Central'
    };
  });
};

const setWorksheetCols = (worksheet) => {
  worksheet['!cols'] = [
    { wch: 6 },   // N°
    { wch: 16 },  // ESTADO DE VOTO
    { wch: 22 },  // FECHA Y HORA
    { wch: 38 },  // APELLIDOS Y NOMBRES
    { wch: 16 },  // DNI
    { wch: 24 },  // SALÓN
    { wch: 12 },  // GRADO
    { wch: 12 },  // SECCIÓN
    { wch: 18 }   // SEDE
  ];
};

const StudentMonitor = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, votaron: 0, pendientes: 0, porcentaje: 0 });
  const [sedesDisponibles, setSedesDisponibles] = useState([]);
  const [ngsDisponibles, setNgsDisponibles] = useState([]);

  // Filtros de la tabla principal
  const [selectedSede, setSelectedSede] = useState('todos');
  const [selectedNivel, setSelectedNivel] = useState('todos');
  const [selectedNgs, setSelectedNgs] = useState('todos');
  const [selectedEstado, setSelectedEstado] = useState('todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  // Estado del Modal de Descarga por Grado y Sección
  const [showExportModal, setShowExportModal] = useState(false);
  const [modalSede, setModalSede] = useState('todos');
  const [modalNivel, setModalNivel] = useState('todos');
  const [modalNgs, setModalNgs] = useState('todos');
  const [modalEstado, setModalEstado] = useState('todos');
  const [modalDownloading, setModalDownloading] = useState(false);

  // Estado del Modal de Lista de Electores Oficial ONPE
  const [showOnpeModal, setShowOnpeModal] = useState(false);

  // Estado de descarga de reporte completo
  const [exportingReporte, setExportingReporte] = useState(false);

  const handleAmbitoSelect = (sede, nivel = 'todos') => {
    setSelectedSede(sede);
    setSelectedNivel(nivel);
    setSelectedNgs('todos');
  };

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSede !== 'todos') params.append('sede', selectedSede);
      if (selectedNivel !== 'todos') params.append('nivel', selectedNivel);
      if (selectedNgs !== 'todos') params.append('ngs', selectedNgs);
      if (selectedEstado !== 'todos') params.append('estado', selectedEstado);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/admin/alumnos?${params.toString()}`);
      setAlumnos(res.data.alumnos || []);
      setResumen(res.data.resumen || { total: 0, votaron: 0, pendientes: 0, porcentaje: 0 });

      // Cargar sedes y NGS si no están cargados
      if (sedesDisponibles.length === 0) {
        const statsRes = await api.get('/admin/stats');
        setSedesDisponibles(statsRes.data.sedes_disponibles || []);
        setNgsDisponibles(statsRes.data.ngs_disponibles || []);
      }
    } catch (err) {
      console.error("Error al cargar padrón de alumnos", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      // Pausar actualización periódica si el modal ONPE está abierto o si el usuario está buscando
      if (!search.trim() && !showOnpeModal) {
        loadData(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedSede, selectedNivel, selectedNgs, selectedEstado, showOnpeModal]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Abrir Modal de exportación sincronizando con el filtro activo actual
  const handleOpenExportModal = () => {
    setModalSede(selectedSede);
    setModalNivel(selectedNivel);
    setModalNgs(selectedNgs);
    setModalEstado(selectedEstado);
    setShowExportModal(true);
  };

  // Ejecutar la descarga desde el Modal con el grado y sección escogidos
  const handleEjecutarDescargaModal = async () => {
    setModalDownloading(true);
    try {
      const params = new URLSearchParams();
      if (modalSede !== 'todos') params.append('sede', modalSede);
      if (modalNivel !== 'todos') params.append('nivel', modalNivel);
      if (modalNgs !== 'todos') params.append('ngs', modalNgs);
      if (modalEstado !== 'todos') params.append('estado', modalEstado);

      const res = await api.get(`/admin/alumnos?${params.toString()}`);
      const alumnosExportar = res.data.alumnos || [];

      if (!alumnosExportar.length) {
        alert("No se encontraron alumnos con los criterios seleccionados para descargar.");
        setModalDownloading(false);
        return;
      }

      const rows = formatAlumnosToExcelRows(alumnosExportar);
      const worksheet = XLSX.utils.json_to_sheet(rows);
      setWorksheetCols(worksheet);

      const workbook = XLSX.utils.book_new();
      const sheetTitle = (modalNgs !== 'todos' ? modalNgs : 'Padron').slice(0, 30);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

      const safeNgs = (modalNgs !== 'todos' ? modalNgs : 'TODOS_LOS_SALONES').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeSede = (modalSede !== 'todos' ? modalSede : 'SEDES').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeEstado = modalEstado !== 'todos' ? `_${modalEstado.toUpperCase()}` : '';
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `PADRON_${safeSede}_${safeNgs}${safeEstado}_${dateStr}.xlsx`;

      XLSX.writeFile(workbook, filename);
      setShowExportModal(false);
    } catch (err) {
      console.error("Error al exportar padrón", err);
      alert("Ocurrió un error al generar la descarga del archivo Excel.");
    } finally {
      setModalDownloading(false);
    }
  };

  // Descargar reporte completo global (con resumen estadístico por salón)
  const handleExportarReporteCompleto = async () => {
    setExportingReporte(true);
    try {
      const res = await api.get('/admin/alumnos?sede=todos&ngs=todos&estado=todos');
      const todosAlumnos = res.data.alumnos || [];

      if (!todosAlumnos.length) {
        alert("No se encontraron alumnos registrados en el sistema.");
        return;
      }

      // 1. Resumen estadístico por cada Salón / NGS
      const resumenPorSalon = {};
      todosAlumnos.forEach(a => {
        const salon = a.ngs || 'SIN SALÓN';
        const sede = a.sede || 'Sede Central';
        const key = `${sede} || ${salon}`;
        if (!resumenPorSalon[key]) {
          resumenPorSalon[key] = {
            sede,
            salon,
            total: 0,
            votaron: 0,
            pendientes: 0
          };
        }
        resumenPorSalon[key].total++;
        if (a.ha_votado) {
          resumenPorSalon[key].votaron++;
        } else {
          resumenPorSalon[key].pendientes++;
        }
      });

      const dataResumen = Object.values(resumenPorSalon).map((r, idx) => ({
        'N°': idx + 1,
        'SEDE': r.sede,
        'SALÓN (GRADO Y SECCIÓN)': r.salon,
        'TOTAL ALUMNOS': r.total,
        'YA VOTARON': r.votaron,
        'PENDIENTES': r.pendientes,
        '% PARTICIPACIÓN': `${r.total > 0 ? ((r.votaron / r.total) * 100).toFixed(1) : 0}%`
      }));

      // Total general acumulado
      const totalGlobal = todosAlumnos.length;
      const votaronGlobal = todosAlumnos.filter(a => a.ha_votado).length;
      const pendientesGlobal = totalGlobal - votaronGlobal;
      dataResumen.push({
        'N°': '',
        'SEDE': 'TOTAL GENERAL',
        'SALÓN (GRADO Y SECCIÓN)': 'TODAS LAS SECCIONES',
        'TOTAL ALUMNOS': totalGlobal,
        'YA VOTARON': votaronGlobal,
        'PENDIENTES': pendientesGlobal,
        '% PARTICIPACIÓN': `${totalGlobal > 0 ? ((votaronGlobal / totalGlobal) * 100).toFixed(1) : 0}%`
      });

      const wsResumen = XLSX.utils.json_to_sheet(dataResumen);
      wsResumen['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 28 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 }
      ];

      // 2. Detalle completo de todos los estudiantes (Sin columna duplicada de código, solo DNI)
      const rowsDetalle = formatAlumnosToExcelRows(todosAlumnos);
      const wsDetalle = XLSX.utils.json_to_sheet(rowsDetalle);
      setWorksheetCols(wsDetalle);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, wsResumen, 'RESUMEN POR SALÓN');
      XLSX.utils.book_append_sheet(workbook, wsDetalle, 'PADRÓN DETALLADO');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `REPORTE_AUDITORIA_ELECTORAL_CATA_${dateStr}.xlsx`);
    } catch (err) {
      console.error("Error al exportar reporte completo", err);
      alert("Error al descargar el reporte completo de auditoría.");
    } finally {
      setExportingReporte(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen de Participación por Filtro */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#EEF4FF', color: BLUE }}>
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Total en Lista</p>
            <h4 className="text-2xl font-black text-slate-800">{resumen.total}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Ya Votaron</p>
            <h4 className="text-2xl font-black text-emerald-600">{resumen.votaron}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Pendientes</p>
            <h4 className="text-2xl font-black text-amber-600">{resumen.pendientes}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#EEF4FF', color: BLUE }}>
            <School className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold uppercase text-slate-400">Avance</span>
              <span className="text-sm font-black" style={{ color: BLUE }}>{resumen.porcentaje}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${resumen.porcentaje}%`, backgroundColor: BLUE }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas de Acceso Rápido por Ámbito Electoral */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleAmbitoSelect('todos', 'todos')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedSede === 'todos' && selectedNivel === 'todos'
              ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span>🌐 Todas las Sedes</span>
        </button>
        <button
          type="button"
          onClick={() => handleAmbitoSelect('Sede Central', 'Primaria')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedSede === 'Sede Central' && selectedNivel === 'Primaria'
              ? 'bg-blue-900 text-white shadow-sm ring-2 ring-blue-900/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span>🎒 Central Primaria (Día 1)</span>
        </button>
        <button
          type="button"
          onClick={() => handleAmbitoSelect('Sede Central', 'Secundaria')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedSede === 'Sede Central' && selectedNivel === 'Secundaria'
              ? 'bg-indigo-900 text-white shadow-sm ring-2 ring-indigo-900/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span>🎓 Central Secundaria (Día 2)</span>
        </button>
        <button
          type="button"
          onClick={() => handleAmbitoSelect('Sede Jerusalén', 'todos')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedSede === 'Sede Jerusalén'
              ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-800/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span>⛪ Sede Jerusalén (Día 1)</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Filtro Sede y Nivel */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ámbito / Sede</label>
            <select
              value={
                selectedSede === 'todos' ? 'todos' :
                (selectedSede === 'Sede Central' && selectedNivel === 'Primaria' ? 'central_primaria' :
                (selectedSede === 'Sede Central' && selectedNivel === 'Secundaria' ? 'central_secundaria' :
                (selectedSede === 'Sede Central' ? 'central_todos' : 'jerusalen')))
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'todos') handleAmbitoSelect('todos', 'todos');
                else if (val === 'central_primaria') handleAmbitoSelect('Sede Central', 'Primaria');
                else if (val === 'central_secundaria') handleAmbitoSelect('Sede Central', 'Secundaria');
                else if (val === 'central_todos') handleAmbitoSelect('Sede Central', 'todos');
                else if (val === 'jerusalen') handleAmbitoSelect('Sede Jerusalén', 'todos');
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = BLUE}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            >
              <option value="todos">🌐 Todas las Sedes (Ambos Niveles)</option>
              <option value="central_primaria">🎒 Sede Central — Nivel Primaria</option>
              <option value="central_secundaria">🎓 Sede Central — Nivel Secundaria</option>
              <option value="central_todos">🏛️ Sede Central (Completa)</option>
              <option value="jerusalen">⛪ Sede Jerusalén (Completa)</option>
            </select>
          </div>

          {/* Filtro NGS / Salón */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Salón (Grado y Sección)</label>
            <select
              value={selectedNgs}
              onChange={(e) => setSelectedNgs(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = BLUE}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            >
              <option value="todos">Todos los Salones</option>
              {ngsDisponibles.map((n, idx) => (
                <option key={idx} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Filtro Estado de Sufragio */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Estado de Voto</label>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = BLUE}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            >
              <option value="todos">Todos los Alumnos</option>
              <option value="votaron">Solo los que Ya Votaron</option>
              <option value="pendientes">Solo Pendientes por Votar</option>
            </select>
          </div>

          {/* Buscador */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Buscar Alumno / DNI</label>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre o DNI..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none transition-colors"
                onFocus={e => e.target.style.borderColor = BLUE}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
              <button
                type="submit"
                className="p-2.5 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: BLUE }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#142D6E'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = BLUE}
              >
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Tabla del Padrón */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
          <div>
            <h4 className="text-base font-black text-slate-800">
              Padrón Electoral en Vivo ({alumnos.length} estudiantes)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditoría y control de asistencia al sufragio en tiempo real
            </p>
          </div>

          {/* Botones de Descarga y Actualización */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Botón Lista de Electores Oficial ONPE */}
            <button
              onClick={() => setShowOnpeModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all cursor-pointer bg-amber-400 hover:bg-amber-300 hover:scale-[1.02]"
              title="Abrir generador e impresor de la Lista de Electores oficial en formato ONPE con código de barras y casilleros de firma y huella"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Lista de Electores (ONPE)</span>
            </button>

            {/* Botón Principal: Abrir Modal para Escoger Grado y Sección */}
            <button
              onClick={handleOpenExportModal}
              className="flex items-center gap-2 px-4 py-2.5 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer"
              style={{ backgroundColor: '#10B981' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10B981'}
              title="Abrir selector de grado y sección para descargar en Excel"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Padrón por Grado / Sección (.xlsx)</span>
            </button>

            {/* Botón Secundario: Descargar Reporte Completo de Auditoría */}
            <button
              onClick={handleExportarReporteCompleto}
              disabled={exportingReporte}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BLUE }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#142D6E'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = BLUE}
              title="Descargar libro Excel con resumen de todos los salones y padrón completo"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exportingReporte ? 'Generando...' : 'Reporte Global Todos los Salones'}</span>
            </button>

            {/* Botón: Actualizar datos */}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Recargar datos de la base de datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-100">
                <th className="p-4 text-center">N°</th>
                <th className="p-4">Apellidos y Nombres</th>
                <th className="p-4">Salón (NGS)</th>
                <th className="p-4 text-center">Grado</th>
                <th className="p-4 text-center">Sección</th>
                <th className="p-4">Sede</th>
                <th className="p-4">DNI</th>
                <th className="p-4 text-center">Estado de Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400 font-bold animate-pulse">
                    Consultando padrón electoral...
                  </td>
                </tr>
              ) : alumnos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400 font-bold">
                    No se encontraron estudiantes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                alumnos.map((a, idx) => {
                  const { grado, seccion } = parseGradoSeccion(a);
                  const dniVal = a.dni || a.codigo;
                  return (
                    <tr key={a.codigo} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-center text-slate-400 text-xs font-bold">{idx + 1}</td>
                      <td className="p-4">
                        <span className="font-extrabold text-slate-800 block">{a.nombre}</span>
                        {a.codigo_original && (
                          <span className="text-xs text-slate-400 font-mono">Cód: {a.codigo_original}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 font-bold text-xs rounded-lg" style={{ backgroundColor: '#EEF4FF', color: BLUE }}>
                          {a.ngs || 'GENERAL'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 font-black text-xs rounded bg-slate-100 text-slate-700">
                          {grado}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 font-black text-xs rounded bg-slate-100 text-slate-700">
                          {seccion}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-semibold">{a.sede}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 font-mono font-black text-sm tracking-wider rounded-xl shadow-inner border" style={{ backgroundColor: '#EEF4FF', color: BLUE, borderColor: '#C7D9FF' }}>
                            {dniVal}
                          </span>
                          <button
                            onClick={() => copyToClipboard(dniVal)}
                            title="Copiar DNI para votar"
                            className="p-1.5 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            style={{ color: copiedCode === dniVal ? '#10B981' : undefined }}
                          >
                            {copiedCode === dniVal ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {a.ha_votado ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> YA VOTÓ
                            </span>
                            {a.fecha_voto && (
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {a.fecha_voto}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-black rounded-full border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> PENDIENTE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================= */}
      {/* MODAL: SELECCIÓN PRECISA DE GRADO Y SECCIÓN A DESCARGAR */}
      {/* ======================================================= */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl text-white" style={{ backgroundColor: '#10B981' }}>
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Descargar Padrón por Grado y Sección</h3>
                  <p className="text-xs text-slate-500">Selecciona con exactitud el salón y los filtros a exportar</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Accesos rápidos a Salones Dinámicos */}
            {ngsDisponibles.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Selección Rápida de Salón (Un Clic):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalNgs('todos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${modalNgs === 'todos'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    Todos
                  </button>
                  {ngsDisponibles.map((ngsItem, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setModalNgs(ngsItem)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${modalNgs === 'ngsItem' || modalNgs === ngsItem
                          ? 'text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50'
                        }`}
                      style={{
                        backgroundColor: modalNgs === ngsItem ? '#10B981' : undefined
                      }}
                    >
                      {ngsItem}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Opciones del Formulario */}
            <div className="space-y-3.5">
              {/* Selector Salón / Grado y Sección */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  1. Salón / Grado y Sección a Descargar:
                </label>
                <select
                  value={modalNgs}
                  onChange={(e) => setModalNgs(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none"
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                >
                  <option value="todos">Todos los Salones (Padrón Completo)</option>
                  {ngsDisponibles.map((n, idx) => (
                    <option key={idx} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Selector Sede / Ámbito */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  2. Ámbito Electoral:
                </label>
                <select
                  value={
                    modalSede === 'todos' ? 'todos' :
                    (modalSede === 'Sede Central' && modalNivel === 'Primaria' ? 'central_primaria' :
                    (modalSede === 'Sede Central' && modalNivel === 'Secundaria' ? 'central_secundaria' :
                    (modalSede === 'Sede Central' ? 'central_todos' : 'jerusalen')))
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'todos') { setModalSede('todos'); setModalNivel('todos'); }
                    else if (val === 'central_primaria') { setModalSede('Sede Central'); setModalNivel('Primaria'); }
                    else if (val === 'central_secundaria') { setModalSede('Sede Central'); setModalNivel('Secundaria'); }
                    else if (val === 'central_todos') { setModalSede('Sede Central'); setModalNivel('todos'); }
                    else if (val === 'jerusalen') { setModalSede('Sede Jerusalén'); setModalNivel('todos'); }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none"
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                >
                  <option value="todos">🌐 Todas las Sedes (Ambos Niveles)</option>
                  <option value="central_primaria">🎒 Sede Central — Nivel Primaria</option>
                  <option value="central_secundaria">🎓 Sede Central — Nivel Secundaria</option>
                  <option value="central_todos">🏛️ Sede Central (Completa)</option>
                  <option value="jerusalen">⛪ Sede Jerusalén</option>
                </select>
              </div>

              {/* Selector Estado de Voto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  3. Estado de Votación:
                </label>
                <select
                  value={modalEstado}
                  onChange={(e) => setModalEstado(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none"
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                >
                  <option value="todos">Todos los Alumnos (Asistieron y Pendientes)</option>
                  <option value="votaron">Solo los que Ya Votaron (Asistieron)</option>
                  <option value="pendientes">Solo Pendientes por Votar (Faltantes)</option>
                </select>
              </div>
            </div>

            {/* Aviso informativo de estructura del Excel */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-xs text-emerald-900 space-y-1">
              <p className="font-extrabold flex items-center gap-1.5">
                <CheckCheck className="w-4 h-4 text-emerald-600" /> Formato Excel Optimizado (.xlsx):
              </p>
              <p className="text-emerald-700 text-[11px] leading-relaxed">
                Incluye columnas oficiales: <b>N°</b>, <b>ESTADO DE VOTO</b>, <b>FECHA Y HORA</b>, <b>APELLIDOS Y NOMBRES</b>, <b>DNI</b> (sin columnas duplicadas), <b>SALÓN</b>, <b>GRADO</b>, <b>SECCIÓN</b> y <b>SEDE</b>.
              </p>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={modalDownloading}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEjecutarDescargaModal}
                disabled={modalDownloading}
                className="flex items-center gap-2 px-5 py-2.5 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: '#10B981' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10B981'}
              >
                <Download className="w-4 h-4" />
                <span>{modalDownloading ? 'Generando Archivo...' : 'Descargar Archivo Excel (.xlsx)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OFICIAL ONPE DE LISTA DE ELECTORES IMPRIMIBLE */}
      <OnpePadronModal
        isOpen={showOnpeModal}
        onClose={() => setShowOnpeModal(false)}
        alumnosOriginales={alumnos}
        sedes={sedesDisponibles}
        salones={ngsDisponibles}
      />
    </div>
  );
};

export default StudentMonitor;