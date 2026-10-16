import { WarningSeverity } from 'uniswap/src/components/modals/WarningModal/types'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { getTokenWarningSeverity } from 'uniswap/src/features/tokens/warnings/safetyUtils'

/**
 * Blockaid / token-protection severity for an auction's token.
 *
 * The signature is the invariant: an auction's quick-launch classification is deliberately not an
 * input here, and cannot become one without changing every caller. `is_quick_launch` is derived
 * purely from on-chain launch parameters, and the preset is reproducible by anyone
 * permissionlessly — a `true` means "these parameters match our preset", never "this token is
 * trustworthy". Gating a protection verdict on it would let an attacker hide their own token's
 * warnings just by copying the preset.
 */
export function getAuctionTokenWarningSeverity(token: Maybe<CurrencyInfo>): WarningSeverity {
  return token ? getTokenWarningSeverity(token) : WarningSeverity.None
}

/**
 * Whether an auction surface renders the token-protection treatment (warning icon, card, modal).
 * Same threshold every other Uniswap surface uses, and — see
 * {@link getAuctionTokenWarningSeverity} — blind to whether the auction is a quick launch.
 */
export function shouldShowAuctionTokenWarning(token: Maybe<CurrencyInfo>): boolean {
  return getAuctionTokenWarningSeverity(token) > WarningSeverity.Low
}
