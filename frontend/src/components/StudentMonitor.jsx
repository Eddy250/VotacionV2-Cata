import React, { useState, useEffect } from 'react';
import api from '../api';
import { Search, Filter, CheckCircle2, Clock, Eye, Copy, Check, RefreshCw, Users, School } from 'lucide-react';

const BLUE = '#1B3A8C';

const StudentMonitor = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, votaron: 0, pendientes: 0, porcentaje: 0 });
  const [sedesDisponibles, setSedesDisponibles] = useState([]);
  const [ngsDisponibles, setNgsDisponibles] = useState([]);

  // Filtros
  const [selectedSede, setSelectedSede] = useState('todos');
  const [selectedNgs, setSelectedNgs] = useState('todos');
  const [selectedEstado, setSelectedEstado] = useState('todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSede !== 'todos') params.append('sede', selectedSede);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSede, selectedNgs, selectedEstado]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
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

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Filtro Sede */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sede</label>
            <select 
              value={selectedSede} 
              onChange={(e) => setSelectedSede(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = BLUE}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            >
              <option value="todos">Todas las Sedes</option>
              {sedesDisponibles.map((s, idx) => (
                <option key={idx} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Filtro NGS / Salón */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Salón (NGS)</label>
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
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Buscar Alumno / DNI / Código</label>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, DNI o Código..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none transition-colors"
                onFocus={e => e.target.style.borderColor = BLUE}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
              <button 
                type="submit" 
                className="p-2.5 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center"
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
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h4 className="text-base font-bold text-slate-800">
            Listado Electoral ({alumnos.length} estudiantes)
          </h4>
          <button 
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar Lista
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-100">
                <th className="p-4 text-center">N°</th>
                <th className="p-4">Apellidos y Nombres</th>
                <th className="p-4">Salón (NGS)</th>
                <th className="p-4">Sede</th>
                <th className="p-4">DNI</th>
                <th className="p-4">Código de Votación (DNI)</th>
                <th className="p-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400 font-bold animate-pulse">
                    Consultando padrón electoral...
                  </td>
                </tr>
              ) : alumnos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400 font-bold">
                    No se encontraron estudiantes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                alumnos.map((a, idx) => (
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
                    <td className="p-4 text-slate-500 text-xs font-semibold">{a.sede}</td>
                    <td className="p-4 font-mono font-bold text-slate-600">{a.dni || '-'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 font-mono font-black text-sm tracking-wider rounded-xl shadow-inner border" style={{ backgroundColor: '#EEF4FF', color: BLUE, borderColor: '#C7D9FF' }}>
                          {a.codigo}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(a.codigo)} 
                          title="Copiar DNI para votar"
                          className="p-1.5 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"
                          style={{ color: copiedCode === a.codigo ? '#10B981' : undefined }}
                        >
                          {copiedCode === a.codigo ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {a.ha_votado ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> YA VOTÓ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-black rounded-full border border-amber-200">
                          <Clock className="w-3.5 h-3.5" /> PENDIENTE
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentMonitor;
