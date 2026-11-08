import React, { useState, useEffect } from 'react';
import api from '../api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Users, Vote, Percent, Filter, RefreshCw, Building2, Church, Globe2, MonitorPlay } from 'lucide-react';
import ProjectorView from './ProjectorView';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BLUE = '#1B3A8C';

const StatCard = ({ title, value, icon: Icon, colorHex, subtitle }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5">
    <div className="p-4 rounded-xl bg-opacity-10 flex-shrink-0" style={{ backgroundColor: `${colorHex}1A` }}>
      <Icon className="w-8 h-8" style={{ color: colorHex }} />
    </div>
    <div>
      <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-black text-slate-800">{value}</h3>
      {subtitle && <p className="text-[11px] text-slate-400 font-medium mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const DashboardStats = ({ handleLogout }) => {
  const [stats, setStats] = useState(null);
  const [filterSede, setFilterSede] = useState('todos');
  const [filterNivel, setFilterNivel] = useState('todos');
  const [filterNgs, setFilterNgs] = useState('todos');
  const [projectorMode, setProjectorMode] = useState(false);

  const loadData = async (sede = filterSede, ngs = filterNgs, nivel = filterNivel) => {
    try {
      const params = new URLSearchParams();
      if (sede !== 'todos') params.append('sede', sede);
      if (sede.toLowerCase().includes('central') && nivel !== 'todos') params.append('nivel', nivel);
      if (ngs !== 'todos') params.append('ngs', ngs);

      const resStats = await api.get(`/admin/stats?${params.toString()}`);
      setStats(resStats.data);
    } catch (err) {
      console.error("Error cargando panel", err);
      if (err.response?.status === 401 && handleLogout) {
        handleLogout();
      }
    }
  };

  useEffect(() => {
    loadData(filterSede, filterNgs, filterNivel);
    const intervalId = setInterval(() => {
      loadData(filterSede, filterNgs, filterNivel);
    }, 1500); // Actualización instantánea cada 1.5 segundos (tiempo real)
    return () => clearInterval(intervalId);
  }, [filterSede, filterNgs, filterNivel]);

  if (!stats) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Cargando estadísticas en vivo...</div>;

  const defaultPalette = ['#1B3A8C', '#E11D48', '#F59E0B', '#10B981', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899'];

  const getCandidateColor = (candidato, index = 0) => {
    if (candidato?.color) return candidato.color;
    const name = candidato?.nombre || '';
    if (/blanco|nulo/i.test(name)) return '#94A3B8';
    if (/franco/i.test(name)) return '#1B3A8C';
    if (/mar[ií]a|gonz/i.test(name)) return '#E11D48';
    if (/fuerza/i.test(name)) return '#F59E0B';
    return defaultPalette[index % defaultPalette.length];
  };

  const chartColors = (stats.chart_colors && stats.chart_colors.length === stats.chart_labels.length)
    ? stats.chart_colors
    : stats.chart_labels.map((label, idx) => {
        if (/blanco|nulo/i.test(label)) return '#94A3B8';
        return defaultPalette[idx % defaultPalette.length];
      });

  const chartData = {
    labels: stats.chart_labels,
    datasets: [{
      label: 'Votos Obtenidos',
      data: stats.chart_data,
      backgroundColor: chartColors,
      hoverBackgroundColor: chartColors,
      borderRadius: 12,
      borderSkipped: false,
      borderWidth: 1.5,
      borderColor: chartColors,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12, weight: 'bold' },
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (context) => ` ${context.raw} votos obtenidos`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: { weight: 'bold' }
        },
        grid: {
          color: '#F1F5F9'
        }
      },
      x: {
        ticks: {
          font: { weight: 'bold' }
        },
        grid: {
          display: false
        }
      }
    }
  };

  const desglose = stats.sedes_desglose;

  if (projectorMode) {
    return <ProjectorView sede={filterSede} ngs={filterNgs} onClose={() => setProjectorMode(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Botón: Modo Proyector / Pantalla Gigante */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setProjectorMode(true)}
          className="flex items-center gap-2 px-5 py-3 text-white text-sm font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          style={{ backgroundColor: BLUE }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#142D6E'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = BLUE}
          title="Proyectar resultados en pantalla completa (salir con Esc)"
        >
          <MonitorPlay size={18} /> Modo Proyector / Pantalla Gigante
        </button>
      </div>

      {/* Selector Rápido del Backend Puente (Ambas Sedes / Central / Jerusalén) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setFilterSede('todos')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
            filterSede === 'todos'
              ? 'border-blue-600 bg-blue-50/80 shadow-sm ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${filterSede === 'todos' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Globe2 size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Backend Puente</span>
            <h4 className="font-black text-slate-900 text-sm">Consolidado General</h4>
            <p className="text-[11px] text-slate-500">Ambas sedes sumadas</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterSede('Sede Central')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
            filterSede === 'Sede Central'
              ? 'border-blue-600 bg-blue-50/80 shadow-sm ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${filterSede === 'Sede Central' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Módulo Aislado</span>
            <h4 className="font-black text-slate-900 text-sm">Sede Central</h4>
            <p className="text-[11px] text-slate-500">Base <code className="text-[10px]">central.db</code></p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterSede('Sede Jerusalén')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
            filterSede === 'Sede Jerusalén'
              ? 'border-emerald-600 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-500/20'
              : 'border-slate-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${filterSede === 'Sede Jerusalén' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Church size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Módulo Aislado</span>
            <h4 className="font-black text-slate-900 text-sm">Sede Jerusalén</h4>
            <p className="text-[11px] text-slate-500">Base <code className="text-[10px]">jerusalen.db</code></p>
          </div>
        </button>
      </div>

      {/* Sub-selector de Nivel para Sede Central (Primaria vs Secundaria) */}
      {filterSede === 'Sede Central' && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-blue-50/70 border border-blue-200 rounded-2xl w-fit">
          <span className="text-xs font-black uppercase tracking-wider text-blue-900 px-2">Elección Directa:</span>
          <button
            type="button"
            onClick={() => setFilterNivel('Primaria')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filterNivel === 'Primaria'
                ? 'bg-amber-400 text-slate-900 shadow-xs'
                : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            🎒 Alcaldía Primaria
          </button>
          <button
            type="button"
            onClick={() => setFilterNivel('Secundaria')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filterNivel === 'Secundaria'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            🎓 Alcaldía Secundaria
          </button>
          <button
            type="button"
            onClick={() => setFilterNivel('todos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterNivel === 'todos'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            🌐 Consolidado Central
          </button>
        </div>
      )}

      {/* Desglose Comparativo del Backend Puente (si está en consolidado general) */}
      {filterSede === 'todos' && desglose && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-900 rounded-xl">
                <Building2 size={22} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">Sede Central</h4>
                <p className="text-xs text-slate-500">
                  {desglose.central?.votos_emitidos || 0} de {desglose.central?.total_alumnos || 0} votantes
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-blue-900">
                {desglose.central?.porcentaje_participacion || 0}%
              </span>
              <p className="text-[10px] uppercase font-bold text-slate-400">Participación</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl">
                <Church size={22} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">Sede Jerusalén</h4>
                <p className="text-xs text-slate-500">
                  {desglose.jerusalen?.votos_emitidos || 0} de {desglose.jerusalen?.total_alumnos || 0} votantes
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-900">
                {desglose.jerusalen?.porcentaje_participacion || 0}%
              </span>
              <p className="text-[10px] uppercase font-bold text-slate-400">Participación</p>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtro de Resultados */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
          <Filter size={18} style={{ color: BLUE }} />
          <span>Filtro de Salón (NGS):</span>
        </div>

        <div className="w-full sm:w-auto">
          <select 
            value={filterNgs}
            onChange={(e) => setFilterNgs(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none transition-colors"
            onFocus={e => e.target.style.borderColor = BLUE}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          >
            <option value="todos">Todos los Salones (NGS)</option>
            {(stats.ngs_disponibles || []).map((n, i) => (
              <option key={i} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjetas de Métricas Generales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Padrón Total (Filtro)" value={stats.total_alumnos} icon={Users} colorHex="#3B82F6" />
        <StatCard title="Votos Emitidos" value={stats.votos_emitidos} icon={Vote} colorHex="#10B981" />
        <StatCard title="Participación Electoral" value={`${stats.porcentaje_participacion}%`} icon={Percent} colorHex={BLUE} />
      </div>

      {/* Gráfico de Barras */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800">Distribución de Votos en Tiempo Real</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {filterSede !== 'todos' ? `Sede: ${filterSede} | ` : 'Consolidado General (Ambas Sedes) | '}
              {filterNgs !== 'todos' ? `Salón: ${filterNgs}` : 'Todos los Salones'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>En vivo · 1.5s</span>
            </div>
            <button 
              onClick={() => loadData(filterSede, filterNgs)} 
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ backgroundColor: '#EEF4FF', color: BLUE }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DDE8FF'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EEF4FF'}
            >
              <RefreshCw size={13} /> Actualizar
            </button>
          </div>
        </div>
        <div className="h-80">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
      
      {/* Tabla de Resultados por Candidato */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider border-b border-slate-100">
              <th className="p-5">Candidato / Lista</th>
              <th className="p-5">Sede</th>
              <th className="p-5 text-right">Votos Obtenidos</th>
              <th className="p-5 text-right">Porcentaje de Votos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(stats.resultados || []).map((r, i) => {
              const itemColor = getCandidateColor(r, i);
              return (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-5 font-bold text-slate-800 flex items-center gap-3">
                    <span 
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-xs ring-2 ring-white" 
                      style={{ backgroundColor: itemColor }}
                      title={`Color oficial: ${itemColor}`}
                    />
                    <span 
                      className="w-7 h-7 rounded-full font-black text-xs flex items-center justify-center flex-shrink-0" 
                      style={{ backgroundColor: `${itemColor}20`, color: itemColor }}
                    >
                      {i + 1}
                    </span>
                    <span className="font-extrabold text-slate-900">{r.nombre}</span>
                  </td>
                  <td className="p-5 text-xs font-bold">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                      r.sede && r.sede.includes('Jerusal') ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {r.sede && r.sede.includes('Jerusal') ? '⛪ Sede Jerusalén' : '🏛️ Sede Central'}
                    </span>
                  </td>
                  <td className="p-5 text-right font-extrabold text-slate-700">{r.votos}</td>
                  <td className="p-5 text-right font-black text-base" style={{ color: itemColor }}>{r.porcentaje}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardStats;
