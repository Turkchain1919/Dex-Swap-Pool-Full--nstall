import { UniverseChainId } from '@universe/chains'
import ms from 'ms'

// The chain LP incentives launched on. Only the fallback below reads it — the set of chains rewards
// are actually read from comes from lp_incentives_chain_ids (see useLpIncentivesChainIds).
export const LP_INCENTIVES_CHAIN_ID = UniverseChainId.Mainnet
// Fallback for lp_incentives_chain_ids when the config is absent or names no chain the provider
// supports (see useLpIncentivesChainIds).
export const LP_INCENTIVES_CHAIN_IDS = [LP_INCENTIVES_CHAIN_ID]

// Chains the app knows that the upstream rewards provider (Merkl) doesn't, checked against
// https://api.merkl.xyz/v4/chains. GetRewards carries one `chainId` per chain and fails wholesale
// on any the provider rejects, so a single id from here in lp_incentives_chain_ids would take down
// every rewards surface rather than just that chain's rows — hence the drop in
// resolveLpIncentivesChainIds. Testnets are also unsupported, but are excluded by isTestnetChain
// rather than listed. This mirrors third-party state, so it can only go stale toward dropping a
// chain that has since become supported; re-check the endpoint before widening the config.
export const LP_INCENTIVES_UNSUPPORTED_CHAIN_IDS: UniverseChainId[] = [UniverseChainId.Arc, UniverseChainId.Zora]

// USD value below which a per-token reward is treated as dust and hidden from the multi-token
// rewards modal — claim gas typically exceeds the value of a sub-cent reward.
export const LP_INCENTIVES_USD_DUST_THRESHOLD = 0.01

// Window during which a recent claim is treated as "still claimed" — covers the lag between an on-chain
// claim and Merkl's API reflecting the zero balance. Used by the "effectively claimed" check and the
// LP-incentives claimed store.
export const LP_INCENTIVES_CLAIM_STALENESS_MS = ms('5m')
