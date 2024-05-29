# @savio99/react-draw

> Simple responsive draw component to sign and draw in your own website

[![NPM Version](https://img.shields.io/npm/v/@savio99/react-draw.svg?branch=master)](https://www.npmjs.com/package/@savio99/react-draw) [![License](https://img.shields.io/npm/l/@savio99/react-draw.svg)](https://github.com/savio-99/react-draw/blob/master/LICENSE)


## Install

```bash
npm install --save @savio99/react-draw
```

## Usage

```tsx
import React, { Component } from 'react'

import Whiteboard, { Stroke } from 'react-draw'
import 'react-draw/dist/index.css'

interface ExampleProps {
  initialStrokes?: Stroke[]
}

export default function Example({
  initialStrokes
}: ExampleProps) {
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
      initialStrokes={initialStrokes}
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
```

## License

MIT © [savio-99](https://github.com/savio-99)
