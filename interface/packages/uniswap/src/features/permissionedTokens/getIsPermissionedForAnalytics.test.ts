import { SharedQueryClient, V1_TRADING_API_PATHS, type CheckPermissionsResponse } from '@universe/api'
import {
  getIsPermissionedForAnalytics,
  permissionedAnalyticsTokenFromQuoteParams,
} from 'uniswap/src/features/permissionedTokens/getIsPermissionedForAnalytics'
import { NATIVE_ADDRESS_FOR_TRADING_API } from 'uniswap/src/features/transactions/swap/utils/tradingApi'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

const CHAIN_ID = 11155111
const PERMISSIONED_TOKEN = '0xbf56488c857A881ae7e3BED27Cf99c10A7Ab7e50'
const STANDARD_TOKEN = '0x1F46ea239595706960a9208897968b169db1b89c'
const UNKNOWN_TOKEN = '0xb73055db2b3A3EaE87a331DD88e4a80b43602690'

function seedPermissions(params: { tokens: string[]; chainId: number; response: CheckPermissionsResponse }): void {
  const { tokens, chainId, response } = params
  SharedQueryClient.setQueryData<CheckPermissionsResponse>(
    [
      ReactQueryCacheKey.TradingApi,
      V1_TRADING_API_PATHS.checkPermissions,
      { walletAddress: '0xwallet', tokens, chainId },
    ],
    response,
  )
}

function erc20(address: string, chainId: number = CHAIN_ID): { chainId: number; isNative: boolean; address: string } {
  return { chainId, isNative: false, address }
}

const NATIVE = { chainId: CHAIN_ID, isNative: true }

describe('getIsPermissionedForAnalytics', () => {
  beforeEach(() => {
    SharedQueryClient.clear()
  })

  it('returns true when either token is resolved permissioned', () => {
    seedPermissions({
      tokens: [PERMISSIONED_TOKEN],
      chainId: CHAIN_ID,
      response: { requestId: 'req-1', results: [{ token: PERMISSIONED_TOKEN, isPermissioned: true }] },
    })

    expect(getIsPermissionedForAnalytics([erc20(PERMISSIONED_TOKEN), erc20(UNKNOWN_TOKEN)])).toBe(true)
    expect(getIsPermissionedForAnalytics([NATIVE, erc20(PERMISSIONED_TOKEN)])).toBe(true)
  })

  it('returns false when every token is resolved and none is permissioned', () => {
    seedPermissions({
      tokens: [STANDARD_TOKEN],
      chainId: CHAIN_ID,
      response: { requestId: 'req-2', results: [{ token: STANDARD_TOKEN, isPermissioned: false }] },
    })

    expect(getIsPermissionedForAnalytics([NATIVE, erc20(STANDARD_TOKEN)])).toBe(false)
  })

  it('treats natives as not permissioned without a cache entry', () => {
    expect(getIsPermissionedForAnalytics([NATIVE, NATIVE])).toBe(false)
  })

  it('returns undefined when the cache has no resolved answer', () => {
    expect(getIsPermissionedForAnalytics([erc20(UNKNOWN_TOKEN), erc20(STANDARD_TOKEN)])).toBeUndefined()
    expect(getIsPermissionedForAnalytics([NATIVE, erc20(UNKNOWN_TOKEN)])).toBeUndefined()
  })

  it('returns undefined when one token is resolved not-permissioned and the other is unknown', () => {
    seedPermissions({
      tokens: [STANDARD_TOKEN],
      chainId: CHAIN_ID,
      response: { requestId: 'req-3', results: [{ token: STANDARD_TOKEN, isPermissioned: false }] },
    })

    expect(getIsPermissionedForAnalytics([erc20(STANDARD_TOKEN), erc20(UNKNOWN_TOKEN)])).toBeUndefined()
  })

  it('does not resolve a token from another chain (cross-chain cache stays cold)', () => {
    seedPermissions({
      tokens: [STANDARD_TOKEN],
      chainId: CHAIN_ID,
      response: { requestId: 'req-4', results: [{ token: STANDARD_TOKEN, isPermissioned: false }] },
    })

    expect(getIsPermissionedForAnalytics([erc20(STANDARD_TOKEN, 1)])).toBeUndefined()
  })

  it('returns undefined for missing tokens or an empty list', () => {
    expect(getIsPermissionedForAnalytics([])).toBeUndefined()
    expect(getIsPermissionedForAnalytics([undefined, undefined])).toBeUndefined()
    expect(getIsPermissionedForAnalytics([NATIVE, undefined])).toBeUndefined()
  })
})

describe('permissionedAnalyticsTokenFromQuoteParams', () => {
  it('flags the trading-API zero address as native', () => {
    expect(
      permissionedAnalyticsTokenFromQuoteParams({ address: NATIVE_ADDRESS_FOR_TRADING_API, chainId: CHAIN_ID }),
    ).toEqual({
      address: NATIVE_ADDRESS_FOR_TRADING_API,
      chainId: CHAIN_ID,
      isNative: true,
    })
  })

  it('passes ERC20 addresses through', () => {
    expect(permissionedAnalyticsTokenFromQuoteParams({ address: STANDARD_TOKEN, chainId: CHAIN_ID })).toEqual({
      address: STANDARD_TOKEN,
      chainId: CHAIN_ID,
      isNative: false,
    })
  })

  it('returns undefined when address or chainId is missing', () => {
    expect(permissionedAnalyticsTokenFromQuoteParams({ address: undefined, chainId: CHAIN_ID })).toBeUndefined()
    expect(permissionedAnalyticsTokenFromQuoteParams({ address: STANDARD_TOKEN, chainId: undefined })).toBeUndefined()
  })
})
