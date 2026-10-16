import { getLauncherAddresses, SupportedChainId } from '@uniswap/liquidity-launcher-sdk'
import { areEvmAddressesEqual } from '@universe/chains'

/**
 * LBPStrategy deployments the SDK no longer names, keyed by chain.
 *
 * A strategy holds its live auctions' fee-tier reservations in
 * `registeredPoolIds`, and a reservation clears on `migrate()` — not when
 * bidding closes. So every auction created against an older strategy keeps its
 * tier reserved on THAT contract until it migrates, for as long as it takes.
 * The launcher still rejects a reserved tier at create time, so a reservation
 * check that only reads the CURRENT strategy reads those tiers as free and the
 * create transaction reverts.
 *
 * APPEND the outgoing address here in the same change that bumps
 * `@uniswap/liquidity-launcher-sdk` past an LBPStrategy rotation. Entries are
 * never removed while any auction created on them can still be migrated. The
 * SDK cannot supply this: unlike the Instant Launch deployments and the auction
 * factories, its launcher addresses are CURRENT-only pointers with no
 * append-only history of superseded strategies, so a rotation with no append
 * here silently reopens every reserved tier.
 *
 * This table is deliberately longer than the SDK's own release history. Chains
 * that launched before the address registry existed rotated through generations
 * no pinned SDK release ever named, so no bump could have appended them. Those
 * were recovered from the public LBPStrategy deployment table and the CCA
 * indexer's append-only per-chain strategy history, and every one was confirmed
 * on chain — deployed bytecode present, `registeredPoolIds` answering — before
 * being listed here. That check is not optional: a read against an address with
 * no code returns no data, which surfaces as an error the fee-tier selector folds
 * into a permanent loading state, so a wrong entry hangs the selector on that
 * chain rather than degrading.
 *
 * Entries run newest-first — the generation the most recently pinned SDK named,
 * then the pre-registry generations behind it. Order is presentation only: every
 * listed strategy is read and a reservation on any of them blocks the tier.
 *
 * Keyed by `SupportedChainId` member rather than by position: the SDK's own
 * address table is not ordered by chain id, so an order-based transcription
 * mis-maps chains (Robinhood and Base Sepolia in particular).
 */
export const SUPERSEDED_LBP_STRATEGIES: Partial<Record<SupportedChainId, readonly string[]>> = {
  [SupportedChainId.MAINNET]: [
    '0x49380c4EfaB1b491006aF7FabAB8B3459F0E6000',
    '0xb98766A35cdc28415be0767D4EA41e39fBA3e000',
  ],
  [SupportedChainId.UNICHAIN]: [
    '0x298eA05D0356B2Ae5cCAa3169E471783ee9EA000',
    '0x824A3eCDe463DD45cC156b64CEfA132596C9A000',
  ],
  [SupportedChainId.BASE]: ['0x34385dD739FE5464892BF0bA4CC42492804dA000', '0x5bB4bAfafEc57BEd50D864AAA9D1ef992611e000'],
  [SupportedChainId.ARBITRUM_ONE]: [
    '0x8Af0775a70Cc94D71DFc0fE809435e833F2Fe000',
    '0x18608AD558dcD233F7854242bbAef73988Bee000',
  ],
  [SupportedChainId.AVALANCHE]: [
    '0x57BD0A9Cd933c89Ba55e086D53031367b6406000',
    '0xcAcd77134b072b4AD5621f585b0b422C6Da4E000',
  ],
  [SupportedChainId.XLAYER]: [
    '0x58DF162fF41e5cB42B8515f75F90C1841938A000',
    '0x95bcb80e3804a085d23778F2956c305d6488e000',
  ],
  // Two pre-registry generations, the most of any chain: Robinhood carries the largest live auction
  // population, so it is also the chain where an unlisted generation strands the most reservations.
  [SupportedChainId.ROBINHOOD]: [
    '0x05d552391067389EE44fec3924157ed33F976000',
    '0x095e38a2135aeBcfFa98A5B6911591937f912000',
    '0x843747f4c08E3393E55508F577296bA48E8Ca000',
  ],
  // One generation only: Arc launched after the registry, so its first rotation is its only one.
  [SupportedChainId.ARC]: ['0xe9f36bcc222a6d2e459529D787f8c060d543A000'],
  [SupportedChainId.SEPOLIA]: [
    '0x96641d91e223c766F45b19d09494F5925C3cE000',
    '0x3f37838651B5AD71D4e01Ec9745862A5D9DF2000',
  ],
  [SupportedChainId.BASE_SEPOLIA]: [
    '0xB06428b62c259eE982cE3D9BED47391dC9A5E000',
    '0x0e1793a989c682117fcBfB3a9aA8e451D37D2000',
  ],
}

/**
 * Every LBPStrategy a chain's reservations can live on: the SDK's current one
 * plus {@link SUPERSEDED_LBP_STRATEGIES}. Empty for a chain with no launcher
 * deployment, which is what skips the reservation read entirely.
 *
 * The current address is DERIVED rather than listed, so a bump moves it here
 * automatically and the only manual step is appending the address it replaced.
 */
export function lbpStrategiesForChain(chainId?: number): readonly string[] {
  if (chainId === undefined) {
    return []
  }
  const current = getLauncherAddresses(chainId)?.lbpStrategy
  const strategies: string[] = current === undefined ? [] : [current]
  // Deduped so a release that re-points a chain at an address still listed above cannot produce
  // two identical reads per pool id.
  for (const address of SUPERSEDED_LBP_STRATEGIES[chainId as SupportedChainId] ?? []) {
    if (!strategies.some((kept) => areEvmAddressesEqual(kept, address))) {
      strategies.push(address)
    }
  }
  return strategies
}
