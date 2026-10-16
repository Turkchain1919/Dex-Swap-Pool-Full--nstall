import { useIsOffline } from 'utilities/src/connection/useIsOffline'

export enum TableBodyRenderMode {
  Offline = 'offline',
  Skeleton = 'skeleton',
  Empty = 'empty',
  Rows = 'rows',
}

/** Single source of truth for TableBody's render branch, mirrored by Table for layout decisions. */
export function useTableBodyRenderMode({
  loading,
  error,
  rowCount,
}: {
  loading: boolean
  error: boolean
  rowCount: number
}): TableBodyRenderMode {
  const isOffline = useIsOffline()
  if (isOffline && rowCount === 0) {
    return TableBodyRenderMode.Offline
  }
  if (loading || error) {
    return TableBodyRenderMode.Skeleton
  }
  if (rowCount === 0) {
    return TableBodyRenderMode.Empty
  }
  return TableBodyRenderMode.Rows
}
