import { parseAsArrayOf, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useCallback } from 'react'
import {
  DEFAULT_V2_POSITION_STATUS_FILTER,
  V2_POSITION_STATUS_OPTIONS,
  type V2PositionStatusFilter,
} from '~/features/Liquidity/constants'

export interface UseV2StatusFilterResult {
  v2StatusFilter: V2PositionStatusFilter[]
  toggleV2Status: (status: V2PositionStatusFilter) => void
  resetV2Status: () => void
}

// Lifecycle (open/closed) filter for the V2 positions table, shared by the Positions page and
// Portfolio Pools. Persisted in the URL (nuqs) so it survives navigating into a position and back;
// `history: 'replace'` keeps each toggle out of the back stack. It's URL-scoped, so the two surfaces
// (different routes) still keep independent selections.
const lifecycleParser = {
  lifecycle: parseAsArrayOf(parseAsStringLiteral(V2_POSITION_STATUS_OPTIONS)).withDefault([
    ...DEFAULT_V2_POSITION_STATUS_FILTER,
  ]),
}

export function useV2StatusFilter(): UseV2StatusFilterResult {
  const [{ lifecycle }, setLifecycle] = useQueryStates(lifecycleParser, { history: 'replace' })

  const toggleV2Status = useCallback(
    (status: V2PositionStatusFilter) => {
      void setLifecycle((prev) => {
        if (!prev.lifecycle.includes(status)) {
          return { lifecycle: [...prev.lifecycle, status] }
        }
        const next = prev.lifecycle.filter((s) => s !== status)
        // Keep at least one status selected: an empty list serializes to an unfiltered request.
        return next.length > 0 ? { lifecycle: next } : {}
      })
    },
    [setLifecycle],
  )

  const resetV2Status = useCallback(() => {
    void setLifecycle({ lifecycle: null })
  }, [setLifecycle])

  return { v2StatusFilter: lifecycle, toggleV2Status, resetV2Status }
}
