import { renderHook } from '@testing-library/react'
import { UniverseChainId } from '@universe/chains'
import { UniswapBuiltHookAddressesConfigKey, useDynamicConfigValue } from '@universe/gating'
import {
  getUniswapHookProvenanceLabel,
  UniswapHookProvenance,
  useUniswapHookProvenance,
} from 'uniswap/src/features/poolHooks/hooks/useUniswapHookProvenance'
import i18n from 'uniswap/src/i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@universe/gating', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/gating')>()
  return {
    ...actual,
    useDynamicConfigValue: vi.fn(),
  }
})

const BUILT_ADDRESS = '0x1111111111111111111111111111111111111111'
const CONFIGURED_ADDRESS = '0x2222222222222222222222222222222222222222'
const BOTH_ADDRESS = '0x3333333333333333333333333333333333333333'
const SPLIT_ADDRESS = '0x4444444444444444444444444444444444444444'
const UNLISTED_ADDRESS = '0x5555555555555555555555555555555555555555'

type ConfigLists = Partial<Record<UniswapBuiltHookAddressesConfigKey, unknown>>

// Serves each of the config's three lists by key and applies the caller's type guard the way the real
// hook does, so a malformed list falls back to the default here too.
function mockConfigLists(lists: ConfigLists): void {
  vi.mocked(useDynamicConfigValue).mockImplementation(((args: {
    key: UniswapBuiltHookAddressesConfigKey
    defaultValue: unknown
    customTypeGuard?: (value: unknown) => boolean
  }) => {
    const value = args.key in lists ? lists[args.key] : args.defaultValue
    return args.customTypeGuard && !args.customTypeGuard(value) ? args.defaultValue : value
  }) as typeof useDynamicConfigValue)
}

function renderProvenance() {
  return renderHook(() => useUniswapHookProvenance()).result.current
}

afterEach(() => {
  vi.mocked(useDynamicConfigValue).mockImplementation(
    ((args: { defaultValue: unknown }) => args.defaultValue) as typeof useDynamicConfigValue,
  )
})

describe('useUniswapHookProvenance', () => {
  beforeEach(() => {
    mockConfigLists({
      [UniswapBuiltHookAddressesConfigKey.Built]: [
        { chainId: UniverseChainId.Mainnet, address: BUILT_ADDRESS },
        { chainId: UniverseChainId.Mainnet, address: SPLIT_ADDRESS },
      ],
      [UniswapBuiltHookAddressesConfigKey.Configured]: [
        { chainId: UniverseChainId.Mainnet, address: CONFIGURED_ADDRESS },
        { chainId: UniverseChainId.Mainnet, address: SPLIT_ADDRESS },
      ],
      [UniswapBuiltHookAddressesConfigKey.Both]: [{ chainId: UniverseChainId.Mainnet, address: BOTH_ADDRESS }],
    })
  })

  it.each([
    ['built', BUILT_ADDRESS, UniswapHookProvenance.Built],
    ['configured', CONFIGURED_ADDRESS, UniswapHookProvenance.Configured],
    ['both', BOTH_ADDRESS, UniswapHookProvenance.BuiltAndConfigured],
  ])('resolves a hook in the %s list', (_list, address, expected) => {
    expect(renderProvenance()({ chainId: UniverseChainId.Mainnet, address })).toBe(expected)
  })

  // The config contract files such a hook under `both`, but a split entry shouldn't demote the badge.
  it('treats a hook listed under both built and configured as built-and-configured', () => {
    expect(renderProvenance()({ chainId: UniverseChainId.Mainnet, address: SPLIT_ADDRESS })).toBe(
      UniswapHookProvenance.BuiltAndConfigured,
    )
  })

  it('returns undefined for a hook in no list', () => {
    expect(renderProvenance()({ chainId: UniverseChainId.Mainnet, address: UNLISTED_ADDRESS })).toBeUndefined()
  })

  it('matches addresses case-insensitively', () => {
    expect(renderProvenance()({ chainId: UniverseChainId.Mainnet, address: BUILT_ADDRESS.toUpperCase() })).toBe(
      UniswapHookProvenance.Built,
    )
  })

  // The same address is a different contract on another chain, so a chain mismatch is not a match.
  it('does not match the same address on another chain', () => {
    expect(renderProvenance()({ chainId: UniverseChainId.Base, address: BUILT_ADDRESS })).toBeUndefined()
  })

  it('returns undefined for a hook without a chain or address', () => {
    const getProvenance = renderProvenance()
    expect(getProvenance({ chainId: undefined, address: BUILT_ADDRESS })).toBeUndefined()
    expect(getProvenance({ chainId: UniverseChainId.Mainnet, address: undefined })).toBeUndefined()
  })
})

describe('useUniswapHookProvenance with an unpopulated or malformed config', () => {
  it('badges nothing when the config is unset', () => {
    expect(renderProvenance()({ chainId: UniverseChainId.Mainnet, address: BUILT_ADDRESS })).toBeUndefined()
  })

  // A plain address list is the likeliest misconfiguration; it must read as empty, not throw.
  it.each([
    ['a plain address list', [BUILT_ADDRESS]],
    ['an entry missing its chain', [{ address: BUILT_ADDRESS }]],
    ['a non-array', { chainId: UniverseChainId.Mainnet, address: BUILT_ADDRESS }],
  ])('ignores %s', (_label, malformed) => {
    mockConfigLists({ [UniswapBuiltHookAddressesConfigKey.Built]: malformed })
    expect(renderProvenance()({ chainId: UniverseChainId.Mainnet, address: BUILT_ADDRESS })).toBeUndefined()
  })

  it('still resolves the well-formed lists when another list is malformed', () => {
    mockConfigLists({
      [UniswapBuiltHookAddressesConfigKey.Built]: [BUILT_ADDRESS],
      [UniswapBuiltHookAddressesConfigKey.Configured]: [
        { chainId: UniverseChainId.Mainnet, address: CONFIGURED_ADDRESS },
      ],
    })
    expect(renderProvenance()({ chainId: UniverseChainId.Mainnet, address: CONFIGURED_ADDRESS })).toBe(
      UniswapHookProvenance.Configured,
    )
  })
})

describe('getUniswapHookProvenanceLabel', () => {
  // The package-wide vitest setup mocks `uniswap/src/i18n` to echo back any key it doesn't
  // recognize, so this pins the translation key each provenance maps to, not the rendered copy
  // (the real strings are covered by the source en-US.json fixture / i18n-extract check instead).
  it.each([
    [UniswapHookProvenance.Built, 'hook.builtByUniswap'],
    [UniswapHookProvenance.Configured, 'hook.configuredByUniswap'],
    [UniswapHookProvenance.BuiltAndConfigured, 'hook.builtAndConfiguredByUniswap'],
  ])('maps %s to the %s translation key', (provenance, key) => {
    expect(getUniswapHookProvenanceLabel({ provenance, t: i18n.t })).toBe(key)
  })
})
