import { act, renderHook } from '@testing-library/react'
import { useContextMenuPressGate } from 'uniswap/src/components/menus/hooks/useContextMenuPressGate.native'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe(useContextMenuPressGate, () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls onPress for a short tap', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => useContextMenuPressGate({ onPress, duration: 300 }))

    act(() => {
      result.current.onPressIn()
      vi.advanceTimersByTime(100)
      result.current.handlePress()
    })

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('suppresses onPress when press lasts longer than duration', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => useContextMenuPressGate({ onPress, duration: 300 }))

    act(() => {
      result.current.onPressIn()
      vi.advanceTimersByTime(350)
      result.current.handlePress()
    })

    expect(onPress).not.toHaveBeenCalled()
  })

  it('keeps the earliest press-in when onPressIn re-fires mid-gesture', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => useContextMenuPressGate({ onPress, duration: 300 }))

    act(() => {
      result.current.onPressIn()
      vi.advanceTimersByTime(280)
      // Simulate Pressable reset re-firing onPressIn without clearing the contact
      result.current.onPressIn()
      vi.advanceTimersByTime(50)
      result.current.handlePress()
    })

    expect(onPress).not.toHaveBeenCalled()
  })

  it('suppresses only past the default duration', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => useContextMenuPressGate({ onPress }))

    act(() => {
      result.current.onPressIn()
      vi.advanceTimersByTime(400)
      result.current.handlePress()
    })

    expect(onPress).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.onPressIn()
      vi.advanceTimersByTime(500)
      result.current.handlePress()
    })

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('calls onPress for a long press when the menu is disabled', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => useContextMenuPressGate({ onPress, duration: 300, isMenuEnabled: false }))

    act(() => {
      result.current.onPressIn()
      vi.advanceTimersByTime(1000)
      result.current.handlePress()
    })

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('suppresses a long press when onPress is delivered after onPressOut', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => useContextMenuPressGate({ onPress, duration: 300 }))

    act(() => {
      result.current.onPressIn()
      vi.advanceTimersByTime(350)
      result.current.onPressOut()
      // RNGH delivers onPress a macrotask later than onPressOut
      vi.advanceTimersByTime(0)
      result.current.handlePress()
    })

    expect(onPress).not.toHaveBeenCalled()
  })

  it('clears a short press so the next contact is timed from its own press-in', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => useContextMenuPressGate({ onPress, duration: 300 }))

    act(() => {
      result.current.onPressIn()
      vi.advanceTimersByTime(100)
      result.current.onPressOut()
      vi.advanceTimersByTime(0)
    })

    act(() => {
      vi.advanceTimersByTime(400)
      result.current.onPressIn()
      vi.advanceTimersByTime(100)
      result.current.handlePress()
    })

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('starts a new contact when a press-in timestamp leaks from a consumed gesture', () => {
    const onPress = vi.fn()
    const { result } = renderHook(() => useContextMenuPressGate({ onPress, duration: 300 }))

    act(() => {
      // Native menu consumes the gesture: neither onPressOut nor handlePress runs
      result.current.onPressIn()
      vi.advanceTimersByTime(2000)
      // Next tap after the menu is dismissed
      result.current.onPressIn()
      vi.advanceTimersByTime(100)
      result.current.handlePress()
    })

    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
