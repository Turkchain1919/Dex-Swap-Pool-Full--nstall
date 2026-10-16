import * as wcUtils from '@walletconnect/utils'
import { CUSTOM_UNI_QR_CODE_PREFIX, getSupportedURI, URIType } from 'src/components/Requests/ScanSheet/util'
import {
  UNISWAP_URL_SCHEME_WALLETCONNECT_AS_PARAM,
  UNISWAP_WALLETCONNECT_URL,
} from 'src/features/deepLinking/constants'
import {
  wcAsParamInUniwapScheme,
  wcInUniwapScheme,
  wcUniversalLinkUrl,
} from 'src/features/deepLinking/handleDeepLinkSaga.test'

const VALID_WC_V1_URI = 'validWcV1Uri@1?relay-protocol=irn&symKey=51e'
const VALID_WC_V2_URI = 'validWcV2Uri@2?relay-protocol=irn&symKey=51e'

function getWcVersion(uri: string): number {
  switch (uri) {
    case VALID_WC_V1_URI:
      return 1
    case VALID_WC_V2_URI:
      return 2
    default:
      throw new Error(`Cannot parse URI: ${uri}`)
  }
}

vi.spyOn(wcUtils, 'parseUri').mockImplementation((uri) => {
  return {
    version: getWcVersion(uri),
    protocol: '',
    topic: '',
    symKey: '',
    relay: {
      protocol: '',
    },
  }
})

