import { renderHook } from '@testing-library/react'
import { DEFAULT_BOTTOM_INSET } from '@universe/mycelium/theme-hooks-compat'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// jsdom resolves `.web` legs, so the bare specifier would test the wrong file.
import { useDeviceInsets } from 'ui/src/hooks/useDeviceInsets.native'
import type { MockedFunction } from 'vitest'

// Declared locally rather than relying on the global react-native mocks preset, so the
// inset values this file asserts on are visible in it.
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: vi.fn(),
}))

const mockUseSafeAreaInsets = useSafeAreaInsets as MockedFunction<typeof useSafeAreaInsets>

function mockInsets(bottom: number): { top: number; right: number; bottom: number; left: number } {
  const insets = { top: 44, right: 0, bottom, left: 0 }
  mockUseSafeAreaInsets.mockReturnValue(insets)
  return insets
}

describe('useDeviceInsets (native)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('substitutes the default bottom inset when the device reports none', () => {
    mockInsets(0)

    const { result } = renderHook(() => useDeviceInsets())

    expect(result.current).toEqual({ top: 44, right: 0, bottom: DEFAULT_BOTTOM_INSET, left: 0 })
  })

  it('passes a reported bottom inset through', () => {
    mockInsets(34)

    const { result } = renderHook(() => useDeviceInsets())

    expect(result.current).toEqual({ top: 44, right: 0, bottom: 34, left: 0 })
  })

  it('passes a reported Android navigation-bar inset through unchanged', () => {
    mockInsets(48)

    const { result } = renderHook(() => useDeviceInsets())

    expect(result.current.bottom).toBe(48)
  })

  it('does not mutate the insets object owned by react-native-safe-area-context', () => {
    const insets = mockInsets(0)

    const { result } = renderHook(() => useDeviceInsets())

    expect(insets.bottom).toBe(0)
    expect(result.current).not.toBe(insets)
  })
})
