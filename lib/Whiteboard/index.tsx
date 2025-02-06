import React from 'react'
import type { TouchEvent, MouseEvent } from 'react'
import Pen from '../Pen'
import { Point, Stroke } from '../main'

interface WhiteboardProps {
  enabled?: boolean,
  containerStyle?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
  strokeColor?: string,
  strokeWidth?: number,
  onChangeStrokes?: (strokes?: Stroke[]) => void,
  strokes?: Stroke[],
  initialStrokes?: Stroke[],
  zIndex?: number
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
  py: number
}

export default class Whiteboard extends React.Component<WhiteboardProps, WhiteboardState> {

  drawer: HTMLCanvasElement | null = null;
  //_panResponder: any;

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
      py: 0
    }

  }

  componentDidUpdate() {
    //if(this.props.strokes) console.log(this.props.strokes.length)
    if (this.props.strokes !== undefined && this.props.strokes.length !== this.state.previousStrokes.length) {
      this.setState({ previousStrokes: this.props.strokes })
    }

  }

  preventDefault = (e: Event) => {
    e.preventDefault();
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
    })
    this.state.pen.clear()
    this._onChangeStrokes([])
  }

  dragging = false;

  onTouch = (evt: TouchEvent | MouseEvent) => {
    if (this.props.enabled == false) return;

    let x: number = 0;
    let y: number = 0;
    let time: number | undefined = undefined;

    const rect = this.drawer?.getBoundingClientRect();
    if (evt.nativeEvent instanceof TouchEvent) {
      const event = evt as TouchEvent
      const touch: React.Touch | null = event.touches[0];

      if (!touch) return;

      if (rect) {
        x = touch.clientX - rect.left;
        y = touch.clientY - rect.top;
      }
      time = evt.timeStamp;
    } else {
      const event = evt as MouseEvent;
      if (rect) {
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
      }
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
    if (this.dragging) this.onTouch(evt);
  }

  handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    //e.preventDefault();
    this.onResponderGrant(e);
  }

  onResponderRelease = () => {
    this.dragging = false;

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
    if (this.state.height != height || this.state.width != width || this.state.px != left || this.state.py != top) {
      const currentPoints = { ...this.state.currentPoints };
      currentPoints.box = { height, width };
      this.setState({ height, width, px: left, py: top, currentPoints });
    }
  }

  componentDidMount() {
    window.addEventListener('scroll', this.updateSvgPosition);
    window.addEventListener('resize', this.updateSvgPosition);
    this.updateSvgPosition();
  }

  componentWillUnmount(): void {
    window.removeEventListener('scroll', this.updateSvgPosition);
    window.removeEventListener('resize', this.updateSvgPosition);
  }

  render(): React.ReactElement {
    const { height, width, previousStrokes, currentPoints, pen, px, py } = this.state;
    const zIndex = this.props.zIndex || 0;
    const props = (this.props.containerStyle || {}) as React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
    const rect = this.drawer?.getBoundingClientRect();

    if (!props.style) props.style = {
      flex: 1,
      display: 'flex',
    }
    else props.style = {
      ...props.style,
      flex: 1,
      display: 'flex',
    }
    delete props.ref;

    return (<div
      {...props}>

      <canvas
        ref={drawer => { this.drawer = drawer }}
        onTouchStart={this.handleTouchStart}
        onTouchMove={this.onResponderMove}
        onTouchEnd={this.onResponderRelease}
        onMouseDown={this.onResponderGrant}
        onMouseMove={this.onResponderMove}
        onMouseUp={this.onResponderRelease}
        style={{
          flex: 1,
          backgroundColor: 'transparent',
          zIndex,
          touchAction: 'none',
          scrollBehavior: 'unset'
        }}>
      </canvas>
      <svg style={{ position: 'absolute', ...(rect ? { rect } : { left: px, top: py }), zIndex: zIndex - 1 }} height={height} width={width}>
        <g>
          {
            new Pen(previousStrokes).toSvg({ width, height })
          }
          <path
            d={pen.pointsToSvg(currentPoints, { height, width })}
            stroke={currentPoints.color}
            strokeWidth={currentPoints.width}
            fill="none" />
        </g>
      </svg>
    </div>) as React.ReactElement
  }
}