describe('getSupportedURI', () => {
  it('should return undefined for empty URIs', async () => {
    expect(await getSupportedURI('')).toBeUndefined()
  })

  it('should return undefined for invalid URIs', async () => {
    expect(await getSupportedURI('invalid_uri')).toBeUndefined()
  })

  it('should return undefined for hello_uniwallet v1 URI', async () => {
    const result = await getSupportedURI(CUSTOM_UNI_QR_CODE_PREFIX + VALID_WC_V1_URI)
    expect(result).toBeUndefined()
  })

  it('should return correct values for hello_uniwallet v2 URI', async () => {
    const result = await getSupportedURI('hello_uniwallet:' + VALID_WC_V2_URI)
    expect(result).toEqual({
      type: URIType.WalletConnectV2URL,
      value: VALID_WC_V2_URI,
    })
  })

  it('should return undefined for uniswap scheme v1 URI with wc URI as query param', async () => {
    const result = await getSupportedURI(wcAsParamInUniwapScheme + VALID_WC_V1_URI)
    expect(result).toBeUndefined()
  })

  it('should return correct values for uniswap scheme v2 URI with wc URI as query param', async () => {
    const result = await getSupportedURI('uniswap://wc?uri=' + VALID_WC_V2_URI)
    expect(result).toEqual({
      type: URIType.WalletConnectV2URL,
      value: VALID_WC_V2_URI,
    })
  })

  it('should return undefined for uniswap scheme v1 URI', async () => {
    const result = await getSupportedURI(wcInUniwapScheme + VALID_WC_V1_URI)
    expect(result).toBeUndefined()
  })

  it('should return correct values for uniswap scheme v2 URI', async () => {
    const result = await getSupportedURI('uniswap://' + VALID_WC_V2_URI)
    expect(result).toEqual({
      type: URIType.WalletConnectV2URL,
      value: VALID_WC_V2_URI,
    })
  })

  it('should return undefined for uniswap scheme deep link URI', async () => {
    const result = await getSupportedURI('uniswap://widget/' + VALID_WC_V2_URI)
    expect(result).toBeUndefined()
  })

  it('should return undefined for uniswap app URL v1 URI', async () => {
    const result = await getSupportedURI(wcUniversalLinkUrl + VALID_WC_V1_URI)
    expect(result).toBeUndefined()
  })

  it('should return correct values for uniswap app URL v2 URI', async () => {
    const result = await getSupportedURI('https://uniswap.org/app/wc?uri=' + VALID_WC_V2_URI)
    expect(result).toEqual({
      type: URIType.WalletConnectV2URL,
      value: VALID_WC_V2_URI,
    })
  })

  it('should return correct values for valid v1 URIs', async () => {
    const result = await getSupportedURI(VALID_WC_V1_URI)
    expect(result).toEqual({
      type: URIType.WalletConnectURL,
      value: VALID_WC_V1_URI,
    })
  })

  it('should return correct values for valid v2 URIs', async () => {
    const result = await getSupportedURI(VALID_WC_V2_URI)
    expect(result).toEqual({
      type: URIType.WalletConnectV2URL,
      value: VALID_WC_V2_URI,
    })
  })

  it('should extract correct address from address URI', async () => {
    const validUri = 'address:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const result = await getSupportedURI(validUri)
    expect(result).toEqual({
      type: URIType.Address,
      value: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    })
  })

  it('should return undefined for invalid address URI', async () => {
    expect(await getSupportedURI('address:invalid_address')).toBeUndefined()
  })

  it('should extract correct address from metamask URI', async () => {
    const validUri = 'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const result = await getSupportedURI(validUri)
    expect(result).toEqual({
      type: URIType.Address,
      value: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    })
  })

  it('should return undefined for invalid metamask address', async () => {
    expect(await getSupportedURI('ethereum:invalid_address')).toBeUndefined()
  })

  describe('EIP-681 payment request URIs (e.g. Coinbase receive QRs)', () => {
    const RECIPIENT_LOWER = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f'
    const RECIPIENT_CHECKSUMMED = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
    const USDC_MAINNET = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

    it('should extract address from URI with a chain id suffix', async () => {
      const result = await getSupportedURI(`ethereum:${RECIPIENT_LOWER}@8453`)
      expect(result).toEqual({
        type: URIType.EIP681,
        value: RECIPIENT_CHECKSUMMED,
        chainId: 8453,
        tokenAddress: undefined,
      })
    })

    it('should extract address from URI with a pay- prefix', async () => {
      const result = await getSupportedURI(`ethereum:pay-${RECIPIENT_LOWER}@1`)
      expect(result).toEqual({
        type: URIType.EIP681,
        value: RECIPIENT_CHECKSUMMED,
        chainId: 1,
        tokenAddress: undefined,
      })
    })

    it('should extract address from URI with query params', async () => {
      const result = await getSupportedURI(`ethereum:${RECIPIENT_LOWER}@1?value=1e18`)
      expect(result).toEqual({
        type: URIType.EIP681,
        value: RECIPIENT_CHECKSUMMED,
        chainId: 1,
        tokenAddress: undefined,
      })
    })

    it('should use the current network later when the URI omits a chain id', async () => {
      const result = await getSupportedURI(`ethereum:${RECIPIENT_LOWER}?value=1e18`)
      expect(result).toEqual({
        type: URIType.EIP681,
        value: RECIPIENT_CHECKSUMMED,
        chainId: undefined,
        tokenAddress: undefined,
      })
    })

    it('should extract recipient (not token contract) from ERC-20 transfer request', async () => {
      const result = await getSupportedURI(
        `ethereum:${USDC_MAINNET}@1/transfer?address=${RECIPIENT_LOWER}&uint256=1000000`,
      )
      expect(result).toEqual({
        type: URIType.EIP681,
        value: RECIPIENT_CHECKSUMMED,
        chainId: 1,
        tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      })
    })

    it('should return undefined for a transfer request without a recipient address param', async () => {
      expect(await getSupportedURI(`ethereum:${USDC_MAINNET}@1/transfer?uint256=1000000`)).toBeUndefined()
    })

    it('should return undefined for non-transfer function calls', async () => {
      expect(await getSupportedURI(`ethereum:${USDC_MAINNET}@1/approve?address=${RECIPIENT_LOWER}`)).toBeUndefined()
    })

    it('should return undefined for payment requests on unsupported chains', async () => {
      expect(await getSupportedURI(`ethereum:${RECIPIENT_LOWER}@999999999?value=1e18`)).toBeUndefined()
    })

    it('should return undefined when the payment request chain is not enabled', async () => {
      expect(
        await getSupportedURI(`ethereum:${RECIPIENT_LOWER}@8453`, {
          enabledChainIds: [1],
        }),
      ).toBeUndefined()
    })

    it('should allow payment requests without a chain when filtering enabled chains', async () => {
      expect(
        await getSupportedURI(`ethereum:${RECIPIENT_LOWER}?value=1e18`, {
          enabledChainIds: [1],
        }),
      ).toEqual({
        type: URIType.EIP681,
        value: RECIPIENT_CHECKSUMMED,
        chainId: undefined,
        tokenAddress: undefined,
      })
    })

    it('should return undefined (not throw) when parseUri throws on an unrecognized scheme', async () => {
      await expect(getSupportedURI('somescheme:not-an-address?foo=bar')).resolves.toBeUndefined()
    })
  })

  describe('URL and HTML encoded URIs', () => {
    it('should handle percent-encoded WalletConnect v2 URI', async () => {
      // Simulate a URI that has been percent-encoded (& becomes %26)
      const encodedUri = encodeURIComponent(VALID_WC_V2_URI)
      const result = await getSupportedURI(encodedUri)
      expect(result).toEqual({
        type: URIType.WalletConnectV2URL,
        value: VALID_WC_V2_URI,
      })
    })

    it('should handle HTML entity-encoded ampersands in WalletConnect v2 URI', async () => {
      // Simulate a URI with HTML-encoded ampersands (& becomes &amp;)
      const htmlEncodedUri = VALID_WC_V2_URI.replace(/&/g, '&amp;')
      const result = await getSupportedURI(htmlEncodedUri)
      expect(result).toEqual({
        type: URIType.WalletConnectV2URL,
        value: VALID_WC_V2_URI,
      })
    })

    it('should handle both percent-encoded and HTML entity-encoded URI', async () => {
      // First apply HTML encoding, then percent encoding
      const htmlEncodedUri = VALID_WC_V2_URI.replace(/&/g, '&amp;')
      const doubleEncodedUri = encodeURIComponent(htmlEncodedUri)
      const result = await getSupportedURI(doubleEncodedUri)
      expect(result).toEqual({
        type: URIType.WalletConnectV2URL,
        value: VALID_WC_V2_URI,
      })
    })

    it('should handle percent-encoded uniswap scheme URI with query param', async () => {
      const fullUri = UNISWAP_URL_SCHEME_WALLETCONNECT_AS_PARAM + VALID_WC_V2_URI
      const encodedUri = encodeURIComponent(fullUri)
      const result = await getSupportedURI(encodedUri)
      expect(result).toEqual({
        type: URIType.WalletConnectV2URL,
        value: VALID_WC_V2_URI,
      })
    })

    it('should handle HTML entity-encoded uniswap scheme URI with query param', async () => {
      const fullUri = UNISWAP_URL_SCHEME_WALLETCONNECT_AS_PARAM + VALID_WC_V2_URI
      const htmlEncodedUri = fullUri.replace(/&/g, '&amp;')
      const result = await getSupportedURI(htmlEncodedUri)
      expect(result).toEqual({
        type: URIType.WalletConnectV2URL,
        value: VALID_WC_V2_URI,
      })
    })

    it('should handle percent-encoded uniswap app URL', async () => {
      const fullUri = UNISWAP_WALLETCONNECT_URL + VALID_WC_V2_URI
      const encodedUri = encodeURIComponent(fullUri)
      const result = await getSupportedURI(encodedUri)
      expect(result).toEqual({
        type: URIType.WalletConnectV2URL,
        value: VALID_WC_V2_URI,
      })
    })

    it('should handle HTML entity-encoded uniswap app URL', async () => {
      const fullUri = UNISWAP_WALLETCONNECT_URL + VALID_WC_V2_URI
      const htmlEncodedUri = fullUri.replace(/&/g, '&amp;')
      const result = await getSupportedURI(htmlEncodedUri)
      expect(result).toEqual({
        type: URIType.WalletConnectV2URL,
        value: VALID_WC_V2_URI,
      })
    })

    it('should handle percent-encoded hello_uniwallet prefix', async () => {
      const fullUri = CUSTOM_UNI_QR_CODE_PREFIX + VALID_WC_V2_URI
      const encodedUri = encodeURIComponent(fullUri)
      const result = await getSupportedURI(encodedUri)
      expect(result).toEqual({
        type: URIType.WalletConnectV2URL,
        value: VALID_WC_V2_URI,
      })
    })

    it('should handle HTML entity-encoded hello_uniwallet prefix', async () => {
      const fullUri = CUSTOM_UNI_QR_CODE_PREFIX + VALID_WC_V2_URI
      const htmlEncodedUri = fullUri.replace(/&/g, '&amp;')
      const result = await getSupportedURI(htmlEncodedUri)
      expect(result).toEqual({
        type: URIType.WalletConnectV2URL,
        value: VALID_WC_V2_URI,
      })
    })

    it('should handle malformed percent-encoded URI without crashing', async () => {
      // Malformed URI with invalid percent encoding (% not followed by valid hex)
      const malformedUri = 'uniswap://wc?uri=%E0%A4%A'
      // Should not throw an error, even with malformed encoding
      await expect(getSupportedURI(malformedUri)).resolves.not.toThrow()
    })

    it('should handle URI with standalone percent sign', async () => {
      // URI with a standalone % which is invalid for decodeURIComponent
      const malformedUri = 'hello_uniwallet:' + VALID_WC_V2_URI + '%'
      // Should not throw an error, even with malformed encoding
      await expect(getSupportedURI(malformedUri)).resolves.not.toThrow()
    })
  })
})
