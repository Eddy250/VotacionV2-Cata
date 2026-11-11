import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import html2pdf from 'html2pdf.js';
import { 
  X, Printer, Download, RefreshCw, Building2, Church, GraduationCap, 
  FileCheck, Edit3, CheckCircle2, ShieldCheck 
} from 'lucide-react';
import api, { getAssetUrl } from '../api';
import Barcode128 from './Barcode128';
import logoColegioAzul from '../assets/logo-colegio-azul.png';

// Conversor pedagógico oficial de números a letras en español
export const numeroALetras = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '';
  let n = Math.floor(Math.abs(num));
  if (n === 0) return 'CERO';
  if (n === 100) return 'CIEN';
  if (n === 1000) return 'MIL';

  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const diecis = { 11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE', 16: 'DIECISÉIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE' };
  const veintis = { 21: 'VEINTIUNO', 22: 'VEINTIDÓS', 23: 'VEINTITRÉS', 24: 'VEINTICUATRO', 25: 'VEINTICINCO', 26: 'VEINTISÉIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE' };
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  let res = '';
  if (n >= 1000) {
    res += n < 2000 ? 'MIL ' : unidades[Math.floor(n / 1000)] + ' MIL ';
    n %= 1000;
  }
  if (n >= 100) {
    if (n === 100) {
      res += 'CIEN ';
      n = 0;
    } else {
      res += centenas[Math.floor(n / 100)] + ' ';
      n %= 100;
    }
  }
  if (n > 0) {
    if (diecis[n]) {
      res += diecis[n];
    } else if (veintis[n]) {
      res += veintis[n];
    } else {
      const d = Math.floor(n / 10);
      const u = n % 10;
      if (d > 0 && u > 0) {
        res += decenas[d] + ' Y ' + unidades[u];
      } else if (d > 0) {
        res += decenas[d];
      } else {
        res += unidades[u];
      }
    }
  }
  return res.trim();
};

