import { PlatformSplitStubError } from 'utilities/src/errors'

export type RecyclingBooleanState = {
  value: boolean
  setTrue: () => void
  setFalse: () => void
  toggle: () => void
  setValue: (value: boolean) => void
}

/**
 * Boolean state for a row rendered inside a recycling list. On native it resets when the row's
 * component instance is reused for a different item — plain `useState` would leak the previous
 * item's value into the recycled row (see `recycleItems` on `UniversalListProps`). Lives beside the
 * list so the `@legendapp/list` import stays inside this folder.
 */
export function useRecyclingBooleanState(_initialValue = false): RecyclingBooleanState {
  throw new PlatformSplitStubError('useRecyclingBooleanState')
}
