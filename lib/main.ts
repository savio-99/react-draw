import Pen from './Pen'
import Point from './Point';
import Whiteboard from './Whiteboard'
import Grid from './Grid'
import FloatingToolbox from './FloatingToolbox'
import { SketchImage, createImage, loadImageDimensions } from './Image'

import type { ToolboxAction } from './FloatingToolbox'
import type { WhiteboardData } from './Whiteboard'

type Stroke = {
  box: {
    width: number,
    height: number,
  },
  points: Point[],
  color: string,
  width: number,
}

export { Pen, Point, Grid, FloatingToolbox, createImage, loadImageDimensions };
export type { Stroke, SketchImage, ToolboxAction, WhiteboardData };

export default Whiteboard;