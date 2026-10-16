import { WarningSeverity } from 'uniswap/src/components/modals/WarningModal/types'
import { ProtectionResult } from 'uniswap/src/features/dataApi/safety'
import { AttackType, CurrencyInfo, TokenList } from 'uniswap/src/features/dataApi/types'
import { describe, expect, it } from 'vitest'
import {
  getAuctionTokenWarningSeverity,
  shouldShowAuctionTokenWarning,
} from '~/features/Toucan/utils/auctionTokenProtection'

function makeToken(safetyInfo: CurrencyInfo['safetyInfo']): CurrencyInfo {
  return { currency: { isNative: false }, safetyInfo } as CurrencyInfo
}

const BLOCKED_TOKEN = makeToken({
  tokenList: TokenList.Blocked,
  protectionResult: ProtectionResult.Malicious,
})
const IMPERSONATOR_TOKEN = makeToken({
  tokenList: TokenList.NonDefault,
  protectionResult: ProtectionResult.Malicious,
  attackType: AttackType.Impersonator,
})
const SPAM_AIRDROP_TOKEN = makeToken({
  tokenList: TokenList.NonDefault,
  protectionResult: ProtectionResult.Spam,
  attackType: AttackType.Airdrop,
})
const UNLISTED_TOKEN = makeToken({
  tokenList: TokenList.NonDefault,
  protectionResult: ProtectionResult.Benign,
})
const CLEAN_TOKEN = makeToken({
  tokenList: TokenList.Default,
  protectionResult: ProtectionResult.Benign,
})
/** A token Blockaid has no verdict for at all — no `safetyInfo` on the `CurrencyInfo`. */
const UNSCANNED_TOKEN = makeToken(undefined)

describe('getAuctionTokenWarningSeverity', () => {
  it('surfaces the Blockaid verdict for a malicious auction token', () => {
    expect(getAuctionTokenWarningSeverity(BLOCKED_TOKEN)).toBe(WarningSeverity.Blocked)
    expect(getAuctionTokenWarningSeverity(IMPERSONATOR_TOKEN)).toBe(WarningSeverity.High)
    expect(getAuctionTokenWarningSeverity(SPAM_AIRDROP_TOKEN)).toBe(WarningSeverity.Medium)
  })

  it('reports Low for a merely-unlisted token and None for a clean one', () => {
    expect(getAuctionTokenWarningSeverity(UNLISTED_TOKEN)).toBe(WarningSeverity.Low)
    expect(getAuctionTokenWarningSeverity(CLEAN_TOKEN)).toBe(WarningSeverity.None)
  })

  /**
   * Characterisation, not a guard: `getTokenWarningSeverity` already returns `None` for a falsy
   * token, so the module's own `token ? … : None` ternary is unreachable and deleting it leaves
   * this green. Kept because the loading state is worth stating; the reachable branch is covered by
   * the never-scanned case below.
   */
  it('reports None when the auction has no token yet', () => {
    expect(getAuctionTokenWarningSeverity(undefined)).toBe(WarningSeverity.None)
    expect(getAuctionTokenWarningSeverity(null)).toBe(WarningSeverity.None)
  })

  /**
   * Unknown collapses to safe, and that is a deliberate property of the shared Uniswap threshold,
   * not of this module: `getTokenProtectionWarning` returns `NonDefault` when a `CurrencyInfo`
   * carries no `safetyInfo` (`safetyUtils.ts:72-73`), `NonDefault` maps to `WarningSeverity.Low`
   * (`safetyUtils.ts:166-167`), and the surfaces render above `Low`. So a token Blockaid has never
   * scanned looks exactly like a clean one — no header icon, no bid-form card.
   *
   * Pinned here so the fail-open direction is one reviewable line instead of an emergent property
   * of two files. Both auction call sites already behaved this way before this PR and still do;
   * changing the threshold is a cross-surface decision, not an auction one.
   */
  it('reports Low — not None, and not a warning — for a token that has never been scanned', () => {
    expect(getAuctionTokenWarningSeverity(UNSCANNED_TOKEN)).toBe(WarningSeverity.Low)
  })
})

describe('shouldShowAuctionTokenWarning', () => {
  it('shows the protection treatment above the Low threshold', () => {
    expect(shouldShowAuctionTokenWarning(BLOCKED_TOKEN)).toBe(true)
    expect(shouldShowAuctionTokenWarning(IMPERSONATOR_TOKEN)).toBe(true)
    expect(shouldShowAuctionTokenWarning(SPAM_AIRDROP_TOKEN)).toBe(true)
  })

  it('stays quiet at or below the Low threshold', () => {
    expect(shouldShowAuctionTokenWarning(UNLISTED_TOKEN)).toBe(false)
    expect(shouldShowAuctionTokenWarning(CLEAN_TOKEN)).toBe(false)
    expect(shouldShowAuctionTokenWarning(undefined)).toBe(false)
  })

  /** The fail-open direction, pinned. See the severity test above for why `Low` lands here. */
  it('renders a never-scanned token exactly like a clean one', () => {
    expect(shouldShowAuctionTokenWarning(UNSCANNED_TOKEN)).toBe(false)
    expect(shouldShowAuctionTokenWarning(UNSCANNED_TOKEN)).toBe(shouldShowAuctionTokenWarning(CLEAN_TOKEN))
  })

  /**
   * The point of the whole module: a token that copies the quick-launch preset is still just a
   * token, and the gate has no way to learn otherwise.
   *
   * ⚠️ This assertion is weaker than it looks and does **not** carry that invariant on its own.
   * `Function.length` stops counting at the first defaulted parameter and ignores destructuring, so
   * `getAuctionTokenWarningSeverity(token, isQuickLaunch = false)` and
   * `getAuctionTokenWarningSeverity({ token, isQuickLaunch })` both still report 1 and both still
   * pass here. What actually holds the line is `keeps the shared gate itself unaware that quick
   * launches exist` in `quickLaunchProtectionDecoupling.test.ts`, which fails if this module
   * mentions a quick-launch symbol *anywhere* — including in a new parameter's name. Keep both:
   * this one documents the intended shape, that one enforces it.
   */
  it('takes only the token, so a quick-launch signal cannot reach the gate', () => {
    expect(getAuctionTokenWarningSeverity).toHaveLength(1)
    expect(shouldShowAuctionTokenWarning).toHaveLength(1)
  })
})
