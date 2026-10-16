import { describe, expect, it } from 'vitest'
import { pruneOptionLayouts } from './option-layouts'

const RECT_A = { x: 4, y: 4, width: 50, height: 26 }
const RECT_B = { x: 62, y: 4, width: 48, height: 26 }

describe('pruneOptionLayouts', () => {
  it('returns the same reference when every stored key is still rendered', () => {
    const layouts = { swap: RECT_A, limit: RECT_B }
    const options = [{ value: 'swap' }, { value: 'limit' }, { value: 'buy' }] as const
    expect(pruneOptionLayouts({ layouts, options })).toBe(layouts)
  })

  it('returns the same reference for an empty layout map', () => {
    const layouts = {}
    expect(pruneOptionLayouts({ layouts, options: [{ value: 'swap' }, { value: 'buy' }] })).toBe(layouts)
  })

  it('drops layouts for values no longer in options, keeping the rest', () => {
    const layouts: Partial<Record<string, typeof RECT_A>> = { swap: RECT_A, limit: RECT_B }
    const pruned = pruneOptionLayouts({ layouts, options: [{ value: 'limit' }, { value: 'buy' }] })
    expect(pruned).toEqual({ limit: RECT_B })
    // The input map is left untouched — pruning allocates a fresh map.
    expect(layouts).toEqual({ swap: RECT_A, limit: RECT_B })
  })

  it('prunes everything when no stored key survives', () => {
    const layouts: Partial<Record<string, typeof RECT_A>> = { swap: RECT_A }
    const pruned = pruneOptionLayouts({ layouts, options: [{ value: 'limit' }, { value: 'buy' }] })
    expect(pruned).toEqual({})
  })
})
