/**
 * Class guards for the Spore design constants this package ships — the values a
 * designer specified and that nothing else in the suite pins. Every one of them
 * previously survived mutation: a refactor, a merge-conflict resolution or the
 * next shadcn sync could revert any of them with a green suite, and only the
 * designer would notice, months later.
 *
 * Same shape as the CSS-existence contracts in
 * packages/tailwind/src/parity/tooltip/tooltip-classes.test.ts and
 * packages/tailwind/src/recipes/recipes-classes.test.ts, but asserted on the
 * rendered DOM so `cn()`'s merge result is what gets checked, not source text.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Checkbox } from './checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu'
import { Field, FieldLabel } from './field'
import { Sheet, SheetContent, SheetTitle } from './sheet'
import { Tabs, TabsList, TabsTrigger } from './tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

afterEach(cleanup)

// TabsList measures its indicator with a ResizeObserver; jsdom has none.
class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = NoopResizeObserver

const classesOf = (element: Element | null): string[] =>
  (element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

/** Every `rounded*` utility on an element, so a swap to another radius fails rather than passes. */
const radiiOf = (element: Element | null): string[] => classesOf(element).filter((c) => c.startsWith('rounded'))

describe('Checkbox design constants', () => {
  it('has a 6px radius from the Spore scale (not an arbitrary rounded-[4px])', () => {
    const { container } = render(<Checkbox />)
    const root = container.querySelector('button')
    expect(radiiOf(root)).toEqual(['rounded-6'])
  })

  it('lets a consumer override the radius (needs the radius scale in cn.ts)', () => {
    const { container } = render(<Checkbox className="rounded-12" />)
    expect(radiiOf(container.querySelector('button'))).toEqual(['rounded-12'])
  })
})

describe('Tooltip design constants', () => {
  it('has a 4px radius from the Spore scale', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Info</TooltipTrigger>
          <TooltipContent>Details</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    )
    const content = document.body.querySelector('[data-radix-popper-content-wrapper] > *')
    expect(radiiOf(content)).toEqual(['rounded-4'])
  })
})

describe('Tabs design constants', () => {
  function renderTabs(): { list: Element | null; active: Element | null } {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    return {
      list: document.body.querySelector('[data-slot="tabs-list"]'),
      active: document.body.querySelector('[data-slot="tabs-trigger"][data-state="active"]'),
    }
  }

  it('abuts its triggers with gap-0 so there is no un-hoverable strip between them', () => {
    const classes = classesOf(renderTabs().list)
    expect(classes).toContain('gap-0')
    expect(classes).not.toContain('gap-1')
  })

  it('paints the light active fill with surface1 and the dark one with surface3', () => {
    const classes = classesOf(renderTabs().active)
    expect(classes).toContain('data-[state=active]:bg-surface1')
    expect(classes).toContain('dark:data-[state=active]:bg-surface3')
  })

  it('suppresses BOTH static active fills once the list owns a measured indicator', () => {
    // Without the `dark:`-prefixed suppressor the dark fill (0,3,0) ties the un-prefixed
    // suppressor and, being emitted later, wins — compounding with the indicator's own
    // dark:bg-surface3 into ~#515151 instead of surface3's #3A3A3A, and pre-lighting the
    // destination tab before the pill slides in.
    const classes = classesOf(renderTabs().active)
    expect(classes).toContain('group-data-[indicator=true]/tabs-list:data-[state=active]:bg-transparent')
    expect(classes).toContain('dark:group-data-[indicator=true]/tabs-list:data-[state=active]:bg-transparent')
    expect(classes).toContain('group-data-[indicator=true]/tabs-list:data-[state=active]:border-transparent')
    expect(classes).toContain('group-data-[indicator=true]/tabs-list:data-[state=active]:shadow-none')
  })
})

describe('Sheet design constants', () => {
  function renderSheet(side?: 'top' | 'right' | 'bottom' | 'left', className?: string): Element | null {
    render(
      <Sheet open>
        <SheetContent side={side} className={className}>
          <SheetTitle>Panel</SheetTitle>
        </SheetContent>
      </Sheet>,
    )
    return document.body.querySelector('[role="dialog"]')
  }

  it('has a 28px radius on all four corners', () => {
    expect(radiiOf(renderSheet())).toEqual(['rounded-28'])
  })

  it('lets a consumer override the radius (two shipped dev-portal panels pass rounded-20)', () => {
    expect(radiiOf(renderSheet('right', 'rounded-20'))).toEqual(['rounded-20'])
  })

  it('floats 12px off the viewport on every side, per side variant', () => {
    expect(classesOf(renderSheet('right'))).toEqual(expect.arrayContaining(['inset-y-3', 'right-3']))
    cleanup()
    expect(classesOf(renderSheet('left'))).toEqual(expect.arrayContaining(['inset-y-3', 'left-3']))
    cleanup()
    expect(classesOf(renderSheet('top'))).toEqual(expect.arrayContaining(['inset-x-3', 'top-3']))
    cleanup()
    expect(classesOf(renderSheet('bottom'))).toEqual(expect.arrayContaining(['inset-x-3', 'bottom-3']))
  })

  it('does not carry a full-length dimension, which opposing insets would overflow', () => {
    const classes = classesOf(renderSheet('right'))
    expect(classes).not.toContain('h-full')
    expect(classes).not.toContain('w-full')
  })
})

describe('Menu separator design constants', () => {
  it('is flush with the option text box (mx-0 w-full), not inset by -mx-1', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    const classes = classesOf(document.body.querySelector('[data-slot="dropdown-menu-separator"]'))
    expect(classes).toEqual(expect.arrayContaining(['mx-0', 'w-full', 'h-px', 'bg-surface3']))
    expect(classes).not.toContain('-mx-1')
  })
})

describe('Field design constants', () => {
  it('owns the 12px label-to-control gap', () => {
    const { container } = render(
      <Field>
        <FieldLabel htmlFor="a">A</FieldLabel>
      </Field>,
    )
    const classes = classesOf(container.querySelector('[data-slot="field"]'))
    expect(classes).toContain('gap-3')
    expect(classes).not.toContain('gap-2')
  })
})
