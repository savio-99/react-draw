import { useRef, useState } from 'react'
import Whiteboard, { Stroke, FloatingToolbox, SketchImage, ToolboxAction } from '../lib/main';

const App = () => {
  const whiteboard = useRef<Whiteboard>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [images, setImages] = useState<SketchImage[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [mouseMode, setMouseMode] = useState(false);
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
      id: 'mouseMode',
      label: 'Mouse Mode (Select/Move)',
      active: mouseMode,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={mouseMode ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
      ),
      onClick: () => setMouseMode(!mouseMode)
    },
    {
      id: 'color',
      label: 'Pen Color',
      type: 'colorPicker',
      value: strokeColor,
      onChange: (value) => handleColorChange(value as string),
      colors: ['#000000', '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#f97316', '#06b6d4']
    },
    {
      id: 'strokeWidth',
      label: 'Pen Size',
      type: 'slider',
      value: strokeWidth,
      min: 1,
      max: 50,
      onChange: (value) => handleStrokeWidthChange(value as number)
    },
    {
      id: 'addImage',
      label: 'Add Image',
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
      label: 'Undo',
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
      label: 'Clear',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      ),
      onClick: () => whiteboard.current?.clear()
    },
    {
      id: 'grid',
      label: 'Toggle Grid',
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
      label: 'Fullscreen',
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
      label: 'Reset View',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      ),
      onClick: () => whiteboard.current?.resetView()
    }
  ];

  return <>
    <p style={{ textAlign: 'center', color: '#666', fontSize: 12, margin: '10px 0' }}>
      Ctrl + wheel to zoom (centered on mouse), middle button or two-finger touch to pan
      {mouseMode && <span style={{ color: '#2196f3', fontWeight: 'bold' }}> | Mouse Mode: Click images to select/move</span>}
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
      enabled={!mouseMode}
      onChangeStrokes={(strokes?: Stroke[]) => setStrokes(strokes || [])}
      onChangeImages={(images: SketchImage[]) => setImages(images)}
      onFullscreenChange={setIsFullscreen}
      showGrid={showGrid}
      gridSize={25}
      gridColor="#e0e0e0"
      gridOpacity={0.8}
      enablePan={true}
      enableZoom={true}
      minZoom={0.25}
      maxZoom={4}
      ref={whiteboard}
    >
      <FloatingToolbox
        actions={toolboxActions}
        initialPosition={{ x: 20, y: 20 }}
        orientation="vertical"
        containerRef={whiteboard.current?.getContainerRef()}
      />  
    </Whiteboard>
    <h3 style={{ textAlign: 'center' }}>Mirror Preview (strokes synced)</h3>
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
        Export JSON
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
        Import JSON
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
        Export Image
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
      enabled={false}
      autoFit={true}
      autoFitPadding={30}
    />
  </>
}

export default App
