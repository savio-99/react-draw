import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import Whiteboard, { WhiteboardMode, WhiteBoard } from '../Whiteboard';
import FloatingToolbox, { ToolboxAction } from '../FloatingToolbox';
import { SketchImage } from '../Image';
import { DimensionData } from '../Dimension';
import { Stroke } from '../main';

export interface DrawingBoardProps {
  /** Initial strokes to display */
  initialStrokes?: Stroke[];
  /** Initial images to display */
  initialImages?: SketchImage[];
  /** Initial dimensions to display */
  initialDimensions?: DimensionData[];
  /** Whether to show the grid */
  showGrid?: boolean;
  /** Grid size in pixels */
  gridSize?: number;
  /** Grid line color */
  gridColor?: string;
  /** Grid line opacity (0-1) */
  gridOpacity?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Color for dimension lines */
  dimensionColor?: string;
  /** Default pen color */
  defaultPenColor?: string;
  /** Default pen width */
  defaultPenWidth?: number;
  /** Container style */
  style?: React.CSSProperties;
  /** Callback when strokes change */
  onChangeStrokes?: (strokes: Stroke[]) => void;
  /** Callback when images change */
  onChangeImages?: (images: SketchImage[]) => void;
  /** Callback when dimensions change */
  onChangeDimensions?: (dimensions: DimensionData[]) => void;
  /** Callback when fullscreen state changes */
  onFullscreenChange?: (isFullscreen: boolean) => void;
  /** Color palette for the color picker */
  colorPalette?: string[];
  /** Toolbox initial position */
  toolboxPosition?: { x: number; y: number };
  /** Toolbox orientation */
  toolboxOrientation?: 'horizontal' | 'vertical';
  /** Custom actions to add to the toolbox */
  additionalActions?: ToolboxAction[];
  /** Hide specific default actions by their id */
  hideActions?: string[];
  /** Labels for UI elements (for i18n) */
  labels?: {
    pen?: string;
    hand?: string;
    dimension?: string;
    select?: string;
    penOnly?: string;
    color?: string;
    strokeWidth?: string;
    addImage?: string;
    undo?: string;
    clear?: string;
    grid?: string;
    fullscreen?: string;
    resetView?: string;
    exportJson?: string;
    importJson?: string;
    exportImage?: string;
    modeLabel?: string;
    penOnlyActive?: string;
    instructions?: string;
    eraser?: string;
    gallery?: string;
    camera?: string;
    highlighter?: string;
    clearConfirm?: string;
    clearConfirmTitle?: string;
    clearConfirmYes?: string;
    clearConfirmNo?: string;
  };
}

export interface DrawingBoardRef {
  /** Get the underlying Whiteboard ref */
  getWhiteboard: () => WhiteBoard | null;
  /** Export data as JSON object */
  exportData: () => ReturnType<WhiteBoard['exportData']> | undefined;
  /** Export data as JSON string */
  exportJSON: () => string | undefined;
  /** Import data from JSON object */
  importData: (data: Parameters<WhiteBoard['importData']>[0], options?: Parameters<WhiteBoard['importData']>[1]) => void;
  /** Import data from JSON string */
  importJSON: (json: string, options?: Parameters<WhiteBoard['importJSON']>[1]) => boolean | undefined;
  /** Download as image */
  downloadImage: (filename?: string, options?: Parameters<WhiteBoard['downloadImage']>[1]) => Promise<boolean>;
  /** Clear the board */
  clear: () => void;
  /** Undo last action */
  undo: () => void;
  /** Reset view (pan and zoom) */
  resetView: () => void;
  /** Toggle fullscreen */
  toggleFullscreen: () => void;
}

const defaultLabels = {
  pen: 'Penna',
  hand: 'Mano (Sposta)',
  dimension: 'Quota',
  select: 'Seleziona',
  penOnly: 'Solo Penna (Stylus)',
  color: 'Colore Penna',
  strokeWidth: 'Dimensione Penna',
  addImage: 'Aggiungi Immagine',
  undo: 'Annulla',
  clear: 'Cancella Tutto',
  grid: 'Mostra/Nascondi Griglia',
  fullscreen: 'Schermo Intero',
  resetView: 'Reimposta Vista',
  exportJson: 'Esporta JSON',
  importJson: 'Importa JSON',
  exportImage: 'Esporta Immagine',
  modeLabel: 'Modalità',
  penOnlyActive: 'Solo Penna attivo',
  instructions: 'Ctrl + rotellina per zoom, tasto centrale o due dita per spostarsi',
  eraser: 'Gomma',
  gallery: 'Galleria',
  camera: 'Fotocamera',
  highlighter: 'Evidenziatore',
  clearConfirm: 'Sei sicuro di voler cancellare tutto?',
  clearConfirmTitle: 'Conferma',
  clearConfirmYes: 'Sì, cancella',
  clearConfirmNo: 'Annulla'
};

