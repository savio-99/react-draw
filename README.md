# react-draw

> Simple responsive draw component to sign and draw in your own website

[![NPM](https://img.shields.io/npm/v/react-draw.svg)](https://www.npmjs.com/package/react-draw) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save @savio-99/react-draw
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
