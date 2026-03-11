import { useRef, useState } from 'react'
import Whiteboard, { Stroke, FloatingToolbox, SketchImage, ToolboxAction, WhiteboardMode, DimensionData } from '../lib/main';

const App = () => {
  const whiteboard = useRef<Whiteboard>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [images, setImages] = useState<SketchImage[]>([]);
  const [dimensions, setDimensions] = useState<DimensionData[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [mode, setMode] = useState<WhiteboardMode>('pen');
  const [penOnly, setPenOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = (color: string) => {
    setStrokeColor(color);
    whiteboard.current?.changeColor(color);
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
    whiteboard.current?.changeStrokeWidth(width);
  };

  const handleImageUpload = (src: string) => {
    whiteboard.current?.addImage(src);
  };

  // Export whiteboard to JSON file
  const handleExport = () => {
    const data = whiteboard.current?.exportData();
    if (!data) return;
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export whiteboard to image
  const handleExportImage = async () => {
    const success = await whiteboard.current?.downloadImage(undefined, {
      format: 'png',
      scale: 2, // 2x resolution for better quality
      backgroundColor: '#ffffff'
    });
    if (!success) {
      alert('Nothing to export. Draw something first!');
    }
  };

  // Import whiteboard from JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      const success = whiteboard.current?.importJSON(json);
      if (success) {
        console.log('Whiteboard imported successfully');
      } else {
        alert('Failed to import whiteboard data. Check console for details.');
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const toolboxActions: ToolboxAction[] = [
    {
      id: 'penMode',
      label: 'Penna',
      active: mode === 'pen',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={mode === 'pen' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      ),
      onClick: () => {
        setMode('pen');
        whiteboard.current?.setMode('pen');
      }
    },
    {
      id: 'handMode',
      label: 'Mano (Sposta)',
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
      label: 'Quota',
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
      label: 'Seleziona (Mouse)',
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
      label: 'Gomma',
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
      label: 'Solo Penna (Stylus)',
      active: penOnly,
      icon: penOnly ? (
        // Hand with X when penOnly is active (finger touch disabled)
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
          <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
          <path d="M14 8V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4" />
          <path d="M10 8V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7" />
          <path d="M18 8a2 2 0 1 1 4 0v5a8 8 0 0 1-8 8h-2a8 8 0 0 1-6-2.69" />
          <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.5" />
        </svg>
      ) : (
        // Hand with checkmark when penOnly is disabled (finger touch enabled)
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
      label: 'Colore Penna',
      type: 'colorPicker',
      value: strokeColor,
      onChange: (value) => handleColorChange(value as string),
      colors: ['#000000', '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#f97316', '#06b6d4']
    },
    {
      id: 'strokeWidth',
      label: 'Dimensione Penna',
      type: 'slider',
      value: strokeWidth,
      min: 1,
      max: 50,
      onChange: (value) => handleStrokeWidthChange(value as number)
    },
    {
      id: 'addImage',
      label: 'Aggiungi Immagine',
      type: 'file',
      accept: 'image/*',
      onChange: (value) => handleImageUpload(value as string),
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
      label: 'Annulla',
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
      label: 'Cancella Tutto',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      ),
      onClick: () => whiteboard.current?.clear()
    },
    {
      id: 'grid',
      label: 'Mostra/Nascondi Griglia',
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
      label: 'Schermo Intero',
      active: isFullscreen,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      ),
      onClick: () => whiteboard.current?.toggleFullscreen()
    },
    {
      id: 'resetView',
      label: 'Reimposta Vista',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9h6v6H9z" />
          <path d="M9 3v2" />
          <path d="M15 3v2" />
          <path d="M9 19v2" />
          <path d="M15 19v2" />
          <path d="M3 9h2" />
          <path d="M3 15h2" />
          <path d="M19 9h2" />
          <path d="M19 15h2" />
        </svg>
      ),
      onClick: () => whiteboard.current?.resetView()
    }
  ];

  const getModeLabel = () => {
    switch (mode) {
      case 'pen': return 'Penna';
      case 'hand': return 'Mano (Sposta)';
      case 'dimension': return 'Quota';
      case 'mouse': return 'Seleziona';
      case 'eraser': return 'Gomma';
      default: return '';
    }
  };

  return <>
    <p style={{ textAlign: 'center', color: '#666', fontSize: 12, margin: '10px 0' }}>
      Ctrl + rotellina per zoom, tasto centrale o due dita per spostarsi
      <span style={{ color: '#2196f3', fontWeight: 'bold' }}> | Modalità: {getModeLabel()}</span>
      {penOnly && <span style={{ color: '#4caf50', fontWeight: 'bold' }}> | Solo Penna attivo</span>}
    </p>
    <Whiteboard
      containerStyle={{
        style: {
          border: '2px solid black',
          borderRadius: 10,
          margin: 20,
          height: 'calc(100vh - 150px)',
          backgroundColor: '#ffffff'
        }
      }}
      mode={mode}
      penOnly={penOnly}
      onChangeStrokes={(strokes?: Stroke[]) => setStrokes(strokes || [])}
      onChangeImages={(images: SketchImage[]) => setImages(images)}
      onChangeDimensions={(dims: DimensionData[]) => setDimensions(dims)}
      onFullscreenChange={setIsFullscreen}
      showGrid={showGrid}
      gridSize={25}
      gridColor="#e0e0e0"
      gridOpacity={0.8}
      enablePan={true}
      enableZoom={true}
      minZoom={0.25}
      maxZoom={4}
      dimensionColor="#ff5722"
      ref={whiteboard}
    >
      <FloatingToolbox
        actions={toolboxActions}
        initialPosition={{ x: 20, y: 20 }}
        orientation="vertical"
        containerRef={whiteboard.current?.getContainerRef()}
      />  
    </Whiteboard>
    <h3 style={{ textAlign: 'center' }}>Anteprima (sincronizzata)</h3>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
      <button
        onClick={handleExport}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          backgroundColor: '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Esporta JSON
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Importa JSON
      </button>
      <button
        onClick={handleExportImage}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          backgroundColor: '#9c27b0',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        Esporta Immagine
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />
    </div>
    <Whiteboard
      containerStyle={{
        style: {
          border: '2px solid black',
          borderRadius: 10,
          width: '50%',
          height: 300,
          margin: '20px auto',
          backgroundColor: '#ffffff'
        }
      }}
      strokes={strokes}
      images={images}
      dimensions={dimensions}
      enabled={false}
      autoFit={true}
      autoFitPadding={30}
    />
  </>
}

export default App
