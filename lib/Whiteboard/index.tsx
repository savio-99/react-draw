import React from 'react'
import type { TouchEvent, MouseEvent, WheelEvent } from 'react'
import Pen from '../Pen'
import { Point, Stroke } from '../main'
import Grid from '../Grid'
import { SketchImage, createImage, loadImageDimensions } from '../Image'
import Dimension, { DimensionModal, DimensionData, createDimension } from '../Dimension'

export type WhiteboardMode = 'pen' | 'hand' | 'dimension' | 'mouse';

export interface WhiteboardData {
  version: string;
  strokes: Stroke[];
  images: SketchImage[];
  dimensions?: DimensionData[];
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
  children?: React.ReactNode,
  // New props
  mode?: WhiteboardMode,
  onModeChange?: (mode: WhiteboardMode) => void,
  penOnly?: boolean,
  onPenOnlyChange?: (penOnly: boolean) => void,
  dimensions?: DimensionData[],
  initialDimensions?: DimensionData[],
  onChangeDimensions?: (dimensions: DimensionData[]) => void,
  dimensionColor?: string
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
  isFullscreen: boolean,
  // New state for modes and dimensions
  currentMode: WhiteboardMode,
  penOnly: boolean,
  dimensions: DimensionData[],
  selectedDimensionId: string | null,
  selectedStrokeIndex: number | null,
  isDimensionDrawing: boolean,
  dimensionStart: { x: number, y: number } | null,
  tempDimension: DimensionData | null,
  showDimensionModal: boolean,
  pendingDimension: DimensionData | null,
  // Dimension manipulation state
  isDraggingDimension: boolean,
  isResizingDimension: boolean,
  dimensionResizeHandle: 'start' | 'end' | null,
  dimensionStartData: DimensionData | null,
  dimensionDragStart: { x: number, y: number } | null
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
      previousStrokes: this.props.strokes || this.props.initialStrokes || [],
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
      sketchImages: this.props.images || this.props.initialImages || [],
      selectedImageId: null,
      isDraggingImage: false,
      isResizingImage: false,
      resizeHandle: null,
      imageStartPos: null,
      imageDragStart: null,
      imageStartSize: null,
      isFullscreen: false,
      // New state for modes and dimensions
      currentMode: props.mode || 'pen',
      penOnly: props.penOnly || false,
      dimensions: props.dimensions || props.initialDimensions || [],
      selectedDimensionId: null,
      selectedStrokeIndex: null,
      isDimensionDrawing: false,
      dimensionStart: null,
      tempDimension: null,
      showDimensionModal: false,
      pendingDimension: null,
      // Dimension manipulation state
      isDraggingDimension: false,
      isResizingDimension: false,
      dimensionResizeHandle: null,
      dimensionStartData: null,
      dimensionDragStart: null
    }
  }

  componentDidUpdate(prevProps: WhiteboardProps) {
    const strokesChanged = this.props.strokes !== undefined && this.props.strokes !== prevProps.strokes;
    const imagesChanged = this.props.images !== undefined && this.props.images !== prevProps.images;
    const dimensionsChanged = this.props.dimensions !== undefined && this.props.dimensions !== prevProps.dimensions;
    const modeChanged = this.props.mode !== undefined && this.props.mode !== prevProps.mode;
    const penOnlyChanged = this.props.penOnly !== undefined && this.props.penOnly !== prevProps.penOnly;
    
    if (strokesChanged || imagesChanged || dimensionsChanged || modeChanged || penOnlyChanged) {
      // Build state update with both strokes and images together to avoid race conditions
      const stateUpdate: Partial<WhiteboardState> = {};
      
      if (strokesChanged) {
        stateUpdate.previousStrokes = this.props.strokes;
      }
      if (imagesChanged) {
        stateUpdate.sketchImages = this.props.images;
      }
      if (dimensionsChanged) {
        stateUpdate.dimensions = this.props.dimensions;
      }
      if (modeChanged) {
        stateUpdate.currentMode = this.props.mode;
      }
      if (penOnlyChanged) {
        stateUpdate.penOnly = this.props.penOnly;
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

  // Mode methods
  setMode = (mode: WhiteboardMode) => {
    this.setState({ currentMode: mode, selectedDimensionId: null, selectedStrokeIndex: null, selectedImageId: null });
    this.props.onModeChange?.(mode);
  }

  getMode = (): WhiteboardMode => {
    return this.state.currentMode;
  }

  // Pen only mode methods (for iOS/Android stylus support)
  setPenOnly = (enabled: boolean) => {
    this.setState({ penOnly: enabled });
    this.props.onPenOnlyChange?.(enabled);
  }

  getPenOnly = (): boolean => {
    return this.state.penOnly;
  }

  // Dimension methods
  addDimension = (startX: number, startY: number, endX: number, endY: number, value: string = '') => {
    const newDimension = createDimension(startX, startY, endX, endY, value, this.props.dimensionColor);
    const newDimensions = [...this.state.dimensions, newDimension];
    this.setState({ dimensions: newDimensions });
    this.props.onChangeDimensions?.(newDimensions);
    return newDimension;
  }

  removeDimension = (dimensionId: string) => {
    const newDimensions = this.state.dimensions.filter(d => d.id !== dimensionId);
    this.setState({ dimensions: newDimensions, selectedDimensionId: null });
    this.props.onChangeDimensions?.(newDimensions);
  }

  updateDimension = (dimensionId: string, updates: Partial<DimensionData>) => {
    const newDimensions = this.state.dimensions.map(d =>
      d.id === dimensionId ? { ...d, ...updates } : d
    );
    this.setState({ dimensions: newDimensions });
    this.props.onChangeDimensions?.(newDimensions);
  }

  selectDimension = (dimensionId: string | null) => {
    this.setState({ selectedDimensionId: dimensionId });
  }

  getDimensions = (): DimensionData[] => {
    return this.state.dimensions;
  }

  clearDimensions = () => {
    this.setState({ dimensions: [], selectedDimensionId: null });
    this.props.onChangeDimensions?.([]);
  }

  // Handle dimension modal
  onDimensionModalConfirm = (value: string) => {
    const { pendingDimension } = this.state;
    if (pendingDimension) {
      const completedDimension = { ...pendingDimension, value };
      const newDimensions = [...this.state.dimensions, completedDimension];
      this.setState({ 
        dimensions: newDimensions,
        showDimensionModal: false,
        pendingDimension: null,
        tempDimension: null
      });
      this.props.onChangeDimensions?.(newDimensions);
    }
  }

  onDimensionModalCancel = () => {
    this.setState({ 
      showDimensionModal: false,
      pendingDimension: null,
      tempDimension: null
    });
  }

  // Edit existing dimension value
  editDimensionValue = (dimensionId: string) => {
    const dimension = this.state.dimensions.find(d => d.id === dimensionId);
    if (dimension) {
      this.setState({
        showDimensionModal: true,
        pendingDimension: dimension,
        selectedDimensionId: dimensionId
      });
    }
  }

  onDimensionEditConfirm = (value: string) => {
    const { pendingDimension } = this.state;
    if (pendingDimension) {
      this.updateDimension(pendingDimension.id, { value });
      this.setState({ 
        showDimensionModal: false,
        pendingDimension: null
      });
    }
  }

  // Dimension drag handlers
  onDimensionMouseDown = (dimensionId: string, clientX: number, clientY: number) => {
    if (this.state.currentMode !== 'mouse') return;
    
    const dimension = this.state.dimensions.find(d => d.id === dimensionId);
    if (!dimension) return;
    
    const coords = this.screenToCanvas(clientX, clientY);
    
    this.setState({
      selectedDimensionId: dimensionId,
      isDraggingDimension: true,
      dimensionStartData: { ...dimension },
      dimensionDragStart: coords
    });
  }

  onDimensionHandleMouseDown = (dimensionId: string, handle: 'start' | 'end', clientX: number, clientY: number) => {
    if (this.state.currentMode !== 'mouse') return;
    
    const dimension = this.state.dimensions.find(d => d.id === dimensionId);
    if (!dimension) return;
    
    const coords = this.screenToCanvas(clientX, clientY);
    
    this.setState({
      selectedDimensionId: dimensionId,
      isResizingDimension: true,
      dimensionResizeHandle: handle,
      dimensionStartData: { ...dimension },
      dimensionDragStart: coords
    });
  }

  handleDimensionManipulation = (clientX: number, clientY: number) => {
    const {
      selectedDimensionId, isDraggingDimension, isResizingDimension,
      dimensionResizeHandle, dimensionStartData, dimensionDragStart, dimensions
    } = this.state;
    
    if (!selectedDimensionId || !dimensionDragStart || !dimensionStartData) return;
    
    const coords = this.screenToCanvas(clientX, clientY);
    const dx = coords.x - dimensionDragStart.x;
    const dy = coords.y - dimensionDragStart.y;
    
    if (isDraggingDimension) {
      // Move entire dimension
      const newDimensions = dimensions.map(dim => {
        if (dim.id === selectedDimensionId) {
          return {
            ...dim,
            startX: dimensionStartData.startX + dx,
            startY: dimensionStartData.startY + dy,
            endX: dimensionStartData.endX + dx,
            endY: dimensionStartData.endY + dy
          };
        }
        return dim;
      });
      this.setState({ dimensions: newDimensions });
    } else if (isResizingDimension && dimensionResizeHandle) {
      // Move single endpoint
      const newDimensions = dimensions.map(dim => {
        if (dim.id === selectedDimensionId) {
          if (dimensionResizeHandle === 'start') {
            return {
              ...dim,
              startX: coords.x,
              startY: coords.y
            };
          } else {
            return {
              ...dim,
              endX: coords.x,
              endY: coords.y
            };
          }
        }
        return dim;
      });
      this.setState({ dimensions: newDimensions });
    }
  }

  endDimensionManipulation = () => {
    if (this.state.isDraggingDimension || this.state.isResizingDimension) {
      this.props.onChangeDimensions?.(this.state.dimensions);
    }
    this.setState({
      isDraggingDimension: false,
      isResizingDimension: false,
      dimensionResizeHandle: null,
      dimensionStartData: null,
      dimensionDragStart: null
    });
  }

  // Delete selected dimension
  deleteSelectedDimension = () => {
    const { selectedDimensionId } = this.state;
    if (selectedDimensionId) {
      this.removeDimension(selectedDimensionId);
    }
  }

  // Delete selected image
  deleteSelectedImage = () => {
    const { selectedImageId } = this.state;
    if (selectedImageId) {
      this.removeImage(selectedImageId);
    }
  }

  // Find image at a point (for selection)
  findImageAtPoint = (x: number, y: number): SketchImage | null => {
    const { sketchImages } = this.state;
    
    // Search from end to start (topmost images first)
    for (let i = sketchImages.length - 1; i >= 0; i--) {
      const img = sketchImages[i];
      if (x >= img.x && x <= img.x + img.width && 
          y >= img.y && y <= img.y + img.height) {
        return img;
      }
    }
    
    return null;
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
    const { previousStrokes, sketchImages, dimensions } = this.state;
    
    if (previousStrokes.length === 0 && sketchImages.length === 0 && dimensions.length === 0) {
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

    // Calculate bounds from dimensions (with some padding for arrows and text)
    dimensions.forEach(dim => {
      const padding = 20; // For arrows and extension lines
      minX = Math.min(minX, Math.min(dim.startX, dim.endX) - padding);
      minY = Math.min(minY, Math.min(dim.startY, dim.endY) - padding);
      maxX = Math.max(maxX, Math.max(dim.startX, dim.endX) + padding);
      maxY = Math.max(maxY, Math.max(dim.startY, dim.endY) + padding);
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

    // Render dimensions
    this.state.dimensions.forEach(dim => {
      const { startX, startY, endX, endY, value, color = '#ff5722', fontSize = 14, lineWidth = 2 } = dim;
      
      // Calculate angle
      const dx = endX - startX;
      const dy = endY - startY;
      const angle = Math.atan2(dy, dx);
      
      // Arrow head size
      const arrowSize = 10;
      
      // Draw main line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Draw arrow at start
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + arrowSize * Math.cos(angle + Math.PI / 6),
        startY + arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.lineTo(
        startX + arrowSize * Math.cos(angle - Math.PI / 6),
        startY + arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      
      // Draw arrow at end
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle + Math.PI / 6),
        endY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle - Math.PI / 6),
        endY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      
      // Extension lines (perpendicular)
      const extLength = 15;
      const perpAngle = angle + Math.PI / 2;
      
      ctx.beginPath();
      ctx.lineWidth = lineWidth * 0.7;
      // Extension at start
      ctx.moveTo(
        startX + extLength * Math.cos(perpAngle),
        startY + extLength * Math.sin(perpAngle)
      );
      ctx.lineTo(
        startX - extLength * Math.cos(perpAngle),
        startY - extLength * Math.sin(perpAngle)
      );
      ctx.stroke();
      
      // Extension at end
      ctx.beginPath();
      ctx.moveTo(
        endX + extLength * Math.cos(perpAngle),
        endY + extLength * Math.sin(perpAngle)
      );
      ctx.lineTo(
        endX - extLength * Math.cos(perpAngle),
        endY - extLength * Math.sin(perpAngle)
      );
      ctx.stroke();
      
      // Draw value label
      if (value) {
        const midpointX = (startX + endX) / 2;
        const midpointY = (startY + endY) / 2;
        
        // Calculate text angle (keep it readable)
        let textAngle = (angle * 180) / Math.PI;
        if (textAngle > 90 || textAngle < -90) {
          textAngle += 180;
        }
        const textAngleRad = (textAngle * Math.PI) / 180;
        
        ctx.save();
        ctx.translate(midpointX, midpointY);
        ctx.rotate(textAngleRad);
        
        // Draw background
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textMetrics = ctx.measureText(value);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(-textWidth / 2 - 4, -textHeight / 2 - 2, textWidth + 8, textHeight + 4);
        
        // Draw text
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value, 0, 0);
        
        ctx.restore();
      }
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
      sketchImages: [],
      dimensions: [],
      selectedDimensionId: null,
      selectedStrokeIndex: null
    })
    this.state.pen.clear()
    this._onChangeStrokes([])
    this.props.onChangeImages?.([])
    this.props.onChangeDimensions?.([])
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
      selectedStrokeIndex: null
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
    if (this.state.currentMode !== 'pen') return;

    let x: number = 0;
    let y: number = 0;
    let time: number | undefined = undefined;

    if (evt.nativeEvent instanceof TouchEvent) {
      const event = evt as TouchEvent
      
      // Two-finger touch = pan/zoom, not draw
      if (event.touches.length >= 2) return;
      
      const touch: React.Touch | null = event.touches[0];
      if (!touch) return;

      // penOnly mode: only allow stylus input, ignore finger touches
      if (this.state.penOnly) {
        const nativeTouch = event.nativeEvent.touches[0] as Touch & { touchType?: string; radiusX?: number; radiusY?: number };
        // Check for stylus: touchType === 'stylus' (iOS) or very small radius (Android)
        const isStylus = nativeTouch.touchType === 'stylus' || 
                        (nativeTouch.radiusX !== undefined && nativeTouch.radiusX < 2 && nativeTouch.radiusY !== undefined && nativeTouch.radiusY < 2);
        if (!isStylus) return;
      }

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
    const { currentMode } = this.state;
    
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
      
      // Handle single touch pan in hand mode or penOnly non-stylus
      if (this.state.isPanning && this.state.lastPanPoint && touchEvent.touches.length === 1) {
        const touch = touchEvent.touches[0];
        const dx = touch.clientX - this.state.lastPanPoint.x;
        const dy = touch.clientY - this.state.lastPanPoint.y;
        this.setState({
          panX: this.state.panX + dx,
          panY: this.state.panY + dy,
          lastPanPoint: { x: touch.clientX, y: touch.clientY }
        });
        return;
      }
      
      // Handle dimension drawing on touch
      if (this.state.isDimensionDrawing && this.state.tempDimension && touchEvent.touches.length === 1) {
        const touch = touchEvent.touches[0];
        const coords = this.screenToCanvas(touch.clientX, touch.clientY);
        this.setState({
          tempDimension: {
            ...this.state.tempDimension,
            endX: coords.x,
            endY: coords.y
          }
        });
        return;
      }
    }
    
    if (this.dragging && !this.state.isPanning && currentMode === 'pen') {
      this.onTouch(evt);
    }
  }

  // Handle middle mouse button pan
  onMouseDown = (evt: MouseEvent<HTMLCanvasElement>) => {
    const { currentMode } = this.state;
    
    // Middle mouse button for pan (always works)
    if (evt.button === 1 && this.props.enablePan) {
      evt.preventDefault();
      this.setState({
        isPanning: true,
        lastPanPoint: { x: evt.clientX, y: evt.clientY }
      });
      return;
    }
    
    // Handle hand mode - left click pans
    if (currentMode === 'hand' && evt.button === 0) {
      evt.preventDefault();
      this.setState({
        isPanning: true,
        lastPanPoint: { x: evt.clientX, y: evt.clientY }
      });
      return;
    }
    
    // Handle dimension mode - start drawing dimension
    if (currentMode === 'dimension' && evt.button === 0) {
      const coords = this.screenToCanvas(evt.clientX, evt.clientY);
      const tempDim = createDimension(coords.x, coords.y, coords.x, coords.y, '', this.props.dimensionColor);
      this.setState({
        isDimensionDrawing: true,
        dimensionStart: coords,
        tempDimension: tempDim
      });
      return;
    }
    
    // Handle mouse mode - for selecting images/dimensions/strokes
    if (currentMode === 'mouse' && evt.button === 0) {
      const coords = this.screenToCanvas(evt.clientX, evt.clientY);
      
      // Check if clicking on an image (topmost first)
      const clickedImage = this.findImageAtPoint(coords.x, coords.y);
      if (clickedImage) {
        this.setState({ 
          selectedImageId: clickedImage.id, 
          selectedDimensionId: null, 
          selectedStrokeIndex: null,
          isDraggingImage: true,
          imageStartPos: { x: clickedImage.x, y: clickedImage.y },
          imageDragStart: coords
        });
        return;
      }
      
      // Check if clicking on a dimension
      const clickedDimension = this.findDimensionAtPoint(coords.x, coords.y);
      if (clickedDimension) {
        this.setState({ 
          selectedDimensionId: clickedDimension.id, 
          selectedStrokeIndex: null, 
          selectedImageId: null 
        });
        return;
      }
      
      // Check if clicking on a stroke
      const clickedStrokeIndex = this.findStrokeAtPoint(coords.x, coords.y);
      if (clickedStrokeIndex >= 0) {
        this.setState({ 
          selectedStrokeIndex: clickedStrokeIndex, 
          selectedDimensionId: null, 
          selectedImageId: null 
        });
        return;
      }
      
      // Clicked on empty space - deselect all
      this.setState({ selectedDimensionId: null, selectedStrokeIndex: null, selectedImageId: null });
      return;
    }
    
    // Default: pen mode
    if (currentMode === 'pen') {
      this.onResponderGrant(evt);
    }
  }

  // Find dimension at a point (for selection)
  findDimensionAtPoint = (x: number, y: number): DimensionData | null => {
    const threshold = 10 / this.state.scale;
    
    for (const dim of this.state.dimensions) {
      // Calculate distance from point to line segment
      const dx = dim.endX - dim.startX;
      const dy = dim.endY - dim.startY;
      const lengthSquared = dx * dx + dy * dy;
      
      if (lengthSquared === 0) {
        // Start and end are the same point
        const dist = Math.sqrt((x - dim.startX) ** 2 + (y - dim.startY) ** 2);
        if (dist <= threshold) return dim;
        continue;
      }
      
      // Calculate projection
      let t = ((x - dim.startX) * dx + (y - dim.startY) * dy) / lengthSquared;
      t = Math.max(0, Math.min(1, t));
      
      const projX = dim.startX + t * dx;
      const projY = dim.startY + t * dy;
      const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
      
      if (dist <= threshold) return dim;
    }
    
    return null;
  }

  // Find stroke at a point (for selection)
  findStrokeAtPoint = (x: number, y: number): number => {
    const { previousStrokes, scale } = this.state;
    
    // Search from end to start (top strokes first)
    for (let strokeIndex = previousStrokes.length - 1; strokeIndex >= 0; strokeIndex--) {
      const stroke = previousStrokes[strokeIndex];
      const threshold = Math.max(stroke.width / 2, 10) / scale;
      
      for (let i = 0; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        
        // Calculate distance from point to line segment
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
          const dist = Math.sqrt((x - p1.x) ** 2 + (y - p1.y) ** 2);
          if (dist <= threshold) return strokeIndex;
          continue;
        }
        
        let t = ((x - p1.x) * dx + (y - p1.y) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
        
        if (dist <= threshold) return strokeIndex;
      }
      
      // Also check single-point strokes
      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
        if (dist <= threshold) return strokeIndex;
      }
    }
    
    return -1;
  }

  // Delete selected stroke
  deleteSelectedStroke = () => {
    const { selectedStrokeIndex, previousStrokes } = this.state;
    if (selectedStrokeIndex === null || selectedStrokeIndex < 0) return;
    
    const newStrokes = [...previousStrokes];
    newStrokes.splice(selectedStrokeIndex, 1);
    
    // Update pen strokes
    this.state.pen.clear();
    newStrokes.forEach(stroke => this.state.pen.addStroke(stroke));
    
    this.setState({ 
      previousStrokes: newStrokes, 
      selectedStrokeIndex: null,
      tracker: this.state.tracker - 1
    });
    this._onChangeStrokes(newStrokes);
  }

  onMouseMove = (evt: MouseEvent<HTMLCanvasElement>) => {
    const { currentMode } = this.state;
    
    // Handle image manipulation
    if (this.state.isDraggingImage || this.state.isResizingImage) {
      this.handleImageManipulation(evt.clientX, evt.clientY);
      return;
    }
    
    // Handle dimension manipulation
    if (this.state.isDraggingDimension || this.state.isResizingDimension) {
      this.handleDimensionManipulation(evt.clientX, evt.clientY);
      return;
    }
    
    // Handle middle button pan or hand mode pan
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
    
    // Handle dimension drawing
    if (this.state.isDimensionDrawing && this.state.tempDimension) {
      const coords = this.screenToCanvas(evt.clientX, evt.clientY);
      this.setState({
        tempDimension: {
          ...this.state.tempDimension,
          endX: coords.x,
          endY: coords.y
        }
      });
      return;
    }
    
    // Default: pen mode or other
    if (currentMode === 'pen') {
      this.onResponderMove(evt);
    }
  }

  onMouseUp = () => {
    if (this.state.isDraggingImage || this.state.isResizingImage) {
      this.endImageManipulation();
      return;
    }
    
    // End dimension manipulation
    if (this.state.isDraggingDimension || this.state.isResizingDimension) {
      this.endDimensionManipulation();
      return;
    }
    
    // End dimension drawing
    if (this.state.isDimensionDrawing && this.state.tempDimension) {
      const { tempDimension } = this.state;
      // Only create dimension if it has some length
      const dx = tempDimension.endX - tempDimension.startX;
      const dy = tempDimension.endY - tempDimension.startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 5) {
        // Show modal to enter value
        this.setState({
          isDimensionDrawing: false,
          dimensionStart: null,
          pendingDimension: tempDimension,
          showDimensionModal: true
        });
      } else {
        // Too short, cancel
        this.setState({
          isDimensionDrawing: false,
          dimensionStart: null,
          tempDimension: null
        });
      }
      return;
    }
    
    // End panning
    if (this.state.isPanning) {
      this.setState({
        isPanning: false,
        lastPanPoint: null
      });
      return;
    }
    
    this.onResponderRelease();
  }

  handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    const { currentMode, penOnly } = this.state;
    
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
    
    // penOnly mode check for stylus
    if (penOnly && e.touches.length === 1) {
      const nativeTouch = e.nativeEvent.touches[0] as Touch & { touchType?: string; radiusX?: number; radiusY?: number };
      const isStylus = nativeTouch.touchType === 'stylus' || 
                      (nativeTouch.radiusX !== undefined && nativeTouch.radiusX < 2 && nativeTouch.radiusY !== undefined && nativeTouch.radiusY < 2);
      
      // If not stylus in penOnly mode, use as pan
      if (!isStylus) {
        const touch = e.touches[0];
        this.setState({
          isPanning: true,
          lastPanPoint: { x: touch.clientX, y: touch.clientY }
        });
        return;
      }
    }
    
    // Hand mode - single touch starts pan
    if (currentMode === 'hand' && e.touches.length === 1) {
      const touch = e.touches[0];
      this.setState({
        isPanning: true,
        lastPanPoint: { x: touch.clientX, y: touch.clientY }
      });
      return;
    }
    
    // Dimension mode
    if (currentMode === 'dimension' && e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = this.screenToCanvas(touch.clientX, touch.clientY);
      const tempDim = createDimension(coords.x, coords.y, coords.x, coords.y, '', this.props.dimensionColor);
      this.setState({
        isDimensionDrawing: true,
        dimensionStart: coords,
        tempDimension: tempDim
      });
      return;
    }
    
    if (currentMode === 'pen') {
      this.onResponderGrant(e);
    }
  }

  onResponderRelease = () => {
    this.dragging = false;
    
    // End dimension drawing on touch
    if (this.state.isDimensionDrawing && this.state.tempDimension) {
      const { tempDimension } = this.state;
      const dx = tempDimension.endX - tempDimension.startX;
      const dy = tempDimension.endY - tempDimension.startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 5) {
        this.setState({
          isDimensionDrawing: false,
          dimensionStart: null,
          pendingDimension: tempDimension,
          showDimensionModal: true,
          isPanning: false,
          lastPanPoint: null,
          lastTouchDistance: null
        });
      } else {
        this.setState({
          isDimensionDrawing: false,
          dimensionStart: null,
          tempDimension: null,
          isPanning: false,
          lastPanPoint: null,
          lastTouchDistance: null
        });
      }
      
      document.removeEventListener('touchmove', this.preventDefault);
      document.removeEventListener('mousemove', this.preventDefault);
      return;
    }
    
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
    document.addEventListener('keydown', this.handleKeyDown);
    // Prevent browser zoom on Ctrl+scroll
    this.containerElement?.addEventListener('wheel', this.preventBrowserZoom, { passive: false });
    this.updateSvgPosition();
    
    // Initialize pen with initial strokes if provided
    const initialStrokes = this.props.strokes || this.props.initialStrokes;
    if (initialStrokes && initialStrokes.length > 0) {
      this.state.pen.clear();
      initialStrokes.forEach(stroke => this.state.pen.addStroke(stroke));
    }
    
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
    document.removeEventListener('keydown', this.handleKeyDown);
    this.containerElement?.removeEventListener('wheel', this.preventBrowserZoom);
  }

  preventBrowserZoom = (e: globalThis.WheelEvent) => {
    // Prevent browser's native Ctrl+scroll zoom when we're handling zoom
    if (this.props.enableZoom && e.ctrlKey) {
      e.preventDefault();
    }
  }

  handleKeyDown = (e: globalThis.KeyboardEvent) => {
    // Delete selected element with Delete or Backspace key
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.state.currentMode === 'mouse') {
      // Don't delete if we're in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (this.state.selectedImageId) {
        e.preventDefault();
        this.deleteSelectedImage();
        return;
      }
      
      if (this.state.selectedDimensionId) {
        e.preventDefault();
        this.deleteSelectedDimension();
        return;
      }
      
      if (this.state.selectedStrokeIndex !== null && this.state.selectedStrokeIndex >= 0) {
        e.preventDefault();
        this.deleteSelectedStroke();
        return;
      }
    }
  }

  handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
    if (this.state.isDraggingImage || this.state.isResizingImage) {
      this.handleImageManipulation(e.clientX, e.clientY);
    }
    if (this.state.isDraggingDimension || this.state.isResizingDimension) {
      this.handleDimensionManipulation(e.clientX, e.clientY);
    }
  }

  handleGlobalMouseUp = () => {
    if (this.state.isDraggingImage || this.state.isResizingImage) {
      this.endImageManipulation();
    }
    if (this.state.isDraggingDimension || this.state.isResizingDimension) {
      this.endDimensionManipulation();
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
      dimensions: this.state.dimensions,
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
    const newDimensions = clearExisting ? (data.dimensions || []) : [...this.state.dimensions, ...(data.dimensions || [])];
    
    this.state.pen.clear();
    data.strokes.forEach(stroke => this.state.pen.addStroke(stroke));
    
    const stateUpdate: Partial<WhiteboardState> = {
      previousStrokes: newStrokes,
      sketchImages: newImages,
      dimensions: newDimensions,
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
    this.props.onChangeDimensions?.(newDimensions);
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
      panX, panY, scale, sketchImages, selectedImageId, isFullscreen,
      dimensions, selectedDimensionId, selectedStrokeIndex, tempDimension, showDimensionModal, pendingDimension, currentMode
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

    // Set cursor based on mode
    let cursorStyle = 'crosshair';
    if (currentMode === 'hand') cursorStyle = this.state.isPanning ? 'grabbing' : 'grab';
    else if (currentMode === 'mouse') cursorStyle = 'default';
    else if (currentMode === 'dimension') cursorStyle = 'crosshair';

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
          zIndex: currentMode === 'mouse' && selectedImageId ? 5 : 1,
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
                  cursor: selectedImageId === img.id ? 'move' : (currentMode === 'mouse' ? 'pointer' : 'default'),
                  pointerEvents: selectedImageId === img.id ? 'all' : 'none'
                }}
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
            new Pen(previousStrokes).toSvgWithScale({ width, height }, scale, true)
          }
          <path
            d={pen.pointsToSvg(currentPoints, { height, width }, true)}
            stroke={currentPoints.color}
            strokeWidth={adjustedStrokeWidth}
            fill="none" />
          
          {/* Selection indicator for selected stroke */}
          {this.state.selectedStrokeIndex !== null && this.state.selectedStrokeIndex >= 0 && previousStrokes[this.state.selectedStrokeIndex] && (() => {
            const stroke = previousStrokes[this.state.selectedStrokeIndex];
            if (stroke.points.length === 0) return null;
            
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            stroke.points.forEach(p => {
              minX = Math.min(minX, p.x);
              minY = Math.min(minY, p.y);
              maxX = Math.max(maxX, p.x);
              maxY = Math.max(maxY, p.y);
            });
            
            const padding = (stroke.width / 2 + 5) / scale;
            return (
              <rect
                x={minX - padding}
                y={minY - padding}
                width={maxX - minX + padding * 2}
                height={maxY - minY + padding * 2}
                fill="none"
                stroke="#2196f3"
                strokeWidth={2 / scale}
                strokeDasharray={`${4 / scale},${4 / scale}`}
              />
            );
          })()}
        </g>
      </svg>

      {/* Dimensions layer */}
      <svg 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: currentMode === 'mouse' ? 4 : 2,
          pointerEvents: 'none',
          overflow: 'visible'
        }} 
        height={height}
        width={width}
      >
        <g transform={`translate(${panX}, ${panY}) scale(${scale})`}>
          {/* Existing dimensions */}
          {dimensions.map((dim) => (
            <Dimension
              key={dim.id}
              dimension={dim}
              scale={scale}
              selected={selectedDimensionId === dim.id}
              onSelect={(id) => {
                this.setState({ selectedDimensionId: id });
              }}
              onDragStart={(id, clientX, clientY) => {
                this.onDimensionMouseDown(id, clientX, clientY);
              }}
              onHandleDragStart={(id, handle, clientX, clientY) => {
                this.onDimensionHandleMouseDown(id, handle, clientX, clientY);
              }}
              enabled={currentMode === 'mouse'}
            />
          ))}
          {/* Temporary dimension being drawn */}
          {tempDimension && (
            <Dimension
              dimension={tempDimension}
              scale={scale}
              selected={false}
              enabled={false}
            />
          )}
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
        onDoubleClick={() => {
          // Double click on selected dimension to edit
          if (selectedDimensionId && currentMode === 'mouse') {
            this.editDimensionValue(selectedDimensionId);
          }
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
          zIndex: 3,
          touchAction: 'none',
          cursor: cursorStyle,
          pointerEvents: this.props.enabled === false ? 'none' : 'auto'
        }}>
      </canvas>

      {/* Delete button for selected element */}
      {(selectedImageId || selectedDimensionId || (selectedStrokeIndex !== null && selectedStrokeIndex >= 0)) && currentMode === 'mouse' && (
        <button
          onClick={() => {
            if (selectedImageId) {
              this.deleteSelectedImage();
            } else if (selectedDimensionId) {
              this.deleteSelectedDimension();
            } else if (selectedStrokeIndex !== null && selectedStrokeIndex >= 0) {
              this.deleteSelectedStroke();
            }
          }}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 100,
            width: 44,
            height: 44,
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#ef4444',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
          title="Elimina elemento selezionato"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      )}

      {/* Children (e.g., FloatingToolbox) */}
      {this.props.children}

      {/* Dimension Modal */}
      <DimensionModal
        isOpen={showDimensionModal}
        initialValue={pendingDimension?.value || ''}
        onConfirm={(value) => {
          if (pendingDimension && !dimensions.find(d => d.id === pendingDimension.id)) {
            // New dimension
            this.onDimensionModalConfirm(value);
          } else {
            // Editing existing
            this.onDimensionEditConfirm(value);
          }
        }}
        onCancel={this.onDimensionModalCancel}
      />
    </div>) as React.ReactElement
  }
}

// Type alias for the Whiteboard class (useful for ref typing)
export type WhiteBoard = Whiteboard;