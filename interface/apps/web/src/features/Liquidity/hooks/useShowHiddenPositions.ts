import { AddressStringFormat, normalizeAddress } from '@universe/chains'
import { useEvent } from 'utilities/src/react/hooks'
import { create } from 'zustand'

// Shared across the Positions page and Portfolio Pools (different routes, so URL state can't
// carry it). Keyed by the wallet whose positions are on screen, so switching wallets falls back
// to off. Presentational only — both the visible and hidden position sets are always fetched.
const useShownForAddressStore = create<{ shownForAddress: string | undefined }>()(() => ({
  shownForAddress: undefined,
}))

export function useShowHiddenPositions(positionsOwnerAddress: string | undefined): {
  showHiddenPositions: boolean
  setShowHiddenPositions: (showHiddenPositions: boolean) => void
} {
  const addressKey =
    positionsOwnerAddress === undefined
      ? undefined
      : normalizeAddress(positionsOwnerAddress, AddressStringFormat.Lowercase)
  const showHiddenPositions = useShownForAddressStore(
    (state) => addressKey !== undefined && state.shownForAddress === addressKey,
  )
  const setShowHiddenPositions = useEvent((show: boolean) =>
    useShownForAddressStore.setState({ shownForAddress: show ? addressKey : undefined }),
  )
  return { showHiddenPositions, setShowHiddenPositions }
}
