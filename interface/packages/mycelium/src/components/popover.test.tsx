import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

afterEach(cleanup)

const classesOf = (element: Element | null): string[] =>
  (element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

function renderContent(props: { side?: 'top' | 'right' | 'bottom' | 'left'; align?: 'start' | 'center' | 'end' } = {}) {
  render(
    <Popover open>
      <PopoverTrigger>Slippage</PopoverTrigger>
      <PopoverContent {...props}>Max slippage</PopoverContent>
    </Popover>,
  )
  // Radix portals the content out of the render container.
  return document.body.querySelector('[data-radix-popper-content-wrapper] > *')
}

describe('PopoverContent placement', () => {
  it('defaults to side=bottom / align=center', () => {
    const content = renderContent()
    expect(content?.getAttribute('data-side')).toBe('bottom')
    expect(content?.getAttribute('data-align')).toBe('center')
  })

  it.each(['top', 'right', 'bottom', 'left'] as const)('honours side=%s', (side) => {
    expect(renderContent({ side })?.getAttribute('data-side')).toBe(side)
  })

  it.each(['start', 'center', 'end'] as const)('honours align=%s', (align) => {
    expect(renderContent({ align })?.getAttribute('data-align')).toBe(align)
  })
})

describe('PopoverContent surface + animation tokens', () => {
  // These were fumadocs names (bg-fd-popover, animate-fd-popover-in) that only resolve
  // inside apps/dev-portal: everywhere else the panel had no background and no animation.
  it('uses repo tokens, not fumadocs ones', () => {
    const classes = classesOf(renderContent()).join(' ')
    expect(classes).not.toContain('fd-popover')
    expect(classes).toContain('bg-surface2/60')
    expect(classes).toContain('text-neutral1')
  })

  it('uses the stock enter/exit pattern shared with dropdown-menu, select and tooltip', () => {
    const classes = classesOf(renderContent())
    expect(classes).toContain('data-[state=open]:animate-in')
    expect(classes).toContain('data-[state=closed]:animate-out')
    expect(classes).toContain('data-[state=open]:fade-in-0')
    expect(classes).toContain('data-[state=open]:zoom-in-95')
    expect(classes).toContain('data-[side=bottom]:slide-in-from-top-2')
    expect(classes).toContain('data-[side=top]:slide-in-from-bottom-2')
  })
})
