import { Platform, UniverseChainId, areAddressesEqual } from '@universe/chains'
import type { EIP681URI } from 'src/components/Requests/ScanSheet/util'
import { getNativeAddress } from 'uniswap/src/constants/addresses'
import type { TradeableAsset } from 'uniswap/src/entities/assets'
import { isNativeCurrencyAddress } from 'uniswap/src/utils/currencyId'

export enum QrCodeSelectionChangeType {
  Network = 'network',
  Token = 'token',
  NetworkAndToken = 'network-and-token',
}

export enum QrCodeSelectionType {
  Initial = 'initial',
  Change = 'change',
}

export type QrCodeSelectionChange = {
  changeType: QrCodeSelectionChangeType
  chainId: UniverseChainId
  tokenAddress: string
}

export type QrCodeSelection =
  | ({ type: QrCodeSelectionType.Initial } & Omit<QrCodeSelectionChange, 'changeType'>)
  | ({ type: QrCodeSelectionType.Change } & QrCodeSelectionChange)

export function getQrCodeSelection({
  currentSelection,
  defaultChainId,
  paymentRequest,
}: {
  currentSelection: TradeableAsset | null
  defaultChainId: UniverseChainId
  paymentRequest: EIP681URI
}): QrCodeSelection | undefined {
  if (!currentSelection) {
    if (paymentRequest.chainId === undefined && paymentRequest.tokenAddress === undefined) {
      return undefined
    }

    const chainId = paymentRequest.chainId ?? defaultChainId
    return {
      type: QrCodeSelectionType.Initial,
      chainId,
      tokenAddress: paymentRequest.tokenAddress ?? getNativeAddress(chainId),
    }
  }

  const change = getQrCodeSelectionChange({ currentSelection, paymentRequest })
  return change ? { type: QrCodeSelectionType.Change, ...change } : undefined
}

export function getQrCodeSelectionChange({
  currentSelection,
  paymentRequest,
}: {
  currentSelection: TradeableAsset | null
  paymentRequest: EIP681URI
}): QrCodeSelectionChange | undefined {
  if (!currentSelection) {
    return undefined
  }

  const chainId = paymentRequest.chainId ?? currentSelection.chainId
  const tokenAddress = paymentRequest.tokenAddress ?? getNativeAddress(chainId)
  const networkChanged = chainId !== currentSelection.chainId
  const tokenChanged = paymentRequest.tokenAddress
    ? !areAddressesEqual({
        addressInput1: {
          address: currentSelection.address,
          chainId: currentSelection.chainId,
        },
        addressInput2: { address: tokenAddress, platform: Platform.EVM },
      })
    : !isNativeCurrencyAddress(currentSelection.chainId, currentSelection.address)

  if (!networkChanged && !tokenChanged) {
    return undefined
  }

  const changeType = networkChanged
    ? tokenChanged
      ? QrCodeSelectionChangeType.NetworkAndToken
      : QrCodeSelectionChangeType.Network
    : QrCodeSelectionChangeType.Token

  return { changeType, chainId, tokenAddress }
}
