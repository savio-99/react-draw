import { useRef } from 'react'
import { DrawingBoard, DrawingBoardRef } from '../lib/main';

const App = () => {
  const drawingBoard = useRef<DrawingBoardRef>(null);

  // Export whiteboard to JSON file
  const handleExport = () => {
    const json = drawingBoard.current?.exportJSON();
    if (!json) return;
    
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
    const success = await drawingBoard.current?.downloadImage(undefined, {
      format: 'png',
      scale: 2,
      backgroundColor: '#ffffff'
    });
    if (!success) {
      alert('Nothing to export. Draw something first!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <DrawingBoard
        ref={drawingBoard}
        style={{ flex: 1 }}
        showGrid={true}
        gridSize={25}
        gridColor="#e0e0e0"
        gridOpacity={0.8}
        minZoom={0.25}
        maxZoom={4}
        dimensionColor="#ff5722"
        defaultPenColor="#000000"
        defaultPenWidth={4}
      />
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 16, 
        padding: 16,
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#f5f5f5'
      }}>
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
      </div>
    </div>
  );
}

export default App
