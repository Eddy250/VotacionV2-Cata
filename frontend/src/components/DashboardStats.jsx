import React, { useState, useEffect } from 'react';
import api, { getAssetUrl } from '../api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Users, Vote, Percent, Filter, RefreshCw, Building2, Church, Globe2, MonitorPlay, CalendarClock, FileCheck, Power, PowerOff, PauseCircle, PlayCircle, GraduationCap } from 'lucide-react';
import ProjectorView from './ProjectorView';
import OnpeActasModal from './OnpeActasModal';

const lighten = (hex, amt = 0.22) => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  const r = Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amt);
  const g = Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amt);
  const b = Math.round((n & 255) + (255 - (n & 255)) * amt);
  return `rgb(${r}, ${g}, ${b})`;
};

const imgUrl = (path) => {
  if (!path) return null;
  const p = /^\/?static\//i.test(path) || /^https?:/i.test(path) ? path : `static/${path.replace(/^\/+/, '')}`;
  return getAssetUrl(p);
};

// Plugin de números en la parte superior de cada barra
const barValuePlugin = {
  id: 'barValuesDashboard',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data) return;
    meta.data.forEach((bar, i) => {
      const val = chart.data.datasets[0].data[i];
      ctx.save();
      ctx.font = '900 16px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.fillText(val, bar.x, bar.y - 8);
      ctx.restore();
    });
  }
};

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, barValuePlugin);

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
  const [showActasModal, setShowActasModal] = useState(false);
  const [jornadas, setJornadas] = useState({
    central_primaria: true,
    jerusalen: true,
    central_secundaria: false
  });
  const [loadingJornada, setLoadingJornada] = useState(false);
  const [estadoEleccion, setEstadoEleccion] = useState('EN_CURSO');
  const [loadingEstado, setLoadingEstado] = useState(false);
  const [confirmingPause, setConfirmingPause] = useState(false);

  const loadEstadoEleccion = async () => {
    try {
      const res = await api.get('/admin/estado-eleccion');
      if (res.data?.estado) {
        setEstadoEleccion(res.data.estado);
      }
    } catch (err) {
      console.error("Error al cargar estado de elección", err);
    }
  };

  const handleToggleEstado = async (nuevoEstado) => {
    setLoadingEstado(true);
    setConfirmingPause(false);
    try {
      const res = await api.post('/admin/estado-eleccion', { estado: nuevoEstado });
      if (res.data?.success && res.data?.info?.estado) {
        setEstadoEleccion(res.data.info.estado);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar estado de la urna');
    } finally {
      setLoadingEstado(false);
    }
  };

  const loadJornadas = async () => {
    try {
      const res = await api.get('/admin/jornadas');
      if (res.data?.success && res.data?.jornadas) {
        setJornadas(res.data.jornadas);
      }
    } catch (err) {
      console.error("Error al cargar jornadas", err);
    }
  };

  const handleToggleJornada = async (jornadaKey, currentStatus) => {
    setLoadingJornada(true);
    try {
      const res = await api.post('/admin/jornadas', {
        jornada: jornadaKey,
        activo: !currentStatus
      });
      if (res.data?.success && res.data?.jornadas) {
        setJornadas(res.data.jornadas);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar jornada');
    } finally {
      setLoadingJornada(false);
    }
  };

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
    loadEstadoEleccion();
    loadJornadas();
    loadData(filterSede, filterNgs, filterNivel);
    const intervalId = setInterval(() => {
      loadData(filterSede, filterNgs, filterNivel);
      loadEstadoEleccion();
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

  const isConsolidado = filterSede === 'todos';
  const chartLabels = (stats.resultados || []).map(r => {
    if (isConsolidado) {
      const sedeTag = r.sede && r.sede.includes('Jerusal') ? '(Jerusalén)' : '(Central)';
      return [r.nombre, sedeTag];
    }
    return r.nombre;
  });

  const chartDataValues = (stats.resultados || []).map(r => r.votos);
  const chartColors = (stats.resultados || []).map((r, idx) => getCandidateColor(r, idx));

  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Votos Obtenidos',
      data: chartDataValues,
      backgroundColor: (ctx) => {
        const { chart, dataIndex } = ctx;
        const base = chartColors[dataIndex] || BLUE;
        const area = chart.chartArea;
        if (!area) return base;
        const g = chart.ctx.createLinearGradient(0, area.bottom, 0, area.top);
        g.addColorStop(0, base);
        g.addColorStop(1, lighten(base, 0.22));
        return g;
      },
      borderRadius: { topLeft: 10, topRight: 10 },
      borderSkipped: 'bottom',
      borderWidth: 0,
      maxBarThickness: 90,
    }]
  };

  const maxVotos = Math.max(1, ...chartDataValues);
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 32, bottom: 6 }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13, weight: 'bold' },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (context) => ` ${context.raw} votos obtenidos`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: maxVotos <= 2 ? maxVotos + 1 : Math.ceil(maxVotos * 1.2),
        ticks: {
          stepSize: maxVotos <= 5 ? 1 : undefined,
          precision: 0,
          font: { weight: '800', size: 13 },
          color: '#64748B'
        },
        grid: {
          color: '#F1F5F9'
        },
        border: { display: false }
      },
      x: {
        ticks: {
          font: { weight: '800', size: 12 },
          color: '#0F172A',
          maxRotation: 0,
          minRotation: 0
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
      {/* Botones de Acción Superior: Actas Oficiales ONPE y Modo Proyector */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowActasModal(true)}
          className="flex items-center gap-2 px-5 py-3 text-slate-900 bg-amber-400 hover:bg-amber-300 active:scale-95 text-sm font-black rounded-xl shadow-sm transition-all cursor-pointer border border-amber-500/30"
          title="Generar e imprimir Actas Oficiales ONPE (Sufragio 4a y Escrutinio 4b) con Comités Docentes y Estudiantiles"
        >
          <FileCheck size={18} /> 📄 Generar Actas Oficiales ONPE
        </button>

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

      {/* INTERRUPTOR MAESTRO: ACTIVAR O DESACTIVAR URNA ELECTORAL */}
      <div className={`rounded-3xl p-6 shadow-sm border-2 transition-all ${
        estadoEleccion === 'EN_CURSO'
          ? 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 border-emerald-300'
          : 'bg-gradient-to-r from-amber-50 via-white to-rose-50 border-amber-300'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`p-3.5 rounded-2xl flex-shrink-0 shadow-xs ${
              estadoEleccion === 'EN_CURSO'
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 text-white'
            }`}>
              {estadoEleccion === 'EN_CURSO' ? <Power size={28} /> : <PowerOff size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  estadoEleccion === 'EN_CURSO'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${estadoEleccion === 'EN_CURSO' ? 'bg-emerald-500 animate-ping' : 'bg-amber-600'}`}></span>
                  {estadoEleccion === 'EN_CURSO' ? 'Urna Activa · Votación Abierta' : 'Urna Desactivada · Votación en Pausa'}
                </span>
                <span className="text-xs text-slate-400 font-bold">Interruptor Maestro General</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                {estadoEleccion === 'EN_CURSO'
                  ? 'Todas las cabinas de votación están habilitadas'
                  : 'Votación suspendida temporalmente en todo el colegio'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {estadoEleccion === 'EN_CURSO'
                  ? 'Los alumnos pueden ingresar su DNI y sufragar con normalidad según su cohorte habilitada.'
                  : 'Las cabinas muestran el aviso de pausa docente y bloquean el ingreso de DNI hasta que reactives la urna.'}
              </p>
            </div>
          </div>

          {/* Botón de Acción con Confirmación de Pausa */}
          <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
            {confirmingPause ? (
              <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-amber-300 shadow-sm animate-in fade-in">
                <span className="text-xs font-black text-amber-900 pl-2">¿Confirmas pausar la urna?</span>
                <button
                  type="button"
                  disabled={loadingEstado}
                  onClick={() => handleToggleEstado('PAUSADA')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-xs"
                >
                  {loadingEstado ? 'Pausando...' : 'Sí, Pausar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingPause(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : estadoEleccion === 'EN_CURSO' ? (
              <button
                type="button"
                disabled={loadingEstado}
                onClick={() => setConfirmingPause(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm bg-white hover:bg-amber-50 text-amber-800 border-2 border-amber-300 hover:border-amber-400 shadow-sm transition-all cursor-pointer group active:scale-95"
                title="Pausar la votación en todas las cabinas (refrigerio, formación, etc.)"
              >
                <PauseCircle size={18} className="text-amber-600 group-hover:scale-110 transition-transform" />
                Pausar / Desactivar Urna
              </button>
            ) : (
              <button
                type="button"
                disabled={loadingEstado}
                onClick={() => handleToggleEstado('EN_CURSO')}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 animate-pulse"
                title="Habilitar la votación y reabrir las cabinas para los alumnos"
              >
                <PlayCircle size={20} />
                {loadingEstado ? 'Activando...' : '▶️ Activar Urna / Abrir Votación'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONTROL DE JORNADAS ELECTORALES (Día 1 vs Día 2) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <CalendarClock size={18} />
              </span>
              <h3 className="font-black text-slate-900 text-base sm:text-lg">Control de Jornadas Electorales</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Activa o pausa qué cohortes pueden votar hoy en la Urna. El estudiante que intente votar antes de su día verá un aviso con su cronograma.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider self-start sm:self-auto bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Día 1: Primaria + Jerusalén · Día 2: Colegio
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          {/* Card 1: Primaria Sede Central */}
          <div className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
            jornadas.central_primaria
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-slate-200 bg-slate-50/60 opacity-80'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">DÍA 1 · ACTIVO</span>
                <span className={`w-2.5 h-2.5 rounded-full ${jornadas.central_primaria ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
              </div>
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                🎒 Primaria Sede Central
              </h4>
              <p className="text-xs text-slate-500 mt-1">1° a 6° Grado de Primaria en Pabellón Central.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
              <span className={`text-xs font-black ${jornadas.central_primaria ? 'text-emerald-700' : 'text-slate-500'}`}>
                {jornadas.central_primaria ? '✓ Votación Habilitada' : '⏸ En Pausa'}
              </span>
              <button
                type="button"
                disabled={loadingJornada}
                onClick={() => handleToggleJornada('central_primaria', jornadas.central_primaria)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  jornadas.central_primaria
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {jornadas.central_primaria ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>

          {/* Card 2: Todo Sede Jerusalén */}
          <div className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
            jornadas.jerusalen
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-slate-200 bg-slate-50/60 opacity-80'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">DÍA 1 · ACTIVO</span>
                <span className={`w-2.5 h-2.5 rounded-full ${jornadas.jerusalen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
              </div>
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                ⛪ Sede Jerusalén (Completa)
              </h4>
              <p className="text-xs text-slate-500 mt-1">Todos los alumnos del Anexo Jerusalén.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
              <span className={`text-xs font-black ${jornadas.jerusalen ? 'text-emerald-700' : 'text-slate-500'}`}>
                {jornadas.jerusalen ? '✓ Votación Habilitada' : '⏸ En Pausa'}
              </span>
              <button
                type="button"
                disabled={loadingJornada}
                onClick={() => handleToggleJornada('jerusalen', jornadas.jerusalen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  jornadas.jerusalen
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {jornadas.jerusalen ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>

          {/* Card 3: Secundaria Colegio Central */}
          <div className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
            jornadas.central_secundaria
              ? 'border-indigo-400 bg-indigo-50/50'
              : 'border-amber-300 bg-amber-50/60'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-black uppercase tracking-wider ${jornadas.central_secundaria ? 'text-indigo-900' : 'text-amber-900'}`}>
                  {jornadas.central_secundaria ? 'DÍA 2 · ACTIVO' : 'DÍA 2 · PROGRAMADO'}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${jornadas.central_secundaria ? 'bg-indigo-600 animate-pulse' : 'bg-amber-400'}`}></span>
              </div>
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                🎓 Secundaria Colegio Central
              </h4>
              <p className="text-xs text-slate-500 mt-1">1° a 5° de Secundaria Central. Votarán al día siguiente.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
              <span className={`text-xs font-black ${jornadas.central_secundaria ? 'text-indigo-700' : 'text-amber-800'}`}>
                {jornadas.central_secundaria ? '✓ Votación Abierta' : '🔒 Bloqueado para Día 1'}
              </span>
              <button
                type="button"
                disabled={loadingJornada}
                onClick={() => handleToggleJornada('central_secundaria', jornadas.central_secundaria)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  jornadas.central_secundaria
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                    : 'bg-amber-500 text-slate-900 hover:bg-amber-600 font-black shadow-xs'
                }`}
              >
                {jornadas.central_secundaria ? 'Pausar' : 'Habilitar Votación Día 2'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selector Rápido de Ámbito Electoral Oficial (4 Ámbitos Directos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Ámbito 1: Central Primaria */}
        <button
          type="button"
          onClick={() => { setFilterSede('Sede Central'); setFilterNivel('Primaria'); setFilterNgs('todos'); loadData('Sede Central', 'todos', 'Primaria'); }}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
            filterSede === 'Sede Central' && filterNivel === 'Primaria'
              ? 'border-amber-400 bg-amber-50/80 shadow-sm ring-2 ring-amber-400/30'
              : 'border-slate-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${filterSede === 'Sede Central' && filterNivel === 'Primaria' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-600'}`}>
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Día 1 · Activo</span>
            <h4 className="font-black text-slate-900 text-sm">Central Primaria</h4>
            <p className="text-[11px] text-slate-500">1° a 6° Grado Central</p>
          </div>
        </button>

        {/* Ámbito 2: Central Secundaria */}
        <button
          type="button"
          onClick={() => { setFilterSede('Sede Central'); setFilterNivel('Secundaria'); setFilterNgs('todos'); loadData('Sede Central', 'todos', 'Secundaria'); }}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
            filterSede === 'Sede Central' && filterNivel === 'Secundaria'
              ? 'border-indigo-500 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-500/30'
              : 'border-slate-200 bg-white hover:border-indigo-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${filterSede === 'Sede Central' && filterNivel === 'Secundaria' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-100 text-slate-600'}`}>
            <GraduationCap size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">Día 2 · Programado</span>
            <h4 className="font-black text-slate-900 text-sm">Central Secundaria</h4>
            <p className="text-[11px] text-slate-500">1° a 5° Secundaria</p>
          </div>
        </button>

        {/* Ámbito 3: Sede Jerusalén */}
        <button
          type="button"
          onClick={() => { setFilterSede('Sede Jerusalén'); setFilterNivel('todos'); setFilterNgs('todos'); loadData('Sede Jerusalén', 'todos', 'todos'); }}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
            filterSede === 'Sede Jerusalén'
              ? 'border-emerald-500 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-500/30'
              : 'border-slate-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${filterSede === 'Sede Jerusalén' ? 'bg-emerald-600 text-white font-black' : 'bg-slate-100 text-slate-600'}`}>
            <Church size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Día 1 · Activo</span>
            <h4 className="font-black text-slate-900 text-sm">Sede Jerusalén</h4>
            <p className="text-[11px] text-slate-500">Elección General Anexo</p>
          </div>
        </button>

        {/* Ámbito 4: Consolidado General */}
        <button
          type="button"
          onClick={() => { setFilterSede('todos'); setFilterNivel('todos'); setFilterNgs('todos'); loadData('todos', 'todos', 'todos'); }}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
            filterSede === 'todos'
              ? 'border-blue-600 bg-blue-50/80 shadow-sm ring-2 ring-blue-500/30'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${filterSede === 'todos' ? 'bg-blue-600 text-white font-black' : 'bg-slate-100 text-slate-600'}`}>
            <Globe2 size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Backend Puente</span>
            <h4 className="font-black text-slate-900 text-sm">Consolidado General</h4>
            <p className="text-[11px] text-slate-500">Ambas sedes sumadas</p>
          </div>
        </button>
      </div>

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
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-slate-900 text-base">Detalle de Resultados Electorales</h4>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Votación individualizada con logotipos y porcentajes oficiales</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {(stats.resultados || []).length} Listas / Opciones
          </span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider border-b border-slate-100">
              <th className="p-5">Candidato / Lista</th>
              <th className="p-5">Sede y Nivel</th>
              <th className="p-5 text-right">Votos Obtenidos</th>
              <th className="p-5 text-right w-52">Porcentaje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(stats.resultados || []).map((r, i) => {
              const itemColor = getCandidateColor(r, i);
              const logoSrc = imgUrl(r.logo || r.foto);
              const isBlanco = (r.nombre || '').toLowerCase().includes('blanco');
              const isNulo = (r.nombre || '').toLowerCase().includes('nulo');
              return (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-5 font-bold text-slate-800">
                    <div className="flex items-center gap-3.5">
                      {/* Puesto / Ranking */}
                      <span 
                        className="w-7 h-7 rounded-full font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs" 
                        style={{ backgroundColor: `${itemColor}20`, color: itemColor }}
                      >
                        {i + 1}
                      </span>

                      {/* Logo / Foto del Candidato */}
                      <div 
                        className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0 border"
                        style={{ borderColor: `${itemColor}40` }}
                      >
                        {logoSrc ? (
                          <img src={logoSrc} alt={r.nombre} className="w-full h-full object-cover" />
                        ) : isBlanco ? (
                          <span className="text-sm font-black text-slate-400">⚪</span>
                        ) : isNulo ? (
                          <span className="text-sm font-black text-slate-400">✖️</span>
                        ) : (
                          <span className="text-sm font-black" style={{ color: itemColor }}>
                            {r.nombre?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>

                      {/* Nombre del Candidato / Lista */}
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{r.nombre}</div>
                        {(isBlanco || isNulo) && (
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            {isBlanco ? 'Opción cívica en blanco' : 'Voto no computable'}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-xs font-bold">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                        r.sede && r.sede.includes('Jerusal') ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {r.sede && r.sede.includes('Jerusal') ? '⛪ Sede Jerusalén' : '🏛️ Sede Central'}
                      </span>
                      {r.nivel && r.nivel !== 'General' && (
                        <span className="text-[10px] text-slate-500 font-semibold pl-1">
                          {r.nivel.toLowerCase().includes('prim') ? '🎒 Nivel Primaria' : '🎓 Nivel Secundaria'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <span className="font-black text-lg text-slate-800">{r.votos}</span>
                    <span className="text-xs text-slate-400 font-bold ml-1.5">votos</span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="font-black text-base" style={{ color: itemColor }}>
                        {r.porcentaje}%
                      </span>
                      {/* Barra de progreso visual */}
                      <div className="w-36 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, Math.max(0, r.porcentaje))}%`,
                            backgroundColor: itemColor 
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Actas Oficiales ONPE (Sufragio 4a y Escrutinio 4b) */}
      <OnpeActasModal
        isOpen={showActasModal}
        onClose={() => setShowActasModal(false)}
        defaultAmbito={
          filterSede.includes('Jerusal')
            ? 'jerusalen'
            : (filterNivel === 'Secundaria' ? 'central_secundaria' : 'central_primaria')
        }
      />
    </div>
  );
};

export default DashboardStats;