const defaultColorPalette = [
  // Neutrals
  '#000000', '#404040', '#808080', '#c0c0c0', '#ffffff',
  // Warm colors
  '#8b0000', '#ff0000', '#ff4500', '#ff8c00', '#ffa500',
  // Yellow-Green
  '#ffd700', '#ffff00', '#adff2f', '#32cd32', '#228b22',
  // Cool colors
  '#20b2aa', '#00ced1', '#00bfff', '#1e90ff', '#0000ff',
  // Purple-Pink
  '#4b0082', '#8b00ff', '#9400d3', '#ff00ff', '#ff69b4'
];

/**
 * DrawingBoard - A complete, ready-to-use drawing board component
 * 
 * This component provides a full-featured whiteboard with:
 * - Multiple drawing modes (pen, hand, dimension, select)
 * - Stylus-only mode for tablets
 * - Image support with drag & resize
 * - Dimension/measurement annotations
 * - Pan and zoom
 * - Grid background
 * - Fullscreen mode
 * - Undo functionality
 * - Export/Import (JSON and image)
 * - Floating toolbox
 */
const DrawingBoard = forwardRef<DrawingBoardRef, DrawingBoardProps>(({
  initialStrokes = [],
  initialImages = [],
  initialDimensions = [],
  showGrid: initialShowGrid = true,
  gridSize = 25,
  gridColor = '#e0e0e0',
  gridOpacity = 0.8,
  minZoom = 0.25,
  maxZoom = 4,
  dimensionColor = '#ff5722',
  defaultPenColor = '#000000',
  defaultPenWidth = 4,
  style,
  onChangeStrokes,
  onChangeImages,
  onChangeDimensions,
  onFullscreenChange,
  colorPalette = defaultColorPalette,
  toolboxPosition = { x: 20, y: 20 },
  toolboxOrientation = 'vertical',
  additionalActions = [],
  hideActions = [],
  labels: customLabels = {}
}, ref) => {
  const whiteboard = useRef<WhiteBoard>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showGrid, setShowGrid] = useState(initialShowGrid);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [strokeColor, setStrokeColor] = useState(defaultPenColor);
  const [strokeWidth, setStrokeWidth] = useState(defaultPenWidth);
  //const [_, setStrokeOpacity] = useState(1);
  const [mode, setMode] = useState<WhiteboardMode>('pen');
  const [penOnly, setPenOnly] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const labels = { ...defaultLabels, ...customLabels };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getWhiteboard: () => whiteboard.current,
    exportData: () => whiteboard.current?.exportData(),
    exportJSON: () => whiteboard.current?.exportJSON(),
    importData: (data, options) => whiteboard.current?.importData(data, options),
    importJSON: (json, options) => whiteboard.current?.importJSON(json, options),
    downloadImage: async (filename, options) => {
      const result = await whiteboard.current?.downloadImage(filename, options);
      return result ?? false;
    },
    clear: () => whiteboard.current?.clear(),
    undo: () => whiteboard.current?.undo(),
    resetView: () => whiteboard.current?.resetView(),
    toggleFullscreen: () => whiteboard.current?.toggleFullscreen()
  }));

  const handleColorChange = (color: string) => {
    setStrokeColor(color);
    whiteboard.current?.changeColor(color);
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
    whiteboard.current?.changeStrokeWidth(width);
  };

  const handleStrokeOpacityChange = (opacity: number) => {
    //setStrokeOpacity(opacity);
    whiteboard.current?.changeStrokeOpacity(opacity);
  };

  const handleImageUpload = async (src: string) => {
    const newImage = await whiteboard.current?.addImage(src);
    if (newImage) {
      setMode('mouse');
      whiteboard.current?.setMode('mouse');
      whiteboard.current?.selectImage(newImage.id);
    }
  };

  const handleStrokesChange = (newStrokes?: Stroke[]) => {
    const s = newStrokes || [];
    onChangeStrokes?.(s);
  };

  const handleImagesChange = (newImages: SketchImage[]) => {
    onChangeImages?.(newImages);
  };

  const handleDimensionsChange = (newDimensions: DimensionData[]) => {
    onChangeDimensions?.(newDimensions);
  };

  const handleFullscreenChange = (fs: boolean) => {
    setIsFullscreen(fs);
    onFullscreenChange?.(fs);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      whiteboard.current?.importJSON(json);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'pen': return labels.pen;
      case 'hand': return labels.hand;
      case 'dimension': return labels.dimension;
      case 'mouse': return labels.select;
      case 'highlighter': return labels.highlighter;
      case 'eraser': return labels.eraser;
      default: return '';
    }
  };

  // Build toolbox actions
  const defaultActions: ToolboxAction[] = [
    {
      id: 'penMode',
      label: labels.pen,
      active: mode === 'pen',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={mode === 'pen' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      ),
      onClick: () => {
        if (mode === 'pen') {
          setMode('mouse');
          whiteboard.current?.setMode('mouse');
        } else {
          setMode('pen');
          whiteboard.current?.setMode('pen');
          // Reset to pen defaults
          handleStrokeWidthChange(defaultPenWidth);
          handleStrokeOpacityChange(1);
        }
      }
    },
    {
      id: 'highlighterMode',
      label: labels.highlighter,
      active: mode === 'highlighter',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={mode === 'highlighter' ? "#fbbf24" : "currentColor"} strokeWidth="1.5">
          {/* Highlighter body - angled rectangle */}
          <path 
            d="M15 4L20 9L12 17L7 12L15 4Z" 
            fill={mode === 'highlighter' ? "rgba(251, 191, 36, 0.5)" : "none"} 
            strokeLinejoin="round"
          />
          {/* Highlighter tip */}
          <path 
            d="M12 17L7 12L4 19L12 17Z" 
            fill={mode === 'highlighter' ? "#fbbf24" : "none"} 
            strokeLinejoin="round"
          />
          {/* Cap/top */}
          <path d="M15 4L17 2L22 7L20 9" strokeLinecap="round" strokeLinejoin="round" />
          {/* Highlight line underneath to show the effect */}
          <path 
            d="M3 21H14" 
            stroke={mode === 'highlighter' ? "#fbbf24" : "currentColor"} 
            strokeWidth="3" 
            strokeLinecap="round"
            opacity={mode === 'highlighter' ? "0.5" : "0.3"}
          />
        </svg>
      ),
      onClick: () => {
        if (mode === 'highlighter') {
          setMode('mouse');
          whiteboard.current?.setMode('mouse');
        } else {
          // When switching to highlighter, set default highlighter settings
          setMode('highlighter');
          whiteboard.current?.setMode('highlighter');
          // Set highlighter defaults: larger width, lower opacity
          handleStrokeWidthChange(20);
          handleStrokeOpacityChange(0.4);
        }
      }
    },
    {
      id: 'handMode',
      label: labels.hand,
      active: mode === 'hand',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={mode === 'hand' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1" />
          <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      ),
      onClick: () => {
        setMode('hand');
        whiteboard.current?.setMode('hand');
      }
    },
    {
      id: 'dimensionMode',
      label: labels.dimension,
      active: mode === 'dimension',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={mode === 'dimension' ? "#ff5722" : "currentColor"} strokeWidth="2">
          <path d="M2 12h20" />
          <path d="M2 12l3-3" />
          <path d="M2 12l3 3" />
          <path d="M22 12l-3-3" />
          <path d="M22 12l-3 3" />
          <path d="M2 8V4" />
          <path d="M22 8V4" />
          <text x="12" y="10" fontSize="6" textAnchor="middle" fill={mode === 'dimension' ? "#ff5722" : "currentColor"} stroke="none">150</text>
        </svg>
      ),
      onClick: () => {
        setMode('dimension');
        whiteboard.current?.setMode('dimension');
      }
    },
    {
      id: 'mouseMode',
      label: labels.select,
      active: mode === 'mouse',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={mode === 'mouse' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
      ),
      onClick: () => {
        setMode('mouse');
        whiteboard.current?.setMode('mouse');
      }
    },
    {
      id: 'eraserMode',
      label: labels.eraser,
      active: mode === 'eraser',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={mode === 'eraser' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M20 20H7L3 16c-.6-.6-.6-1.5 0-2.1l10-10c.6-.6 1.5-.6 2.1 0l6 6c.6.6.6 1.5 0 2.1L12 21" />
          <path d="M6 11l8 8" />
        </svg>
      ),
      onClick: () => {
        setMode('eraser');
        whiteboard.current?.setMode('eraser');
      }
    },
    {
      id: 'penOnly',
      label: labels.penOnly,
      active: penOnly,
      icon: penOnly ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
          <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
          <path d="M14 8V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4" />
          <path d="M10 8V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7" />
          <path d="M18 8a2 2 0 1 1 4 0v5a8 8 0 0 1-8 8h-2a8 8 0 0 1-6-2.69" />
          <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.5" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
          <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
          <path d="M14 8V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4" />
          <path d="M10 8V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7" />
          <path d="M18 8a2 2 0 1 1 4 0v5a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          <path d="M5 21l4-4" stroke="#4caf50" strokeWidth="2.5" />
          <path d="M9 21l-2-2" stroke="#4caf50" strokeWidth="2.5" />
        </svg>
      ),
      onClick: () => {
        const newValue = !penOnly;
        setPenOnly(newValue);
        whiteboard.current?.setPenOnly(newValue);
      }
    },
    {
      id: 'separator1',
      label: '',
      icon: <div style={{ height: 1, width: 24, backgroundColor: '#e0e0e0', margin: '4px 0' }} />,
    },
    {
      id: 'color',
      label: labels.color,
      type: 'colorPicker',
      value: strokeColor,
      onChange: (value) => handleColorChange(value as string),
      colors: colorPalette
    },
    {
      id: 'strokeWidth',
      label: labels.strokeWidth,
      type: 'slider',
      value: strokeWidth,
      min: 1,
      max: 50,
      onChange: (value) => handleStrokeWidthChange(value as number)
    },
    {
      id: 'addImage',
      label: labels.addImage,
      type: 'file',
      accept: 'image/*',
      onChange: (value) => handleImageUpload(value as string),
      showCameraOption: true,
      cameraLabels: {
        gallery: labels.gallery,
        camera: labels.camera
      },
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      )
    },
    {
      id: 'undo',
      label: labels.undo,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      ),
      onClick: () => whiteboard.current?.undo()
    },
    {
      id: 'clear',
      label: labels.clear,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      ),
      onClick: () => setShowClearConfirm(true)
    },
    {
      id: 'grid',
      label: labels.grid,
      active: showGrid,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" /><path d="M3 9h18" /><path d="M3 15h18" />
          <path d="M9 3v18" /><path d="M15 3v18" />
        </svg>
      ),
      onClick: () => setShowGrid(!showGrid)
    },
    {
      id: 'fullscreen',
      label: labels.fullscreen,
      active: isFullscreen,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      ),
      onClick: () => whiteboard.current?.toggleFullscreen()
    }
  ];

  // Filter out hidden actions and add custom actions
  const toolboxActions = [
    ...defaultActions.filter(action => !hideActions.includes(action.id)),
    ...additionalActions
  ];

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    ...style
  };

  return (
    <div style={containerStyle}>
      {/* Instructions bar */}
      <p style={{ 
        textAlign: 'center', 
        color: '#666', 
        fontSize: 12, 
        margin: '10px 0',
        flexShrink: 0
      }}>
        {labels.instructions}
        <span style={{ color: '#2196f3', fontWeight: 'bold' }}> | {labels.modeLabel}: {getModeLabel()}</span>
        {penOnly && <span style={{ color: '#4caf50', fontWeight: 'bold' }}> | {labels.penOnlyActive}</span>}
      </p>

      {/* Main whiteboard */}
      <Whiteboard
        containerStyle={{
          style: {
            border: '2px solid black',
            borderRadius: 10,
            flex: 1,
            backgroundColor: '#ffffff'
          }
        }}
        mode={mode}
        penOnly={penOnly}
        onChangeStrokes={handleStrokesChange}
        onChangeImages={handleImagesChange}
        onChangeDimensions={handleDimensionsChange}
        onFullscreenChange={handleFullscreenChange}
        onModeChange={(newMode) => setMode(newMode)}
        showGrid={showGrid}
        gridSize={gridSize}
        gridColor={gridColor}
        gridOpacity={gridOpacity}
        enablePan={true}
        enableZoom={true}
        minZoom={minZoom}
        maxZoom={maxZoom}
        dimensionColor={dimensionColor}
        initialStrokes={initialStrokes}
        initialImages={initialImages}
        initialDimensions={initialDimensions}
        ref={whiteboard}
      >
        <FloatingToolbox
          actions={toolboxActions}
          initialPosition={toolboxPosition}
          orientation={toolboxOrientation}
          containerRef={whiteboard.current?.getContainerRef()}
        />
      </Whiteboard>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />

      {/* Clear confirmation modal */}
      {showClearConfirm && (
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
            zIndex: 10000
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 24,
              minWidth: 300,
              maxWidth: 400,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
              {labels.clearConfirmTitle}
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: 14 }}>
              {labels.clearConfirm}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'white';
                }}
              >
                {labels.clearConfirmNo}
              </button>
              <button
                onClick={() => {
                  whiteboard.current?.clear();
                  setShowClearConfirm(false);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#ef4444';
                }}
              >
                {labels.clearConfirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

DrawingBoard.displayName = 'DrawingBoard';

export default DrawingBoard;
