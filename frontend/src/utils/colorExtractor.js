// utils/colorExtractor.js - Extracción inteligente de color representativo de logos
export const extractDominantColor = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve('#1B3A8C'); // Azul CATA institucional por defecto
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const sampleSize = 64;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
        const colorBuckets = {};

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          // Ignorar píxeles transparentes
          if (a < 120) continue;

          // Ignorar blancos / fondos muy claros
          if (r > 230 && g > 230 && b > 230) continue;

          // Ignorar negros puros / grises neutros
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          if (max < 35) continue; // Demasiado oscuro
          if (delta < 20) continue; // Muy grisáceo / sin saturación

          // Cuantizar color a bloques de 32 para agrupar tonos similares
          const qR = Math.round(r / 32) * 32;
          const qG = Math.round(g / 32) * 32;
          const qB = Math.round(b / 32) * 32;
          const key = `${qR},${qG},${qB}`;

          colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }

        // Buscar el bucket con más píxeles
        let bestColor = null;
        let maxCount = 0;
        for (const [key, count] of Object.entries(colorBuckets)) {
          if (count > maxCount) {
            maxCount = count;
            bestColor = key;
          }
        }

        URL.revokeObjectURL(url);

        if (bestColor) {
          const [r, g, b] = bestColor.split(',').map(Number);
          const toHex = (c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
          const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
          resolve(hex);
        } else {
          // Si el logo es monocromático o en blanco y negro, asignar azul institucional
          resolve('#1B3A8C');
        }
      } catch (err) {
        URL.revokeObjectURL(url);
        resolve('#1B3A8C');
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('#1B3A8C');
    };
  });
};

