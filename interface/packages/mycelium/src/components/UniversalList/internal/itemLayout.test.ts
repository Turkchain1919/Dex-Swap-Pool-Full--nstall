import { describe, expect, it } from 'vitest'
import { createItemTypeResolver, createOverrideItemLayout } from './itemLayout'

describe('createOverrideItemLayout', () => {
  it('returns undefined when the consumer has no getItemSpan, so the engine keeps its default', () => {
    expect(createOverrideItemLayout(undefined)).toBeUndefined()
  })

  it('writes the returned span onto the layout', () => {
    const overrideItemLayout = createOverrideItemLayout<string>((item) => (item === 'Alpha' ? 2 : undefined))
    const layout: { span?: number } = {}

    overrideItemLayout?.(layout, 'Alpha', 0)

    expect(layout).toEqual({ span: 2 })
  })

  it('leaves the layout untouched when getItemSpan returns undefined', () => {
    const overrideItemLayout = createOverrideItemLayout<string>(() => undefined)
    const layout: { span?: number } = {}

    overrideItemLayout?.(layout, 'Bravo', 1)

    expect(layout).toEqual({})
  })

  it('does not clear a span the engine already set when getItemSpan has no opinion', () => {
    const overrideItemLayout = createOverrideItemLayout<string>(() => undefined)
    const layout: { span?: number } = { span: 3 }

    overrideItemLayout?.(layout, 'Bravo', 1)

    expect(layout).toEqual({ span: 3 })
  })

  it('passes the index through', () => {
    const overrideItemLayout = createOverrideItemLayout<string>((_item, index) => index + 1)
    const layout: { span?: number } = {}

    overrideItemLayout?.(layout, 'Alpha', 4)

    expect(layout).toEqual({ span: 5 })
  })
})

describe('createItemTypeResolver', () => {
  it('returns undefined when the consumer has no getItemType', () => {
    expect(createItemTypeResolver(undefined)).toBeUndefined()
  })

  it('coerces a numeric item type to the string the engine pools on', () => {
    const resolveItemType = createItemTypeResolver<string>((_item, index) => index)

    expect(resolveItemType?.('Alpha', 7)).toBe('7')
  })

  it('passes a string item type through unchanged', () => {
    const resolveItemType = createItemTypeResolver<{ kind: string }>((item) => item.kind)

    expect(resolveItemType?.({ kind: 'header' }, 0)).toBe('header')
  })
})
