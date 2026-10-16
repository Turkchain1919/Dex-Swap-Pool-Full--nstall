/**
 * `SquareCompat` render contract (INFRA-3750 sibling widening): `size` fans
 * out onto `width`/`height`/`minWidth`/`maxWidth`/`minHeight`/`maxHeight` all
 * at once, matching legacy Tamagui `Square`'s `getShapeSize` variant, and the
 * `centered` frame default rides through unchanged. Compared against a
 * directly rendered `FlexCompat` (the `AnimatableCopyIconCompat` precedent),
 * not a literal class string, so the contract is "same emission as the flex
 * compat with size fanned out", not a copy of its class manifest.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FlexCompat } from '../flex-compat/FlexCompat'
import type { FlexCompatProps } from '../flex-compat/props'
import { SquareCompat } from './SquareCompat'

afterEach(() => {
  cleanup()
})

function flexClassName(props: FlexCompatProps): string {
  const { container } = render(<FlexCompat {...props} />)
  const el = container.firstElementChild
  if (!(el instanceof HTMLElement)) {
    throw new Error('no FlexCompat rendered')
  }
  const className = el.className
  cleanup()
  return className
}

describe('SquareCompat', () => {
  it('fans size out onto width/height/min/max, centered, same as a hand-built FlexCompat', () => {
    const expected = flexClassName({
      centered: true,
      width: 48,
      height: 48,
      minWidth: 48,
      maxWidth: 48,
      minHeight: 48,
      maxHeight: 48,
    })
    const { container } = render(<SquareCompat size={48} />)
    const el = container.firstElementChild
    expect(el).toBeInstanceOf(HTMLElement)
    expect((el as HTMLElement).className).toBe(expected)
  })

  it('a token size resolves identically to the same token on a plain FlexCompat width/height', () => {
    const expected = flexClassName({
      centered: true,
      width: '$spacing48',
      height: '$spacing48',
      minWidth: '$spacing48',
      maxWidth: '$spacing48',
      minHeight: '$spacing48',
      maxHeight: '$spacing48',
    })
    const { container } = render(<SquareCompat size="$spacing48" />)
    const el = container.firstElementChild
    expect((el as HTMLElement).className).toBe(expected)
  })

  it('passes other Flex props through unchanged', () => {
    const { container } = render(<SquareCompat size={24} backgroundColor="$surface2" />)
    const el = container.firstElementChild
    expect((el as HTMLElement).className).toContain('bg-surface2')
  })
})
