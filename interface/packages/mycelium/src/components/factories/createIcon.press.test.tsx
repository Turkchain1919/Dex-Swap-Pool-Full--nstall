/**
 * Render-level pin for the `onPress`/`onClick` composition in `createIcon.tsx`
 * (INFRA-3750 sibling widening): a caller's raw `onClick` riding the
 * passthrough spread must still fire, before the new `onPress`, so supplying
 * both never silently drops one.
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Check } from '../icons/Check'

afterEach(() => {
  cleanup()
})

describe('createIcon onPress/onClick composition', () => {
  it('fires a caller-supplied onClick and the new onPress, in that order', () => {
    const calls: string[] = []
    const onClick = vi.fn(() => calls.push('onClick'))
    const onPress = vi.fn(() => calls.push('onPress'))
    const { container } = render(<Check onClick={onClick} onPress={onPress} />)
    const svg = container.querySelector('svg')
    if (svg === null) {
      throw new Error('no svg rendered')
    }
    fireEvent.click(svg)
    expect(calls).toEqual(['onClick', 'onPress'])
  })

  it('onPress alone still fires', () => {
    const onPress = vi.fn()
    const { container } = render(<Check onPress={onPress} />)
    const svg = container.querySelector('svg')
    if (svg === null) {
      throw new Error('no svg rendered')
    }
    fireEvent.click(svg)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('a raw onClick alone still fires, with no onPress supplied', () => {
    const onClick = vi.fn()
    const { container } = render(<Check onClick={onClick} />)
    const svg = container.querySelector('svg')
    if (svg === null) {
      throw new Error('no svg rendered')
    }
    fireEvent.click(svg)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
