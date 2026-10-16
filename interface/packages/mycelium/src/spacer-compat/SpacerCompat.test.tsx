import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { FlexCompat } from '../flex-compat/FlexCompat'
import type { FlexCompatProps } from '../flex-compat/props'
import { SpacerCompat } from './SpacerCompat'

afterEach(() => {
  cleanup()
})

function renderedElement(ui: ReactElement): HTMLElement {
  const { container } = render(ui)
  const el = container.firstElementChild
  if (!(el instanceof HTMLElement)) {
    throw new Error('nothing rendered')
  }
  return el
}

function flexClassName(props: FlexCompatProps): string {
  const className = renderedElement(<FlexCompat {...props} />).className
  cleanup()
  return className
}

describe('SpacerCompat', () => {
  it('fans size out onto width/height and their min twins, same as a hand-built FlexCompat', () => {
    const expected = flexClassName({
      tag: 'span',
      pointerEvents: 'none',
      width: '$spacing16',
      height: '$spacing16',
      minWidth: '$spacing16',
      minHeight: '$spacing16',
    })
    expect(renderedElement(<SpacerCompat size="$spacing16" />).className).toBe(expected)
  })

  it.each([
    ['$spacing6', 6],
    ['$spacing8', 8],
    ['$spacing12', 12],
    ['$spacing16', 16],
    ['$spacing20', 20],
    ['$spacing24', 24],
    ['$spacing32', 32],
  ])('resolves %s through the space scale to %ipx on all four dimensions', (token, px) => {
    const classes = renderedElement(<SpacerCompat size={token} />).className.split(' ')
    expect(classes).toEqual(
      expect.arrayContaining([`w-[${px}px]`, `h-[${px}px]`, `min-w-[${px}px]`, `min-h-[${px}px]`]),
    )
  })

  it('defaults to the legacy $true size of 8px and sets no max twins', () => {
    const classes = renderedElement(<SpacerCompat />).className.split(' ')
    expect(classes).toEqual(expect.arrayContaining(['w-[8px]', 'h-[8px]', 'min-w-[8px]', 'min-h-[8px]']))
    expect(classes.filter((name) => name.startsWith('max-w-') || name.startsWith('max-h-'))).toEqual([])
  })

  it('renders a non-interactive span', () => {
    const el = renderedElement(<SpacerCompat />)
    expect(el.tagName).toBe('SPAN')
    expect(el.className.split(' ')).toContain('[pointer-events:none]')
  })

  it('maps any truthy flex onto flexGrow: 1, and a falsy one onto nothing', () => {
    const expected = flexClassName({
      tag: 'span',
      pointerEvents: 'none',
      width: '$true',
      height: '$true',
      minWidth: '$true',
      minHeight: '$true',
      flexGrow: 1,
    })
    expect(renderedElement(<SpacerCompat flex={1} />).className).toBe(expected)
    expect(renderedElement(<SpacerCompat flex />).className).toBe(expected)
    expect(renderedElement(<SpacerCompat flex={false} />).className).toBe(renderedElement(<SpacerCompat />).className)
  })
})
