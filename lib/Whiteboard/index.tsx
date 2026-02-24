import React from 'react'
import type { TouchEvent, MouseEvent, WheelEvent } from 'react'
import Pen from '../Pen'
import { Point, Stroke } from '../main'
import Grid from '../Grid'
import { SketchImage, createImage, loadImageDimensions } from '../Image'

export interface WhiteboardData {
  version: string;
  strokes: Stroke[];
  images: SketchImage[];
  viewState?: {
    panX: number;
    panY: number;
    scale: number;
  };
}

interface WhiteboardProps {
  enabled?: boolean,
  containerStyle?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
  strokeColor?: string,
  strokeWidth?: number,
  onChangeStrokes?: (strokes?: Stroke[]) => void,
  strokes?: Stroke[],
  initialStrokes?: Stroke[],
  zIndex?: number,
  showGrid?: boolean,
  gridSize?: number,
  gridColor?: string,
  gridOpacity?: number,
  enablePan?: boolean,
  enableZoom?: boolean,
  minZoom?: number,
  maxZoom?: number,
  images?: SketchImage[],
  initialImages?: SketchImage[],
  onChangeImages?: (images: SketchImage[]) => void,
  onFullscreenChange?: (isFullscreen: boolean) => void,
  autoFit?: boolean,
  autoFitPadding?: number,
  children?: React.ReactNode
}

interface WhiteboardState {
  tracker: number,
  currentPoints: Stroke,
  previousStrokes: Stroke[],
  pen: Pen,
  strokeWidth: number,
  strokeColor: string,
  height: number,
  width: number,
  px: number,
  py: number,
  panX: number,
  panY: number,
  scale: number,
  isPanning: boolean,
  lastPanPoint: { x: number, y: number } | null,
  lastTouchDistance: number | null,
  sketchImages: SketchImage[],
  selectedImageId: string | null,
  isDraggingImage: boolean,
  isResizingImage: boolean,
  resizeHandle: string | null,
  imageStartPos: { x: number, y: number } | null,
  imageDragStart: { x: number, y: number } | null,
  imageStartSize: { width: number, height: number } | null,
  isFullscreen: boolean
}

export default class Whiteboard extends React.Component<WhiteboardProps, WhiteboardState> {

  drawer: HTMLCanvasElement | null = null;
  containerElement: HTMLDivElement | null = null;

  constructor(props: WhiteboardProps) {
    super(props)

    this.state = {
      tracker: 0,
      currentPoints: {
        color: props.strokeColor || '#000000',
        width: props.strokeWidth || 4,
        box: { height: 0, width: 0 },
        points: []
      },
      previousStrokes: this.props.initialStrokes || [],
      pen: new Pen(),
      strokeWidth: props.strokeWidth || 4,
      strokeColor: props.strokeColor || '#000000',
      height: 0,
      width: 0,
      px: 0,
      py: 0,
      panX: 0,
      panY: 0,
      scale: 1,
      isPanning: false,
      lastPanPoint: null,
      lastTouchDistance: null,
      sketchImages: this.props.initialImages || [],
      selectedImageId: null,
      isDraggingImage: false,
      isResizingImage: false,
      resizeHandle: null,
      imageStartPos: null,
      imageDragStart: null,
      imageStartSize: null,
      isFullscreen: false
    }
  }

  componentDidUpdate(prevProps: WhiteboardProps) {
    const strokesChanged = this.props.strokes !== undefined && this.props.strokes !== prevProps.strokes;
    const imagesChanged = this.props.images !== undefined && this.props.images !== prevProps.images;
    
    if (strokesChanged || imagesChanged) {
      // Build state update with both strokes and images together to avoid race conditions
      const stateUpdate: Partial<WhiteboardState> = {};
      
      if (strokesChanged) {
        stateUpdate.previousStrokes = this.props.strokes;
      }
      if (imagesChanged) {
        stateUpdate.sketchImages = this.props.images;
      }
      
      this.setState(stateUpdate as WhiteboardState, () => {
        // Rebuild pen strokes if strokes changed
        if (strokesChanged) {
          this.state.pen.clear();
          this.props.strokes!.forEach(stroke => this.state.pen.addStroke(stroke));
        }
        // Auto-fit after all state updates are applied
        if (this.props.autoFit) {
          // Use requestAnimationFrame to ensure DOM is updated
          requestAnimationFrame(() => {
            this.fitToContent();
          });
        }
      });
    }
  }

