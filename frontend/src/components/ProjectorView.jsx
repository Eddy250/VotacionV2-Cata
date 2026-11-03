import React, { useState, useEffect, useRef } from 'react';
import api, { getAssetUrl } from '../api';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend
} from 'chart.js';
import { Trophy, Users, Vote, Minimize2, Scale, CheckCircle2, School, Building2, Church } from 'lucide-react';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const NAVY = '#1B3A8C';
const PALETTE = ['#1B3A8C', '#B91C1C', '#B45309', '#047857', '#6D28D9', '#C2410C', '#0E7490', '#BE185D'];

const colorFor = (c, i) => {
  if (c?.color) return c.color;
  if (/blanco|nulo/i.test(c?.nombre || '')) return '#94A3B8';
  return PALETTE[i % PALETTE.length];
};

const imgUrl = (path) => {
  if (!path) return null;
  const p = /^\/?static\//i.test(path) || /^https?:/i.test(path) ? path : `static/${path.replace(/^\/+/, '')}`;
  return getAssetUrl(p);
};

const lighten = (hex, amt = 0.22) => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  const r = Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amt);
  const g = Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amt);
  const b = Math.round((n & 255) + (255 - (n & 255)) * amt);
  return `rgb(${r}, ${g}, ${b})`;
};

// Avatar circular con foto/logo o inicial
const Avatar = ({ item, size = 64, ring = true }) => {
  const src = imgUrl(item.logo || item.foto);
  return (
    <div
      className="rounded-full overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center shadow-sm"
      style={{
        width: size, height: size,
        border: ring ? `3px solid ${item._color}` : 'none'
      }}
    >
      {src ? (
        <img src={src} alt={item.nombre} className="w-full h-full object-cover" />
      ) : (
        <span className="font-black" style={{ color: item._color, fontSize: size * 0.42 }}>
          {item.nombre.charAt(0)}
        </span>
      )}
    </div>
  );
};

// Plugin: número de votos sobre cada barra (GRANDE Y CLARO PARA PANTALLA GIGANTE)
const barValuePlugin = {
  id: 'barValues',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      const val = chart.data.datasets[0].data[i];
      ctx.save();
      ctx.font = '900 28px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.fillText(val, bar.x, bar.y - 12);
      ctx.restore();
    });
  }
};

// Plugin: etiquetas flotantes de porcentaje en los segmentos de la dona
const donutPillsPlugin = {
  id: 'donutPills',
  afterDatasetsDraw(chart) {
    const opts = chart.options.plugins.donutPills;
    if (!opts || !opts.enabled) return;
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    meta.data.forEach((arc, i) => {
      const pct = opts.percents[i];
      if (pct === undefined || pct < 4) return;
      const { x, y } = arc.getCenterPoint();
      const text = `${pct}%`;
      ctx.save();
      ctx.font = '900 17px Inter, system-ui, sans-serif';
      const w = ctx.measureText(text).width + 24;
      const h = 32;
      ctx.shadowColor = 'rgba(15,23,42,0.18)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 9);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 1);
      ctx.restore();
    });
  }
};

// Componente: Medidor circular de "% de Avance" (tamaño ajustado a la marca, compacto y limpio)
const ParticipationGauge = ({ pct, total, votaron, pendientes }) => {
  const radius = 86;
  const stroke = 18;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(pct, 100) / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 shrink-0 flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">% de Avance</h4>
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Asistencia Oficial
        </span>
      </div>

      {/* Dona circular con porcentaje central */}
      <div className="relative flex items-center justify-center my-1.5">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          <circle
            stroke="#E2E8F0"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="#047857"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Porcentaje en el centro exacto */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl font-black text-slate-900 tracking-tight tabular-nums leading-none">
            {pct}%
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            Participación
          </span>
        </div>
      </div>

      {/* Datos numéricos del padrón */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center shrink-0">
        <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-100">
          <p className="text-[10px] font-bold uppercase text-slate-400">Padrón</p>
          <p className="text-sm font-black text-slate-800 tabular-nums">{total}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-1.5 border border-emerald-100">
          <p className="text-[10px] font-bold uppercase text-emerald-600">Votaron</p>
          <p className="text-sm font-black text-emerald-700 tabular-nums">{votaron}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-1.5 border border-amber-100">
          <p className="text-[10px] font-bold uppercase text-amber-600">Faltan</p>
          <p className="text-sm font-black text-amber-700 tabular-nums">{pendientes}</p>
        </div>
      </div>
    </div>
  );
};

