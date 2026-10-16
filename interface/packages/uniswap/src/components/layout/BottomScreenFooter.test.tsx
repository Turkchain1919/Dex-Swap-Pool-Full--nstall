import { BottomScreenFooter } from 'uniswap/src/components/layout/BottomScreenFooter'
import { useAppInsets } from 'uniswap/src/hooks/useAppInsets'
import { useBottomScreenGap } from 'uniswap/src/hooks/useBottomScreenGap'
import { renderWithProviders } from 'uniswap/src/test/render'
import type { MockedFunction } from 'vitest'

vi.mock('uniswap/src/hooks/useAppInsets', () => ({
  useAppInsets: vi.fn(),
}))
vi.mock('uniswap/src/hooks/useBottomScreenGap', () => ({
  useBottomScreenGap: vi.fn(),
}))

const mockUseAppInsets = useAppInsets as MockedFunction<typeof useAppInsets>
const mockUseBottomScreenGap = useBottomScreenGap as MockedFunction<typeof useBottomScreenGap>

/**
 * This package's vitest environment has no Tailwind build step, so mycelium's
 * utility classes never resolve via `getComputedStyle` here (unlike apps/web,
 * which compiles Tailwind for tests). A gap value renders as either a literal
 * arbitrary class (`pb-[16px]`) or, once outside the pregenerated safelist, a
 * var-indirection twin (`pb-[var(--c-pb)]` plus an inline `--c-pb` custom
 * property) — read whichever form is actually present instead.
 *
 * Returns `undefined` when no gap class is present at all, and `''` when a
 * var-indirection class is present but its custom property was never set, so
 * callers can tell "no gap applied" apart from "gap emitted but unresolved".
 */
function resolvedGapValue(el: HTMLElement, prefix: 'pb' | 'pt' | 'mb'): string | undefined {
  const marker = `${prefix}-[`
  const cls = el.className.split(/\s+/).find((name) => name.startsWith(marker))
  if (!cls) {
    return undefined
  }
  const inner = cls.slice(marker.length, -1)
  const varMatch = inner.match(/^var\((--[\w-]+)\)$/)
  const varName = varMatch?.[1]
  return varName ? el.style.getPropertyValue(varName).trim() : inner
}

describe(BottomScreenFooter, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAppInsets.mockReturnValue({ top: 44, right: 0, bottom: 34, left: 0 })
    mockUseBottomScreenGap.mockReturnValue({ bottomScreenTotalGap: 50, bottomScreenExtraGap: 16 })
  })

  it('applies the full gap as padding by default', () => {
    const { getByTestId } = renderWithProviders(<BottomScreenFooter testID="footer" />)

    const footer = getByTestId('footer') as unknown as HTMLElement
    expect(resolvedGapValue(footer, 'pb')).toBe('50px')
    expect(resolvedGapValue(footer, 'mb')).toBeUndefined()
  })

  it('splits the gap into margin and padding in margin mode', () => {
    const { getByTestId } = renderWithProviders(<BottomScreenFooter insetMode="margin" testID="footer" />)

    const footer = getByTestId('footer') as unknown as HTMLElement
    expect(resolvedGapValue(footer, 'mb')).toBe('34px')
    expect(resolvedGapValue(footer, 'pb')).toBe('16px')
  })

  it('does not let callers override the guaranteed bottom gap', () => {
    const { getByTestId } = renderWithProviders(<BottomScreenFooter pb={0} pt={24} testID="footer" />)

    const footer = getByTestId('footer') as unknown as HTMLElement
    expect(resolvedGapValue(footer, 'pb')).toBe('50px')
    expect(resolvedGapValue(footer, 'pt')).toBe('24px')
  })

  it('applies only the extra gap when a parent applies the inset', () => {
    const { getByTestId } = renderWithProviders(<BottomScreenFooter insetMode="none" testID="footer" />)

    const footer = getByTestId('footer') as unknown as HTMLElement
    expect(resolvedGapValue(footer, 'pb')).toBe('16px')
    expect(resolvedGapValue(footer, 'mb')).toBeUndefined()
  })
})