const OnpeActasModal = ({ isOpen, onClose, defaultAmbito = 'central_primaria' }) => {
  const [ambito, setAmbito] = useState(defaultAmbito);
  const [vistaActa, setVistaActa] = useState('ambas'); // 'ambas', 'sufragio', 'escrutinio'
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  const [customEstudiantes, setCustomEstudiantes] = useState({});
  const [customDni, setCustomDni] = useState({});
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Aislamiento total de impresión: ocultar el resto de la web cuando el modal está activo
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('actas-modal-open');
    } else {
      document.body.classList.remove('actas-modal-open');
    }
    return () => {
      document.body.classList.remove('actas-modal-open');
    };
  }, [isOpen]);

  const loadActaData = async (targetAmbito = ambito) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/acta?ambito=${targetAmbito}`);
      if (res.data?.success) {
        setData(res.data);
        // Inicializar comités editables
        const initEst = {};
        const initDni = {};
        (res.data.comite_estudiantil || []).forEach((c, idx) => {
          initEst[idx] = c.nombre || '';
          initDni[idx] = c.dni || '';
        });
        setCustomEstudiantes(initEst);
        setCustomDni(initDni);
      }
    } catch (err) {
      console.error("Error al cargar datos del acta", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadActaData(ambito);
    }
  }, [isOpen, ambito]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('onpe-actas-document-printable');
    if (!element) return;

    setDownloadingPdf(true);
    setIsExportingPdf(true);

    try {
      // Dar un tick al render para que cambie a modo estático de texto
      await new Promise((resolve) => setTimeout(resolve, 150));

      const filename = `Acta_Oficial_ONPE_${ambito}_${vistaActa}_CATA2026.pdf`;
      const opt = {
        margin: [6, 6, 6, 6],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          scrollY: 0,
          windowWidth: 800
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Error al generar PDF directo:", err);
      window.print();
    } finally {
      setIsExportingPdf(false);
      setDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  const cifras = data?.cifras || {
    electores_habiles: 0,
    ciudadanos_votaron: 0,
    cedulas_no_utilizadas: 0,
    votos_blanco: 0,
    votos_nulo: 0,
    votos_impugnados: 0,
    total_votos_emitidos: 0
  };

  const mesaCodigo = data?.ambito?.mesa || '030390';
  const listas = data?.listas || [];
  const comiteDocente = data?.comite_docente || [];
  const comiteEstudiantil = data?.comite_estudiantil || [];

  const numListas = listas.length;
  // Compactación proporcional para garantizar que entre 1 y hasta 8 candidatos quepan en 1 sola hoja A4
  const isCompact = numListas >= 4;
  const isUltraCompact = numListas >= 6;

  // Clases dinámicas para tabla de candidatos y símbolos
  const tableCellPadding = isUltraCompact ? "py-1 px-1.5 text-[10px]" : (isCompact ? "py-1.5 px-2 text-[11px]" : "py-2 px-3 text-xs");
  const logoContainerHeight = isUltraCompact ? "h-11 sm:h-12" : (isCompact ? "h-14 sm:h-16" : "h-18 sm:h-20");
  const logoMaxDimensions = isUltraCompact ? "max-h-11 max-w-[100px]" : (isCompact ? "max-h-14 max-w-[125px]" : "max-h-18 max-w-[150px]");
  const signatureHeight = isUltraCompact ? "h-14" : (isCompact ? "h-16" : "h-20");
  const signatureLineHeight = isUltraCompact ? "h-6" : (isCompact ? "h-7" : "h-9");

  return createPortal(
    <div id="onpe-actas-portal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* Contenedor Modal */}
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
        
        {/* BARRA SUPERIOR DE CONTROL (NO SE IMPRIME) */}
        <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
              <FileCheck size={22} />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                Actas Oficiales de Sufragio y Escrutinio
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Formato Reglamentario ONPE / MINEDU · Colegio Adventista Túpac Amaru 2026
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* BOTÓN 1: DESCARGA DIRECTA DE ARCHIVO PDF OFICIAL */}
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Descargar archivo PDF tal cual a la vista previa oficial"
            >
              {downloadingPdf ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            {/* BOTÓN 2: DIÁLOGO DE IMPRESIÓN OFICIAL */}
            <button
              onClick={handlePrint}
              disabled={downloadingPdf || loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-md transition-all cursor-pointer"
              title="Abrir ventana de impresión directa"
            >
              <Printer size={16} /> Imprimir
            </button>

            {/* BOTÓN CERRAR */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SELECTORES DE ÁMBITO Y MODO (NO SE IMPRIME) */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden no-print">
          {/* Selector de Ámbito / Jornada */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Ámbito:</span>
            <button
              onClick={() => setAmbito('central_primaria')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                ambito === 'central_primaria'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Building2 size={14} /> 🎒 Primaria Central (Día 1)
            </button>
            <button
              onClick={() => setAmbito('jerusalen')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                ambito === 'jerusalen'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Church size={14} /> ⛪ Sede Jerusalén (Día 1)
            </button>
            <button
              onClick={() => setAmbito('central_secundaria')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                ambito === 'central_secundaria'
                  ? 'bg-indigo-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <GraduationCap size={14} /> 🎓 Secundaria Central (Día 2)
            </button>
          </div>

          {/* Selector de Vista: Ambas vs Sufragio vs Escrutinio */}
          <div className="flex items-center bg-white border border-slate-300 rounded-xl p-1 text-xs font-bold shadow-xs">
            <button
              onClick={() => setVistaActa('ambas')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                vistaActa === 'ambas' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ambas Actas (4a y 4b)
            </button>
            <button
              onClick={() => setVistaActa('sufragio')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                vistaActa === 'sufragio' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Solo Sufragio (4a)
            </button>
            <button
              onClick={() => setVistaActa('escrutinio')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                vistaActa === 'escrutinio' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Solo Escrutinio (4b)
            </button>
          </div>
        </div>

        {/* AVISO PEDAGÓGICO DE EDICIÓN EN PANTALLA */}
        <div className="bg-blue-50/70 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-[11px] text-blue-900 print:hidden no-print">
          <div className="flex items-center gap-2">
            <Edit3 size={14} className="text-blue-600" />
            <span>
              <strong>Campos editables en pantalla:</strong> Puedes hacer click sobre los nombres y DNIs del Comité Estudiantil u observaciones para personalizarlos antes de imprimir o descargar en PDF.
            </span>
          </div>
          <span className="text-[10px] text-blue-600 font-semibold hidden md:inline">
            Formato A4 Estricto (1 Acta por Hoja)
          </span>
        </div>

        {/* ÁREA DE DOCUMENTO IMPRESO (ESTILO OFICIAL ONPE) */}
        <div 
          id="onpe-actas-document-printable"
          className="p-3 sm:p-6 overflow-y-auto max-h-[75vh] print:max-h-none print:p-0 print:overflow-visible bg-slate-100 print:bg-white space-y-6 print:space-y-0"
        >
          {loading ? (
            <div className="p-16 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
              <RefreshCw className="animate-spin text-blue-600" size={32} />
              <span>Calculando cifras electorales oficiales...</span>
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* HOJA 1: ACTA DE SUFRAGIO (SECCIÓN B - 4a)                */}
              {/* ======================================================== */}
              {(vistaActa === 'ambas' || vistaActa === 'sufragio') && (
                <div className={`acta-page bg-white border-2 border-black p-5 sm:p-6 max-w-[780px] mx-auto shadow-md print:shadow-none print:border-2 print:border-black print:p-6 print:m-0 print:w-full ${
                  vistaActa === 'ambas' ? 'print:page-break-after-always html2pdf__page-break' : ''
                }`}>
                  
                  {/* Encabezado ONPE */}
                  <div className="flex items-start justify-between border-b-2 border-black pb-2.5">
                    <div className="flex items-center gap-3">
                      <img src={logoColegioAzul} alt="CATA" className="w-12 h-12 object-contain" />
                      <div>
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 block">
                          SISTEMA ELECTORAL ESTUDIANTIL CATA 2026
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-black uppercase leading-tight">
                          ACTA ELECTORAL
                        </h2>
                        <p className="text-[11px] font-bold text-black uppercase">
                          {data?.ambito?.subtitulo}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="text-right">
                        <span className="text-3xl font-black text-black leading-none">4a</span>
                        <div className="text-[8.5px] font-black uppercase text-slate-500">FORMATO OFICIAL</div>
                      </div>
                      <div className="mt-1">
                        <Barcode128 value={mesaCodigo} height={22} unitWidth={1.1} showText={true} />
                      </div>
                    </div>
                  </div>

                  {/* Datos de Mesa */}
                  <div className="grid grid-cols-4 gap-2 border-b-2 border-black py-1.5 text-xs font-black uppercase">
                    <div>
                      <span className="text-[8.5px] text-slate-500 block leading-tight">MESA DE SUFRAGIO</span>
                      <span className="text-black font-extrabold">{mesaCodigo}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 block leading-tight">DEPARTAMENTO</span>
                      <span className="text-black font-extrabold">PUNO</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 block leading-tight">PROVINCIA / DISTRITO</span>
                      <span className="text-black font-extrabold">SAN ROMÁN / JULIACA</span>
                    </div>
                    <div className="bg-slate-100 border border-black p-1 text-center rounded-xs">
                      <span className="text-[8px] text-slate-600 block leading-none">TOTAL ELECTORES HÁBILES</span>
                      <span className="text-sm sm:text-base font-black text-black leading-tight">
                        {cifras.electores_habiles}
                      </span>
                    </div>
                  </div>

                  {/* TÍTULO SECCIÓN B */}
                  <div className="my-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 bg-black text-white px-2.5 py-0.5 font-black text-xs uppercase">
                      <span>B</span>
                      <span>ACTA DE SUFRAGIO</span>
                    </div>
                    <span className="text-[9.5px] font-semibold text-slate-600">
                      Instalación y Sufragio conforme a normativa electoral escolar CATA
                    </span>
                  </div>

                  {/* CIFRAS OFICIALES DE SUFRAGIO */}
                  <div className="space-y-2.5 my-2">
                    {/* TOTAL CIUDADANOS QUE VOTARON */}
                    <div className="border border-black p-2.5 bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-xs font-black uppercase text-black block">
                            TOTAL DE CIUDADANOS QUE VOTARON
                          </span>
                          <span className="text-[9px] text-slate-500 font-semibold block">
                            Número total de firmas y huellas asentadas en el Padrón Electoral
                          </span>
                        </div>
                        <div className="w-24 sm:w-28 border-2 border-black p-1.5 text-center text-lg sm:text-xl font-black bg-slate-100 text-black">
                          {cifras.ciudadanos_votaron}
                        </div>
                      </div>
                      <div className="border-t border-dotted border-black pt-1">
                        <span className="text-[9.5px] text-slate-500 uppercase font-bold mr-2">En letras:</span>
                        <span className="text-xs font-black text-black uppercase tracking-wider">
                          {numeroALetras(cifras.ciudadanos_votaron)}
                        </span>
                      </div>
                    </div>

                    {/* TOTAL CÉDULAS NO UTILIZADAS */}
                    <div className="border border-black p-2.5 bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-xs font-black uppercase text-black block">
                            TOTAL DE CÉDULAS NO UTILIZADAS
                          </span>
                          <span className="text-[9px] text-slate-500 font-semibold block">
                            Electores que no sufragaron (Inasistencias)
                          </span>
                        </div>
                        <div className="w-24 sm:w-28 border-2 border-dashed border-black p-1.5 text-center text-lg sm:text-xl font-black bg-white text-black">
                          {cifras.cedulas_no_utilizadas}
                        </div>
                      </div>
                      <div className="border-t border-dotted border-black pt-1">
                        <span className="text-[9.5px] text-slate-500 uppercase font-bold mr-2">En letras:</span>
                        <span className="text-xs font-black text-black uppercase tracking-wider">
                          {numeroALetras(cifras.cedulas_no_utilizadas)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="border border-black p-2 my-2">
                    <span className="text-[9px] font-black uppercase text-black block mb-0.5">
                      OBSERVACIONES DEL SUFRAGIO:
                    </span>
                    {!isExportingPdf ? (
                      <input
                        type="text"
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value)}
                        placeholder="Sin observaciones. Proceso electoral llevado a cabo con normalidad."
                        className="w-full text-[11px] font-medium text-black outline-none border-b border-dotted border-slate-300 py-0.5 bg-blue-50/20 focus:bg-white print:hidden"
                      />
                    ) : null}
                    <div className={`${!isExportingPdf ? 'hidden print:block' : 'block'} text-[11px] font-medium text-black py-0.5`}>
                      {observaciones || 'Sin observaciones. Proceso electoral llevado a cabo con normalidad.'}
                    </div>
                    <div className="mt-1 text-[9.5px] font-semibold text-slate-600">
                      Siendo las <strong>02:00 p. m.</strong> del <strong>{data?.fecha_texto}</strong>, finalizó formalmente el acto de sufragio.
                    </div>
                  </div>

                  {/* FIRMAS 1: MIEMBROS DE MESA (ESTUDIANTES) */}
                  <div className="border-t-2 border-black pt-2 mb-2">
                    <h4 className="text-[10px] font-black uppercase text-black mb-1.5 text-center">
                      FIRMA, NOMBRES, APELLIDOS Y DNI DE MIEMBROS DE MESA (COMITÉ ESTUDIANTIL)
                    </h4>
                    <div className={`grid gap-2 ${comiteEstudiantil.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : (comiteEstudiantil.length === 2 ? 'grid-cols-2 max-w-md mx-auto' : 'grid-cols-3')}`}>
                      {comiteEstudiantil.map((m, idx) => {
                        const estNombre = customEstudiantes[idx] !== undefined ? customEstudiantes[idx] : m.nombre;
                        const estDni = customDni[idx] !== undefined ? customDni[idx] : '';
                        return (
                          <div key={idx} className="border border-black p-1.5 flex flex-col justify-between h-20 bg-white">
                            <div className="h-8 border-b border-dotted border-black"></div>
                            <div className="text-[8.5px] font-bold text-center">
                              <span className="block font-black uppercase text-[7.5px] text-slate-500 leading-tight">{m.cargo}</span>
                              {!isExportingPdf ? (
                                <>
                                  <input
                                    type="text"
                                    value={estNombre}
                                    onChange={e => setCustomEstudiantes({ ...customEstudiantes, [idx]: e.target.value })}
                                    placeholder="Nombre del Alumno"
                                    className="w-full text-center font-bold text-[8.5px] uppercase outline-none border-b border-dotted border-slate-300 focus:border-blue-500 bg-blue-50/20 focus:bg-white rounded-xs print:hidden"
                                  />
                                  <input
                                    type="text"
                                    value={estDni}
                                    onChange={e => setCustomDni({ ...customDni, [idx]: e.target.value })}
                                    placeholder="DNI: ___________"
                                    className="w-full text-center text-[7.5px] text-slate-600 outline-none bg-blue-50/20 focus:bg-white rounded-xs print:hidden"
                                  />
                                </>
                              ) : null}
                              <div className={`${!isExportingPdf ? 'hidden print:block' : 'block'} text-center`}>
                                <span className="block font-bold text-[8px] uppercase leading-tight truncate">
                                  {estNombre || '______________________'}
                                </span>
                                <span className="block text-[7.5px] text-slate-700 leading-tight">
                                  {estDni ? `DNI: ${estDni}` : 'DNI: ____________'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* FIRMAS 2: COMITÉ ELECTORAL DOCENTE (VEEDORES OFICIALES) */}
                  <div className="border-t border-black pt-2">
                    <h4 className="text-[9.5px] font-black uppercase text-black mb-1 text-center">
                      COMITÉ ELECTORAL DOCENTE (VEEDORES Y GARANTES INSTITUCIONALES)
                    </h4>
                    <div className={`grid gap-2 ${comiteDocente.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : (comiteDocente.length === 2 ? 'grid-cols-2 max-w-md mx-auto' : 'grid-cols-3')}`}>
                      {comiteDocente.map((doc, idx) => (
                        <div key={idx} className="border border-black/80 p-1.5 text-center h-16 flex flex-col justify-between bg-slate-50/50">
                          <div className="h-6 border-b border-dotted border-black/50"></div>
                          <div>
                            <span className="text-[7px] font-black uppercase text-blue-900 block leading-tight">{doc.cargo}</span>
                            <span className="text-[7.5px] font-black uppercase text-black block leading-tight truncate" title={doc.nombre}>
                              {doc.nombre}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ======================================================== */}
              {/* HOJA 2: ACTA DE ESCRUTINIO (SECCIÓN C - 4b)               */}
              {/* ======================================================== */}
              {(vistaActa === 'ambas' || vistaActa === 'escrutinio') && (
                <div className="acta-page bg-white border-2 border-black p-5 sm:p-6 max-w-[780px] mx-auto shadow-md print:shadow-none print:border-2 print:border-black print:p-6 print:m-0 print:w-full">
                  
                  {/* Encabezado ONPE */}
                  <div className="flex items-start justify-between border-b-2 border-black pb-2">
                    <div className="flex items-center gap-3">
                      <img src={logoColegioAzul} alt="CATA" className="w-12 h-12 object-contain" />
                      <div>
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 block">
                          SISTEMA ELECTORAL ESTUDIANTIL CATA 2026
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-black uppercase leading-tight">
                          ACTA ELECTORAL
                        </h2>
                        <p className="text-[11px] font-bold text-black uppercase">
                          {data?.ambito?.subtitulo}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="text-right">
                        <span className="text-3xl font-black text-black leading-none">4b</span>
                        <div className="text-[8.5px] font-black uppercase text-slate-500">FORMATO OFICIAL</div>
                      </div>
                      <div className="mt-1">
                        <Barcode128 value={mesaCodigo} height={22} unitWidth={1.1} showText={true} />
                      </div>
                    </div>
                  </div>

                  {/* Datos de Mesa */}
                  <div className="grid grid-cols-4 gap-2 border-b-2 border-black py-1.5 text-xs font-black uppercase">
                    <div>
                      <span className="text-[8.5px] text-slate-500 block leading-tight">MESA DE SUFRAGIO</span>
                      <span className="text-black font-extrabold">{mesaCodigo}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 block leading-tight">DEPARTAMENTO</span>
                      <span className="text-black font-extrabold">PUNO</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 block leading-tight">PROVINCIA / DISTRITO</span>
                      <span className="text-black font-extrabold">SAN ROMÁN / JULIACA</span>
                    </div>
                    <div className="bg-slate-100 border border-black p-1 text-center rounded-xs">
                      <span className="text-[8px] text-slate-600 block leading-none">TOTAL SUFRAGANTES</span>
                      <span className="text-sm sm:text-base font-black text-black leading-tight">
                        {cifras.ciudadanos_votaron}
                      </span>
                    </div>
                  </div>

                  {/* TÍTULO SECCIÓN C */}
                  <div className="my-2 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 bg-black text-white px-2.5 py-0.5 font-black text-xs uppercase">
                      <span>C</span>
                      <span>ACTA DE ESCRUTINIO</span>
                    </div>
                    <span className="text-[9.5px] font-semibold text-slate-600">
                      Siendo las <strong>02:15 p. m.</strong> del <strong>{data?.fecha_texto}</strong>, se inició el ACTO DE ESCRUTINIO.
                    </span>
                  </div>

                  {/* TABLA DE ESCRUTINIO CON LOGOS GRANDES */}
                  <table className="w-full border-collapse border-2 border-black text-xs my-2">
                    <thead>
                      <tr className="bg-slate-100 text-black border-b-2 border-black">
                        <th className="border border-black py-1 px-1.5 w-10 text-center font-black text-[10px]">N°</th>
                        <th className="border border-black py-1 px-2 text-left font-black text-[10px]">ORGANIZACIONES POLÍTICAS (LISTAS CANDIDATAS)</th>
                        <th className="border border-black py-1 px-2 w-36 sm:w-44 text-center font-black text-[10px]">SÍMBOLO</th>
                        <th className="border border-black py-1 px-2 w-24 text-center font-black text-[10px]">TOTAL VOTOS (NÚMEROS)</th>
                        <th className="border border-black py-1 px-2 text-left font-black text-[10px]">TOTAL VOTOS (EN LETRAS)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listas.map((lista, idx) => (
                        <tr key={lista.id} className="border-b border-black">
                          <td className={`border border-black text-center font-black ${tableCellPadding}`}>
                            {idx + 1}
                          </td>
                          <td className={`border border-black font-black text-black ${tableCellPadding}`}>
                            <span className={`${isUltraCompact ? 'text-xs' : 'text-sm'} block font-black leading-tight`}>{lista.nombre}</span>
                            {lista.alcalde && (
                              <span className="text-[9.5px] text-slate-600 font-bold block leading-tight">
                                Candidato(a): {lista.alcalde}
                              </span>
                            )}
                          </td>
                          {/* CELDA SÍMBOLO: LOGO GRANDE QUE CASI COMPLETA EL CUADRITO */}
                          <td className={`border border-black text-center align-middle bg-white w-36 sm:w-44 p-1`}>
                            {lista.logo ? (
                              <div className={`w-full ${logoContainerHeight} flex items-center justify-center p-0.5 bg-white`}>
                                <img 
                                  src={getAssetUrl(lista.logo)} 
                                  alt={`Símbolo ${lista.nombre}`} 
                                  className={`${logoMaxDimensions} w-full h-full object-contain mx-auto filter drop-shadow-xs`} 
                                />
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 block py-1">Sin símbolo</span>
                            )}
                          </td>
                          <td className={`border border-black text-center font-black ${isUltraCompact ? 'text-sm' : 'text-base'} bg-slate-50 ${tableCellPadding}`}>
                            {lista.votos}
                          </td>
                          <td className={`border border-black font-bold uppercase text-[10px] text-slate-800 ${tableCellPadding}`}>
                            {numeroALetras(lista.votos)}
                          </td>
                        </tr>
                      ))}

                      {/* VOTOS EN BLANCO */}
                      <tr className="border-b border-black bg-slate-50/50">
                        <td className={`border border-black text-center font-black text-[11px] ${tableCellPadding}`}>—</td>
                        <td className={`border border-black font-black uppercase text-slate-700 text-[11px] ${tableCellPadding}`}>
                          VOTOS EN BLANCO
                        </td>
                        <td className="border border-black text-center align-middle bg-white w-36 sm:w-44 p-1">
                          {cifras.logo_blanco ? (
                            <div className={`w-full ${logoContainerHeight} flex items-center justify-center p-0.5 bg-white`}>
                              <img 
                                src={getAssetUrl(cifras.logo_blanco)} 
                                alt="Símbolo Voto en Blanco" 
                                className={`${logoMaxDimensions} w-full h-full object-contain mx-auto filter drop-shadow-xs`} 
                              />
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-300 block py-1">—</span>
                          )}
                        </td>
                        <td className={`border border-black text-center font-black text-sm bg-slate-100 ${tableCellPadding}`}>
                          {cifras.votos_blanco}
                        </td>
                        <td className={`border border-black py-1 px-2 font-bold uppercase text-[10px] text-slate-800 ${tableCellPadding}`}>
                          {numeroALetras(cifras.votos_blanco)}
                        </td>
                      </tr>

                      {/* VOTOS NULOS */}
                      <tr className="border-b border-black bg-slate-50/50">
                        <td className={`border border-black text-center font-black text-[11px] ${tableCellPadding}`}>—</td>
                        <td className={`border border-black font-black uppercase text-slate-700 text-[11px] ${tableCellPadding}`}>
                          VOTOS NULOS / VICIADOS
                        </td>
                        <td className="border border-black text-center align-middle bg-white w-36 sm:w-44 p-1">
                          {cifras.logo_nulo ? (
                            <div className={`w-full ${logoContainerHeight} flex items-center justify-center p-0.5 bg-white`}>
                              <img 
                                src={getAssetUrl(cifras.logo_nulo)} 
                                alt="Símbolo Voto Nulo" 
                                className={`${logoMaxDimensions} w-full h-full object-contain mx-auto filter drop-shadow-xs`} 
                              />
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-300 block py-1">—</span>
                          )}
                        </td>
                        <td className={`border border-black text-center font-black text-sm bg-slate-100 ${tableCellPadding}`}>
                          {cifras.votos_nulo}
                        </td>
                        <td className={`border border-black py-1 px-2 font-bold uppercase text-[10px] text-slate-800 ${tableCellPadding}`}>
                          {numeroALetras(cifras.votos_nulo)}
                        </td>
                      </tr>

                      {/* TOTAL DE VOTOS EMITIDOS */}
                      <tr className="bg-slate-200 border-t-2 border-black font-black">
                        <td className="border border-black py-1 text-center text-xs">★</td>
                        <td colSpan={2} className="border border-black py-1 px-2 text-xs uppercase">
                          TOTAL DE VOTOS EMITIDOS
                        </td>
                        <td className="border border-black py-1 text-center text-base bg-black text-white font-black">
                          {cifras.total_votos_emitidos}
                        </td>
                        <td className="border border-black py-1 px-2 uppercase text-[11px]">
                          {numeroALetras(cifras.total_votos_emitidos)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Observaciones Escrutinio */}
                  <div className="border border-black p-2 my-1.5">
                    <span className="text-[9px] font-black uppercase text-black block mb-0.5">
                      OBSERVACIONES DEL ESCRUTINIO:
                    </span>
                    <p className="text-[10px] font-medium text-slate-700 leading-tight">
                      Conforme al conteo digital y verificación de firmas de los miembros de mesa y personeros acreditados.
                    </p>
                    <div className="mt-0.5 text-[9px] font-semibold text-slate-600">
                      Siendo las <strong>03:00 p. m.</strong> del <strong>{data?.fecha_texto}</strong>, finalizó el ACTO DE ESCRUTINIO.
                    </div>
                  </div>

                  {/* FIRMAS 1: MIEMBROS DE MESA (ESTUDIANTES - EDITABLE Y COMPARTIDO) */}
                  <div className="border-t-2 border-black pt-1.5 mb-1.5">
                    <h4 className="text-[9.5px] font-black uppercase text-black mb-1 text-center">
                      FIRMA DE LOS MIEMBROS DE MESA (COMITÉ ESTUDIANTIL)
                    </h4>
                    <div className={`grid gap-2 ${comiteEstudiantil.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : (comiteEstudiantil.length === 2 ? 'grid-cols-2 max-w-md mx-auto' : 'grid-cols-3')}`}>
                      {comiteEstudiantil.map((m, idx) => {
                        const estNombre = customEstudiantes[idx] !== undefined ? customEstudiantes[idx] : m.nombre;
                        const estDni = customDni[idx] !== undefined ? customDni[idx] : '';
                        return (
                          <div key={idx} className={`border border-black p-1.5 flex flex-col justify-between ${signatureHeight} bg-white`}>
                            <div className={`${signatureLineHeight} border-b border-dotted border-black`}></div>
                            <div className="text-[8.5px] font-bold text-center">
                              <span className="block font-black uppercase text-[7.5px] text-slate-500 leading-tight">{m.cargo}</span>
                              {!isExportingPdf ? (
                                <>
                                  <input
                                    type="text"
                                    value={estNombre}
                                    onChange={e => setCustomEstudiantes({ ...customEstudiantes, [idx]: e.target.value })}
                                    placeholder="Nombre del Alumno"
                                    className="w-full text-center font-bold text-[8.5px] uppercase outline-none border-b border-dotted border-slate-300 focus:border-blue-500 bg-blue-50/20 focus:bg-white rounded-xs print:hidden"
                                  />
                                  <input
                                    type="text"
                                    value={estDni}
                                    onChange={e => setCustomDni({ ...customDni, [idx]: e.target.value })}
                                    placeholder="DNI: ___________"
                                    className="w-full text-center text-[7.5px] text-slate-600 outline-none bg-blue-50/20 focus:bg-white rounded-xs print:hidden"
                                  />
                                </>
                              ) : null}
                              <div className={`${!isExportingPdf ? 'hidden print:block' : 'block'} text-center`}>
                                <span className="block font-bold text-[8px] uppercase leading-tight truncate">
                                  {estNombre || '______________________'}
                                </span>
                                <span className="block text-[7.5px] text-slate-700 leading-tight">
                                  {estDni ? `DNI: ${estDni}` : 'DNI: ____________'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* FIRMAS 2: COMITÉ ELECTORAL DOCENTE */}
                  <div className="border-t border-black pt-1.5">
                    <h4 className="text-[9px] font-black uppercase text-black mb-1 text-center">
                      FIRMA DEL COMITÉ ELECTORAL DOCENTE (VEEDORES)
                    </h4>
                    <div className={`grid gap-2 ${comiteDocente.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : (comiteDocente.length === 2 ? 'grid-cols-2 max-w-md mx-auto' : 'grid-cols-3')}`}>
                      {comiteDocente.map((doc, idx) => (
                        <div key={idx} className={`border border-black/80 p-1 text-center ${isUltraCompact ? 'h-13' : 'h-15'} flex flex-col justify-between bg-slate-50/50`}>
                          <div className={`${isUltraCompact ? 'h-5' : 'h-6'} border-b border-dotted border-black/50`}></div>
                          <div>
                            <span className="text-[7px] font-black uppercase text-blue-900 block leading-tight">{doc.cargo}</span>
                            <span className="text-[7.5px] font-black uppercase text-black block leading-tight truncate">
                              {doc.nombre}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </div>

        {/* PIE DEL MODAL (NO SE IMPRIME) */}
        <div className="bg-slate-100 border-t border-slate-200 p-3 sm:p-4 flex items-center justify-between text-xs text-slate-500 print:hidden no-print">
          <span>
            💡 <strong>Consejo para imprimir:</strong> En la ventana de impresión, selecciona <em>Destino: Guardar como PDF</em> o tu impresora, tamaño <em>A4</em> y márgenes <em>Mínimos</em> o <em>Predeterminados</em>.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default OnpeActasModal;
