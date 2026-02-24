export interface SketchImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
}

export const createImage = (
  src: string,
  x: number = 0,
  y: number = 0,
  width: number = 100,
  height: number = 100
): SketchImage => ({
  id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  src,
  x,
  y,
  width,
  height,
  rotation: 0,
  opacity: 1
});

export const loadImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
};
