import { UniverseChainId } from '@universe/chains'
import { useDynamicConfigValue } from '@universe/gating'
import { logger } from 'utilities/src/logger/logger'
import {
  LP_INCENTIVES_CHAIN_IDS,
  LP_INCENTIVES_UNSUPPORTED_CHAIN_IDS,
} from '~/features/Liquidity/LPIncentives/constants'
import {
  resolveLpIncentivesChainIds,
  useLpIncentivesChainIds,
} from '~/features/Liquidity/LPIncentives/hooks/useLpIncentivesChainIds'
import { renderHook } from '~/test-utils/render'

// useDynamicConfigValue is mocked globally in setupTests to return the passed defaultValue.

vi.mock('utilities/src/logger/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

const UNSUPPORTED_CHAIN_ID = 999_999

beforeEach(() => {
  vi.mocked(logger.warn).mockClear()
})

describe('resolveLpIncentivesChainIds', () => {
  it('passes through configured EVM chains', () => {
    expect(resolveLpIncentivesChainIds([UniverseChainId.Base, UniverseChainId.Unichain])).toEqual([
      UniverseChainId.Base,
      UniverseChainId.Unichain,
    ])
    expect(logger.warn).not.toHaveBeenCalled()
  })

  // One chain the upstream read doesn't know fails the whole request, so a bad entry is dropped
  // rather than forwarded.
  it('drops chains the app does not know', () => {
    expect(resolveLpIncentivesChainIds([UniverseChainId.Base, UNSUPPORTED_CHAIN_ID])).toEqual([UniverseChainId.Base])
  })

  it('drops non-EVM chains', () => {
    expect(resolveLpIncentivesChainIds([UniverseChainId.Base, UniverseChainId.Solana])).toEqual([UniverseChainId.Base])
  })

  // The provider rejects the whole request on any chain it doesn't know, so every id on the list has
  // to be unreachable from the config — not just the ones a test happens to name.
  it.each(LP_INCENTIVES_UNSUPPORTED_CHAIN_IDS)('drops chain %i, unsupported by the rewards provider', (chainId) => {
    expect(resolveLpIncentivesChainIds([UniverseChainId.Base, chainId])).toEqual([UniverseChainId.Base])
  })

  it.each([UniverseChainId.Sepolia, UniverseChainId.UnichainSepolia])('drops testnet %i', (chainId) => {
    expect(resolveLpIncentivesChainIds([UniverseChainId.Base, chainId])).toEqual([UniverseChainId.Base])
  })

  // GetRewards rejects a request naming no chains, so an empty list can't be honored as-is.
  it.each([
    ['an empty list', []],
    ['an all-invalid list', [UNSUPPORTED_CHAIN_ID]],
  ])('falls back to the default on %s', (_label, configured) => {
    expect(resolveLpIncentivesChainIds(configured)).toBe(LP_INCENTIVES_CHAIN_IDS)
  })

  // A silent drop leaves a typo'd config looking like an unset one, so both narrowing cases warn —
  // once per resolve, since a chain this client doesn't know yet isn't necessarily a misconfiguration.
  it.each([
    ['dropping an entry', [UniverseChainId.Base, UNSUPPORTED_CHAIN_ID], false],
    ['falling back to the default', [UNSUPPORTED_CHAIN_ID], true],
  ])('warns with the dropped ids when %s', (_label, configured, fellBackToDefault) => {
    resolveLpIncentivesChainIds(configured)

    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      'useLpIncentivesChainIds.ts',
      'resolveLpIncentivesChainIds',
      'Unusable configured chain ids',
      { configured, dropped: [UNSUPPORTED_CHAIN_ID], fellBackToDefault },
    )
  })
})

describe('LP_INCENTIVES_CHAIN_IDS', () => {
  // An absent config has to leave the read where it was; widening it is the config's job, so a chain
  // added here would go out to every client at once without one.
  it('defaults to mainnet only', () => {
    expect(LP_INCENTIVES_CHAIN_IDS).toEqual([UniverseChainId.Mainnet])
  })
})

describe('useLpIncentivesChainIds', () => {
  it('returns the configured chains', () => {
    vi.mocked(useDynamicConfigValue).mockReturnValueOnce([UniverseChainId.Base])

    const { result } = renderHook(() => useLpIncentivesChainIds())

    expect(result.current).toEqual([UniverseChainId.Base])
  })

  it('returns the default when the config is unset', () => {
    const { result } = renderHook(() => useLpIncentivesChainIds())

    expect(result.current).toEqual(LP_INCENTIVES_CHAIN_IDS)
  })
})
