import { act, renderHook } from '@testing-library/react'
import { TradingApi } from '@universe/api'
import { UniverseChainId } from '@universe/chains'
import { EarnAnalyticsSurface, EarnEntryPoint } from 'uniswap/src/features/earn/analytics'
import { useEarnReviewAnalytics } from 'uniswap/src/features/earn/hooks/useEarnReviewAnalytics'
import { EarnPlanPriceChangeError } from 'uniswap/src/features/earn/planExecution'
import type { EarnVaultInfo } from 'uniswap/src/features/earn/types'
import { EarnEventName } from 'uniswap/src/features/telemetry/constants/features'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { TransactionStatus } from 'uniswap/src/features/transactions/types/transactionDetails'
import { createTransactionId } from 'uniswap/src/utils/createTransactionId'

vi.mock('uniswap/src/features/telemetry/send', () => ({
  sendAnalyticsEvent: vi.fn(),
}))

vi.mock('uniswap/src/utils/createTransactionId', () => ({
  createTransactionId: vi.fn(),
}))

const mockSendAnalyticsEvent = vi.mocked(sendAnalyticsEvent)
const mockCreateTransactionId = vi.mocked(createTransactionId)

const VAULT: EarnVaultInfo = {
  id: '1-0xvault',
  currencyId: `${UniverseChainId.Mainnet}-0xunderlying`,
  displayCurrencyId: `${UniverseChainId.Mainnet}-0xunderlying`,
  vaultAddress: '0xvault',
  chainId: UniverseChainId.Mainnet,
  apyPercent: 4.8,
  exposureCurrencyIds: [],
  exposures: [],
  totalDepositsUsd: 1_000_000,
  liquidityUsd: 500_000,
  curator: { name: 'Morpho' },
}

function renderAnalytics(overrides: Partial<Parameters<typeof useEarnReviewAnalytics>[0]> = {}) {
  return renderHook(() =>
    useEarnReviewAnalytics({
      action: 'deposit',
      amountUsd: 100,
      analyticsEntryPoint: EarnEntryPoint.PostSwapUpsellToast,
      analyticsSurface: EarnAnalyticsSurface.Web,
      tokenAmount: '100',
      vault: VAULT,
      ...overrides,
    }),
  )
}

function getEventCalls(eventName: EarnEventName): unknown[][] {
  return mockSendAnalyticsEvent.mock.calls.filter(([name]) => name === eventName)
}

