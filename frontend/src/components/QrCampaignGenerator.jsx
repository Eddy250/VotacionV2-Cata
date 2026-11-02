import React, { useState } from 'react';
import { QrCode, Printer, Download, Copy, Check, ExternalLink, Sparkles, Smartphone, Vote, Globe, Info } from 'lucide-react';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

const BLUE = '#1B3A8C';
const GOLD = '#D97706';

const QrCampaignGenerator = () => {
  // Servidor o dominio detectado
  const detectedHost = window.location.host;
    
  const defaultBase = `${window.location.protocol}//${detectedHost}`;

  const [mode, setMode] = useState('portal'); // 'portal', 'urna', 'custom'
  const [customUrl, setCustomUrl] = useState(`${defaultBase}/portal`);
  const [copied, setCopied] = useState(false);

  // Determinar la URL final según el modo
  const getActiveUrl = () => {
    if (mode === 'portal') return `${defaultBase}/portal`;
    if (mode === 'urna') return `${defaultBase}/`;
    return customUrl;
  };

  const targetUrl = getActiveUrl();
  // Servicio estándar y confiable de generación de QR de alta resolución
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&format=png&data=${encodeURIComponent(targetUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_CATA_2026_${mode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(qrImageUrl, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full">
      {/* SECCIÓN PANTALLA ADMIN (Se oculta al imprimir afiche) */}
      <div className="print:hidden space-y-6">
        {/* Cabecera del generador */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-blue-50 text-blue-800">
                <QrCode size={14} /> Difusión y Campaña Electoral
              </span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mt-1">Generador de Códigos QR y Afiches A4</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Genera códigos QR listos para imprimir en afiches para las aulas o compartir en redes escolares.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>QR Estático Permanente: No caduca, no cambia de estado y funciona siempre</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              style={{ backgroundColor: BLUE }}
            >
              <Printer size={16} /> Imprimir Afiche A4
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Download size={16} /> Descargar QR
            </button>
          </div>
        </div>

        {/* Notificación informativa para celulares en red Wi-Fi o dominio */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Info size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold text-sm text-amber-950 mb-1">¿Cómo abren los alumnos el QR desde sus celulares?</p>
            <p>
              • <strong>En la red Wi-Fi del colegio:</strong> El QR debe apuntar a la IP de la computadora servidora (por ejemplo <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">http://192.168.18.42:8001/portal</code>).
            </p>
            <p className="mt-0.5">
              • <strong>Con dominio público de internet:</strong> Si van a subirlo a internet con un dominio (ejemplo: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">https://elecciones-cata2026.com/portal</code>), selecciona la opción <strong>"Personalizado"</strong> y escribe el enlace final para que el afiche quede con ese enlace oficial.
            </p>
          </div>
        </div>

        {/* Panel Central: Opciones + Previsualización */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Configuración del Enlace */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" /> 1. Elige el Destino del Código QR
            </h3>

            {/* Selector de Modos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMode('portal')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  mode === 'portal'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 shadow-sm'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                  <Smartphone size={18} />
                </div>
                <div className="font-bold text-xs text-gray-900">Portal Informativo</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  Campaña previa: Candidatos y propuestas
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('urna')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  mode === 'urna'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-sm'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                  <Vote size={18} />
                </div>
                <div className="font-bold text-xs text-gray-900">Urna de Votación</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  Día de la elección: Ingreso y emisión de voto
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  mode === 'custom'
                    ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-600/20 shadow-sm'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                  <Globe size={18} />
                </div>
                <div className="font-bold text-xs text-gray-900">Personalizado</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  Dominio web oficial o IP específica
                </div>
              </button>
            </div>

            {/* Campo URL en vivo */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Enlace codificado en el QR:
              </label>
              {mode === 'custom' ? (
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://tudominio.edu.pe/portal"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 px-3">
                  <span className="font-mono text-xs text-gray-800 break-all select-all flex-1">
                    {targetUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-700 transition-all cursor-pointer shrink-0"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 transition-all shrink-0"
                    title="Abrir enlace en pestaña nueva"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            {/* Instrucciones de Impresión */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
              <p className="font-bold mb-1">💡 Recomendación para el Afiche:</p>
              <p>
                Haz clic en el botón <strong>"Imprimir Afiche A4"</strong> para ver una vista previa con el formato oficial del Colegio Adventista Túpac Amaru. Puedes imprimir directamente en cualquier impresora o guardar como PDF en tu computadora.
              </p>
            </div>
          </div>

          {/* Columna Derecha: Vista Previa del Código QR */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Vista Previa Escaneable
            </span>

            <div className="p-4 bg-white border-2 border-dashed border-gray-300 rounded-3xl shadow-sm hover:border-blue-500 transition-all">
              <img
                src={qrImageUrl}
                alt="Código QR"
                className="w-56 h-56 md:w-64 md:h-64 object-contain rounded-xl"
              />
            </div>

            <div className="mt-4">
              <p className="font-black text-sm text-gray-900">
                {mode === 'portal' && '📱 Portal de Candidatos y Propuestas'}
                {mode === 'urna' && '🗳️ Urna Digital de Votación'}
                {mode === 'custom' && '🌐 Enlace Personalizado'}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs break-all">
                {targetUrl}
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer"
              >
                <Download size={14} /> Guardar Imagen
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-all cursor-pointer"
              >
                <Printer size={14} /> Imprimir Afiche
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PLANTILLA OFICIAL DE AFICHE A4 PARA IMPRESIÓN (Visible al imprimir) */}
      <div className="hidden print:block font-sans text-gray-900 p-8 max-w-2xl mx-auto border-4 border-blue-900 rounded-3xl min-h-[90vh] flex flex-col justify-between text-center bg-white">
        {/* Cabecera del Afiche */}
        <div>
          <div className="border-b-2 border-blue-900 pb-4 mb-6 flex items-center justify-center gap-4 text-left">
            <img src={logoColegioAzul} alt="Logo CATA" className="w-16 h-16 object-contain flex-shrink-0" />
            <div>
              <h3 className="text-xs font-black tracking-widest text-blue-900 uppercase">
                Colegio Adventista Túpac Amaru
              </h3>
              <h1 className="text-2xl font-black text-blue-950 mt-0.5 tracking-tight uppercase">
                Elecciones Estudiantiles CATA 2026
              </h1>
              <p className="text-xs font-semibold text-gray-600 mt-0.5">
                Comité Electoral Escolar • Sede Central y Sede Jerusalén
              </p>
            </div>
          </div>

          <div className="my-4">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase bg-blue-100 text-blue-900 border border-blue-300">
              {mode === 'urna' ? 'Votación Oficial 2026' : 'Portal Informativo Oficial'}
            </span>
            <h2 className="text-3xl font-black text-gray-900 mt-3 leading-tight">
              {mode === 'urna' ? '¡Emite tu Voto Digital Aquí!' : '¡Conoce a tus Candidatos y sus Propuestas!'}
            </h2>
            <p className="text-sm font-medium text-gray-600 mt-2 max-w-md mx-auto">
              {mode === 'urna'
                ? 'Escanea este código con tu celular para acceder a la cabina de votación digital con tu DNI.'
                : 'Escanea este código con la cámara de tu celular para revisar los planes de trabajo, juntas directivas y propuestas de cada lista electoral.'}
            </p>
          </div>
        </div>

        {/* QR Gigante Centrado */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="p-5 border-4 border-dashed border-blue-800 rounded-3xl inline-block bg-white shadow-md">
            <img
              src={qrImageUrl}
              alt="Código QR CATA"
              className="w-72 h-72 object-contain"
            />
          </div>
          <div className="mt-3 font-mono text-xs font-bold text-gray-700 bg-gray-100 px-4 py-1.5 rounded-lg border border-gray-300">
            {targetUrl}
          </div>
        </div>

        {/* Pasos Rápidos para el Estudiante */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left my-4">
          <p className="text-xs font-black text-blue-950 uppercase tracking-wider mb-2">
            Pasos para ingresar desde tu celular:
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white rounded-xl border border-blue-100">
              <span className="block font-black text-blue-800 text-sm">1</span>
              <span className="text-[11px] text-gray-700 font-medium">Abre la cámara de tu celular</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-blue-100">
              <span className="block font-black text-blue-800 text-sm">2</span>
              <span className="text-[11px] text-gray-700 font-medium">Apunta al código QR</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-blue-100">
              <span className="block font-black text-blue-800 text-sm">3</span>
              <span className="text-[11px] text-gray-700 font-medium">Toca la notificación para ingresar</span>
            </div>
          </div>
        </div>

        {/* Pie de Página */}
        <div className="border-t border-gray-300 pt-3 text-[11px] text-gray-500 font-medium">
          "Educando la mente, el corazón y la mano" • Voto Informado, Libre y Transparente • CATA 2026
        </div>
      </div>
    </div>
  );
};

export default QrCampaignGenerator;

