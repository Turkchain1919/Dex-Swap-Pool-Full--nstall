import { UniverseChainId } from '@universe/chains'
import { multichainTokensFromAddresses } from 'src/components/TokenDetails/multichainTokensFromAddresses'
import { DEFAULT_NATIVE_ADDRESS_LEGACY } from 'uniswap/src/features/chains/evm/defaults'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const ENABLED_CHAINS = [UniverseChainId.Mainnet, UniverseChainId.Base, UniverseChainId.Polygon]

describe(multichainTokensFromAddresses, () => {
  it('maps native placeholder addresses to a null address', () => {
    const tokens = multichainTokensFromAddresses({
      addresses: {
        [String(UniverseChainId.Mainnet)]: ZERO_ADDRESS,
        [String(UniverseChainId.Base)]: DEFAULT_NATIVE_ADDRESS_LEGACY,
        [String(UniverseChainId.Polygon)]: 'ETH',
      },
      enabledChains: ENABLED_CHAINS,
    })

    expect(tokens).toHaveLength(3)
    expect(tokens).toEqual(
      expect.arrayContaining([
        { chainId: UniverseChainId.Mainnet, address: null },
        { chainId: UniverseChainId.Base, address: null },
        { chainId: UniverseChainId.Polygon, address: null },
      ]),
    )
  })

  it('keeps ERC-20 deployment addresses as served', () => {
    const tokens = multichainTokensFromAddresses({
      addresses: { [String(UniverseChainId.Mainnet)]: USDC_MAINNET, [String(UniverseChainId.Base)]: USDC_BASE },
      enabledChains: ENABLED_CHAINS,
    })

    expect(tokens).toHaveLength(2)
    expect(tokens).toEqual(
      expect.arrayContaining([
        { chainId: UniverseChainId.Mainnet, address: USDC_MAINNET },
        { chainId: UniverseChainId.Base, address: USDC_BASE },
      ]),
    )
  })

  it('drops disabled and unsupported chains', () => {
    const tokens = multichainTokensFromAddresses({
      addresses: {
        [String(UniverseChainId.Mainnet)]: USDC_MAINNET,
        [String(UniverseChainId.Base)]: USDC_BASE,
        '999999': USDC_BASE,
      },
      enabledChains: [UniverseChainId.Mainnet],
    })

    expect(tokens).toEqual([{ chainId: UniverseChainId.Mainnet, address: USDC_MAINNET }])
  })
})
