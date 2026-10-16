import { UniverseChainId } from '@universe/chains'
import type { MultichainTokenEntry } from 'uniswap/src/components/MultichainTokenDetails/useOrderedMultichainEntries'
import type { MultiChainMap } from '~/pages/TokenDetails/context/TDPContext'
import { getHighestBalanceChain } from '~/pages/TokenDetails/hooks/getHighestBalanceChain'

const makeEntry = (chainId: UniverseChainId, address = '0x1'): MultichainTokenEntry => ({
  chainId,
  address,
  isNative: false,
})

const entries: MultichainTokenEntry[] = [
  makeEntry(UniverseChainId.Mainnet, '0xeth'),
  makeEntry(UniverseChainId.Base, '0xbase'),
  makeEntry(UniverseChainId.Polygon, '0xpoly'),
]

function buildMultiChainMap(balances: Partial<Record<UniverseChainId, number | null | undefined>>): MultiChainMap {
  const map: MultiChainMap = {}
  for (const [chainIdKey, balanceUSD] of Object.entries(balances)) {
    map[Number(chainIdKey) as UniverseChainId] = {
      address: '0x1',
      balance:
        balanceUSD != null ? ({ balanceUSD } as NonNullable<MultiChainMap[UniverseChainId]>['balance']) : undefined,
    }
  }
  return map
}

describe('getHighestBalanceChain', () => {
  it('returns the entry with the highest balance', () => {
    const map = buildMultiChainMap({
      [UniverseChainId.Mainnet]: 100,
      [UniverseChainId.Base]: 5000,
      [UniverseChainId.Polygon]: 200,
    })
    expect(getHighestBalanceChain(map, entries)).toEqual(makeEntry(UniverseChainId.Base, '0xbase'))
  })

  it('returns undefined when multichainEntries is empty', () => {
    const map = buildMultiChainMap({ [UniverseChainId.Mainnet]: 100 })
    expect(getHighestBalanceChain(map, [])).toBeUndefined()
  })

  it('returns undefined when multiChainMap is empty', () => {
    expect(getHighestBalanceChain({}, entries)).toBeUndefined()
  })

  it('returns undefined when all balances are zero', () => {
    const map = buildMultiChainMap({
      [UniverseChainId.Mainnet]: 0,
      [UniverseChainId.Base]: 0,
    })
    expect(getHighestBalanceChain(map, entries)).toBeUndefined()
  })

  it('returns undefined when all balances are null', () => {
    const map = buildMultiChainMap({
      [UniverseChainId.Mainnet]: null,
      [UniverseChainId.Base]: null,
    })
    expect(getHighestBalanceChain(map, entries)).toBeUndefined()
  })

  it('returns undefined when no balance data exists', () => {
    const map: MultiChainMap = {
      [UniverseChainId.Mainnet]: { address: '0x1' },
      [UniverseChainId.Base]: { address: '0x2' },
    }
    expect(getHighestBalanceChain(map, entries)).toBeUndefined()
  })

  it('skips chains without a matching entry', () => {
    const limitedEntries = [makeEntry(UniverseChainId.Polygon, '0xpoly')]
    const map = buildMultiChainMap({
      [UniverseChainId.Mainnet]: 10_000,
      [UniverseChainId.Polygon]: 50,
    })
    expect(getHighestBalanceChain(map, limitedEntries)).toEqual(makeEntry(UniverseChainId.Polygon, '0xpoly'))
  })
})
