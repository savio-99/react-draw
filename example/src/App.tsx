import React from 'react'

import Whiteboard from '@savio99/react-draw'

const App = () => {
  return <>
    <Whiteboard zIndex={10} containerStyle={{
      style: {
        border: '1px solid black',
        margin: 10
      }
    }} />
    <Whiteboard zIndex={10} containerStyle={{
      style: {
        border: '2px solid black',
        borderRadius: 10,
        margin: 100
      }
    }} />
  </>
}

export default App