const ProjectorView = ({ sede = 'todos', ngs = 'todos', onClose }) => {
  const [selectedSede, setSelectedSede] = useState(() => {
    if (sede && sede !== 'todos') {
      return /jeru/i.test(sede) ? 'jerusalen' : 'central';
    }
    // Si corre en puerto 8002 (servidor Jerusalén)
    if (typeof window !== 'undefined' && window.location.port === '8002') {
      return 'jerusalen';
    }
    // Si corre en puerto 8001 (servidor Central)
    if (typeof window !== 'undefined' && window.location.port === '8001') {
      return 'central';
    }
    return sede === 'todos' ? 'todos' : 'central';
  });

  const [stats, setStats] = useState(null);
  const [now, setNow] = useState(new Date());
  const rootRef = useRef(null);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSede !== 'todos') params.append('sede', selectedSede);
      if (ngs !== 'todos') params.append('ngs', ngs);
      const res = await api.get(`/admin/stats?${params.toString()}`);
      setStats(res.data);
    } catch (err) {
      console.error('Error cargando modo proyector', err);
    }
  };

  useEffect(() => {
    load();
    const dataTimer = setInterval(load, 2000);
    return () => clearInterval(dataTimer);
  }, [selectedSede, ngs]);

  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
    const onFsChange = () => { if (!document.fullscreenElement) onClose(); };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleClose = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => onClose());
    else onClose();
  };

  if (!stats) {
    return (
      <div ref={rootRef} className="fixed inset-0 z-[100] bg-slate-50 flex items-center justify-center">
        <p className="text-2xl font-bold text-slate-400 animate-pulse">Cargando resultados oficiales...</p>
      </div>
    );
  }

  const isJeru = selectedSede === 'jerusalen';
  const isCentral = selectedSede === 'central';
  const isTodos = selectedSede === 'todos';
  const multiSede = isTodos;

  const sedeBadgeText = isJeru
    ? 'Colegio Adventista Tupac Amaru- JERUSALEN'
    : isCentral
      ? 'Colegio Adventista Tupac Amaru- CENTRAL'
      : 'Colegio Adventista Tupac Amaru- GENERAL';

  const sedeSubtitle = isJeru
    ? 'Sede Jerusalén'
    : isCentral
      ? 'Sede Central'
      : 'Consolidado General (Ambas Sedes)';
  const resultados = (stats.resultados || []).map((r, i) => ({ ...r, _color: colorFor(r, i) }));
  const listas = resultados.filter(r => !/blanco|nulo/i.test(r.nombre));
  const hayVotos = (stats.votos_emitidos || 0) > 0;

  // Líderes (manejo de empate técnico limpio y con ambos logos)
  const topVotos = listas.length ? listas[0].votos : 0;
  const lideres = hayVotos && topVotos > 0 ? listas.filter(l => l.votos === topVotos) : [];
  const empate = lideres.length > 1;
  const lider = lideres[0];
  const segundo = !empate ? listas.find(l => l.votos < topVotos) : null;
  const ventaja = lider && segundo ? lider.votos - segundo.votos : 0;

  // Etiquetas multilínea para que el texto de cada candidato en el eje X sea grande y legible
  const barLabels = resultados.map(r => multiSede ? [r.nombre, `(${r.sede?.includes('Jerusal') ? 'Jerusalén' : 'Central'})`] : r.nombre);
  const singleLabels = resultados.map(r => multiSede ? `${r.nombre} (${r.sede?.includes('Jerusal') ? 'Jerusalén' : 'Central'})` : r.nombre);
  const values = resultados.map(r => r.votos);
  const colors = resultados.map(r => r._color);

  // ===== Gráfico de barras (CENTRAL Y AMPLIO) =====
  const barData = {
    labels: barLabels,
    datasets: [{
      data: values,
      backgroundColor: (ctx) => {
        const { chart, dataIndex } = ctx;
        const base = colors[dataIndex] || NAVY;
        const area = chart.chartArea;
        if (!area) return base;
        const g = chart.ctx.createLinearGradient(0, area.bottom, 0, area.top);
        g.addColorStop(0, base);
        g.addColorStop(1, lighten(base, 0.20));
        return g;
      },
      borderRadius: { topLeft: 10, topRight: 10 },
      borderSkipped: 'bottom',
      maxBarThickness: 130,
    }]
  };

  const maxVal = Math.max(1, ...values);
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    layout: { padding: { top: 40, bottom: 10 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13, weight: 'bold' },
        padding: 12,
        cornerRadius: 10
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: maxVal <= 2 ? maxVal + 1 : Math.ceil(maxVal * 1.15),
        ticks: {
          stepSize: maxVal <= 5 ? 1 : undefined,
          precision: 0,
          font: { size: 16, weight: '800' },
          color: '#64748B'
        },
        grid: { color: '#E2E8F0' },
        border: { display: false }
      },
      x: {
        ticks: {
          font: { size: 16, weight: '800' },
          color: '#0F172A',
          padding: 8
        },
        grid: { display: false }
      }
    }
  };

  // ===== Dona con segmentos separados y etiquetas en cada porción =====
  const doughnutData = {
    labels: singleLabels,
    datasets: [{
      data: hayVotos ? values : [1],
      backgroundColor: hayVotos ? colors : ['#E2E8F0'],
      borderWidth: 0,
      spacing: hayVotos ? 6 : 0,
      borderRadius: hayVotos ? 8 : 0,
      hoverOffset: 0,
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '52%',
    animation: { duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      donutPills: {
        enabled: hayVotos,
        percents: resultados.map(r => Math.round(Number(r.porcentaje || 0)))
      }
    }
  };

  const fecha = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const pct = Number(stats.porcentaje_participacion || 0);
  const totalAlumnos = stats.total_alumnos || 0;
  const votosEmitidos = stats.votos_emitidos || 0;
  const faltantes = Math.max(0, totalAlumnos - votosEmitidos);

  return (
    <div ref={rootRef} className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* ===== CABECERA INSTITUCIONAL ===== */}
      <header className="flex items-center justify-between px-8 py-3 text-white shadow-md shrink-0" style={{ backgroundColor: NAVY }}>
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl p-1.5 shadow-xs">
            <img src={logoColegioAzul} alt="CATA" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Colegio Adventista Túpac Amaru · Juliaca</p>
            <h1 className="text-2xl font-black tracking-tight leading-none mt-1">Elecciones Escolares 2026 — Resultados en Vivo</h1>
            <p className="text-xs text-blue-100 font-semibold mt-1">
              {sedeSubtitle}
              {ngs !== 'todos' ? ` · Salón: ${ngs}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums tracking-tight">{hora}</p>
            <p className="text-xs text-blue-200 font-semibold capitalize">{fecha}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wider">EN VIVO</span>
          </div>
          <button
            onClick={handleClose}
            title="Salir del modo proyector (Esc)"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ===== FRANJA SUPERIOR: LÍDER O EMPATE TÉCNICO (AMPLIADO Y CENTRADO) ===== */}
      <section className="mx-6 mt-4 rounded-2xl border border-blue-200 shadow-sm px-8 py-4 flex items-center justify-between gap-6 shrink-0" style={{ backgroundColor: '#E8F0FC' }}>
        <div className="flex items-center gap-6 min-w-0">
          <div className="shrink-0">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border shadow-xs"
              style={{
                backgroundColor: empate ? '#FEF3C7' : '#FFFFFF',
                color: empate ? '#92400E' : NAVY,
                borderColor: empate ? '#FCD34D' : '#BFD2F5'
              }}
            >
              {empate ? <Scale className="w-4 h-4 text-amber-600" /> : <Trophy className="w-4 h-4 text-amber-500" />}
              {empate ? 'EMPATE TÉCNICO' : 'PRIMER LUGAR'}
            </span>
            <p className="text-4xl font-black text-slate-900 mt-2 leading-none tabular-nums">
              {hayVotos && lider ? `${lider.porcentaje}%` : '—'}
            </p>
            <p className="text-xs font-bold text-slate-500 mt-1">
              {!hayVotos || !lider
                ? 'Esperando el inicio del escrutinio...'
                : empate
                  ? `${lideres.length} listas con ${lider.votos} votos cada una`
                  : segundo
                    ? `Ventaja de ${ventaja} ${ventaja === 1 ? 'voto' : 'votos'}`
                    : `${lider.votos} votos acumulados`}
            </p>
          </div>

          {/* Candidatos en Primer Lugar (o Empatados lado a lado con ambos logos) */}
          {hayVotos && lider && (
            <div className="flex items-center gap-8 min-w-0 flex-wrap">
              {lideres.map((l, idx) => (
                <React.Fragment key={`lead-${l.id}-${l.sede}-${idx}`}>
                  {idx > 0 && (
                    <span className="text-3xl font-black text-slate-400">=</span>
                  )}
                  <div className="flex items-center gap-4 min-w-0 bg-white/60 p-2.5 pr-5 rounded-2xl border border-blue-100">
                    <Avatar item={l} size={76} />
                    <div className="min-w-0">
                      <p className="text-lg font-black text-slate-900 leading-tight truncate max-w-[17rem]">{l.nombre}</p>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-3xl font-black tabular-nums leading-none" style={{ color: l._color }}>
                          {l.votos}
                        </span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          votos · {l.porcentaje}%
                        </span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Tarjeta institucional lateral en cabecera: Identificación Oficial de Sede */}
        <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-white/85 rounded-xl border border-blue-200 shrink-0 text-right shadow-xs">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-800">
              {sedeBadgeText}
            </p>
            <p className="text-[11px] font-bold text-slate-500 mt-0.5">
              Recuento Automático Oficial · En Vivo
            </p>
            {/* Selector rápido para alternar sedes */}
            <div className="flex items-center justify-end gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setSelectedSede('central')}
                title="Proyectar Sede Central"
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                  isCentral
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Central
              </button>
              <button
                type="button"
                onClick={() => setSelectedSede('jerusalen')}
                title="Proyectar Sede Jerusalén"
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                  isJeru
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Jerusalén
              </button>
              <button
                type="button"
                onClick={() => setSelectedSede('todos')}
                title="Proyectar Consolidado General (Ambas Sedes)"
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                  isTodos
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                General
              </button>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 shrink-0">
            {isJeru ? (
              <Church className="w-6 h-6 text-emerald-700" />
            ) : isTodos ? (
              <School className="w-6 h-6 text-slate-700" />
            ) : (
              <Building2 className="w-6 h-6 text-blue-800" />
            )}
          </div>
        </div>
      </section>

      {/* ===== CUERPO PRINCIPAL: 3 COLUMNAS PERFECTAMENTE EQUILIBRADAS ===== */}
      <main className="flex-1 grid grid-cols-12 gap-5 px-6 py-4 min-h-0">
        {/* COLUMNA IZQUIERDA (col-span-3): Resultados Acumulados + % de Avance ajustado al tamaño de la marca */}
        <section className="col-span-3 flex flex-col gap-4 min-h-0">
          {/* Resultados Acumulados (ocupa la parte superior hasta la marca roja de % de avance) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 shrink-0">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Resultados Acumulados
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                Posición
              </span>
            </div>
            <div className="flex-1 min-h-0 flex flex-col justify-around gap-2 overflow-y-auto pr-1">
              {resultados.map((r, i) => (
                <div key={`rank-${r.id}-${r.sede}-${i}`} className="rounded-xl bg-slate-50/90 border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar item={r} size={30} ring={false} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate leading-tight">{singleLabels[i]}</p>
                    </div>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md text-white shrink-0" style={{ backgroundColor: r._color }}>
                      #{i + 1}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(Number(r.porcentaje || 0), 100)}%`, backgroundColor: r._color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[11px] font-bold">
                    <span className="text-slate-500 tabular-nums">{r.votos} votos</span>
                    <span className="tabular-nums" style={{ color: r._color }}>{r.porcentaje}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* % de Avance (bájado hasta donde se marcó con rojo, con su tamaño justo y sin vacíos) */}
          <ParticipationGauge
            pct={pct}
            total={totalAlumnos}
            votaron={votosEmitidos}
            pendientes={faltantes}
          />
        </section>

        {/* COLUMNA CENTRAL (col-span-6): GRÁFICO DE BARRAS AMPLIO CON TEXTOS GRANDES */}
        <section className="col-span-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-800">
                <Vote className="w-6 h-6" style={{ color: NAVY }} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Votos por Lista Electoral</h3>
                <p className="text-xs font-bold text-slate-400">Conteo proporcional y auditoría en tiempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Actualización en vivo</span>
            </div>
          </div>

          {/* Área principal del gráfico de barras maximizado */}
          <div className="flex-1 min-h-0 w-full pt-2">
            <Bar data={barData} options={barOptions} plugins={[barValuePlugin]} />
          </div>
        </section>

        {/* COLUMNA DERECHA (col-span-3): Distribución Porcentual en Dona Agrandada + Resumen */}
        <section className="col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between min-h-0">
          {/* Cabecera de la columna */}
          <div className="border-b border-slate-100 pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Distribución de Votos</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
                Oficial
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 tabular-nums leading-none">
                {stats.votos_emitidos}
              </span>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                votos emitidos
              </span>
            </div>
          </div>

          {/* Dona con etiquetas flotantes de porcentaje - AGRANDADA Y EN EL MEDIO (ENTRE LAS MARCAS) */}
          <div className="relative flex-1 min-h-[250px] max-h-[320px] my-auto flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} plugins={[donutPillsPlugin]} />
          </div>

          {/* Desglose de votos por lista - BAJADO HACIA LA LÍNEA ROJA INFERIOR */}
          <div className="flex flex-col gap-1.5 shrink-0 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto pr-1">
            {resultados.map((r, i) => (
              <div key={`leg-${r.id}-${r.sede}-${i}`} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-3.5 h-5 rounded-md shrink-0 shadow-xs" style={{ backgroundColor: r._color }} />
                  <span className="text-xs font-extrabold text-slate-800 truncate max-w-[10rem]">{singleLabels[i]}</span>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-sm font-black text-slate-900 tabular-nums">{r.votos}</span>
                  <span className="text-[11px] font-bold text-slate-400 ml-1.5">({r.porcentaje}%)</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bloque resumen de votos válidos vs blanco en el pie inferior */}
          <div className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-100 shrink-0 text-xs text-slate-600 mt-1">
            <div className="flex justify-between items-center font-bold">
              <span className="text-slate-500">Votos a Listas:</span>
              <span className="text-slate-900 font-extrabold tabular-nums">
                {listas.reduce((acc, curr) => acc + (curr.votos || 0), 0)} votos
              </span>
            </div>
            <div className="flex justify-between items-center font-bold mt-1">
              <span className="text-slate-500">Votos en Blanco:</span>
              <span className="text-slate-600 font-extrabold tabular-nums">
                {resultados.filter(r => /blanco|nulo/i.test(r.nombre)).reduce((acc, curr) => acc + (curr.votos || 0), 0)} votos
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProjectorView;