  preventDefault = (e: Event) => {
    e.preventDefault();
  }

  addImage = async (src: string, x?: number, y?: number, width?: number, height?: number) => {
    try {
      let imgWidth = width;
      let imgHeight = height;
      
      if (!imgWidth || !imgHeight) {
        const dimensions = await loadImageDimensions(src);
        const maxSize = Math.min(this.state.width, this.state.height) * 0.5;
        const ratio = Math.min(maxSize / dimensions.width, maxSize / dimensions.height);
        imgWidth = dimensions.width * ratio;
        imgHeight = dimensions.height * ratio;
      }

      const newImage = createImage(
        src,
        x ?? (this.state.width - imgWidth) / 2,
        y ?? (this.state.height - imgHeight) / 2,
        imgWidth,
        imgHeight
      );

      const newImages = [...this.state.sketchImages, newImage];
      this.setState({ sketchImages: newImages });
      this.props.onChangeImages?.(newImages);
      return newImage;
    } catch (error) {
      console.error('Failed to load image:', error);
      return null;
    }
  }

  removeImage = (imageId: string) => {
    const newImages = this.state.sketchImages.filter(img => img.id !== imageId);
    this.setState({ sketchImages: newImages, selectedImageId: null });
    this.props.onChangeImages?.(newImages);
  }

  updateImage = (imageId: string, updates: Partial<SketchImage>) => {
    const newImages = this.state.sketchImages.map(img =>
      img.id === imageId ? { ...img, ...updates } : img
    );
    this.setState({ sketchImages: newImages });
    this.props.onChangeImages?.(newImages);
  }

  selectImage = (imageId: string | null) => {
    this.setState({ selectedImageId: imageId });
  }

  onImageMouseDown = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const image = this.state.sketchImages.find(img => img.id === imageId);
    if (!image) return;

    const coords = this.screenToCanvas(e.clientX, e.clientY);
    
