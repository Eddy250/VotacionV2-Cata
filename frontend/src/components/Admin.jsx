import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, UserCog, LogOut, FileSpreadsheet, ClipboardList, ShieldCheck, QrCode } from 'lucide-react';

import AdminLogin from './AdminLogin';
import ExcelImporter from './ExcelImporter';
import StudentMonitor from './StudentMonitor';
import DashboardStats from './DashboardStats';
import CandidateManager from './CandidateManager';
import QrCampaignGenerator from './QrCampaignGenerator';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

const BLUE = '#1B3A8C';

const Admin = () => {
  const [adminUser, setAdminUser] = useState(() => {
    const saved = localStorage.getItem('cata_admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    localStorage.removeItem('cata_admin_token');
    localStorage.removeItem('cata_admin_user');
    setAdminUser(null);
  };

  if (!adminUser) {
    return <AdminLogin onLoginSuccess={(user) => setAdminUser(user)} />;
  }

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden" style={{ backgroundColor: '#F3F6FD' }}>
      {/* Marca de Agua: Logo Institucional Gigante de Fondo */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden select-none">
        <img 
          src={logoColegioAzul} 
          alt="" 
          className="w-[85vw] max-w-[850px] max-h-[85vh] h-auto object-contain opacity-[0.11] filter drop-shadow select-none" 
        />
      </div>

      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 relative z-10">
        {/* Cabecera Principal del Admin: Diseño Ejecutivo Azul Institucional */}
        <div 
          className="rounded-3xl p-6 sm:p-7 mb-6 shadow-xl text-white relative overflow-hidden border border-blue-900/40 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
          style={{
            background: 'linear-gradient(135deg, #10255A 0%, #1B3A8C 50%, #2046A8 100%)'
          }}
        >
          {/* Brillos decorativos sutiles */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute right-1/3 -top-12 w-48 h-48 rounded-full bg-blue-400/10 blur-xl pointer-events-none" />

          {/* Lado izquierdo: Logo blanco nítido + Info Docente */}
          <div className="flex items-center gap-4 sm:gap-5 relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 p-2 rounded-2xl bg-white shadow-md flex items-center justify-center shrink-0 border border-white/20">
              <img src={logoColegioAzul} alt="Logo CATA" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-blue-100 border border-white/20 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <ShieldCheck size={14} className="text-emerald-300" /> Docente: {adminUser.nombre} ({adminUser.email})
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                Centro de Control Electoral
              </h1>
              <p className="text-blue-200 text-xs sm:text-sm font-medium mt-0.5">
                Colegio Adventista Túpac Amaru · Panel de Gestión y Monitoreo 2026
              </p>
            </div>
          </div>

          {/* Lado derecho: Botón de Cerrar Sesión */}
          <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto justify-end">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold text-xs bg-white/15 hover:bg-red-500 text-white border border-white/20 shadow-sm cursor-pointer"
              title="Cerrar Sesión Docente"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Barra de Módulos / Navegación */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-md mb-8">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-1 md:flex-none justify-center items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-[#1B3A8C] text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard size={17} /> Resultados
          </button>
          <button 
            onClick={() => setActiveTab('alumnos')} 
            className={`flex flex-1 md:flex-none justify-center items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'alumnos' 
                ? 'bg-[#1B3A8C] text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ClipboardList size={17} /> Padrón en Vivo
          </button>
          <button 
            onClick={() => setActiveTab('excel')} 
            className={`flex flex-1 md:flex-none justify-center items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'excel' 
                ? 'bg-[#1B3A8C] text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet size={17} /> Carga Multi-Excel
          </button>
          <button 
            onClick={() => setActiveTab('candidatos')} 
            className={`flex flex-1 md:flex-none justify-center items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'candidatos' 
                ? 'bg-[#1B3A8C] text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCog size={17} /> Candidatos
          </button>
          <button 
            onClick={() => setActiveTab('qr')} 
            className={`flex flex-1 md:flex-none justify-center items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'qr' 
                ? 'bg-[#1B3A8C] text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <QrCode size={17} /> QR Campaña
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <DashboardStats handleLogout={handleLogout} />
            </motion.div>
          )}
          {activeTab === 'alumnos' && (
            <motion.div key="alumnos" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <StudentMonitor />
            </motion.div>
          )}
          {activeTab === 'excel' && (
            <motion.div key="excel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <ExcelImporter />
            </motion.div>
          )}
          {activeTab === 'candidatos' && (
            <motion.div key="candidatos" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <CandidateManager />
            </motion.div>
          )}
          {activeTab === 'qr' && (
            <motion.div key="qr" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <QrCampaignGenerator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Admin;

