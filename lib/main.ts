import Pen from './Pen'
import Point from './Point';
import Whiteboard from './Whiteboard'
import Grid from './Grid'
import FloatingToolbox from './FloatingToolbox'
import { SketchImage, createImage, loadImageDimensions } from './Image'
import Dimension, { DimensionModal, DimensionData, createDimension } from './Dimension'
import DrawingBoard from './DrawingBoard'

import type { ToolboxAction } from './FloatingToolbox'
import type { WhiteboardData, WhiteboardMode, WhiteBoard } from './Whiteboard'
import type { DrawingBoardProps, DrawingBoardRef } from './DrawingBoard'

type Stroke = {
  box: {
    width: number,
    height: number,
  },
  points: Point[],
  color: string,
  width: number,
}

export { Pen, Point, Grid, FloatingToolbox, createImage, loadImageDimensions, Dimension, DimensionModal, createDimension, DrawingBoard };
export type { Stroke, SketchImage, ToolboxAction, WhiteboardData, WhiteboardMode, DimensionData, DrawingBoardProps, DrawingBoardRef, WhiteBoard };

export default Whiteboard;