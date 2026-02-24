# @savio99/react-draw

[![NPM Version](https://img.shields.io/npm/v/@savio99/react-draw.svg?branch=master)](https://www.npmjs.com/package/@savio99/react-draw) [![License](https://img.shields.io/npm/l/@savio99/react-draw.svg)](https://github.com/savio-99/react-draw/blob/master/LICENSE)

A powerful React whiteboard/drawing library with support for freehand drawing, images, pan & zoom, grid backgrounds, floating toolbox, and more.

## Features

- ✏️ **Freehand Drawing** - Smooth pen strokes with customizable color and width
- 🖼️ **Image Support** - Add, move, resize, and rotate images
- 🔍 **Pan & Zoom** - Navigate large canvases with mouse wheel, touch gestures, or middle-click
- 📐 **Grid Background** - Optional customizable grid overlay
- 🧰 **Floating Toolbox** - Draggable toolbar with buttons, sliders, color pickers, and file inputs
- 📺 **Fullscreen Mode** - Expand whiteboard to fullscreen
- 💾 **Export/Import JSON** - Save and load whiteboard state
- 🖼️ **Export to Image** - Download whiteboard as PNG/JPEG with custom resolution
- 🔄 **Auto-fit Preview** - Automatically scale content to fit container
- ↩️ **Undo Support** - Undo last stroke

## Installation

```bash
npm install --save @savio99/react-draw
# or
yarn add @savio99/react-draw
```

## Quick Start

```tsx
import { useRef, useState } from 'react';
import Whiteboard, { Stroke } from '@savio99/react-draw';

function App() {
  const whiteboard = useRef<Whiteboard>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  return (
    <Whiteboard
      ref={whiteboard}
      containerStyle={{
        style: {
          border: '2px solid black',
          borderRadius: 10,
          height: '80vh'
        }
      }}
      onChangeStrokes={(strokes) => setStrokes(strokes || [])}
    />
  );
}
```

## API Reference

### Whiteboard Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable drawing. Set to `false` for mouse mode (select/move images) |
| `containerStyle` | `object` | - | Container div props including `style` |
| `strokeColor` | `string` | `'#000000'` | Initial stroke color |
| `strokeWidth` | `number` | `4` | Initial stroke width |
| `strokes` | `Stroke[]` | - | Controlled strokes array |
| `initialStrokes` | `Stroke[]` | `[]` | Initial strokes (uncontrolled) |
| `onChangeStrokes` | `(strokes?: Stroke[]) => void` | - | Callback when strokes change |
| `images` | `SketchImage[]` | - | Controlled images array |
| `initialImages` | `SketchImage[]` | `[]` | Initial images (uncontrolled) |
| `onChangeImages` | `(images: SketchImage[]) => void` | - | Callback when images change |
| `showGrid` | `boolean` | `false` | Show grid background |
| `gridSize` | `number` | `20` | Grid cell size in pixels |
| `gridColor` | `string` | `'#cccccc'` | Grid line color |
| `gridOpacity` | `number` | `0.5` | Grid line opacity (0-1) |
| `enablePan` | `boolean` | `false` | Enable panning (middle-click or two-finger touch) |
| `enableZoom` | `boolean` | `false` | Enable zooming (Ctrl+scroll or pinch) |
| `minZoom` | `number` | `0.5` | Minimum zoom level |
| `maxZoom` | `number` | `3` | Maximum zoom level |
| `onFullscreenChange` | `(isFullscreen: boolean) => void` | - | Callback when fullscreen state changes |
| `autoFit` | `boolean` | `false` | Auto-fit content to container (useful for preview) |
| `autoFitPadding` | `number` | `20` | Padding around content when auto-fitting |
| `children` | `ReactNode` | - | Children (e.g., FloatingToolbox) |

### Whiteboard Methods

Access methods via ref:

```tsx
const whiteboard = useRef<Whiteboard>(null);

// Then use:
whiteboard.current?.methodName();
```

#### Drawing Methods

| Method | Description |
|--------|-------------|
| `undo()` | Undo the last stroke |
| `clear()` | Clear all strokes and images |
| `clearStrokes()` | Clear only strokes |
| `clearImages()` | Clear only images |
| `changeColor(color: string)` | Change stroke color |
| `changeStrokeWidth(width: number)` | Change stroke width |

#### Image Methods

| Method | Description |
|--------|-------------|
| `addImage(src, x?, y?, width?, height?)` | Add image to whiteboard |
| `removeImage(imageId: string)` | Remove image by ID |
| `updateImage(imageId, updates)` | Update image properties |
| `selectImage(imageId: string \| null)` | Select/deselect image |
| `getImages()` | Get all images |

#### View Methods

| Method | Description |
|--------|-------------|
| `setPan(x: number, y: number)` | Set pan position |
| `setZoom(scale: number)` | Set zoom level |
| `resetView()` | Reset pan and zoom to defaults |
| `fitToContent(padding?: number)` | Fit view to show all content |
| `toggleFullscreen()` | Toggle fullscreen mode |
| `isFullscreen()` | Check if in fullscreen mode |
| `getBounds()` | Get bounding box of all content |

#### Export/Import Methods

| Method | Description |
|--------|-------------|
| `exportData()` | Export as `WhiteboardData` object |
| `exportJSON()` | Export as JSON string |
| `importData(data, options?)` | Import from `WhiteboardData` object |
| `importJSON(json, options?)` | Import from JSON string |
| `exportToImage(options?)` | Export as data URL |
| `downloadImage(filename?, options?)` | Download as image file |

### Types

#### Stroke

```typescript
interface Stroke {
  box: { width: number; height: number };
  points: Point[];
  color: string;
  width: number;
}
```

#### SketchImage

```typescript
interface SketchImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
}
```

#### WhiteboardData

```typescript
interface WhiteboardData {
  version: string;
  strokes: Stroke[];
  images: SketchImage[];
  viewState?: {
    panX: number;
    panY: number;
    scale: number;
  };
}
```

#### Export Image Options

```typescript
interface ExportImageOptions {
  format?: 'png' | 'jpeg';
  quality?: number;        // 0-1, for JPEG
  width?: number;          // Output width
  height?: number;         // Output height
  scale?: number;          // Scale factor (e.g., 2 for 2x resolution)
  backgroundColor?: string;
}
```

## Examples

### Basic Drawing with Controls

```tsx
import { useRef, useState } from 'react';
import Whiteboard, { Stroke } from '@savio99/react-draw';

function DrawingApp() {
  const whiteboard = useRef<Whiteboard>(null);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => whiteboard.current?.undo()}>Undo</button>
        <button onClick={() => whiteboard.current?.clear()}>Clear</button>
        <input 
          type="color" 
          onChange={(e) => whiteboard.current?.changeColor(e.target.value)} 
        />
        <input 
          type="range" 
          min={1} 
          max={50}
          defaultValue={4}
          onChange={(e) => whiteboard.current?.changeStrokeWidth(parseInt(e.target.value))} 
        />
      </div>
      <Whiteboard
        ref={whiteboard}
        containerStyle={{ style: { height: '500px', border: '1px solid #ccc' } }}
      />
    </div>
  );
}
```

### With Grid and Pan/Zoom

```tsx
<Whiteboard
  ref={whiteboard}
  showGrid={true}
  gridSize={25}
  gridColor="#e0e0e0"
  gridOpacity={0.8}
  enablePan={true}
  enableZoom={true}
  minZoom={0.25}
  maxZoom={4}
  containerStyle={{ style: { height: '100vh' } }}
/>
```

### With FloatingToolbox

```tsx
import Whiteboard, { FloatingToolbox, ToolboxAction } from '@savio99/react-draw';

function App() {
  const whiteboard = useRef<Whiteboard>(null);
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);

  const actions: ToolboxAction[] = [
    {
      id: 'color',
      label: 'Color',
      type: 'colorPicker',
      value: color,
      onChange: (value) => {
        setColor(value as string);
        whiteboard.current?.changeColor(value as string);
      },
      colors: ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00']
    },
    {
      id: 'size',
      label: 'Size',
      type: 'slider',
      value: strokeWidth,
      min: 1,
      max: 50,
      onChange: (value) => {
        setStrokeWidth(value as number);
        whiteboard.current?.changeStrokeWidth(value as number);
      }
    },
    {
      id: 'addImage',
      label: 'Add Image',
      type: 'file',
      accept: 'image/*',
      onChange: (src) => whiteboard.current?.addImage(src as string),
      icon: <span>🖼️</span>
    },
    {
      id: 'undo',
      label: 'Undo',
      onClick: () => whiteboard.current?.undo(),
      icon: <span>↩️</span>
    },
    {
      id: 'clear',
      label: 'Clear',
      onClick: () => whiteboard.current?.clear(),
      icon: <span>🗑️</span>
    }
  ];

  return (
    <Whiteboard ref={whiteboard} containerStyle={{ style: { height: '100vh' } }}>
      <FloatingToolbox
        actions={actions}
        initialPosition={{ x: 20, y: 20 }}
        orientation="vertical"
        containerRef={whiteboard.current?.getContainerRef()}
      />
    </Whiteboard>
  );
}
```

### Mouse Mode for Image Selection

```tsx
function App() {
  const whiteboard = useRef<Whiteboard>(null);
  const [mouseMode, setMouseMode] = useState(false);

  return (
    <div>
      <button onClick={() => setMouseMode(!mouseMode)}>
        {mouseMode ? 'Drawing Mode' : 'Mouse Mode'}
      </button>
      <Whiteboard
        ref={whiteboard}
        enabled={!mouseMode} // Disable drawing in mouse mode
        containerStyle={{ style: { height: '500px' } }}
      />
    </div>
  );
}
```

### Mirror Preview with Auto-Fit

```tsx
function App() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [images, setImages] = useState<SketchImage[]>([]);

  return (
    <div>
      {/* Main whiteboard */}
      <Whiteboard
        onChangeStrokes={(s) => setStrokes(s || [])}
        onChangeImages={(i) => setImages(i)}
        containerStyle={{ style: { height: '60vh' } }}
      />
      
      {/* Mirror preview - auto-fits content */}
      <Whiteboard
        strokes={strokes}
        images={images}
        enabled={false}
        autoFit={true}
        autoFitPadding={30}
        containerStyle={{ 
          style: { 
            height: 200, 
            width: '50%', 
            margin: '0 auto',
            border: '1px solid #ccc'
          } 
        }}
      />
    </div>
  );
}
```

### Export/Import JSON

```tsx
function App() {
  const whiteboard = useRef<Whiteboard>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = whiteboard.current?.exportData();
    if (!data) return;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whiteboard.json';
    a.click();
    URL.revokeObjectURL(url);
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
  };

  return (
    <div>
      <button onClick={handleExport}>Export</button>
      <button onClick={() => fileInputRef.current?.click()}>Import</button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />
      <Whiteboard ref={whiteboard} containerStyle={{ style: { height: '500px' } }} />
    </div>
  );
}
```

### Export to Image

```tsx
function App() {
  const whiteboard = useRef<Whiteboard>(null);

  const handleExportPNG = async () => {
    await whiteboard.current?.downloadImage('my-drawing.png', {
      format: 'png',
      scale: 2, // 2x resolution
      backgroundColor: '#ffffff'
    });
  };

  const handleExportJPEG = async () => {
    await whiteboard.current?.downloadImage('my-drawing.jpg', {
      format: 'jpeg',
      quality: 0.9,
      width: 1920, // Fixed width
      backgroundColor: '#ffffff'
    });
  };

  const handleGetDataUrl = async () => {
    const dataUrl = await whiteboard.current?.exportToImage({
      format: 'png',
      scale: 1
    });
    console.log(dataUrl); // Can be used as img src
  };

  return (
    <div>
      <button onClick={handleExportPNG}>Export PNG (2x)</button>
      <button onClick={handleExportJPEG}>Export JPEG (1920px)</button>
      <button onClick={handleGetDataUrl}>Get Data URL</button>
      <Whiteboard ref={whiteboard} containerStyle={{ style: { height: '500px' } }} />
    </div>
  );
}
```

### Fullscreen Mode

```tsx
function App() {
  const whiteboard = useRef<Whiteboard>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div>
      <button onClick={() => whiteboard.current?.toggleFullscreen()}>
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
      <Whiteboard
        ref={whiteboard}
        onFullscreenChange={setIsFullscreen}
        containerStyle={{ 
          style: { 
            height: '500px',
            backgroundColor: '#ffffff' // Background in fullscreen
          } 
        }}
      />
    </div>
  );
}
```

## FloatingToolbox

A draggable toolbar component that can be placed inside the Whiteboard.

### FloatingToolbox Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `actions` | `ToolboxAction[]` | - | Array of toolbar actions |
| `visible` | `boolean` | `true` | Show/hide toolbox |
| `initialPosition` | `{ x: number; y: number }` | `{ x: 20, y: 20 }` | Initial position |
| `orientation` | `'horizontal' \| 'vertical'` | `'vertical'` | Layout direction |
| `style` | `CSSProperties` | - | Additional styles |
| `containerRef` | `RefObject<HTMLElement>` | - | Reference to whiteboard container for bounds |

### ToolboxAction Types

```typescript
interface ToolboxAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  type?: 'button' | 'color' | 'number' | 'file' | 'slider' | 'colorPicker';
  value?: string | number | boolean;
  onChange?: (value: string | number | boolean) => void;
  min?: number;    // For slider
  max?: number;    // For slider
  accept?: string; // For file input
  colors?: string[]; // For colorPicker
}
```

### Action Types

- **button** (default): Simple click button
- **colorPicker**: Color grid popup with presets
- **slider**: Range slider with popup
- **file**: File input (returns data URL for images)
- **color**: Native color input
- **number**: Native number input

## Keyboard & Mouse Controls

| Action | Control |
|--------|---------|
| Zoom | `Ctrl + Scroll` or pinch gesture |
| Pan | `Middle mouse button` drag or two-finger touch |
| Draw | Left mouse button or single-finger touch |
| Select Image | Click image (when `enabled={false}`) |
| Move Image | Drag selected image |
| Resize Image | Drag corner handles |

## License

MIT © [savio-99](https://github.com/savio-99)