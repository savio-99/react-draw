import React, { TouchEvent, MouseEvent } from 'react'
import Pen, { Stroke } from '../tools/pen'
import Point from '../tools/point'

interface WhiteboardProps {
  enabled?: boolean,
  containerStyle?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
  strokeColor?: string,
  strokeWidth?: number,
  onChangeStrokes?: Function,
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
  _panResponder: any;

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
    if(this.props.strokes) console.log(this.props.strokes.length)
    if (this.props.strokes !== undefined && this.props.strokes.length !== this.state.previousStrokes.length) {
      this.setState({ previousStrokes: this.props.strokes })
    }
    
  }

  undo = () => {
    if (this.state.currentPoints.points.length > 0 || this.state.previousStrokes.length < 1) return
    let strokes = this.state.previousStrokes
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

  onTouch = (evt: any) => {
    if (this.props.enabled == false) return;

    var x: number = 0;
    var y: number = 0;
    var time: number | undefined = undefined;

    if (evt.touches) {
      let event = evt as TouchEvent
      let touch: React.Touch | null = event.touches[0];

      if (!touch) return;

      x = touch.clientX;
      y = touch.clientY;
      time = evt.timeStamp;
    } else {
        let event = evt as MouseEvent;
        const rect = this.drawer?.getBoundingClientRect();
        if (rect) {
          x = event.clientX - rect.left;
          y = event.clientY - rect.top;
        }
    } 

    let newCurrentPoints = {...this.state.currentPoints, points: [...this.state.currentPoints.points, new Point(x, y, time)]}

    this.setState({
      currentPoints: newCurrentPoints
    })

  }

  onResponderGrant = (evt: TouchEvent<HTMLCanvasElement> | MouseEvent<HTMLCanvasElement>) => {
    this.dragging = true;
    this.onTouch(evt);
  }

  onResponderMove = (evt: TouchEvent<HTMLCanvasElement> | MouseEvent<HTMLCanvasElement>) => {
    if(this.dragging) this.onTouch(evt);
  }

  onResponderRelease = () => {
    this.dragging = false;
    let strokes = this.state.previousStrokes
    if (this.state.currentPoints.points.length < 1) return
    var { height, width } = this.state;

    var points = this.state.currentPoints
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
    if(this.state.height != height || this.state.width != width || this.state.px != left || this.state.py != top) {
      const currentPoints = {...this.state.currentPoints};
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

  render() {
    const { height, width, previousStrokes, currentPoints, pen, px, py } = this.state;
    const zIndex = this.props.zIndex || 0;
    const props = (this.props.containerStyle || {}) as React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
    const rect = this.drawer?.getBoundingClientRect();

    if(!props.style) props.style = {
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
        ref={drawer => this.drawer = drawer}
        onTouchStart={this.onResponderGrant}
        onTouchMove={this.onResponderMove}
        onTouchEnd={this.onResponderRelease}        
        onMouseDown={this.onResponderGrant} 
        onMouseMove={this.onResponderMove}
        onMouseUp={this.onResponderRelease}
        style={{ flex: 1, backgroundColor: 'transparent', zIndex }}>
      </canvas> 
      <svg style={{ position: 'absolute', ...(rect ? { rect } : {left: px, top: py}), zIndex: zIndex - 1 }} height={height} width={width}>
          <g>
            {
              new Pen(previousStrokes).toSvg({ width, height})
            }
            <path
              d={pen.pointsToSvg(currentPoints, { height, width })}
              stroke={currentPoints.color}
              strokeWidth={currentPoints.width}
              fill="none" />
          </g>
        </svg> 
    </div>)
  }
}