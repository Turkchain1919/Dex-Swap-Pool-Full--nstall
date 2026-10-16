import { ParentSizeState } from '@visx/responsive/lib/hooks/useParentSize'
import { createContext, useContext, type ReactNode } from 'react'

const defaultTableSize: ParentSizeState = {
  width: 0,
  height: 0,
  top: 0,
  left: 0,
}

const TableSizeContext = createContext<ParentSizeState>(defaultTableSize)

const TableRowContentMinWidthContext = createContext<number | undefined>(undefined)

export const useTableSize = (): ParentSizeState => {
  return useContext(TableSizeContext)
}

export const useTableRowContentMinWidthPx = (): number => {
  const value = useContext(TableRowContentMinWidthContext)
  if (value === undefined) {
    throw new Error('useTableRowContentMinWidthPx must be used within TableSizeProvider')
  }
  return value
}

export function TableSizeProvider({
  children,
  size,
  rowContentMinWidthPx,
}: {
  children: ReactNode
  size: ParentSizeState
  rowContentMinWidthPx: number
}): JSX.Element {
  return (
    <TableSizeContext.Provider value={size}>
      <TableRowContentMinWidthContext.Provider value={rowContentMinWidthPx}>
        {children}
      </TableRowContentMinWidthContext.Provider>
    </TableSizeContext.Provider>
  )
}
