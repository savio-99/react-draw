import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface ToolboxAction {
  id: string;
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  type?: 'button' | 'color' | 'number' | 'file' | 'slider' | 'colorPicker';
  value?: string | number | boolean;
  onChange?: (value: string | number | boolean) => void;
  min?: number;
  max?: number;
  accept?: string;
  colors?: string[];
}

interface FloatingToolboxProps {
  actions: ToolboxAction[];
  visible?: boolean;
  initialPosition?: { x: number; y: number };
  orientation?: 'horizontal' | 'vertical';
  style?: React.CSSProperties;
  containerRef?: React.RefObject<HTMLElement | null>;
}

// Default color presets
const DEFAULT_COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff'
];

const FloatingToolbox: React.FC<FloatingToolboxProps> = ({
  actions,
  visible = true,
  initialPosition = { x: 20, y: 20 },
  orientation = 'vertical',
  style,
  containerRef
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [openPopup, setOpenPopup] = useState<string | null>(null);
  const [useDoubleColumn, setUseDoubleColumn] = useState(false);
  const toolboxRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const wasFullscreenBeforeFileDialog = useRef<boolean>(false);

  // Check if toolbox needs to use double column layout
  useEffect(() => {
    const checkHeight = () => {
      const container = containerRef?.current;
      const toolbox = toolboxRef.current;
      if (!container || !toolbox) return;
      
      const containerRect = container.getBoundingClientRect();
      // Estimate single column height: ~52px per action (36px button + padding + gap)
      const estimatedSingleColumnHeight = (actions.length + 1) * 48 + 40; // +1 for drag handle, +40 for padding
      const availableHeight = containerRect.height - 40; // 20px margin top and bottom
      
      setUseDoubleColumn(orientation === 'vertical' && estimatedSingleColumnHeight > availableHeight);
    };
    
    checkHeight();
    window.addEventListener('resize', checkHeight);
    
    // Also check on fullscreen changes
    document.addEventListener('fullscreenchange', checkHeight);
    
    return () => {
      window.removeEventListener('resize', checkHeight);
      document.removeEventListener('fullscreenchange', checkHeight);
    };
  }, [actions.length, orientation, containerRef]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openPopup && toolboxRef.current && !toolboxRef.current.contains(e.target as Node)) {
        setOpenPopup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPopup]);

  // Unified Pointer Event handlers for better touch/pen/mouse support
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Skip if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('input') ||
        (e.target as HTMLElement).closest('label')) return;
    
    // Only track the first pointer
    if (activePointerId.current !== null) return;
    
    activePointerId.current = e.pointerId;
    setIsDragging(true);
    
    const rect = toolboxRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    
    // Capture pointer for reliable tracking
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors
    }
    
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || activePointerId.current !== e.pointerId) return;
    
    const container = containerRef?.current || document.body;
    const containerRect = container.getBoundingClientRect();
    const toolboxRect = toolboxRef.current?.getBoundingClientRect();

    if (toolboxRect) {
      let newX = e.clientX - containerRect.left - dragOffset.current.x;
      let newY = e.clientY - containerRect.top - dragOffset.current.y;

      // Constrain to container bounds
      newX = Math.max(0, Math.min(newX, containerRect.width - toolboxRect.width));
      newY = Math.max(0, Math.min(newY, containerRect.height - toolboxRect.height));

      setPosition({ x: newX, y: newY });
    }
    
    e.preventDefault();
    e.stopPropagation();
  }, [isDragging, containerRef]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;
    
    activePointerId.current = null;
    setIsDragging(false);
    
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release errors
    }
  }, []);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    handlePointerUp(e);
  }, [handlePointerUp]);

  if (!visible) return null;

  const isHorizontal = orientation === 'horizontal';

  const renderAction = (action: ToolboxAction) => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      border: 'none',
      borderRadius: 6,
      backgroundColor: action.active ? '#e3f2fd' : 'transparent',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      position: 'relative',
      touchAction: 'manipulation'
    };

    // Use onPointerUp for touch-friendly clicks
    const handleClick = (e: React.PointerEvent | React.MouseEvent, onClick?: () => void) => {
      e.stopPropagation();
      onClick?.();
    };

    switch (action.type) {
      case 'slider': {
        // Slider with popup and size preview in icon
        const sliderValue = action.value as number || 4;
        const isOpen = openPopup === action.id;
        return (
          <div key={action.id} style={{ position: 'relative' }}>
            <button
              title={action.label}
              style={baseStyle}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => handleClick(e, () => setOpenPopup(isOpen ? null : action.id))}
              onMouseEnter={(e) => {
                if (!action.active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = action.active ? '#e3f2fd' : 'transparent';
              }}
            >
              {/* Pen icon with size indicator */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              <span style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                fontSize: 8,
                fontWeight: 'bold',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 2,
                padding: '0 2px',
                color: '#333'
              }}>
                {sliderValue}
              </span>
            </button>
            {isOpen && (
              <div 
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  marginLeft: 8,
                  backgroundColor: 'white',
                  borderRadius: 8,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  zIndex: 1001,
                  minWidth: 180,
                  touchAction: 'manipulation'
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <input
                  type="range"
                  min={action.min || 1}
                  max={action.max || 50}
                  value={sliderValue}
                  onChange={(e) => action.onChange?.(parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    cursor: 'pointer',
                    accentColor: '#2196f3',
                    touchAction: 'manipulation'
                  }}
                />
                <div style={{
                  width: Math.min(sliderValue, 30),
                  height: Math.min(sliderValue, 30),
                  borderRadius: '50%',
                  backgroundColor: '#333',
                  flexShrink: 0
                }} />
              </div>
            )}
          </div>
        );
      }

      case 'colorPicker': {
        // Color picker with presets
        const currentColor = action.value as string || '#000000';
        const isColorOpen = openPopup === action.id;
        const colorPresets = action.colors || DEFAULT_COLORS;
        return (
          <div key={action.id} style={{ position: 'relative' }}>
            <button
              title={action.label}
              style={baseStyle}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => handleClick(e, () => setOpenPopup(isColorOpen ? null : action.id))}
              onMouseEnter={(e) => {
                if (!action.active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = action.active ? '#e3f2fd' : 'transparent';
              }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                backgroundColor: currentColor,
                border: '2px solid #ccc'
              }} />
            </button>
            {isColorOpen && (
              <div 
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  marginLeft: 8,
                  backgroundColor: 'white',
                  borderRadius: 8,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  padding: 12,
                  zIndex: 1001,
                  touchAction: 'manipulation'
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Color presets grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 6,
                  marginBottom: 10
                }}>
                  {colorPresets.map((color, idx) => (
                    <button
                      key={idx}
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => handleClick(e, () => {
                        action.onChange?.(color);
                        setOpenPopup(null);
                      })}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: color,
                        border: currentColor === color ? '3px solid #2196f3' : '2px solid #ddd',
                        cursor: 'pointer',
                        padding: 0,
                        touchAction: 'manipulation'
                      }}
                    />
                  ))}
                </div>
                {/* Custom color picker */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#666'
                }}>
                  <span>Custom:</span>
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => action.onChange?.(e.target.value)}
                    style={{ width: 32, height: 24, cursor: 'pointer', border: 'none' }}
                  />
                </label>
              </div>
            )}
          </div>
        );
      }

      case 'color':
        return (
          <label
            key={action.id}
            title={action.label}
            style={{
              ...baseStyle,
              overflow: 'hidden'
            }}
          >
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: action.value as string || '#000000',
              border: '2px solid #ccc'
            }} />
            <input
              type="color"
              value={action.value as string || '#000000'}
              onChange={(e) => action.onChange?.(e.target.value)}
              style={{
                position: 'absolute',
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer'
              }}
            />
          </label>
        );

      case 'number':
        return (
          <div
            key={action.id}
            title={action.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px'
            }}
          >
            {action.icon}
            <input
              type="number"
              value={action.value as number || 4}
              min={action.min || 1}
              max={action.max || 50}
              onChange={(e) => action.onChange?.(parseInt(e.target.value) || 1)}
              style={{
                width: 40,
                height: 24,
                border: '1px solid #ccc',
                borderRadius: 4,
                textAlign: 'center',
                fontSize: 12
              }}
            />
          </div>
        );

      case 'file':
        return (
          <label
            key={action.id}
            title={action.label}
            style={{
              ...baseStyle,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => {
              e.stopPropagation();
              // Trigger file input click
              fileInputRefs.current[action.id]?.click();
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            {action.icon}
            <input
              ref={el => { fileInputRefs.current[action.id] = el; }}
              type="file"
              accept={action.accept || 'image/*'}
              onClick={(e) => {
                e.stopPropagation();
                // Store fullscreen state BEFORE file dialog opens (dialog exits fullscreen)
                wasFullscreenBeforeFileDialog.current = !!document.fullscreenElement;
              }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    action.onChange?.(event.target?.result as string);
                    // Re-enter fullscreen if we were in fullscreen before the file dialog
                    if (wasFullscreenBeforeFileDialog.current && !document.fullscreenElement) {
                      const container = containerRef?.current;
                      if (container) {
                        setTimeout(() => {
                          container.requestFullscreen?.().catch(() => {
                            // Ignore fullscreen request errors
                          });
                        }, 100);
                      }
                    }
                  };
                  reader.readAsDataURL(file);
                }
                // Reset input so same file can be selected again
                e.target.value = '';
              }}
              style={{
                position: 'absolute',
                opacity: 0,
                width: 1,
                height: 1,
                pointerEvents: 'none'
              }}
            />
          </label>
        );

      default:
        return (
          <button
            key={action.id}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => handleClick(e, action.onClick)}
            title={action.label}
            style={baseStyle}
            onMouseEnter={(e) => {
              if (!action.active) {
                (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = action.active ? '#e3f2fd' : 'transparent';
            }}
          >
            {action.icon}
          </button>
        );
    }
  };

  return (
    <div
      ref={toolboxRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        display: 'grid',
        gridTemplateColumns: useDoubleColumn ? 'repeat(2, auto)' : '1fr',
        gridAutoFlow: useDoubleColumn ? 'row' : (isHorizontal ? 'column' : 'row'),
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        padding: 8,
        gap: 4,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'manipulation',
        zIndex: 1000,
        ...style
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          gridColumn: useDoubleColumn ? 'span 2' : undefined,
          marginBottom: isHorizontal ? 0 : 4,
          marginRight: isHorizontal ? 4 : 0,
          borderBottom: isHorizontal ? 'none' : '1px solid #eee',
          borderRight: isHorizontal ? '1px solid #eee' : 'none',
          touchAction: 'none',
          cursor: 'grab'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
          <circle cx="5" cy="5" r="1" />
          <circle cx="5" cy="12" r="1" />
          <circle cx="5" cy="19" r="1" />
        </svg>
      </div>
      {actions.map(renderAction)}
    </div>
  );
};

export default FloatingToolbox;
