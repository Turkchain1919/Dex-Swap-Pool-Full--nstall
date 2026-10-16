import { Column, RowData, Table } from '@tanstack/react-table'
import { CSSProperties } from 'react'
import type { TableColumnMeta } from '~/components/Table/types'

/**
 * Returns sizing styles for table columns (width and flexGrow).
 */
export function getColumnSizingStyles<Data extends RowData>(column: Column<Data, unknown>): CSSProperties {
  const meta = column.columnDef.meta as TableColumnMeta | undefined
  const metaFlexGrow = meta?.flexGrow
  const size = meta?.widthOverride ?? column.getSize()

  const styles: CSSProperties = {
    width: size,
  }

  // Pinned columns must not flex with row content — otherwise header/body dividers drift per row.
  if (column.getIsPinned()) {
    styles.minWidth = size
    styles.flexShrink = 0
    if (metaFlexGrow !== undefined && metaFlexGrow > 0) {
      // Opted-in flexible pinned column (e.g. name/token): absorbs leftover width. Every row
      // shares the same free space, so the divider stays aligned across header and body.
      styles.flexGrow = metaFlexGrow
    } else {
      styles.maxWidth = size
      styles.flexGrow = 0
    }
  } else if (metaFlexGrow !== undefined) {
    // Only override flexGrow if explicitly set in meta
    styles.flexGrow = metaFlexGrow
  }

  return styles
}

/**
 * Effective CSS `flex-grow` a column renders with, mirroring `getColumnSizingStyles`: a pinned column
 * only grows when it opts in via `meta.flexGrow`; an unpinned column defaults to the `CellContainer`
 * `grow` (1) unless `meta.flexGrow` overrides it.
 */
function getEffectiveFlexGrow<Data extends RowData>(column: Column<Data, unknown>): number {
  const metaFlexGrow = (column.columnDef.meta as TableColumnMeta | undefined)?.flexGrow
  if (column.getIsPinned()) {
    return metaFlexGrow && metaFlexGrow > 0 ? metaFlexGrow : 0
  }
  return metaFlexGrow ?? 1
}

/**
 * Rendered left offset of the pinned/scroll divider: the summed pinned column sizes plus the share of
 * leftover container width that pinned flex-grow columns (e.g. the name column) absorb. A flexible pinned
 * column grows past its size when the container is wider than the summed column sizes, so without the flex
 * share the size-derived divider would land inside that column instead of at the pinned-region edge.
 */
export function getPinnedRegionRightEdgePx<Data extends RowData>({
  table,
  containerWidthPx,
  totalColumnSizePx,
}: {
  table: Table<Data>
  containerWidthPx: number
  totalColumnSizePx: number
}): number {
  const pinnedBasisPx = table.getLeftTotalSize()
  const flexSlackPx = Math.max(0, containerWidthPx - totalColumnSizePx)
  if (flexSlackPx === 0) {
    return pinnedBasisPx
  }

  const totalFlexGrow = table.getAllLeafColumns().reduce((sum, column) => sum + getEffectiveFlexGrow(column), 0)
  if (totalFlexGrow === 0) {
    return pinnedBasisPx
  }

  const pinnedFlexGrow = table.getLeftLeafColumns().reduce((sum, column) => sum + getEffectiveFlexGrow(column), 0)
  return pinnedBasisPx + (flexSlackPx * pinnedFlexGrow) / totalFlexGrow
}
