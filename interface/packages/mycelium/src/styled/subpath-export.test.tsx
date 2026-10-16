// @vitest-environment jsdom
/**
 * Consumption-path contract for the styled() factory: conversions import it
 * as `@universe/mycelium/styled` (the shipped subpath export — deliberately
 * not in the package barrel). This test imports through the package name
 * (self-reference), so it only passes when the `"./styled"` exports-map entry
 * resolves — mycelium's vitest config has no tsconfig-paths plugin, meaning
 * resolution here goes through package.json `exports` (the deep-import icons
 * test precedent).
 */
import { render } from '@testing-library/react'
import { collectStyledClasses, styled } from '@universe/mycelium/styled'
import type { GetProps, StyledComponent } from '@universe/mycelium/styled'
import { describe, expect, it } from 'vitest'

describe('styled subpath export via exports map', () => {
  it('resolves @universe/mycelium/styled and builds a working component', () => {
    const Frame: StyledComponent<'div', { row: { true: string; false: string } }> = styled('div', {
      base: 'rounded-12',
      variants: { row: { true: 'flex-row', false: 'flex-col' } },
      defaultVariants: { row: false },
    })
    const { container } = render(<Frame row className="gap-2" />)
    const classes = (container.firstElementChild as HTMLElement).className.split(/\s+/)
    expect(classes.sort()).toEqual(['flex-row', 'gap-2', 'rounded-12'])
    expect(collectStyledClasses(Frame.styledConfig)).toEqual(['flex-col', 'flex-row', 'rounded-12'])
    // Type-level proof the conversion alias survives the subpath.
    const props: GetProps<typeof Frame> = { row: true, className: 'gap-2' }
    expect(props.row).toBe(true)
  })
})
