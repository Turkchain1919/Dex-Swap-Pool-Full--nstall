import { createContext } from 'react'

/**
 * Row-hover state provided by TableRow alongside its `group` anchor; `undefined` outside a
 * hover-tracked row. Cells whose GroupHoverTransition slides on row hover read it as `isHovered`,
 * which scopes the slide to this row instead of any hovered ancestor group anchor.
 *
 * Deliberately separate from `IssuerTableRowHoverContext`, which the RWA expandable issuer rows
 * provide (`IssuerTableRowHoverProvider`): this one belongs to the generic web `TableRow`. Both
 * share the undefined-means-CSS-fallback convention, so a cell reading the "wrong" one degrades
 * to the CSS hover path rather than breaking.
 */
export const TableRowHoverContext = createContext<boolean | undefined>(undefined)
