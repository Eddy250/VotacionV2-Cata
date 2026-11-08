import React, { useMemo } from 'react';
import { generateCode128Svg } from '../utils/barcode128';

const Barcode128 = ({ value, height = 26, unitWidth = 1.3, showText = false, className = '' }) => {
  const svgString = useMemo(() => {
    return generateCode128Svg(value, { height, unitWidth, showText });
  }, [value, height, unitWidth, showText]);

  if (!value) return null;

  return (
    <div 
      className={`inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
};

export default Barcode128;

