import { render, renderHook } from '@testing-library/react'
import { createElement, createRef, type Ref } from 'react'
import { composeRefs, useComposedRefs } from 'utilities/src/react/composeRefs'
import { vi } from 'vitest'

describe('composeRefs', () => {
  it('assigns the node to object refs, calls function refs, and skips empty slots', () => {
    const objectRef = createRef<string>()
    const seen: Array<string | null> = []
    const functionRef = (node: string | null): void => {
      seen.push(node)
    }

    const composed = composeRefs<string>(objectRef, undefined, functionRef, null)

    composed('node')
    expect(objectRef.current).toBe('node')
    expect(seen).toEqual(['node'])

    composed(null)
    expect(objectRef.current).toBeNull()
    expect(seen).toEqual(['node', null])
  })

  it('returns no cleanup when no composed ref returns one, preserving the legacy null-call contract', () => {
    const objectRef = createRef<string>()
    const composed = composeRefs<string>(objectRef, () => {})

    expect(composed('node')).toBeUndefined()
  })

  it('composes React 19 cleanup refs — each cleanup runs exactly once', () => {
    const cleanupA = vi.fn()
    const cleanupB = vi.fn()
    const refA = vi.fn(() => cleanupA)
    const refB = vi.fn(() => cleanupB)

    const composed = composeRefs<string>(refA, refB)
    const composedCleanup = composed('node')

    expect(refA).toHaveBeenCalledExactlyOnceWith('node')
    expect(refB).toHaveBeenCalledExactlyOnceWith('node')
    expect(typeof composedCleanup).toBe('function')

    if (typeof composedCleanup === 'function') {
      composedCleanup()
    }
    expect(cleanupA).toHaveBeenCalledOnce()
    expect(cleanupB).toHaveBeenCalledOnce()
    // The cleanup path must not fall back to calling cleanup refs with null.
    expect(refA).toHaveBeenCalledOnce()
    expect(refB).toHaveBeenCalledOnce()
  })

  it('handles mixed cleanup, legacy function, and object refs per React 19 semantics', () => {
    const cleanup = vi.fn()
    const cleanupRef = vi.fn(() => cleanup)
    const legacySeen: Array<string | null> = []
    const legacyRef = (node: string | null): void => {
      legacySeen.push(node)
    }
    const objectRef = createRef<string>()

    const composed = composeRefs<string>(cleanupRef, legacyRef, objectRef)
    const composedCleanup = composed('node')

    expect(objectRef.current).toBe('node')
    expect(legacySeen).toEqual(['node'])
    // One ref returned a cleanup, so the composed ref must return one too — React
    // will not call it with null.
    expect(typeof composedCleanup).toBe('function')

    if (typeof composedCleanup === 'function') {
      composedCleanup()
    }
    expect(cleanup).toHaveBeenCalledOnce()
    // Slots without their own cleanup are detached by the composed cleanup instead.
    expect(legacySeen).toEqual(['node', null])
    expect(objectRef.current).toBeNull()
  })

  it('runs composed cleanups once on unmount when rendered by React', () => {
    const cleanupA = vi.fn()
    const cleanupB = vi.fn()
    const refA = vi.fn(() => cleanupA)
    const refB = vi.fn(() => cleanupB)
    const objectRef = createRef<HTMLDivElement>()

    const { unmount } = render(createElement('div', { ref: composeRefs<HTMLDivElement>(refA, refB, objectRef) }))

    expect(objectRef.current).toBeInstanceOf(HTMLDivElement)
    expect(refA).toHaveBeenCalledOnce()
    expect(refB).toHaveBeenCalledOnce()

    unmount()
    expect(cleanupA).toHaveBeenCalledOnce()
    expect(cleanupB).toHaveBeenCalledOnce()
    expect(objectRef.current).toBeNull()
    // React honored the cleanup contract: no null call into the cleanup refs.
    expect(refA).toHaveBeenCalledOnce()
    expect(refB).toHaveBeenCalledOnce()
  })
})

describe('useComposedRefs', () => {
  it('keeps the composed ref identity stable across re-renders with the same inputs', () => {
    const objectRef = createRef<string>()
    const functionRef = (_node: string | null): void => {}

    const { result, rerender } = renderHook(
      ({ refs }: { refs: Array<Ref<string> | undefined> }) => useComposedRefs<string>(...refs),
      { initialProps: { refs: [objectRef, functionRef] } },
    )
    const first = result.current

    rerender({ refs: [objectRef, functionRef] })
    expect(result.current).toBe(first)

    rerender({ refs: [objectRef, (_node: string | null): void => {}] })
    expect(result.current).not.toBe(first)
  })

  it('still assigns all composed refs', () => {
    const objectRef = createRef<string>()
    const seen: Array<string | null> = []
    const { result } = renderHook(() =>
      useComposedRefs<string>(objectRef, (node) => {
        seen.push(node)
      }),
    )

    result.current('node')
    expect(objectRef.current).toBe('node')
    expect(seen).toEqual(['node'])
  })
})
