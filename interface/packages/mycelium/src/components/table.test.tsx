import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './table'

afterEach(cleanup)

const classesOf = (element: Element | null): string[] =>
  (element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

function renderRow(props: { selectable?: boolean; 'data-state'?: string } = {}): Element | null {
  const { container } = render(
    <Table>
      <TableBody>
        <TableRow {...props}>
          <TableCell>ETH / USDC</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  )
  return container.querySelector('tbody tr')
}

describe('TableRow selectable gating', () => {
  it('has no hover fill and no pointer cursor by default', () => {
    const classes = classesOf(renderRow())
    expect(classes).not.toContain('cursor-pointer')
    expect(classes).not.toContain('hover:[&>*]:bg-surface2')
    expect(renderRow()?.getAttribute('data-selectable')).toBeNull()
  })

  it('gates both the hover fill and the pointer cursor behind selectable', () => {
    const row = renderRow({ selectable: true })
    const classes = classesOf(row)
    expect(classes).toContain('cursor-pointer')
    expect(classes).toContain('hover:[&>*]:bg-surface2')
    expect(row?.getAttribute('data-selectable')).toBe('true')
  })

  it('keeps data-state=selected working, on a Spore token', () => {
    const row = renderRow({ 'data-state': 'selected' })
    expect(row?.getAttribute('data-state')).toBe('selected')
    // Selected is a persistent fill, independent of selectable
    expect(classesOf(row)).toContain('data-[state=selected]:[&>*]:bg-surface3')
  })

  it('rounds the row end caps to 12px (radius has to sit on the cells)', () => {
    const classes = classesOf(renderRow())
    expect(classes).toContain('[&>*:first-child]:rounded-l-12')
    expect(classes).toContain('[&>*:last-child]:rounded-r-12')
  })
})

describe('Table chrome', () => {
  // border-collapse suppresses border-radius, so the row corners only exist in the separated model.
  it('uses the separated border model with zero spacing', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    const classes = classesOf(container.querySelector('table'))
    expect(classes).toContain('border-separate')
    expect(classes).toContain('border-spacing-0')
  })

  it('gives the header row a persistent surface2 fill with matching corners', () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pool</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    )
    const classes = classesOf(container.querySelector('thead'))
    expect(classes).toContain('[&>tr>*]:bg-surface2')
    expect(classes).toContain('[&>tr>*:first-child]:rounded-l-12')
    expect(classes).toContain('[&>tr>*:last-child]:rounded-r-12')
  })

  it('drops no shadcn greys into the row chrome', () => {
    const classes = classesOf(renderRow({ selectable: true }))
    expect(classes.join(' ')).not.toContain('bg-muted')
  })
})

// Every rule below has to sit on the cells: under border-separate the browser ignores
// borders on <tr> and on the row groups, so a border-* on <thead>/<tfoot>/<tr> is a no-op.
describe('border-separate keeps every rule on the cells', () => {
  const headerClasses = (): string[] => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pool</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    )
    return classesOf(container.querySelector('thead'))
  }

  const footerClasses = (): string[] => {
    const { container } = render(
      <Table>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    )
    return classesOf(container.querySelector('tfoot'))
  }

  it('draws the header hairline on the header cells', () => {
    const classes = headerClasses()
    expect(classes).toContain('[&>tr>*]:border-b')
    expect(classes).toContain('[&>tr>*]:border-surface3')
  })

  it('never puts the header hairline on the row group or the row', () => {
    const classes = headerClasses()
    expect(classes).not.toContain('border-b')
    expect(classes).not.toContain('[&_tr]:border-b')
  })

  it('draws the footer top rule on the footer cells', () => {
    const classes = footerClasses()
    expect(classes).toContain('[&>tr:first-child>*]:border-t')
    expect(classes).toContain('[&>tr:first-child>*]:border-surface3')
    expect(classes).toContain('[&>tr:last-child>*]:border-b-0')
  })

  it('never puts the footer rule on the row group or the row', () => {
    const classes = footerClasses()
    expect(classes).not.toContain('border-t')
    expect(classes).not.toContain('[&>tr]:last:border-b-0')
  })

  it('closes the last body row on the cells', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    expect(classesOf(container.querySelector('tbody'))).toContain('[&>tr:last-child>*]:border-b-0')
  })
})

// Root CLAUDE.md: a colour transition on an element carrying a surface token cross-fades
// on light/dark toggle. The row cells carry border-surface3 and a surface2 hover fill.
describe('no colour transition on tokenised surfaces', () => {
  it('keeps transition-colors off the row cells', () => {
    for (const props of [{}, { selectable: true }]) {
      const joined = classesOf(renderRow(props)).join(' ')
      expect(joined).not.toContain('transition-colors')
      expect(joined).not.toContain('transition-all')
    }
  })
})
