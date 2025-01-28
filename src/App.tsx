import { useRef, useState } from 'react'
import Whiteboard, { Stroke } from '../';

const App = () => {
  const whiteboard = useRef<Whiteboard>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  return <>
    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
      <button onClick={() => whiteboard.current?.undo()}>Undo</button>
      <button onClick={() => whiteboard.current?.clear()}>Clear</button>
      <input type="color" onChange={(e) => whiteboard.current?.changeColor(e.target.value)} />
      <input type="number" onChange={(e) => whiteboard.current?.changeStrokeWidth(parseInt(e.target.value))} defaultValue={4} />
    </div>
    <Whiteboard
      containerStyle={{
        style: {
          border: '2px solid black',
          borderRadius: 10,
          margin: 100
        }
      }}
      onChangeStrokes={(strokes: Stroke[]) => setStrokes(strokes)}
      ref={whiteboard} />
    <Whiteboard
      containerStyle={{
        style: {
          border: '2px solid black',
          borderRadius: 10,
          width: '50%',
          height: '20%',
          margin: 100
        }
      }}
      strokes={strokes} />
  </>
}

export default App
