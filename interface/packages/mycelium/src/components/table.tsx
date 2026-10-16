import * as React from 'react'
import { cn } from '../cn'

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    // oxlint-disable-next-line react/forbid-elements -- scroll wrapper for table
    <div className="relative w-full overflow-auto">
      {/* border-separate + zero spacing: `border-collapse` suppresses border-radius on cells,
          and rows need 12px corners. Consequence — row rules and row fills are painted by the
          cells, applied from TableRow/TableHeader via child selectors, not by <tr> itself
          (browsers ignore background-radius and borders on <tr> in the separated model). */}
      <table
        ref={ref}
        className={cn('w-full caption-bottom border-separate border-spacing-0 text-sm', className)}
        {...props}
      />
    </div>
  ),
)
Table.displayName = 'Table'

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      // Header hairline + persistent title-row fill with matching 12px end-cap radius.
      // All three live on the cells: <tr> borders, fills and radii are ignored under
      // border-separate (see Table's note).
      className={cn(
        '[&>tr>*]:border-b [&>tr>*]:border-surface3',
        '[&>tr>*]:bg-surface2 [&>tr>*:first-child]:rounded-l-12 [&>tr>*:last-child]:rounded-r-12',
        className,
      )}
      {...props}
    />
  ),
)
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&>tr:last-child>*]:border-b-0', className)} {...props} />
  ),
)
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    // Rule lives on the cells, same as TableBody: a `border-t` on <tfoot> and a
    // `border-b-0` on its <tr> are both ignored under border-separate.
    <tfoot
      ref={ref}
      className={cn(
        'bg-muted/50 font-medium',
        '[&>tr:first-child>*]:border-t [&>tr:first-child>*]:border-surface3',
        '[&>tr:last-child>*]:border-b-0',
        className,
      )}
      {...props}
    />
  ),
)
TableFooter.displayName = 'TableFooter'

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /**
   * The row is a target the user can act on: adds the surface2 hover fill and a
   * pointer cursor. Off by default so read-only rows don't advertise a click
   * that does nothing.
   */
  selectable?: boolean
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selectable = false, ...props }, ref) => (
    <tr
      ref={ref}
      data-selectable={selectable || undefined}
      className={cn(
        // Rule + fills live on the cells (see Table's note on border-separate).
        // No colour transition: the cells carry surface tokens, so transitioning
        // background/border cross-fades them on light/dark toggle (root CLAUDE.md).
        '[&>*]:border-b [&>*]:border-surface3',
        '[&>*:first-child]:rounded-l-12 [&>*:last-child]:rounded-r-12',
        selectable && 'cursor-pointer hover:[&>*]:bg-surface2',
        'data-[state=selected]:[&>*]:bg-surface3',
        className,
      )}
      {...props}
    />
  ),
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  ),
)
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', className)}
      {...props}
    />
  ),
)
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
  ),
)
TableCaption.displayName = 'TableCaption'

export type { TableRowProps }
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