    this.setState({
      selectedImageId: imageId,
      isDraggingImage: true,
      imageStartPos: { x: image.x, y: image.y },
      imageDragStart: coords
    });
  }

  onResizeHandleMouseDown = (e: React.MouseEvent, imageId: string, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const image = this.state.sketchImages.find(img => img.id === imageId);
    if (!image) return;

    const coords = this.screenToCanvas(e.clientX, e.clientY);
    
    this.setState({
      selectedImageId: imageId,
      isResizingImage: true,
      resizeHandle: handle,
      imageStartPos: { x: image.x, y: image.y },
      imageStartSize: { width: image.width, height: image.height },
      imageDragStart: coords
    });
  }

  handleImageManipulation = (clientX: number, clientY: number) => {
    const { 
      selectedImageId, isDraggingImage, isResizingImage, resizeHandle,
      imageStartPos, imageDragStart, imageStartSize, sketchImages 
    } = this.state;
    
    if (!selectedImageId || !imageDragStart) return;
    
    const coords = this.screenToCanvas(clientX, clientY);
    const dx = coords.x - imageDragStart.x;
    const dy = coords.y - imageDragStart.y;
    
    if (isDraggingImage && imageStartPos) {
      // Move image
      const newImages = sketchImages.map(img => {
        if (img.id === selectedImageId) {
          return {
            ...img,
            x: imageStartPos.x + dx,
            y: imageStartPos.y + dy
          };
        }
        return img;
      });
      this.setState({ sketchImages: newImages });
    } else if (isResizingImage && resizeHandle && imageStartSize && imageStartPos) {
      // Resize image
      const newImages = sketchImages.map(img => {
        if (img.id === selectedImageId) {
          let newWidth = imageStartSize.width;
          let newHeight = imageStartSize.height;
          let newX = imageStartPos.x;
          let newY = imageStartPos.y;
          
          const aspectRatio = imageStartSize.width / imageStartSize.height;
          
          switch (resizeHandle) {
            case 'se': // Bottom-right
              newWidth = Math.max(20, imageStartSize.width + dx);
              newHeight = newWidth / aspectRatio;
              break;
            case 'sw': // Bottom-left
              newWidth = Math.max(20, imageStartSize.width - dx);
              newHeight = newWidth / aspectRatio;
              newX = imageStartPos.x + (imageStartSize.width - newWidth);
              break;
            case 'ne': // Top-right
              newWidth = Math.max(20, imageStartSize.width + dx);
              newHeight = newWidth / aspectRatio;
              newY = imageStartPos.y + (imageStartSize.height - newHeight);
              break;
            case 'nw': // Top-left
              newWidth = Math.max(20, imageStartSize.width - dx);
              newHeight = newWidth / aspectRatio;
              newX = imageStartPos.x + (imageStartSize.width - newWidth);
              newY = imageStartPos.y + (imageStartSize.height - newHeight);
              break;
          }
          
          return { ...img, x: newX, y: newY, width: newWidth, height: newHeight };
        }
        return img;
      });
      this.setState({ sketchImages: newImages });
    }
  }

  endImageManipulation = () => {
    if (this.state.isDraggingImage || this.state.isResizingImage) {
      this.props.onChangeImages?.(this.state.sketchImages);
    }
    this.setState({
      isDraggingImage: false,
      isResizingImage: false,
      resizeHandle: null,
      imageStartPos: null,
      imageDragStart: null,
      imageStartSize: null
    });
  }

  deselectImage = () => {
    this.setState({ selectedImageId: null });
  }

  getImages = () => {
    return this.state.sketchImages;
  }

  setPan = (x: number, y: number) => {
    this.setState({ panX: x, panY: y });
  }

  setZoom = (scale: number) => {
    const { minZoom = 0.5, maxZoom = 3 } = this.props;
    const clampedScale = Math.max(minZoom, Math.min(maxZoom, scale));
    this.setState({ scale: clampedScale });
  }

  resetView = () => {
    this.setState({ panX: 0, panY: 0, scale: 1 });
  }

  getBounds = (): { minX: number; minY: number; maxX: number; maxY: number } | null => {
    const { previousStrokes, sketchImages } = this.state;
    
    if (previousStrokes.length === 0 && sketchImages.length === 0) {
      return null;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Calculate bounds from strokes, accounting for stroke width
    previousStrokes.forEach(stroke => {
      const halfWidth = stroke.width / 2;
      stroke.points.forEach(point => {
        minX = Math.min(minX, point.x - halfWidth);
        minY = Math.min(minY, point.y - halfWidth);
        maxX = Math.max(maxX, point.x + halfWidth);
        maxY = Math.max(maxY, point.y + halfWidth);
      });
    });

    // Calculate bounds from images
    sketchImages.forEach(img => {
      minX = Math.min(minX, img.x);
      minY = Math.min(minY, img.y);
      maxX = Math.max(maxX, img.x + img.width);
      maxY = Math.max(maxY, img.y + img.height);
    });

    if (minX === Infinity) return null;

    return { minX, minY, maxX, maxY };
  }

  fitToContent = (padding?: number) => {
    const bounds = this.getBounds();
    if (!bounds) return;

    const { width, height } = this.state;
    if (width === 0 || height === 0) return;

    const pad = padding ?? this.props.autoFitPadding ?? 20;
    const contentWidth = bounds.maxX - bounds.minX + pad * 2;
    const contentHeight = bounds.maxY - bounds.minY + pad * 2;

    if (contentWidth <= 0 || contentHeight <= 0) return;

    const scaleX = width / contentWidth;
    const scaleY = height / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 1);

    const contentCenterX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
    const contentCenterY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
    const newPanX = width / 2 - contentCenterX * newScale;
    const newPanY = height / 2 - contentCenterY * newScale;

    this.setState({ scale: newScale, panX: newPanX, panY: newPanY });
  }

  exportToImage = async (options?: { 
    format?: 'png' | 'jpeg'; 
    quality?: number; 
    width?: number; 
    height?: number;
    backgroundColor?: string;
    scale?: number;
  }): Promise<string | null> => {
    const { 
      format = 'png', 
      quality = 0.92, 
      backgroundColor = '#ffffff',
      scale: exportScale
    } = options || {};

    const bounds = this.getBounds();
    if (!bounds) return null;

    const padding = 20;
    const contentWidth = bounds.maxX - bounds.minX + padding * 2;
    const contentHeight = bounds.maxY - bounds.minY + padding * 2;

    let outputWidth: number;
    let outputHeight: number;
    
    if (options?.width && options?.height) {
      outputWidth = options.width;
      outputHeight = options.height;
    } else if (options?.width) {
      outputWidth = options.width;
      outputHeight = (contentHeight / contentWidth) * options.width;
    } else if (options?.height) {
      outputHeight = options.height;
      outputWidth = (contentWidth / contentHeight) * options.height;
    } else if (exportScale) {
      outputWidth = contentWidth * exportScale;
      outputHeight = contentHeight * exportScale;
    } else {
      outputWidth = contentWidth;
      outputHeight = contentHeight;
    }

    const renderScale = outputWidth / contentWidth;

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    ctx.translate(padding * renderScale, padding * renderScale);
    ctx.translate(-bounds.minX * renderScale, -bounds.minY * renderScale);
    ctx.scale(renderScale, renderScale);

    for (const img of this.state.sketchImages) {
      await new Promise<void>((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
          ctx.save();
          if (img.rotation) {
            const cx = img.x + img.width / 2;
            const cy = img.y + img.height / 2;
            ctx.translate(cx, cy);
            ctx.rotate((img.rotation * Math.PI) / 180);
            ctx.translate(-cx, -cy);
          }
          ctx.globalAlpha = img.opacity ?? 1;
          ctx.drawImage(image, img.x, img.y, img.width, img.height);
          ctx.restore();
          resolve();
        };
        image.onerror = () => resolve();
        image.src = img.src;
      });
    }

    this.state.previousStrokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const points = stroke.points;
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }
      
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
    });

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return canvas.toDataURL(mimeType, quality);
  }

  downloadImage = async (filename?: string, options?: Parameters<typeof this.exportToImage>[0]) => {
    const dataUrl = await this.exportToImage(options);
    if (!dataUrl) return false;

    const format = options?.format || 'png';
    const name = filename || `whiteboard-${new Date().toISOString().slice(0, 10)}.${format}`;
    
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  toggleFullscreen = async () => {
    const container = this.containerElement;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        this.setState({ isFullscreen: true });
        this.props.onFullscreenChange?.(true);
      } else {
        await document.exitFullscreen();
        this.setState({ isFullscreen: false });
        this.props.onFullscreenChange?.(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }

  isFullscreen = () => {
    return this.state.isFullscreen;
  }

  onWheel = (e: WheelEvent) => {
    if (!this.props.enableZoom) return;
    
    const isTouchpad = Math.abs(e.deltaY) < 50;
    if (!this.state.isFullscreen && !e.ctrlKey && !isTouchpad) {
      return; // Allow normal scroll when not pressing Ctrl
    }
    
    e.preventDefault();
    
    const rect = this.drawer?.getBoundingClientRect();
    if (!rect) return;
    
    // Mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Current pan and scale
    const { panX, panY, scale } = this.state;
    
    // Calculate zoom
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const { minZoom = 0.5, maxZoom = 3 } = this.props;
    const newScale = Math.max(minZoom, Math.min(maxZoom, scale * delta));
    
    // Calculate the point in canvas space that's under the mouse
    const canvasX = (mouseX - panX) / scale;
    const canvasY = (mouseY - panY) / scale;
    
    // Calculate new pan to keep the same point under the mouse
    const newPanX = mouseX - canvasX * newScale;
    const newPanY = mouseY - canvasY * newScale;
    
    this.setState({ 
      scale: newScale,
      panX: newPanX,
      panY: newPanY
    });
  }

  // Handle two-finger touch for pan
  getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getTouchCenter = (touches: React.TouchList): { x: number; y: number } => {
    if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  undo = () => {
    if (this.state.currentPoints.points.length > 0 || this.state.previousStrokes.length < 1) return
    const strokes = this.state.previousStrokes
    strokes.pop()

    this.state.pen.undoStroke()
    const { height, width } = this.state;

    this.setState({
      previousStrokes: [...strokes],
      currentPoints: {
        color: this.state.strokeColor,
        width: this.state.strokeWidth,
        box: { height, width },
        points: []
      },
      tracker: this.state.tracker - 1,
    })

    this._onChangeStrokes([...strokes])
  }

  changeColor = (color: string) => {
    const { currentPoints } = this.state;
    currentPoints.color = color;
    this.setState({ currentPoints, strokeColor: color })
  }

  changeStrokeWidth = (stroke: number) => {
    const { currentPoints } = this.state;
    currentPoints.width = stroke;
    this.setState({ currentPoints, strokeWidth: stroke })
  }

  _onChangeStrokes = (strokes: Stroke[]) => {
    if (this.props.onChangeStrokes) this.props.onChangeStrokes(strokes)
  }

  clear = () => {
    const { height, width } = this.state;
    this.setState({
      previousStrokes: [],
      currentPoints: {
        color: this.state.strokeColor,
        width: this.state.strokeWidth,
        box: { height, width },
        points: []
      },
      tracker: 0,
      sketchImages: []
    })
    this.state.pen.clear()
    this._onChangeStrokes([])
    this.props.onChangeImages?.([])
  }

  clearStrokes = () => {
    const { height, width } = this.state;
    this.setState({
      previousStrokes: [],
      currentPoints: {
        color: this.state.strokeColor,
        width: this.state.strokeWidth,
        box: { height, width },
        points: []
      },
      tracker: 0,
    })
    this.state.pen.clear()
    this._onChangeStrokes([])
  }

  clearImages = () => {
    this.setState({ sketchImages: [] })
    this.props.onChangeImages?.([])
  }

  dragging = false;

  // Convert screen coordinates to canvas coordinates (accounting for pan/zoom)
  screenToCanvas = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = this.drawer?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    const { panX, panY, scale } = this.state;
    const x = (clientX - rect.left - panX) / scale;
    const y = (clientY - rect.top - panY) / scale;
    return { x, y };
  }

  onTouch = (evt: TouchEvent | MouseEvent) => {
    if (this.props.enabled == false) return;
    if (this.state.isPanning) return;

    let x: number = 0;
    let y: number = 0;
    let time: number | undefined = undefined;

    if (evt.nativeEvent instanceof TouchEvent) {
      const event = evt as TouchEvent
      
      // Two-finger touch = pan/zoom, not draw
      if (event.touches.length >= 2) return;
      
      const touch: React.Touch | null = event.touches[0];
      if (!touch) return;

      const coords = this.screenToCanvas(touch.clientX, touch.clientY);
      x = coords.x;
      y = coords.y;
      time = evt.timeStamp;
    } else {
      const event = evt as MouseEvent;
      const coords = this.screenToCanvas(event.clientX, event.clientY);
      x = coords.x;
      y = coords.y;
    }

    const newCurrentPoints = { ...this.state.currentPoints, points: [...this.state.currentPoints.points, new Point(x, y, time)] }

    this.setState({
      currentPoints: newCurrentPoints
    })

  }


  onResponderGrant = (evt: TouchEvent<HTMLCanvasElement> | MouseEvent<HTMLCanvasElement>) => {
    this.dragging = true;
    this.onTouch(evt);
    document.addEventListener('touchmove', this.preventDefault, { passive: false });
    document.addEventListener('mousemove', this.preventDefault);
  }

  onResponderMove = (evt: TouchEvent<HTMLCanvasElement> | MouseEvent<HTMLCanvasElement>) => {
    // Handle two-finger pan/zoom
    if (evt.nativeEvent instanceof TouchEvent) {
      const touchEvent = evt as TouchEvent<HTMLCanvasElement>;
      if (touchEvent.touches.length >= 2 && this.props.enablePan) {
        const center = this.getTouchCenter(touchEvent.touches);
        const distance = this.getTouchDistance(touchEvent.touches);

        if (this.state.lastPanPoint && this.state.lastTouchDistance !== null) {
          // Pan
          const dx = center.x - this.state.lastPanPoint.x;
          const dy = center.y - this.state.lastPanPoint.y;
          
          // Zoom
          if (this.props.enableZoom && this.state.lastTouchDistance > 0) {
            const scaleChange = distance / this.state.lastTouchDistance;
            this.setZoom(this.state.scale * scaleChange);
          }

          this.setState({
            panX: this.state.panX + dx,
            panY: this.state.panY + dy,
            lastPanPoint: center,
            lastTouchDistance: distance,
            isPanning: true
          });
        } else {
          this.setState({
            lastPanPoint: center,
            lastTouchDistance: distance,
            isPanning: true
          });
        }
        return;
      }
    }
    
    if (this.dragging && !this.state.isPanning) this.onTouch(evt);
  }

  // Handle middle mouse button pan
  onMouseDown = (evt: MouseEvent<HTMLCanvasElement>) => {
    // Click on canvas deselects image if nothing else is happening
    if (this.state.selectedImageId && !this.state.isDraggingImage && !this.state.isResizingImage) {
      this.deselectImage();
    }
    
    // Middle mouse button for pan
    if (evt.button === 1 && this.props.enablePan) {
      evt.preventDefault();
      this.setState({
        isPanning: true,
        lastPanPoint: { x: evt.clientX, y: evt.clientY }
      });
      return;
    }
    this.onResponderGrant(evt);
  }

  onMouseMove = (evt: MouseEvent<HTMLCanvasElement>) => {
    // Handle image manipulation
    if (this.state.isDraggingImage || this.state.isResizingImage) {
      this.handleImageManipulation(evt.clientX, evt.clientY);
      return;
    }
    
    // Handle middle button pan
    if (this.state.isPanning && this.state.lastPanPoint) {
      const dx = evt.clientX - this.state.lastPanPoint.x;
      const dy = evt.clientY - this.state.lastPanPoint.y;
      this.setState({
        panX: this.state.panX + dx,
        panY: this.state.panY + dy,
        lastPanPoint: { x: evt.clientX, y: evt.clientY }
      });
      return;
    }
    this.onResponderMove(evt);
  }

  onMouseUp = () => {
    if (this.state.isDraggingImage || this.state.isResizingImage) {
      this.endImageManipulation();
      return;
    }
    this.onResponderRelease();
  }

  handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    // Two-finger touch starts pan mode
    if (e.touches.length >= 2 && this.props.enablePan) {
      const center = this.getTouchCenter(e.touches);
      const distance = this.getTouchDistance(e.touches);
      this.setState({
        isPanning: true,
        lastPanPoint: center,
        lastTouchDistance: distance
      });
      return;
    }
    this.onResponderGrant(e);
  }

  onResponderRelease = () => {
    this.dragging = false;
    this.setState({
      isPanning: false,
      lastPanPoint: null,
      lastTouchDistance: null
    });

    document.removeEventListener('touchmove', this.preventDefault);
    document.removeEventListener('mousemove', this.preventDefault);

    const strokes = this.state.previousStrokes
    if (this.state.currentPoints.points.length < 1) return
    const { height, width } = this.state;

    const points = this.state.currentPoints
    points.box = { height, width };

    this.state.pen.addStroke(this.state.currentPoints)

    this.setState({
      previousStrokes: [...strokes, points],
      currentPoints: {
        color: this.state.strokeColor,
        width: this.state.strokeWidth,
        box: { height, width },
        points: []
      },
      tracker: this.state.tracker + 1,
    })
    this._onChangeStrokes([...strokes, points])
  }

  updateSvgPosition = () => {
    const { height, width, left, top } = this.drawer?.getBoundingClientRect() || { height: 0, width: 0, left: 0, top: 0 };
    const dimensionsChanged = this.state.height !== height || this.state.width !== width;
    if (dimensionsChanged || this.state.px !== left || this.state.py !== top) {
      const currentPoints = { ...this.state.currentPoints };
      currentPoints.box = { height, width };
      this.setState({ height, width, px: left, py: top, currentPoints }, () => {
        // Auto-fit when dimensions change and autoFit is enabled
        if (dimensionsChanged && this.props.autoFit) {
          this.fitToContent();
        }
      });
    }
  }

  componentDidMount() {
    window.addEventListener('scroll', this.updateSvgPosition);
    window.addEventListener('resize', this.updateSvgPosition);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('mousemove', this.handleGlobalMouseMove);
    document.addEventListener('mouseup', this.handleGlobalMouseUp);
    // Prevent browser zoom on Ctrl+scroll
    this.containerElement?.addEventListener('wheel', this.preventBrowserZoom, { passive: false });
    this.updateSvgPosition();
    
    // Initial auto-fit after mount
    if (this.props.autoFit) {
      // Small delay to ensure dimensions are set
      setTimeout(() => this.fitToContent(), 50);
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('scroll', this.updateSvgPosition);
    window.removeEventListener('resize', this.updateSvgPosition);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mousemove', this.handleGlobalMouseMove);
    document.removeEventListener('mouseup', this.handleGlobalMouseUp);
    this.containerElement?.removeEventListener('wheel', this.preventBrowserZoom);
  }

  preventBrowserZoom = (e: globalThis.WheelEvent) => {
    // Prevent browser's native Ctrl+scroll zoom when we're handling zoom
    if (this.props.enableZoom && e.ctrlKey) {
      e.preventDefault();
    }
  }

  handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
    if (this.state.isDraggingImage || this.state.isResizingImage) {
      this.handleImageManipulation(e.clientX, e.clientY);
    }
  }

  handleGlobalMouseUp = () => {
    if (this.state.isDraggingImage || this.state.isResizingImage) {
      this.endImageManipulation();
    }
  }

  handleFullscreenChange = () => {
    const isFullscreen = !!document.fullscreenElement;
    this.setState({ isFullscreen });
    this.props.onFullscreenChange?.(isFullscreen);
    // Update dimensions after fullscreen change
    setTimeout(() => this.updateSvgPosition(), 100);
  }

  getContainerRef = () => {
    return { current: this.containerElement };
  }

  // Export whiteboard data as JSON-serializable object
  exportData = (): WhiteboardData => {
    return {
      version: '1.0',
      strokes: this.state.previousStrokes,
      images: this.state.sketchImages,
      viewState: {
        panX: this.state.panX,
        panY: this.state.panY,
        scale: this.state.scale
      }
    };
  }

  // Export whiteboard data as JSON string
  exportJSON = (): string => {
    return JSON.stringify(this.exportData(), null, 2);
  }

  // Import whiteboard data from object
  importData = (data: WhiteboardData, options?: { clearExisting?: boolean; loadViewState?: boolean }) => {
    const { clearExisting = true, loadViewState = true } = options || {};
    
    const newStrokes = clearExisting ? data.strokes : [...this.state.previousStrokes, ...data.strokes];
    const newImages = clearExisting ? data.images : [...this.state.sketchImages, ...data.images];
    
    this.state.pen.clear();
    data.strokes.forEach(stroke => this.state.pen.addStroke(stroke));
    
    const stateUpdate: Partial<WhiteboardState> = {
      previousStrokes: newStrokes,
      sketchImages: newImages,
      tracker: newStrokes.length
    };
    
    if (loadViewState && data.viewState) {
      stateUpdate.panX = data.viewState.panX;
      stateUpdate.panY = data.viewState.panY;
      stateUpdate.scale = data.viewState.scale;
    }
    
    this.setState(stateUpdate as WhiteboardState);
    this.props.onChangeStrokes?.(newStrokes);
    this.props.onChangeImages?.(newImages);
  }

  // Import whiteboard data from JSON string
  importJSON = (json: string, options?: { clearExisting?: boolean; loadViewState?: boolean }) => {
    try {
      const data = JSON.parse(json) as WhiteboardData;
      this.importData(data, options);
      return true;
    } catch (error) {
      console.error('Failed to import whiteboard data:', error);
      return false;
    }
  }

  render(): React.ReactElement {
    const { 
      height, width, previousStrokes, currentPoints, pen,
      panX, panY, scale, sketchImages, selectedImageId, isFullscreen
    } = this.state;
    const { 
      showGrid = false, 
      gridSize = 20, 
      gridColor = '#cccccc', 
      gridOpacity = 0.5 
    } = this.props;
    const props = (this.props.containerStyle || {}) as React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

    if (!props.style) props.style = {
      flex: 1,
      display: 'flex',
      position: 'relative',
      overflow: 'hidden'
    }
    else props.style = {
      ...props.style,
      flex: 1,
      display: 'flex',
      position: 'relative',
      overflow: 'hidden'
    }
    delete props.ref;

    // Apply fullscreen background
    if (isFullscreen) {
      props.style.backgroundColor = props.style.backgroundColor || '#ffffff';
    }

    // Adjusted stroke width based on zoom (visual consistency)
    const adjustedStrokeWidth = currentPoints.width / scale;

    return (<div
      {...props}
      ref={el => { this.containerElement = el }}>

      {/* Grid background */}
      <Grid
        width={width}
        height={height}
        gridSize={gridSize}
        gridColor={gridColor}
        gridOpacity={gridOpacity}
        showGrid={showGrid}
        offsetX={panX}
        offsetY={panY}
        scale={scale}
      />

      {/* Images layer */}
      <svg 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          pointerEvents: 'none',
          overflow: 'visible'
        }} 
        height={height}
        width={width}
      >
        <g transform={`translate(${panX}, ${panY}) scale(${scale})`}>
          {sketchImages.map((img) => (
            <g key={img.id}>
              <image
                href={img.src}
                x={img.x}
                y={img.y}
                width={img.width}
                height={img.height}
                opacity={img.opacity ?? 1}
                transform={img.rotation ? `rotate(${img.rotation} ${img.x + img.width / 2} ${img.y + img.height / 2})` : undefined}
                style={{ 
                  cursor: selectedImageId === img.id ? 'move' : 'pointer',
                  pointerEvents: 'all'
                }}
                onClick={(e) => { e.stopPropagation(); this.selectImage(img.id); }}
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => this.onImageMouseDown(e as unknown as React.MouseEvent, img.id)}
              />
              {selectedImageId === img.id && (
                <>
                  {/* Selection border */}
                  <rect
                    x={img.x - 2}
                    y={img.y - 2}
                    width={img.width + 4}
                    height={img.height + 4}
                    fill="none"
                    stroke="#2196f3"
                    strokeWidth={2 / scale}
                    strokeDasharray={`${5 / scale},${5 / scale}`}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Resize handles */}
                  {['nw', 'ne', 'sw', 'se'].map((handle) => {
                    const handleSize = 10 / scale;
                    let hx = img.x, hy = img.y;
                    if (handle.includes('e')) hx = img.x + img.width - handleSize;
                    if (handle.includes('s')) hy = img.y + img.height - handleSize;
                    if (handle === 'nw') { hx = img.x - handleSize / 2; hy = img.y - handleSize / 2; }
                    if (handle === 'ne') { hx = img.x + img.width - handleSize / 2; hy = img.y - handleSize / 2; }
                    if (handle === 'sw') { hx = img.x - handleSize / 2; hy = img.y + img.height - handleSize / 2; }
                    if (handle === 'se') { hx = img.x + img.width - handleSize / 2; hy = img.y + img.height - handleSize / 2; }
                    
                    return (
                      <rect
                        key={handle}
                        x={hx}
                        y={hy}
                        width={handleSize}
                        height={handleSize}
                        fill="#2196f3"
                        stroke="white"
                        strokeWidth={1 / scale}
                        style={{ 
                          cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize',
                          pointerEvents: 'all'
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        onMouseDown={(e) => this.onResizeHandleMouseDown(e as unknown as React.MouseEvent, img.id, handle)}
                      />
                    );
                  })}
                </>
              )}
            </g>
          ))}
        </g>
      </svg>

      {/* Strokes layer */}
      <svg 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 2,
          pointerEvents: 'none',
          overflow: 'visible'
        }} 
        height={height}
        width={width}
      >
        <g transform={`translate(${panX}, ${panY}) scale(${scale})`}>
          {
            new Pen(previousStrokes).toSvgWithScale({ width, height }, scale, this.props.autoFit)
          }
          <path
            d={pen.pointsToSvg(currentPoints, { height, width }, this.props.autoFit)}
            stroke={currentPoints.color}
            strokeWidth={adjustedStrokeWidth}
            fill="none" />
        </g>
      </svg>

      {/* Transparent canvas for capturing events */}
      <canvas
        ref={drawer => { this.drawer = drawer }}
        onTouchStart={this.handleTouchStart}
        onTouchMove={this.onResponderMove}
        onTouchEnd={this.onResponderRelease}
        onMouseDown={this.onMouseDown}
        onMouseMove={this.onMouseMove}
        onMouseUp={this.onMouseUp}
        onWheel={this.onWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
          zIndex: 3,
          touchAction: 'none',
          pointerEvents: this.props.enabled === false ? 'none' : 'auto'
        }}>
      </canvas>

      {/* Children (e.g., FloatingToolbox) */}
      {this.props.children}
    </div>) as React.ReactElement
  }
}