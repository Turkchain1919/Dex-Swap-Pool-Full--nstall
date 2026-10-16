import { SerializedToken, SerializedTokenMap, TokenDismissInfo } from 'uniswap/src/features/tokens/warnings/slice/types'
import { UserState } from '~/state/user/reducer'

export type PreV16UserState = UserState & {
  tokens: SerializedTokenMap<TokenDismissInfo>
  userLocale: string | null
  // Saved V2 pairs backed the retired "import v2 positions" flow; see the note on UserState.
  pairs: {
    [chainId: number]: {
      [key: string]: { token0: SerializedToken; token1: SerializedToken }
    }
  }
}
