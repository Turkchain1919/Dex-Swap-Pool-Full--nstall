import { UniverseChainId } from '@universe/chains'
import { URIType } from 'src/components/Requests/ScanSheet/util'
import type { EIP681URI } from 'src/components/Requests/ScanSheet/util'
import {
  getQrCodeSelection,
  getQrCodeSelectionChange,
  QrCodeSelectionChangeType,
  QrCodeSelectionType,
} from 'src/features/send/qrCodeSelection'
import { getNativeAddress } from 'uniswap/src/constants/addresses'
import { AssetType } from 'uniswap/src/entities/assets'
import type { CurrencyAsset } from 'uniswap/src/entities/assets'

const RECIPIENT = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

function currencyAsset(chainId: UniverseChainId, address: string): CurrencyAsset {
  return { address, chainId, type: AssetType.Currency }
}

function paymentRequest({ chainId, tokenAddress }: { chainId?: UniverseChainId; tokenAddress?: string }): EIP681URI {
  return { type: URIType.EIP681, value: RECIPIENT, chainId, tokenAddress }
}

describe('getQrCodeSelectionChange', () => {
  it('does not warn when neither the network nor token changes', () => {
    const currentSelection = currencyAsset(UniverseChainId.Mainnet, getNativeAddress(UniverseChainId.Mainnet))

    expect(
      getQrCodeSelectionChange({
        currentSelection,
        paymentRequest: paymentRequest({ chainId: UniverseChainId.Mainnet }),
      }),
    ).toBeUndefined()
  })

  it('warns when only the network changes', () => {
    const currentSelection = currencyAsset(UniverseChainId.Mainnet, getNativeAddress(UniverseChainId.Mainnet))

    expect(
      getQrCodeSelectionChange({
        currentSelection,
        paymentRequest: paymentRequest({ chainId: UniverseChainId.Base }),
      }),
    ).toEqual({
      changeType: QrCodeSelectionChangeType.Network,
      chainId: UniverseChainId.Base,
      tokenAddress: getNativeAddress(UniverseChainId.Base),
    })
  })

  it('warns when only the token changes', () => {
    const currentSelection = currencyAsset(UniverseChainId.Mainnet, getNativeAddress(UniverseChainId.Mainnet))

    expect(
      getQrCodeSelectionChange({
        currentSelection,
        paymentRequest: paymentRequest({
          chainId: UniverseChainId.Mainnet,
          tokenAddress: USDC_MAINNET,
        }),
      }),
    ).toEqual({
      changeType: QrCodeSelectionChangeType.Token,
      chainId: UniverseChainId.Mainnet,
      tokenAddress: USDC_MAINNET,
    })
  })

  it('warns when both the network and token change', () => {
    const currentSelection = currencyAsset(UniverseChainId.Mainnet, USDC_MAINNET)

    expect(
      getQrCodeSelectionChange({
        currentSelection,
        paymentRequest: paymentRequest({
          chainId: UniverseChainId.Base,
          tokenAddress: USDC_BASE,
        }),
      }),
    ).toEqual({
      changeType: QrCodeSelectionChangeType.NetworkAndToken,
      chainId: UniverseChainId.Base,
      tokenAddress: USDC_BASE,
    })
  })

  it('uses the selected network when the QR code omits one', () => {
    const currentSelection = currencyAsset(UniverseChainId.Base, getNativeAddress(UniverseChainId.Base))

    expect(
      getQrCodeSelectionChange({
        currentSelection,
        paymentRequest: paymentRequest({ tokenAddress: USDC_BASE }),
      }),
    ).toEqual({
      changeType: QrCodeSelectionChangeType.Token,
      chainId: UniverseChainId.Base,
      tokenAddress: USDC_BASE,
    })
  })
})

describe('getQrCodeSelection', () => {
  it('returns an initial selection when the send input is empty', () => {
    expect(
      getQrCodeSelection({
        currentSelection: null,
        defaultChainId: UniverseChainId.Mainnet,
        paymentRequest: paymentRequest({ chainId: UniverseChainId.Base, tokenAddress: USDC_BASE }),
      }),
    ).toEqual({
      type: QrCodeSelectionType.Initial,
      chainId: UniverseChainId.Base,
      tokenAddress: USDC_BASE,
    })
  })

  it('uses the default network for an initial token selection without a chain id', () => {
    expect(
      getQrCodeSelection({
        currentSelection: null,
        defaultChainId: UniverseChainId.Base,
        paymentRequest: paymentRequest({ tokenAddress: USDC_BASE }),
      }),
    ).toEqual({
      type: QrCodeSelectionType.Initial,
      chainId: UniverseChainId.Base,
      tokenAddress: USDC_BASE,
    })
  })

  it('uses the QR network native token for an initial network selection', () => {
    expect(
      getQrCodeSelection({
        currentSelection: null,
        defaultChainId: UniverseChainId.Mainnet,
        paymentRequest: paymentRequest({ chainId: UniverseChainId.Base }),
      }),
    ).toEqual({
      type: QrCodeSelectionType.Initial,
      chainId: UniverseChainId.Base,
      tokenAddress: getNativeAddress(UniverseChainId.Base),
    })
  })

  it('marks an existing selection update as a change', () => {
    expect(
      getQrCodeSelection({
        currentSelection: currencyAsset(UniverseChainId.Mainnet, getNativeAddress(UniverseChainId.Mainnet)),
        defaultChainId: UniverseChainId.Mainnet,
        paymentRequest: paymentRequest({ chainId: UniverseChainId.Base }),
      }),
    ).toEqual({
      type: QrCodeSelectionType.Change,
      changeType: QrCodeSelectionChangeType.Network,
      chainId: UniverseChainId.Base,
      tokenAddress: getNativeAddress(UniverseChainId.Base),
    })
  })

  it('does not create an initial selection when the QR does not request a token or network', () => {
    expect(
      getQrCodeSelection({
        currentSelection: null,
        defaultChainId: UniverseChainId.Mainnet,
        paymentRequest: paymentRequest({}),
      }),
    ).toBeUndefined()
  })
})
