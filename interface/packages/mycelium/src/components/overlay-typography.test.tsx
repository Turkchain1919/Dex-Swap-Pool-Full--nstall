import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Card, CardTitle } from './card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from './drawer'

afterEach(cleanup)

const classesOf = (element: Element | null): string[] =>
  (element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

/**
 * Dialog / Card / Drawer titles used to hand-roll `font-semibold` (600), which is
 * not a Basel weight at all — Basel is 485 (book) / 535 (medium) — so the browser
 * synthesised a bold that matched none of the defined type styles. The Spore type
 * tokens carry the correct weight by definition, so no font-weight class may be
 * layered back on: `text-*` emits `font-weight: var(--tw-font-weight, …)`, and any
 * `font-*` utility would win the var and re-break it.
 */
const WEIGHT_CLASS = /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|basel-\w+)$/

function renderDialog(): { title: Element | null; description: Element | null; content: Element | null } {
  render(
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm swap</DialogTitle>
          <DialogDescription>Review the details before signing.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>,
  )
  return {
    title: document.body.querySelector('h2'),
    description: document.body.querySelector('p'),
    content: document.body.querySelector('.dialog-content'),
  }
}

describe('Dialog typography + layout (Spore dialog 15079:22112)', () => {
  it('titles use the Subheading/1 token with no hand-rolled weight', () => {
    const { title } = renderDialog()
    const classes = classesOf(title)
    expect(classes).toContain('text-subheading-1')
    expect(classes.filter((c) => WEIGHT_CLASS.test(c))).toEqual([])
    expect(classes).not.toContain('leading-none')
  })

  it('descriptions use the Body/3 token', () => {
    expect(classesOf(renderDialog().description)).toContain('text-body-3')
  })

  it('has a 20px radius at every width (it used to be sm:rounded-lg = 10px)', () => {
    const classes = classesOf(renderDialog().content)
    expect(classes).toContain('rounded-20')
    expect(classes).not.toContain('sm:rounded-lg')
  })

  it('uses the measured 16 top / 24 side / 24 bottom padding, not a blanket p-6', () => {
    const classes = classesOf(renderDialog().content)
    expect(classes).toContain('pt-4')
    expect(classes).toContain('px-6')
    expect(classes).toContain('pb-6')
    expect(classes).not.toContain('p-6')
  })

  it('centres the header TEXT at every width, and does not re-size header children', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm swap</DialogTitle>
            <DialogDescription>Review the details before signing.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    )
    const header = document.body.querySelector('.dialog-content > div')
    const classes = classesOf(header)
    expect(classes).toContain('text-center')
    expect(classes).not.toContain('sm:text-left')
    // 8px title→description gap
    expect(classes).toContain('gap-2')
    // items-center would win Flex's items-stretch and shrink every child to max-content,
    // reflowing badges and warning paragraphs at 17 consumer headers. Text-align only.
    expect(classes).toContain('items-stretch')
    expect(classes).not.toContain('items-center')
  })

  it('gives the close button a 24x24 hit area flush to the 24px right padding', () => {
    renderDialog()
    const close = document.body.querySelector('.dialog-content button')
    const classes = classesOf(close)
    expect(classes).toContain('size-6')
    expect(classes).toContain('right-6')
    expect(classes).toContain('top-4')
  })
})

describe('CardTitle typography', () => {
  it('uses the Subheading/1 token with no hand-rolled weight', () => {
    render(
      <Card>
        <CardTitle>Position</CardTitle>
      </Card>,
    )
    const classes = classesOf(screen.getByText('Position'))
    expect(classes).toContain('text-subheading-1')
    expect(classes.filter((c) => WEIGHT_CLASS.test(c))).toEqual([])
  })
})

describe('Drawer typography + top rhythm (Spore bottom sheet 15081:22236)', () => {
  it('titles use the Subheading/1 token, descriptions the Body/3 token', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerTitle>Wallet</DrawerTitle>
          <DrawerDescription>Balances and recent activity.</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    )
    const titleClasses = classesOf(document.body.querySelector('h2'))
    expect(titleClasses).toContain('text-subheading-1')
    expect(titleClasses.filter((c) => WEIGHT_CLASS.test(c))).toEqual([])
    expect(classesOf(document.body.querySelector('p'))).toContain('text-body-3')
  })

  it('puts 16px above the pull tab and 24px below it', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerTitle>Wallet</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    )
    const handle = document.body.querySelector('[role="presentation"]')
    const classes = classesOf(handle)
    expect(classes).toContain('mt-4')
    expect(classes).toContain('mb-6')
  })
})
