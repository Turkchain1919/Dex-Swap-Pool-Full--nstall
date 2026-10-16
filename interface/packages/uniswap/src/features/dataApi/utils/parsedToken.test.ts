import { UniverseChainId } from '@universe/chains'
import { getNativeAddress, NATIVE_TOKEN_PLACEHOLDER } from 'uniswap/src/constants/addresses'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { DAI, nativeOnChain, WRAPPED_NATIVE_CURRENCY } from 'uniswap/src/constants/tokens'
import { v2TokenToCurrency, v2UnwrapToken } from 'uniswap/src/features/dataApi/utils/parsedToken'

const PATHUSD_ADDRESS = '0x20c0000000000000000000000000000000000000'

describe('v2TokenToCurrency', () => {
  it.each([
    ['absent address', undefined],
    ['NATIVE placeholder sentinel', NATIVE_TOKEN_PLACEHOLDER],
    ['zero address', ZERO_ADDRESS],
    ['chain-native address', getNativeAddress(UniverseChainId.Mainnet)],
  ])('resolves native currency for %s', (_case, address) => {
    const result = v2TokenToCurrency({ chainId: UniverseChainId.Mainnet, address })
    expect(result?.isNative).toBe(true)
    expect(result?.chainId).toBe(UniverseChainId.Mainnet)
  })

  it('builds an ERC-20 for a token with an address', () => {
    const result = v2TokenToCurrency({
      chainId: UniverseChainId.Mainnet,
      address: DAI.address,
      decimals: 18,
      symbol: 'DAI',
      name: 'Dai Stablecoin',
    })
    expect(result?.isToken).toBe(true)
    expect(result?.symbol).toBe('DAI')
    expect(result?.chainId).toBe(UniverseChainId.Mainnet)
  })

  it('defaults missing decimals to 18', () => {
    const result = v2TokenToCurrency({ chainId: UniverseChainId.Mainnet, address: DAI.address })
    expect(result?.decimals).toBe(18)
  })

  it('returns undefined for Tempo native (no displayable native currency)', () => {
    expect(v2TokenToCurrency({ chainId: UniverseChainId.Tempo })).toBeUndefined()
  })

  it('builds a token for a Tempo asset with a real address', () => {
    const result = v2TokenToCurrency({ chainId: UniverseChainId.Tempo, address: PATHUSD_ADDRESS, decimals: 6 })
    expect(result?.isToken).toBe(true)
  })
})

describe('v2UnwrapToken', () => {
  const weth = WRAPPED_NATIVE_CURRENCY[UniverseChainId.Mainnet]
  const wrappedNativeToken = {
    chainId: UniverseChainId.Mainnet,
    address: weth?.address,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoUrl: 'https://logo.example/weth.png',
  }

  it('rebrands the wrapped-native token as native (absent address, native metadata)', () => {
    const result = v2UnwrapToken(UniverseChainId.Mainnet, wrappedNativeToken)
    expect(result.address).toBeUndefined()
    expect(result.symbol).toBe('ETH')
    expect(result.name).toBe(nativeOnChain(UniverseChainId.Mainnet).name)
    expect(result.decimals).toBe(18)
    // Non-identity fields survive the rebrand
    expect(result.logoUrl).toBe('https://logo.example/weth.png')
  })

  it('unwraps to the override chain’s native metadata when nativeCurrencyChainId is passed', () => {
    const result = v2UnwrapToken(
      { chainId: UniverseChainId.Mainnet, nativeCurrencyChainId: UniverseChainId.Polygon },
      wrappedNativeToken,
    )
    expect(result.address).toBeUndefined()
    expect(result.symbol).toBe(nativeOnChain(UniverseChainId.Polygon).symbol)
  })

  it('passes non-wrapped tokens through unchanged', () => {
    const dai = { chainId: UniverseChainId.Mainnet, address: DAI.address, symbol: 'DAI', decimals: 18 }
    expect(v2UnwrapToken(UniverseChainId.Mainnet, dai)).toBe(dai)
  })

  it('passes native (absent-address) tokens through unchanged', () => {
    const native = { chainId: UniverseChainId.Mainnet, symbol: 'ETH', decimals: 18 }
    expect(v2UnwrapToken(UniverseChainId.Mainnet, native)).toBe(native)
  })
})
