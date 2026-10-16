import { CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core'
import { SharedQueryClient, V1_TRADING_API_PATHS, type CheckPermissionsResponse } from '@universe/api'
import { SwapEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { useWithQuoteLogging } from 'uniswap/src/features/transactions/swap/hooks/useTrade/logging'
import { TradeService } from 'uniswap/src/features/transactions/swap/services/tradeService/tradeService'
import { UseTradeArgs } from 'uniswap/src/features/transactions/swap/types/trade'
import { renderHookWithProviders } from 'uniswap/src/test/render'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

vi.mock('uniswap/src/features/telemetry/send', () => ({
  sendAnalyticsEvent: vi.fn(),
}))

vi.mock('@universe/gating', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/gating')>()
  return {
    ...actual,
    useFeatureFlag: vi.fn().mockReturnValue(false),
  }
})

const CHAIN_ID = 11155111
const PERMISSIONED_TOKEN = new Token(CHAIN_ID, '0xbf56488c857A881ae7e3BED27Cf99c10A7Ab7e50', 18, 'PTOK')
const STANDARD_TOKEN = new Token(CHAIN_ID, '0x1F46eA239595706960a9208897968b169dB1B89C', 18, 'STD')

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

function makeArgs(input: Token, output: Token): UseTradeArgs {
  return {
    amountSpecified: CurrencyAmount.fromRawAmount(input, '1000000'),
    otherCurrency: output,
    tradeType: TradeType.EXACT_INPUT,
  }
}

async function runFailedGetTrade(args: UseTradeArgs): Promise<void> {
  const { result } = renderHookWithProviders(() => useWithQuoteLogging())
  const service = { getTrade: vi.fn().mockRejectedValue(new Error('quote failed')) } as unknown as TradeService
  const wrappedService = result.current(service)

  await expect(wrappedService.getTrade(args)).rejects.toThrow('quote failed')
}

function getSentSwapQuoteFailedProperties(): Record<string, unknown> {
  const call = vi.mocked(sendAnalyticsEvent).mock.calls.find(([name]) => name === SwapEventName.SwapQuoteFailed)
  expect(call).toBeDefined()
  return call?.[1] as Record<string, unknown>
}

describe('useWithQuoteLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    SharedQueryClient.clear()
  })

  it('sends SwapQuoteFailed with quote request metadata when getTrade rejects', async () => {
    await runFailedGetTrade(makeArgs(STANDARD_TOKEN, PERMISSIONED_TOKEN))

    expect(getSentSwapQuoteFailedProperties()).toEqual(
      expect.objectContaining({
        error_message: 'quote failed',
        token_in_symbol: 'STD',
        token_out_symbol: 'PTOK',
        token_in_address: STANDARD_TOKEN.address,
        token_out_address: PERMISSIONED_TOKEN.address,
        chain_id: CHAIN_ID,
        chain_id_in: CHAIN_ID,
        chain_id_out: CHAIN_ID,
      }),
    )
  })

  it('does not send SwapQuoteFailed when a pair currency is missing', async () => {
    await runFailedGetTrade({
      amountSpecified: CurrencyAmount.fromRawAmount(STANDARD_TOKEN, '1000000'),
      otherCurrency: undefined,
      tradeType: TradeType.EXACT_INPUT,
    })

    expect(sendAnalyticsEvent).not.toHaveBeenCalledWith(SwapEventName.SwapQuoteFailed, expect.anything())
  })

  describe('SwapQuoteFailed is_permissioned', () => {
    it('is true when a pair token is resolved permissioned in the cache', async () => {
      seedPermissions({
        tokens: [PERMISSIONED_TOKEN.address],
        chainId: CHAIN_ID,
        response: { requestId: 'req-1', results: [{ token: PERMISSIONED_TOKEN.address, isPermissioned: true }] },
      })

      await runFailedGetTrade(makeArgs(STANDARD_TOKEN, PERMISSIONED_TOKEN))

      expect(getSentSwapQuoteFailedProperties()['is_permissioned']).toBe(true)
    })

    it('is false when every pair token is resolved not-permissioned', async () => {
      seedPermissions({
        tokens: [STANDARD_TOKEN.address, PERMISSIONED_TOKEN.address],
        chainId: CHAIN_ID,
        response: {
          requestId: 'req-2',
          results: [
            { token: STANDARD_TOKEN.address, isPermissioned: false },
            { token: PERMISSIONED_TOKEN.address, isPermissioned: false },
          ],
        },
      })

      await runFailedGetTrade(makeArgs(STANDARD_TOKEN, PERMISSIONED_TOKEN))

      expect(getSentSwapQuoteFailedProperties()['is_permissioned']).toBe(false)
    })

    it('is omitted when the cache has no resolved answer for the pair', async () => {
      await runFailedGetTrade(makeArgs(STANDARD_TOKEN, PERMISSIONED_TOKEN))

      expect(getSentSwapQuoteFailedProperties()['is_permissioned']).toBeUndefined()
    })
  })
})
