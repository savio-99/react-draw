
import React from 'react'
import { render } from '@testing-library/react'
import Whiteboard from './view/pad'

describe('Whiteboard', () => {
  it('is truthy', () => {
    expect(Whiteboard).toBeTruthy()
  })
  test('Renders correctly', () => {
    const w = render(<Whiteboard zIndex={1}/>)
    expect(w).toBeTruthy()
  })
})
