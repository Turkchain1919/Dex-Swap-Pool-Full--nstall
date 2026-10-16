import { renderHook } from '@testing-library/react'
import { spacing, useIsShortMobileDevice } from '@universe/mycelium'
import { DEFAULT_BOTTOM_INSET } from '@universe/mycelium/theme-hooks-compat'
import { useAppInsets } from 'uniswap/src/hooks/useAppInsets'
import { useBottomScreenGap } from 'uniswap/src/hooks/useBottomScreenGap'
import type { MockedFunction } from 'vitest'

const platform = vi.hoisted(() => ({ isAndroid: false, isIOS: true }))

vi.mock('@universe/environment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@universe/environment')>()),
  get isAndroid(): boolean {
    return platform.isAndroid
  },
  get isIOS(): boolean {
    return platform.isIOS
  },
}))
vi.mock('uniswap/src/hooks/useAppInsets', () => ({
  useAppInsets: vi.fn(),
}))
vi.mock('@universe/mycelium', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@universe/mycelium')>()),
  useIsShortMobileDevice: vi.fn(),
}))

const mockUseAppInsets = useAppInsets as MockedFunction<typeof useAppInsets>
const mockUseIsShortMobileDevice = useIsShortMobileDevice as MockedFunction<typeof useIsShortMobileDevice>

function mockBottomInset(bottom: number): void {
  mockUseAppInsets.mockReturnValue({ top: 44, right: 0, bottom, left: 0 })
}

function mockAndroid(): void {
  platform.isAndroid = true
  platform.isIOS = false
}

describe('useBottomScreenGap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platform.isAndroid = false
    platform.isIOS = true
    mockBottomInset(34)
    mockUseIsShortMobileDevice.mockReturnValue(false)
  })

  it('returns inset + spacing16 on iOS', () => {
    const { result } = renderHook(() => useBottomScreenGap())

    expect(result.current).toEqual({
      bottomScreenTotalGap: 34 + spacing.spacing16,
      bottomScreenExtraGap: spacing.spacing16,
    })
  })

  it('returns a tightened gap on short iOS devices', () => {
    mockUseIsShortMobileDevice.mockReturnValue(true)

    const { result } = renderHook(() => useBottomScreenGap())

    expect(result.current).toEqual({
      bottomScreenTotalGap: 34 + spacing.spacing4,
      bottomScreenExtraGap: spacing.spacing4,
    })
  })

  // The three Android inset classes share one code path on purpose: the DEFAULT_BOTTOM_INSET floor
  // (OS reported 0) is indistinguishable from a real inset, so navigation mode is never inferred from it.
  it.each([
    { label: 'the DEFAULT_BOTTOM_INSET floor (OS reported 0)', bottom: DEFAULT_BOTTOM_INSET },
    { label: 'a gesture-nav inset', bottom: 24 },
    { label: 'a three-button-nav inset', bottom: 48 },
  ])('widens the gap by spacing8 on Android with $label', ({ bottom }) => {
    mockAndroid()
    mockBottomInset(bottom)

    const { result } = renderHook(() => useBottomScreenGap())

    expect(result.current).toEqual({
      bottomScreenTotalGap: bottom + spacing.spacing16 + spacing.spacing8,
      bottomScreenExtraGap: spacing.spacing16 + spacing.spacing8,
    })
  })

  it('keeps the full extra gap on short Android devices', () => {
    mockAndroid()
    mockBottomInset(48)
    mockUseIsShortMobileDevice.mockReturnValue(true)

    const { result } = renderHook(() => useBottomScreenGap())

    expect(result.current.bottomScreenExtraGap).toBe(spacing.spacing16 + spacing.spacing8)
  })
})
