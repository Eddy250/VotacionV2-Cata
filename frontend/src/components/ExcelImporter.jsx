import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../api';
import { motion } from 'framer-motion';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, RefreshCw, Users, ShieldAlert, Sparkles } from 'lucide-react';

const BLUE = '#1B3A8C';

const ExcelImporter = ({ onImportFinished }) => {
  const [files, setFiles] = useState([]);
  const [sedeDefault, setSedeDefault] = useState('Sede Principal');
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  // Manejar selección o arrastre de múltiples archivos
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    setFiles(selectedFiles);
    parseExcelFiles(selectedFiles, sedeDefault);
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
          // Si no encontró por nombre, asumir fila 6 (índice 5) como en el formato CATA
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

          // Si la fila está vacía en datos principales, saltar
          if (!codOriginal && !apPaterno && !nombres && !dni) continue;

          // Deduplicar si el alumno ya fue leído en otro archivo
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
        totalNoMatriculados
      });

    } catch (err) {
      console.error("Error al procesar archivos Excel", err);
      setError("Ocurrió un error al leer los archivos Excel. Asegúrate de que no estén dañados ni protegidos con contraseña.");
    } finally {
      setParsing(false);
    }
  };

  // Enviar lista limpia al backend para generar códigos y guardar
  const handleGuardarEnPadrón = async () => {
    if (!parsedData || !parsedData.alumnos.length) return;
    setUploading(true);
    setError('');

    try {
      const res = await api.post('/admin/importar-lote', {
        sede_default: sedeDefault,
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

  // Descargar Excel con los códigos secretos generados
  const handleDescargarTicketsExcel = () => {
    if (!importResult || !importResult.alumnos) return;

    // Crear arreglo formateado para Excel
    const dataExcel = importResult.alumnos.map((a, index) => ({
      'N°': index + 1,
      'SEDE': a.sede || sedeDefault,
      'SALÓN / NGS': a.ngs || 'GENERAL',
      'DNI (CÓDIGO DE VOTACIÓN)': a.codigo_voto,
      'APELLIDOS Y NOMBRES': a.nombre,
      'DNI': a.dni || '-',
      'CÓDIGO ESTUDIANTIL': a.codigo_original || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    // Configurar anchos de columna
    worksheet['!cols'] = [
      { wch: 6 },  // N°
      { wch: 18 }, // SEDE
      { wch: 14 }, // NGS
      { wch: 28 }, // DNI (CÓDIGO VOTO)
      { wch: 38 }, // NOMBRES
      { wch: 14 }, // DNI
      { wch: 18 }  // COD ORIG
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Códigos de Sufragio");
    XLSX.writeFile(workbook, `PADRON_CON_CODIGOS_CATA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-8">
      {/* Encabezado y configuración de Sede */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7" style={{ color: BLUE }} /> Importación Multi-Excel
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Sube múltiples archivos de salones, grados o secciones a la vez. El sistema filtrará a los retirados y asignará sus DNIs como códigos directos de votación.
          </p>
        </div>

        <div className="w-full md:w-auto">
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sede de los archivos:</label>
          <input 
            type="text" 
            value={sedeDefault} 
            onChange={(e) => setSedeDefault(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none transition-colors"
            onFocus={e => e.target.style.borderColor = BLUE}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            placeholder="Ej: Sede Juliaca"
          />
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
        style={{ borderColor: '#C7D9FF', backgroundColor: '#EEF4FF' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = BLUE}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#C7D9FF'}
      >
        <input 
          type="file" 
          multiple 
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />
        <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-8 h-8" style={{ color: BLUE }} />
        </div>
        <h4 className="text-lg font-bold text-slate-800">
          Arrastra aquí tus archivos de Excel (.xlsx / .xls)
        </h4>
        <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
          Puedes soltar 1, 10 o 20 archivos al mismo tiempo (uno por cada salón o sección).
        </p>
        <span 
          className="inline-block mt-4 px-4 py-1.5 text-white font-bold text-xs rounded-full shadow-sm transition-colors"
          style={{ backgroundColor: BLUE }}
        >
          Examinar Archivos
        </span>
      </div>

      {parsing && (
        <div className="p-8 text-center text-slate-500 font-bold animate-pulse">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: BLUE }} />
          Leyendo y analizando todos los archivos Excel...
        </div>
      )}

      {/* Vista Previa Inteligente */}
      {parsedData && !parsing && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 rounded-xl" style={{ backgroundColor: '#EEF4FF', color: BLUE }}>
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Archivos Procesados</p>
                <h4 className="text-2xl font-black text-slate-800">{parsedData.totalArchivos}</h4>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Alumnos Activos Listos</p>
                <h4 className="text-2xl font-black text-emerald-600">{parsedData.totalActivos}</h4>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Filtrados (Retirados/No Mat.)</p>
                <h4 className="text-2xl font-black text-amber-600">
                  {parsedData.totalRetirados + parsedData.totalNoMatriculados}
                </h4>
              </div>
            </div>
          </div>

          {/* Tabla de muestra */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-sm font-bold text-slate-700">Muestra de los primeros estudiantes detectados:</h4>
              <span className="text-xs font-semibold text-slate-400">Total: {parsedData.totalActivos} alumnos</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-100">
                    <th className="p-4">DNI</th>
                    <th className="p-4">Cód. Original</th>
                    <th className="p-4">Apellidos y Nombres</th>
                    <th className="p-4">Salón (NGS)</th>
                    <th className="p-4">Sede</th>
                    <th className="p-4">Archivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {parsedData.alumnos.slice(0, 8).map((al, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="p-4 font-mono font-bold" style={{ color: BLUE }}>{al.dni || '-'}</td>
                      <td className="p-4 font-mono text-slate-500">{al.codigo_original || '-'}</td>
                      <td className="p-4 font-bold">{al.ap_paterno} {al.ap_materno}, {al.nombres}</td>
                      <td className="p-4"><span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#EEF4FF', color: BLUE }}>{al.ngs || 'GENERAL'}</span></td>
                      <td className="p-4 text-slate-500">{al.sede}</td>
                      <td className="p-4 text-xs text-slate-400 truncate max-w-[150px]">{al.archivo_origen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botón de Confirmación */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xs text-slate-500">
                Al confirmar, el sistema registrará a los estudiantes vinculando su <strong>DNI como código directo de votación</strong>.
              </p>
              <button 
                onClick={handleGuardarEnPadrón}
                disabled={uploading}
                className="w-full sm:w-auto px-8 py-3.5 text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: BLUE }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#142D6E'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = BLUE}
              >
                {uploading ? (
                  <>Guardando en Padrón...</>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> Confirmar e Importar al Padrón ({parsedData.totalActivos})
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Resultado Exitoso y Botón de Descarga */}
      {importResult && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 border rounded-3xl shadow-sm text-center" style={{ backgroundColor: '#EEF4FF', borderColor: '#C7D9FF' }}>
          <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
            <CheckCircle2 className="w-9 h-9" style={{ color: BLUE }} />
          </div>
          <h3 className="text-2xl font-black" style={{ color: BLUE }}>¡Padrón Electoral Actualizado Exitosamente!</h3>
          <p className="text-sm mt-2 max-w-xl mx-auto font-medium" style={{ color: '#1B3A8C99' }}>
            Se registraron <strong>{importResult.insertados}</strong> estudiantes nuevos con sus DNIs habilitados para votar y se actualizaron <strong>{importResult.actualizados}</strong> ya existentes.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={handleDescargarTicketsExcel}
              className="px-8 py-4 text-white font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3"
              style={{ backgroundColor: BLUE }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#142D6E'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = BLUE}
            >
              <Download className="w-5 h-5 stroke-[2.5]" /> Descargar Padrón con Códigos de Votación (DNI)
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ExcelImporter;