describe(useEarnReviewAnalytics, () => {
  beforeEach(() => {
    mockSendAnalyticsEvent.mockClear()
    mockCreateTransactionId.mockReset()
    mockCreateTransactionId.mockReturnValue('attempt-1')
  })

  it('provides analytics properties for the review impression', () => {
    const { result } = renderAnalytics()

    expect(result.current.reviewedEventProperties).toEqual(
      expect.objectContaining({ action: 'deposit', amount_usd: 100 }),
    )
  })

  it.each([
    ['deposit', EarnEventName.EarnDepositReviewReady],
    ['withdraw', EarnEventName.EarnWithdrawReviewReady],
  ] as const)('logs one %s Review Ready event', (action, eventName) => {
    const { result } = renderAnalytics({ action })

    act(() => {
      result.current.logReviewReady()
      result.current.logReviewReady()
    })

    expect(getEventCalls(eventName)).toEqual([[eventName, expect.objectContaining({ action, amount_usd: 100 })]])
  })

  it('uses one attempt id for the button click and plan submission', () => {
    const { result } = renderAnalytics({ sourceUpsellCurrencyId: VAULT.displayCurrencyId, swapAmountUsd: 100 })
    let attemptId = ''

    act(() => {
      attemptId = result.current.logSubmitButtonClicked()
    })

    expect(attemptId).toBe('attempt-1')
    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(
      EarnEventName.EarnDepositSubmitButtonClicked,
      expect.objectContaining({ action: 'deposit', attempt_id: 'attempt-1' }),
    )
    expect(getEventCalls(EarnEventName.EarnDepositSubmitted)).toHaveLength(0)
    expect(getEventCalls(EarnEventName.EarnSwapUpsellConverted)).toHaveLength(0)

    act(() => {
      result.current.logSubmitted(attemptId)
      result.current.logSubmitted(attemptId)
    })

    expect(getEventCalls(EarnEventName.EarnDepositSubmitted)).toEqual([
      [EarnEventName.EarnDepositSubmitted, expect.objectContaining({ attempt_id: 'attempt-1' })],
    ])
    expect(getEventCalls(EarnEventName.EarnSwapUpsellConverted)).toHaveLength(1)
  })

  it('terminalizes an errorless interruption before plan submission', () => {
    const { result } = renderAnalytics()
    let attemptId = ''

    act(() => {
      attemptId = result.current.logSubmitButtonClicked()
      result.current.logFailed({ error: undefined, attemptId })
      result.current.logFinalized({ planId: 'late-plan', status: TransactionStatus.Success }, attemptId)
    })

    expect(getEventCalls(EarnEventName.EarnDepositSubmitted)).toHaveLength(0)
    expect(getEventCalls(EarnEventName.EarnDepositFailed)).toEqual([
      [
        EarnEventName.EarnDepositFailed,
        expect.objectContaining({
          attempt_id: 'attempt-1',
          failure_phase: 'validation',
          failure_reason: 'pre_submission_interrupted',
        }),
      ],
    ])
    expect(getEventCalls(EarnEventName.EarnDepositCompleted)).toHaveLength(0)
  })

  it('sanitizes and bounds pre-submission error data', () => {
    const { result } = renderAnalytics()
    const error = new Error(`Provider failed for 0x${'ab'.repeat(40)}\nrequest body`)
    error.name = 'n'.repeat(200)

    act(() => {
      const attemptId = result.current.logSubmitButtonClicked()
      result.current.logFailed({ error, attemptId })
    })

    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(
      EarnEventName.EarnDepositFailed,
      expect.objectContaining({
        error_message: 'Provider failed for 0x…',
        error_name: 'n'.repeat(128),
      }),
    )
  })

  it('records an initialization failure after plan submission', () => {
    const { result } = renderAnalytics()
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    let attemptId = ''

    act(() => {
      attemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(attemptId)
    })
    now.mockReturnValue(1_750)
    act(() => {
      result.current.logFailed({
        error: new Error('plan creation failed'),
        context: { willFinalize: false },
        attemptId,
      })
    })

    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(
      EarnEventName.EarnDepositFailed,
      expect.objectContaining({
        attempt_id: 'attempt-1',
        failure_phase: 'init',
        failure_reason: 'initialization_error',
        failure_duration_ms: 750,
      }),
    )
    now.mockRestore()
  })

  it('identifies a price change after plan submission', () => {
    const { result } = renderAnalytics()

    act(() => {
      const attemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(attemptId)
      result.current.logFailed({
        error: new EarnPlanPriceChangeError('Price changed'),
        context: { willFinalize: false },
        attemptId,
      })
    })

    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(
      EarnEventName.EarnDepositFailed,
      expect.objectContaining({
        attempt_id: 'attempt-1',
        failure_phase: 'init',
        failure_reason: 'price_changed',
      }),
    )
  })

  it('identifies a price change between plan steps', () => {
    const { result } = renderAnalytics()

    act(() => {
      const attemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(attemptId)
      result.current.logFailed({
        error: new EarnPlanPriceChangeError('Price changed'),
        context: { willFinalize: true },
        attemptId,
      })
    })

    expect(mockSendAnalyticsEvent).not.toHaveBeenCalledWith(EarnEventName.EarnDepositFailed, expect.anything())

    act(() => {
      result.current.logFinalized({ planId: 'plan-1', status: TransactionStatus.Pending }, 'attempt-1')
    })

    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(
      EarnEventName.EarnDepositFailed,
      expect.objectContaining({
        attempt_id: 'attempt-1',
        failure_phase: 'execution',
        failure_reason: 'price_changed',
      }),
    )
  })

  it('merges a pending execution failure into one finalized failure', () => {
    const { result } = renderAnalytics()
    let attemptId = ''

    act(() => {
      attemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(attemptId)
      result.current.logFailed({
        error: new Error('step failed'),
        context: { willFinalize: true },
        attemptId,
      })
    })
    expect(getEventCalls(EarnEventName.EarnDepositFailed)).toHaveLength(0)

    act(() => {
      result.current.logFinalized(
        {
          planId: 'plan-1',
          status: TransactionStatus.Failed,
          stepStatus: TradingApi.PlanStepStatus.STEP_ERROR,
        },
        attemptId,
      )
      result.current.logFinalized({ planId: 'plan-1', status: TransactionStatus.Failed }, attemptId)
    })

    expect(getEventCalls(EarnEventName.EarnDepositFailed)).toEqual([
      [
        EarnEventName.EarnDepositFailed,
        expect.objectContaining({
          attempt_id: 'attempt-1',
          error_message: 'step failed',
          failure_phase: 'execution',
          failure_reason: 'execution_error',
          plan_id: 'plan-1',
          step_status: TradingApi.PlanStepStatus.STEP_ERROR,
        }),
      ],
    ])
  })

  it('records a completed event with the same attempt id', () => {
    const { result } = renderAnalytics()

    act(() => {
      const attemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(attemptId)
      result.current.logFinalized({ planId: 'plan-1', status: TransactionStatus.Success }, attemptId)
      result.current.logFinalized({ planId: 'plan-1', status: TransactionStatus.Success }, attemptId)
    })

    expect(getEventCalls(EarnEventName.EarnDepositCompleted)).toEqual([
      [EarnEventName.EarnDepositCompleted, expect.objectContaining({ plan_id: 'plan-1', attempt_id: 'attempt-1' })],
    ])
  })

  it.each([
    [TransactionStatus.Canceled, undefined, 'plan_cancelled'],
    [TransactionStatus.Failed, undefined, 'plan_finalized_failed'],
    [TransactionStatus.Pending, undefined, 'finalization_unresolved'],
    [undefined, undefined, 'finalization_unresolved'],
    [TransactionStatus.Failed, TradingApi.PlanStepStatus.STEP_ERROR, 'plan_step_failed'],
  ] as const)('classifies final status %s and step status %s', (status, stepStatus, failureReason) => {
    const { result } = renderAnalytics()

    act(() => {
      const attemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(attemptId)
      result.current.logFinalized({ planId: 'plan-1', status, stepStatus }, attemptId)
    })

    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(
      EarnEventName.EarnDepositFailed,
      expect.objectContaining({
        attempt_id: 'attempt-1',
        failure_phase: 'finalization',
        failure_reason: failureReason,
      }),
    )
  })

  it('keeps late callbacks from one attempt separate from a successful retry', () => {
    mockCreateTransactionId.mockReturnValueOnce('attempt-1').mockReturnValueOnce('attempt-2')
    const { result } = renderAnalytics()
    let firstAttemptId = ''
    let secondAttemptId = ''

    act(() => {
      firstAttemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(firstAttemptId)
      result.current.logFailed({
        error: new Error('first attempt failed'),
        context: { willFinalize: true },
        attemptId: firstAttemptId,
      })
      secondAttemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(secondAttemptId)
      result.current.logFinalized({ planId: 'plan-1', status: TransactionStatus.Success }, secondAttemptId)
      result.current.logFinalized({ planId: 'plan-1', status: TransactionStatus.Failed }, firstAttemptId)
    })

    expect(getEventCalls(EarnEventName.EarnDepositCompleted)).toEqual([
      [EarnEventName.EarnDepositCompleted, expect.objectContaining({ attempt_id: 'attempt-2' })],
    ])
    expect(getEventCalls(EarnEventName.EarnDepositFailed)).toEqual([
      [
        EarnEventName.EarnDepositFailed,
        expect.objectContaining({ attempt_id: 'attempt-1', error_message: 'first attempt failed' }),
      ],
    ])
  })

  it('does not attribute a finalization to an unknown attempt id', () => {
    const { result } = renderAnalytics()

    act(() => {
      const attemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(attemptId)
      result.current.logFinalized({ planId: 'plan-1', status: TransactionStatus.Success }, 'unknown-attempt')
    })

    expect(getEventCalls(EarnEventName.EarnDepositCompleted)).toHaveLength(0)
    expect(getEventCalls(EarnEventName.EarnDepositFailed)).toHaveLength(0)
  })

  it('logs an upsell conversion once across submitted retries', () => {
    mockCreateTransactionId.mockReturnValueOnce('attempt-1').mockReturnValueOnce('attempt-2')
    const { result } = renderAnalytics({ analyticsEntryPoint: EarnEntryPoint.SwapReviewToggle })

    act(() => {
      const firstAttemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(firstAttemptId)
      result.current.logFailed({ error: new Error('failed'), attemptId: firstAttemptId })
      const secondAttemptId = result.current.logSubmitButtonClicked()
      result.current.logSubmitted(secondAttemptId)
    })

    expect(getEventCalls(EarnEventName.EarnSwapUpsellConverted)).toHaveLength(1)
  })
})
