import React from 'react';

interface GridProps {
  width: number;
  height: number;
  gridSize?: number;
  gridColor?: string;
  gridOpacity?: number;
  showGrid?: boolean;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
}

const Grid: React.FC<GridProps> = ({
  width,
  height,
  gridSize = 20,
  gridColor = '#cccccc',
  gridOpacity = 0.5,
  showGrid = true,
  offsetX = 0,
  offsetY = 0,
  scale = 1
}) => {
  if (!showGrid || width === 0 || height === 0) return null;

  const scaledGridSize = gridSize * scale;
  const patternId = `grid-pattern-${gridSize}`;

  // Calculate offset for seamless scrolling
  const adjustedOffsetX = offsetX % scaledGridSize;
  const adjustedOffsetY = offsetY % scaledGridSize;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0
      }}
      width={width}
      height={height}
    >
      <defs>
        <pattern
          id={patternId}
          width={scaledGridSize}
          height={scaledGridSize}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${adjustedOffsetX}, ${adjustedOffsetY})`}
        >
          <path
            d={`M ${scaledGridSize} 0 L 0 0 0 ${scaledGridSize}`}
            fill="none"
            stroke={gridColor}
            strokeWidth="0.5"
            opacity={gridOpacity}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};

export default Grid;
