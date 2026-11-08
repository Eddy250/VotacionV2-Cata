import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Printer, X, Filter, Download, Check, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Eye, Layers } from 'lucide-react';
import api from '../api';
import Barcode128 from './Barcode128';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

// Icono Genérico Oficial de Estudiante (Silueta pasaporte 100% neutra y unisex)
const GenericStudentPhoto = () => (
  <div className="w-[58px] sm:w-[64px] h-[76px] bg-slate-50 border border-black rounded-xs flex flex-col items-center justify-end overflow-hidden relative select-none shrink-0">
    <svg 
      viewBox="0 0 100 120" 
      className="w-full h-full text-slate-400"
      fill="currentColor"
    >
      <rect width="100" height="120" fill="#F8FAFC" />
      {/* Cabeza neutra unisex */}
      <circle cx="50" cy="40" r="21" fill="#94A3B8" />
      {/* Torso / Busto suave sin corbata ni marcas de género */}
      <path d="M 12 120 C 12 82, 30 72, 50 72 C 70 72, 88 82, 88 120 Z" fill="#94A3B8" />
    </svg>
    <span className="absolute top-0.5 left-1 text-[6.5px] font-black text-slate-500 opacity-70">FOTO</span>
  </div>
);

// Recuadro oficial para Firma (Caja gemela izquierda estilo ONPE)
const SignatureBox = () => (
  <div className="w-[74px] sm:w-[80px] h-[76px] border border-black rounded-xs flex flex-col justify-end p-1 bg-white shrink-0">
    <div className="border-t border-dotted border-black/70 w-full pt-0.5">
      <span className="text-[7px] font-black uppercase tracking-tight text-black block text-center leading-none">
        FIRMA
      </span>
    </div>
  </div>
);

// Cuadros reglamentarios para Huella Dactilar estilo ONPE (Caja gemela derecha, 100% limpia sin puntos)
const FingerprintBox = () => (
  <div className="w-[70px] sm:w-[76px] h-[76px] border border-black rounded-xs flex flex-col justify-end items-center p-1 relative bg-white shrink-0">
    <div className="border-t border-slate-300 w-full pt-0.5">
      <span className="text-[6.5px] font-black uppercase tracking-tight text-black text-center block leading-none">
        HUELLA DACTILAR
      </span>
    </div>
  </div>
);

