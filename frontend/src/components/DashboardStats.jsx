import React, { useState, useEffect } from 'react';
import api, { getBaseURL } from '../api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Users, Vote, Percent, Filter, Download, RefreshCw } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BLUE = '#1B3A8C';

const StatCard = ({ title, value, icon: Icon, colorHex }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5">
    <div className="p-4 rounded-xl bg-opacity-10" style={{ backgroundColor: `${colorHex}1A` }}>
      <Icon className="w-8 h-8" style={{ color: colorHex }} />
    </div>
    <div>
      <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-black text-slate-800">{value}</h3>
    </div>
  </div>
);

const DashboardStats = ({ handleLogout }) => {
  const [stats, setStats] = useState(null);
  const [filterSede, setFilterSede] = useState('todos');
  const [filterNgs, setFilterNgs] = useState('todos');

  const loadData = async (sede = filterSede, ngs = filterNgs) => {
    try {
      const params = new URLSearchParams();
      if (sede !== 'todos') params.append('sede', sede);
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
    loadData(filterSede, filterNgs);
    const intervalId = setInterval(() => {
      loadData(filterSede, filterNgs);
    }, 5000);
    return () => clearInterval(intervalId);
  }, [filterSede, filterNgs]);

  const token = localStorage.getItem('cata_admin_token') || '';
  const exportUrl = `${getBaseURL()}/admin/export?token=${encodeURIComponent(token)}`;

  if (!stats) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Cargando estadísticas en vivo...</div>;

  const chartData = {
    labels: stats.chart_labels,
    datasets: [{
      label: 'Votos Obtenidos',
      data: stats.chart_data,
      backgroundColor: BLUE,
      borderRadius: 10,
    }]
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtro de Resultados */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
          <Filter size={18} style={{ color: BLUE }} /> Filtrar Recuento en Vivo:
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select 
            value={filterSede}
            onChange={(e) => setFilterSede(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none transition-colors"
            onFocus={e => e.target.style.borderColor = BLUE}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          >
            <option value="todos">Todas las Sedes</option>
            {(stats.sedes_disponibles || []).map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>

          <select 
            value={filterNgs}
            onChange={(e) => setFilterNgs(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none transition-colors"
            onFocus={e => e.target.style.borderColor = BLUE}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          >
            <option value="todos">Todos los Salones (NGS)</option>
            {(stats.ngs_disponibles || []).map((n, i) => (
              <option key={i} value={n}>{n}</option>
            ))}
          </select>

          <a 
            href={exportUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            style={{ backgroundColor: '#10B981' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10B981'}
          >
            <Download size={14} /> Exportar Auditoría en Excel
          </a>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Padrón Activo (Filtro)" value={stats.total_alumnos} icon={Users} colorHex="#3B82F6" />
        <StatCard title="Votos Emitidos" value={stats.votos_emitidos} icon={Vote} colorHex="#10B981" />
        <StatCard title="Participación Electoral" value={`${stats.porcentaje_participacion}%`} icon={Percent} colorHex={BLUE} />
      </div>

      {/* Gráfico de Barras */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800">Distribución de Votos en Tiempo Real</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {filterSede !== 'todos' ? `Sede: ${filterSede} | ` : 'Todas las Sedes | '}
              {filterNgs !== 'todos' ? `Salón: ${filterNgs}` : 'Todos los Salones'}
            </p>
          </div>
          <button 
            onClick={() => loadData(filterSede, filterNgs)} 
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: '#EEF4FF', color: BLUE }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DDE8FF'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EEF4FF'}
          >
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
        <div className="h-80">
          <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>
      
      {/* Tabla de Resultados por Candidato */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider border-b border-slate-100">
              <th className="p-5">Candidato / Lista</th>
              <th className="p-5 text-right">Votos Obtenidos</th>
              <th className="p-5 text-right">Porcentaje de Votos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(stats.resultados || []).map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-5 font-bold text-slate-800 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full font-black text-xs flex items-center justify-center" style={{ backgroundColor: '#EEF4FF', color: BLUE }}>
                    {i + 1}
                  </span>
                  {r.nombre}
                </td>
                <td className="p-5 text-right font-extrabold text-slate-700">{r.votos}</td>
                <td className="p-5 text-right font-black" style={{ color: BLUE }}>{r.porcentaje}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardStats;

