// utils/barcode128.js - Generador SVG de Alto Rendimiento para Code-128B (1 solo elemento <path>)

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"                                 // 100-106
];

/**
 * Codifica texto en Code-128 B con un solo elemento <path> SVG (ultraligero y ultraveloz)
 */
export function generateCode128Svg(text, options = {}) {
  const cleanText = String(text || '00000000').trim();
  if (!cleanText) return '';

  const barHeight = options.height || 20;
  const unitWidth = options.unitWidth || 1.1;

  // Code 128B
  const startCode = 104;
  const codes = [startCode];
  let checkSum = startCode;

  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    const code = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
    codes.push(code);
    checkSum += code * (i + 1);
  }

  const checkCode = checkSum % 103;
  codes.push(checkCode);
  codes.push(106); // Stop code

  let patternStr = '';
  for (const c of codes) {
    patternStr += CODE128_PATTERNS[c] || '111111';
  }

  // Generar un único path "d" con todos los rectángulos de las barras
  let x = 0;
  let pathD = '';
  let isBar = true;

  for (let i = 0; i < patternStr.length; i++) {
    const width = parseInt(patternStr[i], 10) * unitWidth;
    if (isBar) {
      pathD += `M${x.toFixed(1)} 0h${width.toFixed(1)}v${barHeight}h-${width.toFixed(1)}Z `;
    }
    x += width;
    isBar = !isBar;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x.toFixed(1)} ${barHeight}" width="100%" height="100%" preserveAspectRatio="none"><path d="${pathD}" fill="#000000" /></svg>`.trim();
}
