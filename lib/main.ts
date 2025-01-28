import Pen from './Pen'
import Point from './Point';
import Whiteboard from './Whiteboard'

type Stroke = {
  box: {
    width: number,
    height: number,
  },
  points: Point[],
  color: string,
  width: number,
}

export { Pen, Point };
export type { Stroke };

export default Whiteboard;