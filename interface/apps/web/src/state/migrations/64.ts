import { PersistState } from 'redux-persist'
import { markPoolsBalanceCoachmarkEligible } from 'uniswap/src/state/uniswapMigrations'

type PersistAppState = {
  _persist: PersistState
}

export const migration64 = (state: PersistAppState | undefined) => {
  if (!state) {
    return undefined
  }

  const newState = markPoolsBalanceCoachmarkEligible(state)

  return {
    ...newState,
    _persist: { ...state._persist, version: 64 },
  }
}
