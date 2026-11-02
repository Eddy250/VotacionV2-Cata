import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../api';
import { motion } from 'framer-motion';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, RefreshCw, Users, ShieldAlert, Sparkles, Building2, Church } from 'lucide-react';

const BLUE = '#1B3A8C';

const ExcelImporter = ({ onImportFinished }) => {
  const [files, setFiles] = useState([]);
  const [selectedSede, setSelectedSede] = useState('Sede Central');
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  // Cambiar sede seleccionada
  const handleSelectSede = (sedeName) => {
    setSelectedSede(sedeName);
    setError('');
    if (files.length > 0) {
      parseExcelFiles(files, sedeName);
    }
  };

  // Manejar selección o arrastre de múltiples archivos
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    setFiles(selectedFiles);
    parseExcelFiles(selectedFiles, selectedSede);
  };

  // Procesar los múltiples archivos Excel
  const parseExcelFiles = async (fileList, sedeName) => {
    setParsing(true);
    setError('');
    setImportResult(null);

    let todosAlumnos = [];
    let totalRetirados = 0;
    let totalNoMatriculados = 0;
    let dniSet = new Set();

    try {
      for (const file of fileList) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        // Tomar la primera hoja o la que tenga datos
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        // Detectar la fila de encabezado buscando "código" o "ap. paterno"
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const rowStr = rows[i].map(c => String(c).toLowerCase().trim()).join(' ');
          if (rowStr.includes('código') || rowStr.includes('codigo') || rowStr.includes('paterno')) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          headerRowIndex = 5;
        }

        const headers = rows[headerRowIndex].map(h => String(h).toLowerCase().trim());

        // Mapear índices de columnas
        const colMap = {
          codigo: headers.findIndex(h => h.includes('código') || h.includes('codigo') || h === 'cod'),
          paterno: headers.findIndex(h => h.includes('paterno')),
          materno: headers.findIndex(h => h.includes('materno')),
          nombres: headers.findIndex(h => h.includes('nombre')),
          sexo: headers.findIndex(h => h.includes('sex')),
          dni: headers.findIndex(h => h.includes('doc') || h.includes('dni') || h.includes('ident')),
          ngs: headers.findIndex(h => h.includes('ngs') || h.includes('grado') || h.includes('secc')),
          matriculado: headers.findIndex(h => h.includes('matríc') || h.includes('matric')),
          estado: headers.findIndex(h => h.includes('estado'))
        };

        // Procesar filas de datos
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const estadoVal = colMap.estado !== -1 ? String(row[colMap.estado]).trim().toLowerCase() : 'activo';
          const matriculadoVal = colMap.matriculado !== -1 ? String(row[colMap.matriculado]).trim().toLowerCase() : 'si';

          // Filtro 1: Descartar "Retirado"
          if (estadoVal.includes('retirad') || estadoVal.includes('inactiv')) {
            totalRetirados++;
            continue;
          }

          // Filtro 2: Descartar "Matriculado: No"
          if (matriculadoVal === 'no') {
            totalNoMatriculados++;
            continue;
          }

          const codOriginal = colMap.codigo !== -1 ? String(row[colMap.codigo]).trim() : '';
          const apPaterno = colMap.paterno !== -1 ? String(row[colMap.paterno]).trim() : '';
          const apMaterno = colMap.materno !== -1 ? String(row[colMap.materno]).trim() : '';
          const nombres = colMap.nombres !== -1 ? String(row[colMap.nombres]).trim() : '';
          const sexo = colMap.sexo !== -1 ? String(row[colMap.sexo]).trim().toUpperCase() : '';
          const dni = colMap.dni !== -1 ? String(row[colMap.dni]).trim() : '';
          const ngs = colMap.ngs !== -1 ? String(row[colMap.ngs]).trim().toUpperCase() : '';

          if (!codOriginal && !apPaterno && !nombres && !dni) continue;

          const identKey = dni || codOriginal;
          if (identKey && dniSet.has(identKey)) {
            continue;
          }
          if (identKey) dniSet.add(identKey);

          todosAlumnos.push({
            codigo_original: codOriginal,
            ap_paterno: apPaterno,
            ap_materno: apMaterno,
            nombres: nombres,
            sexo: sexo,
            dni: dni,
            ngs: ngs,
            sede: sedeName,
            archivo_origen: file.name
          });
        }
      }

      setParsedData({
        alumnos: todosAlumnos,
        totalArchivos: fileList.length,
        totalActivos: todosAlumnos.length,
        totalRetirados,
        totalNoMatriculados,
        sede: sedeName
      });

    } catch (err) {
      console.error("Error al procesar archivos Excel", err);
      setError("Ocurrió un error al leer los archivos Excel. Asegúrate de que no estén dañados ni protegidos con contraseña.");
    } finally {
      setParsing(false);
    }
  };

  // Enviar lista limpia al backend para guardar en la BD aislada de la sede
  const handleGuardarEnPadrón = async () => {
    if (!parsedData || !parsedData.alumnos.length) return;
    setUploading(true);
    setError('');

    try {
      const res = await api.post('/admin/importar-lote', {
        sede: selectedSede,
        sede_default: selectedSede,
        alumnos: parsedData.alumnos
      });

      if (res.data.success) {
        setImportResult(res.data.resultado);
        if (onImportFinished) onImportFinished();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar los estudiantes en la base de datos.');
    } finally {
      setUploading(false);
    }
  };

  // Descargar Excel con los códigos de votación
  const handleDescargarTicketsExcel = () => {
    if (!importResult || !importResult.alumnos) return;

    const dataExcel = importResult.alumnos.map((a, index) => ({
      'N°': index + 1,
      'SEDE': a.sede || selectedSede,
      'SALÓN / NGS': a.ngs || 'GENERAL',
      'DNI (CÓDIGO DE VOTACIÓN)': a.codigo_voto,
      'APELLIDOS Y NOMBRES': a.nombre,
      'DNI': a.dni || '-',
      'CÓDIGO ESTUDIANTIL': a.codigo_original || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 14 },
      { wch: 28 },
      { wch: 38 },
      { wch: 14 },
      { wch: 18 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Padrón ${selectedSede}`);
    XLSX.writeFile(workbook, `PADRON_${selectedSede.replace(/\s+/g, '_').toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const isCentral = selectedSede === 'Sede Central';

  return (
    <div className="space-y-8">
      {/* 2 Botones Críticos de Selección de Sede */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7" style={{ color: BLUE }} />
            Importador de Padrón Electoral Multi-Excel
          </h3>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Selecciona la sede a la que pertenece el lote de archivos. Cada sede se guarda en su base de datos propia e independiente:
          </p>
        </div>

        {/* Los 2 Botones de Sede */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Botón 1: Central */}
          <button
            type="button"
            onClick={() => handleSelectSede('Sede Central')}
            className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
              isCentral
                ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`p-3 rounded-xl ${isCentral ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Building2 size={24} />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">Módulo Aislado</span>
                <h4 className="font-black text-slate-900 text-base">Cargar Padrón Sede Central</h4>
                <p className="text-xs text-slate-500 mt-0.5">Destino: <code className="bg-white px-1.5 py-0.5 rounded border text-[11px] font-mono">central.db</code> (~1000 alumnos)</p>
              </div>
            </div>
            {isCentral && (
              <span className="p-1 rounded-full bg-blue-600 text-white flex-shrink-0">
                <CheckCircle2 size={18} />
              </span>
            )}
          </button>

          {/* Botón 2: Jerusalén */}
          <button
            type="button"
            onClick={() => handleSelectSede('Sede Jerusalén')}
            className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
              !isCentral
                ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`p-3 rounded-xl ${!isCentral ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Church size={24} />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Módulo Aislado</span>
                <h4 className="font-black text-slate-900 text-base">Cargar Padrón Sede Jerusalén</h4>
                <p className="text-xs text-slate-500 mt-0.5">Destino: <code className="bg-white px-1.5 py-0.5 rounded border text-[11px] font-mono">jerusalen.db</code> (~1000 alumnos)</p>
              </div>
            </div>
            {!isCentral && (
              <span className="p-1 rounded-full bg-emerald-600 text-white flex-shrink-0">
                <CheckCircle2 size={18} />
              </span>
            )}
          </button>
        </div>

        {/* Indicador de sede activa para la subida */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700">
              Sede activa seleccionada: <strong className="text-slate-900 underline">{selectedSede}</strong>
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            Los datos se validarán estrictamente para esta sede.
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm font-bold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Zona de Arrastrar y Soltar (Dropzone) */}
      <div 
        className="relative border-2 border-dashed rounded-3xl p-10 text-center transition-all group cursor-pointer"
        style={{ borderColor: isCentral ? '#C7D9FF' : '#A7F3D0', backgroundColor: isCentral ? '#EEF4FF' : '#ECFDF5' }}
      >
        <input 
          type="file" 
          multiple 
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />
        <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-8 h-8" style={{ color: isCentral ? BLUE : '#059669' }} />
        </div>
        <h4 className="text-lg font-black text-slate-800">
          Arrastra los archivos Excel (.xlsx) de <span className={isCentral ? 'text-blue-700' : 'text-emerald-700'}>{selectedSede}</span> aquí
        </h4>
        <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          Puedes seleccionar hasta 20 archivos a la vez (salones, secciones o grados). El sistema filtrará retirados y duplicados automáticamente.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-bold shadow-xs text-slate-700 border border-slate-200">
          Explorar archivos en tu equipo
        </div>
      </div>

      {/* Estado de Lectura / Parsing */}
      {parsing && (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center gap-3 text-blue-800 font-bold text-sm">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Analizando y limpiando archivos Excel de {selectedSede}...</span>
        </div>
      )}

      {/* Resumen del Lote Parseado */}
      {parsedData && !importResult && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 mb-1.5">
                <CheckCircle2 size={13} /> Lote Listo para {selectedSede}
              </span>
              <h4 className="text-xl font-black text-slate-800">Resumen de Filtrado de Datos</h4>
              <p className="text-slate-500 text-xs">Revisa las cifras antes de guardar definitivamente en la base de datos</p>
            </div>
            <button
              onClick={handleGuardarEnPadrón}
              disabled={uploading}
              className="w-full sm:w-auto px-6 py-3 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: isCentral ? BLUE : '#059669' }}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Guardando en {selectedSede}...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Guardar en Padrón de {selectedSede}
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
              <p className="text-xs font-bold text-blue-600 uppercase">Archivos Leídos</p>
              <h5 className="text-2xl font-black text-blue-950 mt-1">{parsedData.totalArchivos}</h5>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-600 uppercase">Alumnos Habilitados</p>
              <h5 className="text-2xl font-black text-emerald-950 mt-1">{parsedData.totalActivos}</h5>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
              <p className="text-xs font-bold text-amber-600 uppercase">Retirados Omitidos</p>
              <h5 className="text-2xl font-black text-amber-950 mt-1">{parsedData.totalRetirados}</h5>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase">No Matriculados</p>
              <h5 className="text-2xl font-black text-slate-900 mt-1">{parsedData.totalNoMatriculados}</h5>
            </div>
          </div>

          {/* Vista previa de los primeros 5 alumnos */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Vista Previa de Alumnos ({selectedSede}):</h5>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">DNI / Código</th>
                    <th className="py-2.5 px-3">Apellidos y Nombres</th>
                    <th className="py-2.5 px-3">Grado/Salón</th>
                    <th className="py-2.5 px-3">Sede Destino</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedData.alumnos.slice(0, 5).map((al, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-bold text-slate-700">{al.dni || al.codigo_original || 'Auto'}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{al.ap_paterno} {al.ap_materno}, {al.nombres}</td>
                      <td className="py-2 px-3 text-slate-600">{al.ngs || '-'}</td>
                      <td className="py-2 px-3 font-bold text-blue-900">{selectedSede}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.alumnos.length > 5 && (
              <p className="text-[11px] text-slate-400 mt-2 text-right">
                y {parsedData.alumnos.length - 5} alumnos más listos para registrarse.
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Éxito de Importación */}
      {importResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 md:p-8 space-y-4"
        >
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="text-xl font-black">¡Padrón de {selectedSede} Importado con Éxito!</h4>
              <p className="text-xs text-emerald-700">
                Se guardaron <strong>{importResult.insertados}</strong> alumnos nuevos y se actualizaron <strong>{importResult.actualizados}</strong> en la base de datos de {selectedSede}.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={handleDescargarTicketsExcel}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Download size={15} /> Descargar Padrón con Códigos (.xlsx)
            </button>
            <button
              onClick={() => { setFiles([]); setParsedData(null); setImportResult(null); }}
              className="px-5 py-2.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cargar otro archivo
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ExcelImporter;
