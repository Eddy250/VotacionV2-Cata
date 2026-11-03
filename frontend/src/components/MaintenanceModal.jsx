import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, X, ShieldAlert, AlertTriangle, CheckCircle2, RotateCcw, 
  Trash2, Users, ClipboardList, Lock, Building2, Church, Globe2, Loader2 
} from 'lucide-react';
import api from '../api';

const MaintenanceModal = ({ isOpen, onClose, onActionSuccess }) => {
  const [selectedSede, setSelectedSede] = useState('central'); // 'central', 'jerusalen', 'ambas'
  const [actionToConfirm, setActionToConfirm] = useState(null); // 'urna', 'candidatos', 'padron', 'total'
  const [password, setPassword] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'urna',
      title: 'Vaciar Urna (Poner votos en Cero)',
      badge: 'Reinicio de Votos',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: RotateCcw,
      iconColor: 'text-emerald-600 bg-emerald-50',
      desc: 'Elimina los votos emitidos y restablece a todos los alumnos a "Pendiente". Mantiene intactos a los candidatos y el padrón de alumnos.',
      btnText: 'Poner Urnas en Cero',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
      dangerLevel: 'Medio'
    },
    {
      id: 'candidatos',
      title: 'Vaciar Candidatos y Listas',
      badge: 'Limpiar Listas',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Users,
      iconColor: 'text-amber-600 bg-amber-50',
      desc: 'Elimina las listas de candidatos y propuestas de prueba. Conserva automáticamente la opción obligatoria de "Voto en Blanco".',
      btnText: 'Vaciar Candidatos',
      btnColor: 'bg-amber-600 hover:bg-amber-700',
      dangerLevel: 'Alto'
    },
    {
      id: 'padron',
      title: 'Vaciar Padrón Electoral',
      badge: 'Limpiar Alumnos',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: ClipboardList,
      iconColor: 'text-orange-600 bg-orange-50',
      desc: 'Elimina a todos los estudiantes de la base de datos para permitir la carga de un archivo Excel nuevo y definitivo.',
      btnText: 'Vaciar Padrón',
      btnColor: 'bg-orange-600 hover:bg-orange-700',
      dangerLevel: 'Alto'
    },
    {
      id: 'total',
      title: 'Reset Total de Fábrica (Puesta a Cero)',
      badge: 'Día D · Limpieza Completa',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      icon: Trash2,
      iconColor: 'text-red-600 bg-red-50',
      desc: 'Borra votos, padrón y candidatos de prueba a la vez. Deja el sistema completamente virgen para la elección real (conserva cuentas docentes).',
      btnText: 'Reset Total de Fábrica',
      btnColor: 'bg-red-600 hover:bg-red-700',
      dangerLevel: 'Crítico'
    }
  ];

  const handleStartConfirm = (actionId) => {
    setActionToConfirm(actionId);
    setPassword('');
    setConfirmPhrase('');
    setError(null);
  };

  const handleCancelConfirm = () => {
    setActionToConfirm(null);
    setPassword('');
    setConfirmPhrase('');
    setError(null);
  };

  const isPhraseValid = confirmPhrase.trim() === 'Eliminar';
  const canExecute = password.length > 0 && isPhraseValid && !loading;

  const handleExecute = async () => {
    if (!canExecute) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/admin/reset', {
        action: actionToConfirm,
        sede: selectedSede,
        password: password,
        confirm_phrase: confirmPhrase
      });

      setSuccessResult(res.data);
      setActionToConfirm(null);
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      console.error('Error en mantenimiento:', err);
      setError(err.response?.data?.error || 'Error al ejecutar la acción de limpieza.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAll = () => {
    setActionToConfirm(null);
    setSuccessResult(null);
    setError(null);
    onClose();
  };

  const activeActionObj = actions.find(a => a.id === actionToConfirm);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8"
      >
        {/* Cabecera del Modal */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Settings className="w-5 h-5 animate-[spin_6s_linear_infinite]" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight leading-tight flex items-center gap-2">
                Mantenimiento y Puesta a Cero Electoral
              </h3>
              <p className="text-[11px] font-semibold text-slate-400">
                Limpieza controlada para despliegue y jornada oficial 2026
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseAll}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Pantalla de Éxito */}
          {successResult ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">Operación Completada Exitosamente</h4>
                <p className="text-xs text-slate-500 mt-1">Se generó un respaldo automático antes de ejecutar el vaciado.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-slate-600">Detalles del proceso:</p>
                <ul className="text-xs text-slate-700 space-y-1">
                  {(successResult.mensajes || [successResult.message]).map((m, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={handleCloseAll}
                className="w-full py-3 rounded-xl bg-[#1B3A8C] text-white font-bold text-sm hover:bg-[#142D6E] transition-colors cursor-pointer"
              >
                Entendido y Cerrar
              </button>
            </div>
          ) : actionToConfirm ? (
            /* Pantalla de Doble Confirmación (Password + Frase) */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-red-900 uppercase">
                    Confirmación de Seguridad Requerida
                  </h4>
                  <p className="text-xs text-red-700 font-medium mt-0.5">
                    Estás a punto de ejecutar: <strong>{activeActionObj?.title}</strong> en{' '}
                    <strong>{selectedSede === 'ambas' ? 'AMBAS SEDES' : selectedSede === 'jerusalen' ? 'SEDE JERUSALÉN' : 'SEDE CENTRAL'}</strong>.
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-100 text-red-800 text-xs font-bold border border-red-200">
                  ⚠️ {error}
                </div>
              )}

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {/* Paso 1: Contraseña */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    1. Tu Contraseña Docente / Administrador:
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña de acceso actual..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-600"
                    />
                    <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>

                {/* Paso 2: Frase Eliminar exacta */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    2. Escribe la palabra <code className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-black normal-case">Eliminar</code> para confirmar:
                  </label>
                  <input
                    type="text"
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    placeholder="Eliminar"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-600"
                  />
                  {!isPhraseValid && confirmPhrase.length > 0 && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">
                      Debes escribir exactamente "Eliminar" (con la 'E' mayúscula y el resto en minúsculas).
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Se creará automáticamente un archivo de respaldo antes de vaciar.</span>
                </div>
              </div>

              {/* Botones de acción final */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={!canExecute}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    canExecute 
                      ? 'bg-red-600 hover:bg-red-700 shadow-md ring-2 ring-red-500/20' 
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Ejecutar Limpieza Definitiva
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Menú Principal de Opciones */
            <>
              {/* Selector de Sede de Aplicación */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  ¿Sobre qué sede deseas aplicar la limpieza?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSede('central')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedSede === 'central'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Building2 size={18} className={selectedSede === 'central' ? 'text-blue-600' : 'text-slate-400'} />
                    <div>
                      <p className="text-xs font-black leading-tight">Solo Central</p>
                      <p className="text-[10px] text-slate-400 font-semibold">central.db</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSede('jerusalen')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedSede === 'jerusalen'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Church size={18} className={selectedSede === 'jerusalen' ? 'text-emerald-600' : 'text-slate-400'} />
                    <div>
                      <p className="text-xs font-black leading-tight">Solo Jerusalén</p>
                      <p className="text-[10px] text-slate-400 font-semibold">jerusalen.db</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSede('ambas')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedSede === 'ambas'
                        ? 'border-red-600 bg-red-50/70 text-red-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Globe2 size={18} className={selectedSede === 'ambas' ? 'text-red-600' : 'text-slate-400'} />
                    <div>
                      <p className="text-xs font-black leading-tight">Ambas Sedes</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Consolidado</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Lista de Acciones Disponibles */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Selecciona la acción a ejecutar:
                </p>

                <div className="grid grid-cols-1 gap-2.5">
                  {actions.map((act) => {
                    const IconComponent = act.icon;
                    return (
                      <div
                        key={act.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-2.5 rounded-xl shrink-0 ${act.iconColor}`}>
                            <IconComponent size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black text-slate-900">{act.title}</h4>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${act.badgeColor}`}>
                                {act.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                              {act.desc}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartConfirm(act.id)}
                          className={`px-4 py-2 rounded-xl text-white font-bold text-xs shrink-0 transition-colors cursor-pointer shadow-xs ${act.btnColor}`}
                        >
                          {act.btnText}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Advertencia Informativa de Respaldo */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center gap-2.5 text-xs text-blue-900">
                <ShieldAlert size={18} className="text-blue-700 shrink-0" />
                <p className="text-[11px] font-semibold">
                  <strong>Protección activa:</strong> El sistema conservará tus credenciales docentes intactas y creará un archivo de respaldo fechado antes de proceder.
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenanceModal;

