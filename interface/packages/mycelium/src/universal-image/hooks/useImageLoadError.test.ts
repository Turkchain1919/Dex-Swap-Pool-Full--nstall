// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useImageLoadError } from './useImageLoadError'

describe('useImageLoadError', () => {
  it('reports no error until the current uri is marked errored, and forwards onError', () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useImageLoadError('https://example.com/a.png', onError))

    expect(result.current.hasError).toBe(false)

    act(() => result.current.handleError())

    expect(result.current.hasError).toBe(true)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('clears the error when the uri changes, then re-errors independently', () => {
    const { result, rerender } = renderHook(({ uri }: { uri: string | number | undefined }) => useImageLoadError(uri), {
      initialProps: { uri: 'https://example.com/a.png' as string | number | undefined },
    })

    act(() => result.current.handleError())
    expect(result.current.hasError).toBe(true)

    rerender({ uri: 'https://example.com/b.png' })
    expect(result.current.hasError, 'a new uri gets a fresh load attempt').toBe(false)

    rerender({ uri: 'https://example.com/a.png' })
    expect(result.current.hasError, 'returning to a previously failed uri retries it').toBe(false)
  })

  it('never reports an error for an undefined uri', () => {
    const { result } = renderHook(() => useImageLoadError(undefined))

    act(() => result.current.handleError())

    expect(result.current.hasError).toBe(false)
  })
})
