import { describe, expect, it, vi } from 'vitest'
import { coalesceScrollEvents } from './coalesceScrollEvents'

function fakeFrame(): { schedule: (cb: () => void) => number; cancel: (h: number) => void; tick: () => void } {
  const queue = new Map<number, () => void>()
  let next = 1
  return {
    schedule: (cb) => {
      const handle = next++
      queue.set(handle, cb)
      return handle
    },
    cancel: (handle) => {
      queue.delete(handle)
    },
    tick: () => {
      const callbacks = [...queue.values()]
      queue.clear()
      callbacks.forEach((cb) => cb())
    },
  }
}

describe('coalesceScrollEvents', () => {
  it('delivers only the newest event of a frame, once', () => {
    const frame = fakeFrame()
    const deliver = vi.fn()
    const { onScroll } = coalesceScrollEvents<number>(deliver, frame)

    onScroll(1)
    onScroll(2)
    onScroll(3)
    expect(deliver).not.toHaveBeenCalled()

    frame.tick()
    expect(deliver).toHaveBeenCalledTimes(1)
    expect(deliver).toHaveBeenCalledWith(3)
  })

  it('schedules again for events that arrive after a flush', () => {
    const frame = fakeFrame()
    const deliver = vi.fn()
    const { onScroll } = coalesceScrollEvents<number>(deliver, frame)

    onScroll(1)
    frame.tick()
    onScroll(2)
    frame.tick()
    expect(deliver.mock.calls).toEqual([[1], [2]])
  })

  it('drops the pending event on dispose', () => {
    const frame = fakeFrame()
    const deliver = vi.fn()
    const { onScroll, dispose } = coalesceScrollEvents<number>(deliver, frame)

    onScroll(1)
    dispose()
    frame.tick()
    expect(deliver).not.toHaveBeenCalled()
  })
})
