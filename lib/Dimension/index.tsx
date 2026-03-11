import React, { useState, useEffect, useRef } from 'react';

export interface DimensionData {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  value: string;
  color?: string;
  fontSize?: number;
  lineWidth?: number;
}

interface DimensionProps {
  dimension: DimensionData;
  scale: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<DimensionData>) => void;
  onDelete?: (id: string) => void;
  onDragStart?: (id: string, clientX: number, clientY: number) => void;
  onHandleDragStart?: (id: string, handle: 'start' | 'end', clientX: number, clientY: number) => void;
  enabled?: boolean;
}

interface DimensionModalProps {
  isOpen: boolean;
  initialValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

// Modal component for entering dimension value
export const DimensionModal: React.FC<DimensionModalProps> = ({
  isOpen,
  initialValue,
  onConfirm,
  onCancel
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        touchAction: 'none'
      }}
      onPointerDown={(e) => {
        // Only cancel if clicking the backdrop (not bubbled from children)
        if (e.target === e.currentTarget) {
          e.stopPropagation();
        }
      }}
      onPointerUp={(e) => {
        // Only cancel if clicking the backdrop (not bubbled from children)
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 24,
          minWidth: 300,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          touchAction: 'manipulation'
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
          Inserisci Misura
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Es: 150 cm"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 16,
              border: '2px solid #e0e0e0',
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 16
            }}
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                border: '1px solid #ccc',
                borderRadius: 6,
                backgroundColor: 'white',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
            >
              Annulla
            </button>
            <button
              type="submit"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onConfirm(value);
              }}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                border: 'none',
                borderRadius: 6,
                backgroundColor: '#2196f3',
                color: 'white',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
            >
              Conferma
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Single Dimension component (renders the dimension line with arrows and value)
const Dimension: React.FC<DimensionProps> = ({
  dimension,
  scale,
  selected,
  onSelect,
  onDragStart,
  onHandleDragStart,
  enabled = true
}) => {
  const { id, startX, startY, endX, endY, value, color = '#ff5722', fontSize = 14, lineWidth = 2 } = dimension;

  // Calculate angle
  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx);
  const angleDeg = (angle * 180) / Math.PI;

  // Midpoint for the label
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Arrow head size
  const arrowSize = 10 / scale;

  // Calculate arrow points
  const arrow1X1 = startX + arrowSize * Math.cos(angle + Math.PI / 6);
  const arrow1Y1 = startY + arrowSize * Math.sin(angle + Math.PI / 6);
  const arrow1X2 = startX + arrowSize * Math.cos(angle - Math.PI / 6);
  const arrow1Y2 = startY + arrowSize * Math.sin(angle - Math.PI / 6);

  const arrow2X1 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
  const arrow2Y1 = endY - arrowSize * Math.sin(angle + Math.PI / 6);
  const arrow2X2 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
  const arrow2Y2 = endY - arrowSize * Math.sin(angle - Math.PI / 6);

  // Extension lines (perpendicular to main line)
  const extLength = 15 / scale;
  const perpAngle = angle + Math.PI / 2;
  const ext1X1 = startX + extLength * Math.cos(perpAngle);
  const ext1Y1 = startY + extLength * Math.sin(perpAngle);
  const ext1X2 = startX - extLength * Math.cos(perpAngle);
  const ext1Y2 = startY - extLength * Math.sin(perpAngle);
  const ext2X1 = endX + extLength * Math.cos(perpAngle);
  const ext2Y1 = endY + extLength * Math.sin(perpAngle);
  const ext2X2 = endX - extLength * Math.cos(perpAngle);
  const ext2Y2 = endY - extLength * Math.sin(perpAngle);

  // Text offset (above the line) - calculated but applied via transform

  // Adjust text rotation so it's always readable
  let textAngle = angleDeg;
  if (textAngle > 90 || textAngle < -90) {
    textAngle += 180;
  }

  const handleClick = (e: React.MouseEvent | React.PointerEvent) => {
    if (!enabled) return;
    e.stopPropagation();
    onSelect?.(id);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!enabled || !selected) return;
    e.stopPropagation();
    e.preventDefault();
    onDragStart?.(id, e.clientX, e.clientY);
  };

  const handleStartHandlePointerDown = (e: React.PointerEvent) => {
    if (!enabled) return;
    e.stopPropagation();
    e.preventDefault();
    onHandleDragStart?.(id, 'start', e.clientX, e.clientY);
  };

  const handleEndHandlePointerDown = (e: React.PointerEvent) => {
    if (!enabled) return;
    e.stopPropagation();
    e.preventDefault();
    onHandleDragStart?.(id, 'end', e.clientX, e.clientY);
  };

  const adjustedLineWidth = lineWidth / scale;
  const adjustedFontSize = fontSize / scale;
  const handleRadius = 8 / scale;

  return (
    <g 
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      style={{ 
        cursor: enabled ? (selected ? 'move' : 'pointer') : 'default',
        pointerEvents: enabled ? 'all' : 'none',
        touchAction: 'none'
      }}
    >
      {/* Main dimension line */}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={adjustedLineWidth}
      />

      {/* Arrow at start */}
      <polygon
        points={`${startX},${startY} ${arrow1X1},${arrow1Y1} ${arrow1X2},${arrow1Y2}`}
        fill={color}
      />

      {/* Arrow at end */}
      <polygon
        points={`${endX},${endY} ${arrow2X1},${arrow2Y1} ${arrow2X2},${arrow2Y2}`}
        fill={color}
      />

      {/* Extension line at start */}
      <line
        x1={ext1X1}
        y1={ext1Y1}
        x2={ext1X2}
        y2={ext1Y2}
        stroke={color}
        strokeWidth={adjustedLineWidth * 0.7}
      />

      {/* Extension line at end */}
      <line
        x1={ext2X1}
        y1={ext2Y1}
        x2={ext2X2}
        y2={ext2Y2}
        stroke={color}
        strokeWidth={adjustedLineWidth * 0.7}
      />

      {/* Value label background */}
      {value && (
        <>
          <rect
            x={midX - (value.length * adjustedFontSize * 0.3)}
            y={midY - adjustedFontSize * 0.7}
            width={value.length * adjustedFontSize * 0.6}
            height={adjustedFontSize * 1.3}
            fill="white"
            rx={2 / scale}
            transform={`rotate(${textAngle}, ${midX}, ${midY})`}
          />
          <text
            x={midX}
            y={midY}
            fill={color}
            fontSize={adjustedFontSize}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${textAngle}, ${midX}, ${midY})`}
            style={{ userSelect: 'none' }}
          >
            {value}
          </text>
        </>
      )}

      {/* Selection indicator */}
      {selected && (
        <>
          <rect
            x={Math.min(startX, endX) - 5 / scale}
            y={Math.min(startY, endY) - 5 / scale}
            width={Math.abs(dx) + 10 / scale}
            height={Math.abs(dy) + 10 / scale}
            fill="none"
            stroke="#2196f3"
            strokeWidth={2 / scale}
            strokeDasharray={`${4 / scale},${4 / scale}`}
          />
          {/* Draggable handle at start point */}
          <circle
            cx={startX}
            cy={startY}
            r={handleRadius}
            fill="#2196f3"
            stroke="white"
            strokeWidth={2 / scale}
            style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={handleStartHandlePointerDown}
          />
          {/* Draggable handle at end point */}
          <circle
            cx={endX}
            cy={endY}
            r={handleRadius}
            fill="#2196f3"
            stroke="white"
            strokeWidth={2 / scale}
            style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={handleEndHandlePointerDown}
          />
        </>
      )}
    </g>
  );
};

// Helper to create a new dimension
export const createDimension = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  value: string = '',
  color?: string
): DimensionData => {
  return {
    id: `dim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startX,
    startY,
    endX,
    endY,
    value,
    color
  };
};

export default Dimension;
