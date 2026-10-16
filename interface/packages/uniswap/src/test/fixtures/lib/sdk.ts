import { Token } from '@uniswap/sdk-core'
import { UniverseChainId } from '@universe/chains'
import { getWrappedNativeAddressWithThrow } from 'uniswap/src/constants/addresses'
import { DEFAULT_NATIVE_ADDRESS_LEGACY } from 'uniswap/src/features/chains/evm/defaults'

export const ETH = new Token(UniverseChainId.Mainnet, DEFAULT_NATIVE_ADDRESS_LEGACY, 18, 'ETH', 'Ethereum')

export const WETH = new Token(
  UniverseChainId.Mainnet,
  getWrappedNativeAddressWithThrow(UniverseChainId.Mainnet),
  18,
  'WETH',
  'Wrapped Ether',
)
