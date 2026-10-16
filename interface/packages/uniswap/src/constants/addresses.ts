import { UniverseChainId } from '@universe/chains'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'

export const NATIVE_TOKEN_PLACEHOLDER = 'NATIVE'

export function getNativeAddress(chainId: UniverseChainId): string {
  return getChainInfo(chainId).nativeCurrency.address
}

export function getWrappedNativeAddress(chainId: UniverseChainId): string | undefined {
  return getChainInfo(chainId).wrappedNativeCurrency?.address
}

export function getWrappedNativeAddressWithThrow(chainId: UniverseChainId): string {
  const address = getChainInfo(chainId).wrappedNativeCurrency?.address
  if (!address) {
    throw new Error(`Wrapped native currency not found for chain ID: ${chainId}`)
  }
  return address
}

// The ERC20 ETH contract address — this is the spender that wallets grant `nativeAllowance` to.
// https://github.com/Uniswap/ERC20-eth
export const ERC20_ETH_ADDRESS = '0x00000000e20E49e6dCeE6e8283A0C090578F0fb9'