// Ficha Individual de Elector (Estilo Oficial ONPE - 10 por hoja A4)
const VoterCard = ({ alumno, index }) => {
  const dniDisplay = String(alumno.dni || alumno.codigo || '00000000').trim();
  const checkDigit = String(Math.abs(parseInt(dniDisplay.slice(-2) || '0', 10) % 9) || '1');
  const indexPadded = String(index + 1).padStart(3, '0');

  // Separación nítida de Apellidos y Nombres
  let apellidos = '';
  let nombres = '';
  if (alumno.ap_paterno || alumno.ap_materno) {
    apellidos = [alumno.ap_paterno, alumno.ap_materno].filter(Boolean).join(' ').trim();
    nombres = (alumno.nombres || '').trim();
  } else if (alumno.nombre) {
    const parts = alumno.nombre.split(',');
    if (parts.length >= 2) {
      apellidos = parts[0].trim();
      nombres = parts.slice(1).join(',').trim();
    } else {
      apellidos = alumno.nombre.trim();
      nombres = '';
    }
  }

  // Grado y Sección conciso y directo (ej. "5° C" o "4° ÚNICA", sin la frase "GRADO Y SECCIÓN")
  const gradoSeccionCorto = (() => {
    const g = (alumno.grado || '').trim();
    const s = (alumno.seccion || '').trim();
    if (g && s) return `${g} ${s}`;
    if (g) return g;
    if (alumno.ngs) {
      const m = alumno.ngs.match(/([1-6]°?\s*(?:[A-E]|ÚNICA|UNICA))/i);
      if (m) return m[1].toUpperCase();
      return alumno.ngs;
    }
    return 'GENERAL';
  })();

  return (
    <div className="border-2 border-black bg-white flex flex-col justify-between h-[46.5mm] min-h-[46.5mm] p-1.5 box-border relative overflow-hidden">
      {/* Barra superior de la celda: Número correlativo + DNI + Código de barras */}
      <div className="flex items-center justify-between border-b border-black pb-0.5 mb-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-black text-black leading-none">{indexPadded}</span>
          <span className="text-xs font-black text-black tracking-tight leading-none">
            {dniDisplay} <span className="text-[9px] font-normal">-{checkDigit}</span>
          </span>
          <span className="text-[7.5px] text-slate-600 uppercase font-bold">N° DNI</span>
        </div>
        {/* Código de barras del DNI */}
        <div className="w-[130px] h-[15px]">
          <Barcode128 value={dniDisplay} height={15} unitWidth={1.05} />
        </div>
      </div>

      {/* Cuerpo principal de la celda: [ FOTO ]  [ NOMBRES + 5° C + NO VOTÓ ]  [ FIRMA ] [ HUELLA ] */}
      <div className="flex items-center justify-between gap-1.5 flex-1 min-h-0">
        {/* 1. Foto a la izquierda */}
        <GenericStudentPhoto />

        {/* 2. Columna central: Apellidos, Nombres, Grado y Sección directo, y casilla NO VOTÓ */}
        <div className="flex-1 min-w-0 px-1 flex flex-col justify-between h-[76px] py-0.5">
          <div className="leading-tight">
            <h5 className="text-[10.5px] sm:text-[11.5px] font-black uppercase text-black leading-[1.15] break-words">
              {apellidos}{nombres ? ',' : ''}
            </h5>
            {nombres && (
              <p className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-900 leading-[1.15] break-words mt-0.5">
                {nombres}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1 mt-auto">
            {/* Grado y Sección directo (ej. "5° C" o "4° ÚNICA") */}
            <span className="text-[10px] font-black text-black tracking-wider uppercase leading-none">
              {gradoSeccionCorto}
            </span>

            {/* Recuadro para marcar si NO VOTÓ */}
            <div className="flex items-center gap-1.5 border border-black px-1.5 py-0.5 rounded-xs w-max bg-slate-50">
              <div className="w-3.5 h-3.5 border border-black bg-white flex items-center justify-center shrink-0"></div>
              <span className="text-[8px] font-black uppercase tracking-wider text-black">NO VOTÓ</span>
            </div>
          </div>
        </div>

        {/* 3. Dos cuadros gemelos a la derecha: FIRMA y HUELLA */}
        <div className="flex items-center gap-1 shrink-0">
          <SignatureBox />
          <FingerprintBox />
        </div>
      </div>
    </div>
  );
};

const OnpePadronModal = ({ isOpen, onClose, alumnosOriginales = [], sedes = [], salones = [] }) => {
  // Estado de datos autónomo
  const [alumnosData, setAlumnosData] = useState([]);
  const [salonesList, setSalonesList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros reactivos
  const [filterSede, setFilterSede] = useState('todos');
  const [filterNivel, setFilterNivel] = useState('todos');
  const [filterNgs, setFilterNgs] = useState('todos');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [itemsPerPage, setItemsPerPage] = useState(10); // 10 alumnos por hoja A4 (5 filas x 2 columnas)

  // Datos de Ubigeo Oficial
  const [departamento] = useState('PUNO');
  const [provincia] = useState('SAN ROMAN');
  const [distrito] = useState('JULIACA');

  // Vista en Pantalla: Página actual (para navegación instantánea sin lag)
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('paged'); // 'paged' (rápido en pantalla) o 'all' (vista previa completa)

  // Carga autónoma de datos directos desde MySQL (sin parpadeos)
  const fetchFreshData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/alumnos');
      const loaded = res.data?.alumnos || [];
      setAlumnosData(loaded);

      // Extraer salones únicos limpios
      const uniqueSalones = Array.from(new Set(
        loaded.map(a => a.ngs).filter(Boolean)
      )).sort();
      setSalonesList(uniqueSalones);
    } catch (err) {
      console.error("Error al cargar padrón para ONPE", err);
      // Fallback a los datos recibidos por prop si la petición falla
      if (alumnosOriginales && alumnosOriginales.length > 0) {
        setAlumnosData(alumnosOriginales);
      }
    } finally {
      setLoading(false);
    }
  }, [alumnosOriginales]);

  // Cargar una sola vez cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchFreshData();
    }
  }, [isOpen, fetchFreshData]);

  // Si abrimos y no hay datos pero sí hay props originales
  useEffect(() => {
    if (isOpen && alumnosOriginales && alumnosOriginales.length > 0 && alumnosData.length === 0) {
      setAlumnosData(alumnosOriginales);
    }
  }, [isOpen, alumnosData.length, alumnosOriginales]);

  // Grados y Secciones disponibles dinámicamente según Sede y Nivel seleccionados
  const salonesDisponibles = useMemo(() => {
    const list = alumnosData.length > 0 ? alumnosData : (alumnosOriginales || []);
    const map = new Map();

    list.forEach(a => {
      // Excluir cabeceras o números de orden corruptos
      const nom = (a.nombre || '').trim();
      const hasRealNames = Boolean((a.ap_paterno && a.ap_paterno.trim() !== '') || (a.nombres && a.nombres.trim() !== ''));
      if (!hasRealNames && (!nom || nom === '#' || /^\d+$/.test(nom))) return;

      // Filtrar por sede seleccionada
      if (filterSede !== 'todos') {
        const s = (a.sede || '').toLowerCase();
        if (filterSede === 'central' && !s.includes('central')) return;
        if (filterSede === 'jerusalen' && !s.includes('jerusal')) return;
      }

      // Filtrar por nivel seleccionado
      if (filterNivel !== 'todos') {
        const niv = (a.nivel || '').toLowerCase();
        if (niv !== filterNivel.toLowerCase()) return;
      }

      const g = (a.grado || '').trim();
      const s = (a.seccion || '').trim();
      const ngs = (a.ngs || '').trim();

      let key = '';
      let label = '';

      if (g && s) {
        key = `${g} ${s}`;
        label = key;
        if (ngs && ngs.toUpperCase() !== key.toUpperCase()) {
          label = `${key} (${ngs})`;
        }
      } else if (ngs) {
        key = ngs;
        label = ngs;
      } else if (g) {
        key = g;
        label = g;
      }

      if (key && !map.has(key)) {
        map.set(key, { key, label, grado: g, seccion: s, ngs });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [alumnosData, alumnosOriginales, filterSede, filterNivel]);

  // Filtrado reactivo en memoria totalmente protegido contra números o cabeceras corruptas
  const filteredAlumnos = useMemo(() => {
    const list = alumnosData.length > 0 ? alumnosData : (alumnosOriginales || []);
    return list.filter(a => {
      // Excluir filas con nombre '#' o que sean solo números correlativos
      const nom = (a.nombre || '').trim();
      const hasRealNames = Boolean((a.ap_paterno && a.ap_paterno.trim() !== '') || (a.nombres && a.nombres.trim() !== ''));
      if (!hasRealNames && (!nom || nom === '#' || /^\d+$/.test(nom))) {
        return false;
      }

      // 1. Filtro de Sede
      if (filterSede !== 'todos') {
        const s = (a.sede || '').toLowerCase();
        if (filterSede === 'central' && !s.includes('central')) return false;
        if (filterSede === 'jerusalen' && !s.includes('jerusal')) return false;
      }

      // 2. Filtro de Nivel
      if (filterNivel !== 'todos') {
        const niv = (a.nivel || '').toLowerCase();
        if (niv !== filterNivel.toLowerCase()) return false;
      }

      // 3. Filtro de Grado y Sección
      if (filterNgs !== 'todos') {
        const target = filterNgs.toUpperCase().trim();
        const aGradoSec = `${a.grado || ''} ${a.seccion || ''}`.toUpperCase().trim();
        const aGrado = (a.grado || '').toUpperCase().trim();
        const aNgs = (a.ngs || '').toUpperCase().trim();

        const matches = (
          aGradoSec === target ||
          aNgs === target ||
          aGrado === target ||
          `${aGradoSec} (${aNgs})` === target ||
          aNgs.includes(target) ||
          target.includes(aGradoSec)
        );

        if (!matches) return false;
      }

      // 4. Filtro de Estado de Votación
      if (filterEstado === 'votaron' && !a.ha_votado) return false;
      if (filterEstado === 'pendientes' && a.ha_votado) return false;

      return true;
    });
  }, [alumnosData, alumnosOriginales, filterSede, filterNivel, filterNgs, filterEstado]);

  // División en páginas (10 por hoja A4)
  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < filteredAlumnos.length; i += itemsPerPage) {
      chunks.push(filteredAlumnos.slice(i, i + itemsPerPage));
    }
    return chunks;
  }, [filteredAlumnos, itemsPerPage]);

  // Ajustar página actual si excede el total
  useEffect(() => {
    if (currentPage > pages.length && pages.length > 0) {
      setCurrentPage(1);
    }
  }, [pages.length, currentPage]);

  const handlePrint = () => {
    // Al imprimir, nos aseguramos de que el DOM tenga todas las páginas visibles
    setViewMode('all');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (!isOpen) return null;

  const totalPages = pages.length;
  const currentStudentsOnPage = pages[currentPage - 1] || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col overflow-hidden">
      {/* ======================================================== */}
      {/* BARRA SUPERIOR DE HERRAMIENTAS Y FILTROS (NO IMPRIMIBLE) */}
      {/* ======================================================== */}
      <div className="bg-slate-900 text-white p-3 sm:p-4 border-b border-slate-700 shadow-xl shrink-0 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
            <Printer size={22} />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              Lista de Electores Oficial (Formato ONPE)
              <span className="text-[10px] uppercase font-black bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                {filteredAlumnos.length} Electores Hábiles
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Padrón Electoral con Código de Barras, Firma y Huella Dactilar · 10 por Hoja A4
            </p>
          </div>
        </div>

        {/* Controles de Filtros Funcionales */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* 1. Sede */}
          <div className="flex flex-col">
            <label className="text-[9.5px] text-slate-400 font-bold uppercase mb-0.5 tracking-wider">Sede</label>
            <select 
              value={filterSede}
              onChange={e => { 
                const newSede = e.target.value;
                setFilterSede(newSede); 
                setFilterNgs('todos'); 
                setCurrentPage(1); 
                if (newSede === 'jerusalen' && (filterNivel === 'Primaria' || filterNivel === 'Secundaria')) {
                  setFilterNivel('todos');
                }
              }}
              className="bg-slate-800 text-white border border-slate-700 hover:border-slate-500 rounded-lg px-2.5 py-1.5 font-bold outline-none cursor-pointer transition-colors shadow-sm"
            >
              <option value="todos">Todas las Sedes</option>
              <option value="central">Sede Central</option>
              <option value="jerusalen">Sede Jerusalén</option>
            </select>
          </div>

          {/* 2. Nivel Educativo (Primaria y Secundaria para Sede Central) */}
          <div className="flex flex-col">
            <label className="text-[9.5px] text-slate-400 font-bold uppercase mb-0.5 tracking-wider">Nivel</label>
            <select 
              value={filterNivel}
              onChange={e => { 
                const newNivel = e.target.value;
                setFilterNivel(newNivel); 
                setFilterNgs('todos'); 
                setCurrentPage(1); 
                if ((newNivel === 'Primaria' || newNivel === 'Secundaria') && filterSede === 'jerusalen') {
                  setFilterSede('central');
                }
              }}
              className="bg-slate-800 text-white border border-slate-700 hover:border-slate-500 rounded-lg px-2.5 py-1.5 font-bold outline-none cursor-pointer transition-colors shadow-sm"
            >
              <option value="todos">Todos los Niveles</option>
              <option value="Primaria">Primaria (Sede Central)</option>
              <option value="Secundaria">Secundaria (Sede Central)</option>
              {filterSede === 'jerusalen' && <option value="General">Nivel General</option>}
            </select>
          </div>

          {/* 3. Salón / Grado y Sección Dinámico */}
          <div className="flex flex-col">
            <label className="text-[9.5px] text-slate-400 font-bold uppercase mb-0.5 tracking-wider">Grado y Sección</label>
            <select 
              value={filterNgs}
              onChange={e => { setFilterNgs(e.target.value); setCurrentPage(1); }}
              className="bg-slate-800 text-white border border-slate-700 hover:border-slate-500 rounded-lg px-2.5 py-1.5 font-bold outline-none cursor-pointer max-w-[210px] transition-colors shadow-sm"
            >
              <option value="todos">
                Todos los Salones {salonesDisponibles.length > 0 ? `(${salonesDisponibles.length})` : ''}
              </option>
              {salonesDisponibles.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Botón de Actualizar / Refrescar desde MySQL */}
          <div className="flex flex-col justify-end">
            <button
              onClick={fetchFreshData}
              disabled={loading}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer h-[33px]"
              title="Recargar datos actualizados desde la base de datos MySQL"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Cargando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>

        {/* Acciones e Impresión */}
        <div className="flex items-center gap-2">
          {/* Alternador de Modo de Vista (Paginado / Todas) */}
          <div className="hidden md:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('paged')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'paged' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Ver página por página (rápido y cómodo)"
            >
              <Eye size={13} /> Paginado
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Ver todas las hojas A4 juntas para revisión general"
            >
              <Layers size={13} /> Todas ({totalPages})
            </button>
          </div>

          {/* Botón Imprimir A4 / Guardar PDF */}
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer text-xs"
          >
            <Printer size={16} /> Imprimir / Guardar PDF
          </button>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-500 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Cerrar Vista"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BARRA DE NAVEGACIÓN EN PANTALLA (SI MODO ES PAGINADO)     */}
      {/* ======================================================== */}
      {viewMode === 'paged' && totalPages > 1 && (
        <div className="bg-slate-950 text-white px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer font-bold"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span className="font-bold text-slate-300">
              Hoja <span className="text-white font-black">{currentPage}</span> de <span className="text-white font-black">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer font-bold"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>

          <div className="text-slate-400 text-[11px] font-medium hidden sm:block">
            Tip: Al hacer clic en <span className="text-emerald-400 font-bold">"Imprimir / Guardar PDF"</span> se imprimirán automáticamente todas las {totalPages} hojas del filtro.
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ÁREA DE VISUALIZACIÓN DE HOJAS A4                        */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-800/60 print:bg-white print:p-0 print:overflow-visible">
        {loading ? (
          <div className="max-w-md mx-auto my-24 p-8 bg-white rounded-3xl text-center shadow-2xl border border-slate-200">
            <RefreshCw size={44} className="text-blue-600 animate-spin mx-auto mb-3" />
            <h4 className="text-base font-black text-slate-800 mb-1">Cargando Lista de Electores...</h4>
            <p className="text-xs text-slate-500">
              Sincronizando los datos del padrón electoral con la base de datos MySQL.
            </p>
          </div>
        ) : totalPages === 0 ? (
          <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl text-center shadow-2xl border border-slate-200">
            <AlertCircle size={44} className="text-amber-500 mx-auto mb-3" />
            <h4 className="text-lg font-black text-slate-800 mb-1">No hay electores para este filtro</h4>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {filterNivel === 'Secundaria' ? (
                <>
                  Aún no se ha importado la lista de electores para <strong>Secundaria</strong>.
                  <br />
                  Los <strong>{alumnosData.length || 432} electores actuales</strong> corresponden a <strong>Primaria (Sede Central)</strong>.
                </>
              ) : (
                'Verifica los filtros seleccionados de sede, nivel o grado y sección.'
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {filterNivel === 'Secundaria' && (
                <button
                  onClick={() => { setFilterNivel('Primaria'); setFilterNgs('todos'); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  Ver Electores de Primaria
                </button>
              )}
              <button
                onClick={() => { setFilterSede('todos'); setFilterNivel('todos'); setFilterNgs('todos'); }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 print:space-y-0 print:w-full max-w-[215mm] mx-auto onpe-print-container">
            {/* Si estamos en modo paginado en pantalla, renderizamos solo la página actual para ultra fluidez;
                al imprimir (@media print) siempre se imprimen todas las páginas */}
            {(viewMode === 'all' ? pages : [currentStudentsOnPage]).map((alumnosEnPagina, pIdx) => {
              const actualPageIndex = (viewMode === 'all') ? pIdx : (currentPage - 1);
              const pageNumber = `${actualPageIndex + 1}a`;
              const startIndex = actualPageIndex * itemsPerPage;

              // Deducir el Grado y Sección correspondiente a los alumnos de esta hoja
              const pageGradoSeccion = (() => {
                if (filterNgs !== 'todos') {
                  const nivSuffix = filterNivel !== 'todos' ? ` - ${filterNivel.toUpperCase()}` : '';
                  return `${filterNgs.toUpperCase()}${nivSuffix}`;
                }
                if (filterNivel !== 'todos') {
                  const sedeText = filterSede === 'central' ? 'SEDE CENTRAL' : (filterSede === 'jerusalen' ? 'SEDE JERUSALÉN' : '');
                  return `${filterNivel.toUpperCase()}${sedeText ? ' - ' + sedeText : ''}`;
                }
                if (alumnosEnPagina && alumnosEnPagina.length > 0) {
                  const first = alumnosEnPagina[0];
                  const g = (first.grado || '').trim();
                  const s = (first.seccion || '').trim();
                  const niv = (first.nivel || '').trim();
                  if (g && s) return `${g} ${s}${niv ? ' - ' + niv.toUpperCase() : ''}`;
                  if (first.ngs) return `${first.ngs}${niv ? ' - ' + niv.toUpperCase() : ''}`;
                }
                return 'PADRÓN GENERAL';
              })();

              const sheetBarcode = `CATA-2026-P${String(actualPageIndex + 1).padStart(2, '0')}`;

              return (
                <div 
                  key={actualPageIndex}
                  className="bg-white text-black p-[5mm] sm:p-[6mm] shadow-2xl rounded-sm print:shadow-none print:rounded-none relative box-border onpe-page flex flex-col justify-between"
                  style={{
                    width: '210mm',
                    height: '297mm',
                    minHeight: '297mm',
                    maxHeight: '297mm',
                    margin: '0 auto',
                    pageBreakAfter: 'always',
                    breakAfter: 'page',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* MARCAS DE ALINEACIÓN EN LAS 4 ESQUINAS (ONPE SQUARES) */}
                  <div className="absolute top-[3mm] left-[3mm] w-[5mm] h-[5mm] bg-black"></div>
                  <div className="absolute top-[3mm] right-[3mm] w-[5mm] h-[5mm] bg-black"></div>
                  <div className="absolute bottom-[3mm] left-[3mm] w-[5mm] h-[5mm] bg-black"></div>
                  <div className="absolute bottom-[3mm] right-[3mm] w-[5mm] h-[5mm] bg-black"></div>

                  {/* CÓDIGO DE BARRAS VERTICAL EN MARGEN DERECHO (CONTROL DE HOJA) */}
                  <div 
                    className="absolute right-[-24px] top-[140mm] -rotate-90 origin-center text-center hidden sm:block print:block select-none"
                    style={{ width: '180px' }}
                  >
                    <div className="h-[14px]">
                      <Barcode128 value={sheetBarcode} height={14} unitWidth={0.9} />
                    </div>
                    <span className="text-[7.5px] font-mono font-bold tracking-widest block text-black">
                      {sheetBarcode}
                    </span>
                  </div>

                  {/* CABECERA OFICIAL ONPE */}
                  <div className="shrink-0 mb-1">
                    <div className="flex items-start justify-between border-b-2 border-black pb-1 mb-1">
                      {/* Logo Colegio CATA */}
                      <div className="w-14 h-14 shrink-0 flex items-center justify-center p-0.5">
                        <img src={logoColegioAzul} alt="CATA" className="w-full h-full object-contain filter grayscale contrast-200" />
                      </div>

                      {/* Títulos Centrales */}
                      <div className="text-center flex-1 px-2">
                        <h4 className="text-[10px] font-black tracking-widest uppercase text-black leading-none mb-1">
                          ELECCIONES DEL MUNICIPIO ESCOLAR 2026
                        </h4>
                        <h2 className="text-lg font-black uppercase text-black tracking-wider leading-none mb-0.5">
                          LISTA DE ELECTORES
                        </h2>
                        <p className="text-[7.5px] font-bold uppercase tracking-wider text-black">
                          PROCESO DEMOCRÁTICO ESTUDIANTIL · COLEGIO ADVENTISTA TÚPAC AMARU
                        </p>
                      </div>

                      {/* Número de página y Total de Electores */}
                      <div className="text-right shrink-0">
                        <span className="text-lg font-black text-black tracking-tight">{pageNumber}</span>
                        <div className="border border-black mt-0.5 px-2 py-0.5 rounded-xs inline-block">
                          <span className="text-[6.5px] font-bold block text-black uppercase leading-tight">TOTAL ELECTORES HÁBILES</span>
                          <span className="text-xs font-black text-black block leading-none">{filteredAlumnos.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* CINTILLO DE IDENTIFICACIÓN: GRADO Y SECCIÓN Y UBIGEO (TABLA OFICIAL) */}
                    <div className="grid grid-cols-4 border border-black text-center text-black">
                      <div className="border-r border-black p-0.5 bg-slate-100 flex flex-col justify-center">
                        <span className="text-[6.5px] font-bold uppercase block leading-none text-slate-600 mb-0.5">GRADO Y SECCIÓN</span>
                        <span className="text-[10.5px] sm:text-[11px] font-black tracking-tight uppercase truncate px-0.5 leading-tight">
                          {pageGradoSeccion}
                        </span>
                      </div>
                      <div className="border-r border-black p-0.5 flex flex-col justify-center">
                        <span className="text-[6.5px] font-bold uppercase block leading-none text-slate-600 mb-0.5">DEPARTAMENTO</span>
                        <span className="text-[9.5px] font-black uppercase leading-tight">{departamento}</span>
                      </div>
                      <div className="border-r border-black p-0.5 flex flex-col justify-center">
                        <span className="text-[6.5px] font-bold uppercase block leading-none text-slate-600 mb-0.5">PROVINCIA</span>
                        <span className="text-[9.5px] font-black uppercase leading-tight">{provincia}</span>
                      </div>
                      <div className="p-0.5 flex flex-col justify-center">
                        <span className="text-[6.5px] font-bold uppercase block leading-none text-slate-600 mb-0.5">DISTRITO</span>
                        <span className="text-[9.5px] font-black uppercase leading-tight">{distrito}</span>
                      </div>
                    </div>
                  </div>

                  {/* GRILLA DE 2 COLUMNAS X 5 FILAS (10 ELECTORES POR HOJA COMPLETA) */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 flex-1 my-1">
                    {alumnosEnPagina.map((alumno, cardIdx) => (
                      <VoterCard 
                        key={alumno.codigo || cardIdx} 
                        alumno={alumno} 
                        index={startIndex + cardIdx} 
                      />
                    ))}
                  </div>

                  {/* PIE DE PÁGINA REGLAMENTARIO */}
                  <div className="flex justify-between items-center text-[7px] font-bold text-slate-600 border-t border-slate-300 pt-0.5 shrink-0">
                    <span>ONPE · Asistencia Técnica para Municipios Escolares</span>
                    <span>Página {pageNumber} · Padrón Oficial CATA 2026</span>
                    <span>Sistema de Votación Electrónica CATA</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ESTILOS GLOBALES DE IMPRESIÓN REGLAMENTARIA A4 */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .onpe-print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .onpe-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 5mm 7mm 4mm 7mm !important;
            margin: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default OnpePadronModal;
