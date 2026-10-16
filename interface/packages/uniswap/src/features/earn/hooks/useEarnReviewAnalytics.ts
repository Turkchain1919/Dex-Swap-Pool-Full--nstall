import { type Currency } from '@uniswap/sdk-core'
import { TradingApi, type ChainedQuoteResponse } from '@universe/api'
import type { UniverseChainId } from '@universe/chains'
import { useCallback, useMemo, useRef } from 'react'
import {
  EarnEntryPoint,
  EarnSwapUpsellSurface,
  getEarnVaultAnalyticsProperties,
  getProjectedMonthlyEarningsUsd,
  logEarnSwapUpsellConverted,
  logEarnTransactionEvent,
} from 'uniswap/src/features/earn/analytics'
import { EarnPlanPriceChangeError } from 'uniswap/src/features/earn/planExecution'
import type { EarnPositionInfo, EarnVaultInfo } from 'uniswap/src/features/earn/types'
import type {
  EarnAnalyticsAction,
  EarnAnalyticsEntryPoint,
  EarnAnalyticsSurface,
  EarnTransactionAnalyticsProperties,
} from 'uniswap/src/features/telemetry/types'
import type {
  PlanFailureCallbackContext,
  PlanFinalizedCallbackParams,
} from 'uniswap/src/features/transactions/swap/plan/types'
import { TransactionStatus } from 'uniswap/src/features/transactions/types/transactionDetails'
import { createTransactionId } from 'uniswap/src/utils/createTransactionId'
import { getCurrencyAddressForAnalytics } from 'uniswap/src/utils/currencyId'

const MAX_ANALYTICS_ERROR_NAME_LENGTH = 128
const MAX_ANALYTICS_ERROR_MESSAGE_LENGTH = 500

function getBoundedErrorString(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined
  }
  // Sanitize before bounding: provider messages embed request arguments (viem on later lines,
  // ethers as inline hex blobs) — keep the first line and elide long hex runs so addresses and
  // calldata never reach the analytics sink through any error-string field.
  const sanitized = value.split('\n', 1)[0]?.replace(/0x[0-9a-fA-F]{8,}/g, '0x…')
  if (!sanitized) {
    return undefined
  }
  return sanitized.length <= maxLength ? sanitized : sanitized.slice(0, maxLength)
}

function getQuoteGasFeeUsd(quote: ChainedQuoteResponse | undefined): string | undefined {
  // Generated types use gasFeeUSD; live REST chained quotes can return gasFeeUsd.
  return (
    quote?.quote.gasFeeUSD ??
    (quote?.quote as (ChainedQuoteResponse['quote'] & { gasFeeUsd?: string }) | undefined)?.gasFeeUsd
  )
}

function getSwapUpsellSurfaceForEntryPoint(
  entryPoint: EarnAnalyticsEntryPoint,
): (typeof EarnSwapUpsellSurface)[keyof typeof EarnSwapUpsellSurface] | undefined {
  if (entryPoint === EarnEntryPoint.SwapReviewToggle) {
    return EarnSwapUpsellSurface.Toggle
  }
  if (entryPoint === EarnEntryPoint.PostSwapUpsellToast) {
    return EarnSwapUpsellSurface.Toast
  }
  return undefined
}

function getFinalizationFallbackReason({
  status,
  stepStatus,
}: {
  status: TransactionStatus | undefined
  stepStatus: TradingApi.PlanStepStatus | undefined
}): EarnFailureAnalyticsProperties['failure_reason'] {
  if (stepStatus === TradingApi.PlanStepStatus.STEP_ERROR) {
    return 'plan_step_failed'
  }
  if (status === TransactionStatus.Canceled) {
    // A canceled plan is not evidence of an on-chain failure. Exclude it from error-rate queries.
    return 'plan_cancelled'
  }
  if (!isFinalizedFailureStatus(status)) {
    // Undefined or non-terminal: the watch ended without an on-chain verdict.
    return 'finalization_unresolved'
  }
  return 'plan_finalized_failed'
}

function isFinalizedFailureStatus(status: TransactionStatus | undefined): boolean {
  return (
    status === TransactionStatus.Canceled ||
    status === TransactionStatus.Expired ||
    status === TransactionStatus.Failed ||
    status === TransactionStatus.FailedCancel ||
    status === TransactionStatus.InsufficientFunds
  )
}

type EarnFailureAnalyticsProperties = Pick<
  EarnTransactionAnalyticsProperties,
  | 'attempt_id'
  | 'error_message'
  | 'error_name'
  | 'failure_duration_ms'
  | 'failure_phase'
  | 'failure_reason'
  | 'plan_id'
  | 'step_status'
>

function getFailureClassification({
  error,
  isPreSubmissionFailure,
  willFinalize,
}: {
  error: Error | undefined
  isPreSubmissionFailure: boolean
  willFinalize: boolean
}): {
  failurePhase: EarnFailureAnalyticsProperties['failure_phase']
  failureReason: EarnFailureAnalyticsProperties['failure_reason']
} {
  if (isPreSubmissionFailure) {
    return { failurePhase: 'validation', failureReason: 'pre_submission_interrupted' }
  }
  if (error instanceof EarnPlanPriceChangeError) {
    return {
      failurePhase: willFinalize ? 'execution' : 'init',
      failureReason: 'price_changed',
    }
  }
  if (willFinalize) {
    return { failurePhase: 'execution', failureReason: 'execution_error' }
  }
  return { failurePhase: 'init', failureReason: 'initialization_error' }
}

interface LogEarnFailureParams {
  error: Error | undefined
  context?: PlanFailureCallbackContext
  attemptId: string
}

function getFailureAnalyticsProperties({
  error,
  attemptedAt,
  attemptId,
  failurePhase,
  failureReason,
}: {
  error: Error | undefined
  attemptedAt: number
  attemptId: string
  failurePhase: EarnFailureAnalyticsProperties['failure_phase']
  failureReason: EarnFailureAnalyticsProperties['failure_reason']
}): EarnFailureAnalyticsProperties {
  return {
    attempt_id: attemptId,
    error_message: getBoundedErrorString(error?.message, MAX_ANALYTICS_ERROR_MESSAGE_LENGTH),
    error_name: getBoundedErrorString(error?.name, MAX_ANALYTICS_ERROR_NAME_LENGTH),
    failure_phase: failurePhase,
    failure_reason: failureReason,
    failure_duration_ms: Math.max(0, Date.now() - attemptedAt),
  }
}

interface EarnExecutionAttemptState {
  attemptedAt: number
  submittedAt: number | null
  pendingFailure: EarnFailureAnalyticsProperties | null
  terminalOutcome: 'completed' | 'failed' | null
}

export function useEarnReviewAnalytics({
  action,
  amountUsd,
  analyticsEntryPoint,
  analyticsSurface,
  destinationChainId,
  destinationCurrency,
  destinationTokenAddress,
  destinationTokenSymbol,
  originatingTransactionId,
  position,
  projectedMonthlyEarningsUsd,
  quote,
  sourceChainId,
  sourceCurrency,
  sourceUpsellCurrencyId,
  sourceTokenAddress,
  sourceTokenSymbol,
  swapAmountUsd,
  tokenAmount,
  underlyingTokenSymbol,
  vault,
  withdrawMode,
}: {
  action: EarnAnalyticsAction
  amountUsd: number
  analyticsEntryPoint: EarnAnalyticsEntryPoint
  analyticsSurface: EarnAnalyticsSurface
  destinationChainId?: UniverseChainId
  destinationCurrency?: Currency
  destinationTokenAddress?: string
  destinationTokenSymbol?: string
  originatingTransactionId?: string
  position?: EarnPositionInfo
  projectedMonthlyEarningsUsd?: number
  quote?: ChainedQuoteResponse
  sourceChainId?: UniverseChainId
  sourceCurrency?: Currency
  sourceUpsellCurrencyId?: string
  sourceTokenAddress?: string
  sourceTokenSymbol?: string
  swapAmountUsd?: number
  tokenAmount?: string
  underlyingTokenSymbol?: string
  vault: EarnVaultInfo
  withdrawMode?: string
}): {
  logFailed: ({ error, context, attemptId }: LogEarnFailureParams) => void
  logFinalized: (params: PlanFinalizedCallbackParams, attemptId: string) => void
  logReviewReady: () => void
  logSubmitButtonClicked: () => string
  logSubmitted: (attemptId: string) => void
  reviewedEventProperties: EarnTransactionAnalyticsProperties
} {
  const analyticsProperties = useMemo<EarnTransactionAnalyticsProperties>(
    () => ({
      ...getEarnVaultAnalyticsProperties({
        entryPoint: analyticsEntryPoint,
        position,
        surface: analyticsSurface,
        underlyingTokenSymbol,
        vault,
      }),
      action,
      amount_usd: amountUsd,
      token_amount: tokenAmount,
      source_chain_id: sourceChainId,
      destination_chain_id: destinationChainId,
      source_token_address: sourceCurrency ? getCurrencyAddressForAnalytics(sourceCurrency) : sourceTokenAddress,
      source_token_symbol: sourceCurrency?.symbol ?? sourceTokenSymbol,
      destination_token_address: destinationCurrency
        ? getCurrencyAddressForAnalytics(destinationCurrency)
        : destinationTokenAddress,
      destination_token_symbol: destinationCurrency?.symbol ?? destinationTokenSymbol,
      estimated_network_fee_usd: getQuoteGasFeeUsd(quote),
      request_id: quote?.requestId,
      quote_id: quote?.quote.quoteId,
      withdraw_mode: withdrawMode,
    }),
    [
      action,
      amountUsd,
      analyticsEntryPoint,
      analyticsSurface,
      destinationChainId,
      destinationCurrency,
      destinationTokenAddress,
      destinationTokenSymbol,
      position,
      quote,
      sourceChainId,
      sourceCurrency,
      sourceTokenAddress,
      sourceTokenSymbol,
      tokenAmount,
      underlyingTokenSymbol,
      vault,
      withdrawMode,
    ],
  )
  const attemptsRef = useRef<Map<string, EarnExecutionAttemptState>>(new Map())
  const hasLoggedReviewReadyRef = useRef(false)
  const hasLoggedUpsellConversionRef = useRef(false)

  const logReviewReady = useCallback((): void => {
    if (hasLoggedReviewReadyRef.current) {
      return
    }

    hasLoggedReviewReadyRef.current = true
    logEarnTransactionEvent({ action, status: 'review_ready', properties: analyticsProperties })
  }, [action, analyticsProperties])

  const logSubmitButtonClicked = useCallback((): string => {
    const attemptId = createTransactionId()
    attemptsRef.current.set(attemptId, {
      attemptedAt: Date.now(),
      submittedAt: null,
      pendingFailure: null,
      terminalOutcome: null,
    })
    logEarnTransactionEvent({
      action,
      status: 'submit_button_clicked',
      properties: { ...analyticsProperties, attempt_id: attemptId },
    })

    return attemptId
  }, [action, analyticsProperties])

  const logSubmitted = useCallback(
    (attemptId: string): void => {
      const attempt = attemptsRef.current.get(attemptId)
      if (!attempt || attempt.terminalOutcome || attempt.submittedAt !== null) {
        return
      }

      attempt.submittedAt = Date.now()
      logEarnTransactionEvent({
        action,
        status: 'submitted',
        properties: { ...analyticsProperties, attempt_id: attemptId },
      })

      if (action === 'deposit' && !hasLoggedUpsellConversionRef.current) {
        const swapUpsellSurface = getSwapUpsellSurfaceForEntryPoint(analyticsEntryPoint)
        if (swapUpsellSurface) {
          // Retries are new attempts, but one upsell can only convert once.
          hasLoggedUpsellConversionRef.current = true
          logEarnSwapUpsellConverted({
            ...analyticsProperties,
            output_currency_id: sourceUpsellCurrencyId,
            projected_monthly_earnings_usd:
              projectedMonthlyEarningsUsd ??
              getProjectedMonthlyEarningsUsd({
                amountUsd: swapAmountUsd ?? amountUsd,
                apyPercent: vault.apyPercent,
              }),
            source_upsell_currency_id: sourceUpsellCurrencyId,
            swap_amount_usd: swapAmountUsd ?? amountUsd,
            swap_upsell_surface: swapUpsellSurface,
            transaction_id: originatingTransactionId,
          })
        }
      }
    },
    [
      action,
      amountUsd,
      analyticsEntryPoint,
      analyticsProperties,
      originatingTransactionId,
      projectedMonthlyEarningsUsd,
      sourceUpsellCurrencyId,
      swapAmountUsd,
      vault.apyPercent,
    ],
  )

  const logFailed = useCallback(
    ({ error, context, attemptId }: LogEarnFailureParams): void => {
      const attempt = attemptsRef.current.get(attemptId)
      if (!attempt) {
        return
      }
      if (attempt.terminalOutcome) {
        return
      }

      const isPreSubmissionFailure = attempt.submittedAt === null
      const failureClassification = getFailureClassification({
        error,
        isPreSubmissionFailure,
        willFinalize: context?.willFinalize === true,
      })
      const errorProperties = getFailureAnalyticsProperties({
        error,
        attemptedAt: attempt.attemptedAt,
        attemptId,
        ...failureClassification,
      })
      // Park only after submission and only when the saga promises a finalization callback.
      if (!isPreSubmissionFailure && context?.willFinalize === true) {
        attempt.pendingFailure = errorProperties
        return
      }

      attempt.terminalOutcome = 'failed'
      attempt.pendingFailure = null
      logEarnTransactionEvent({
        action,
        status: 'failed',
        properties: {
          ...analyticsProperties,
          ...errorProperties,
        },
      })
    },
    [action, analyticsProperties],
  )

  const logFinalized = useCallback(
    // Use the callback's own attempt id. A late finalization must not apply to a newer attempt.
    (params: PlanFinalizedCallbackParams, attemptId: string): void => {
      const attempt = attemptsRef.current.get(attemptId)
      if (!attempt || attempt.terminalOutcome) {
        return
      }

      const { planId, status } = params
      const finalizedProperties = {
        ...analyticsProperties,
        plan_id: planId,
        attempt_id: attemptId,
        ...(params.stepStatus ? { step_status: params.stepStatus } : {}),
      }

      if (status === TransactionStatus.Success) {
        attempt.terminalOutcome = 'completed'
        attempt.pendingFailure = null
        logEarnTransactionEvent({ action, status: 'completed', properties: finalizedProperties })
        return
      }

      // onPlanFinalized is the saga's one verdict for this attempt. A non-terminal status
      // with no failure evidence still ends the watch, so record the attempt as unresolved
      // instead of leaving it open forever.
      const pendingFailure = attempt.pendingFailure
      attempt.terminalOutcome = 'failed'
      attempt.pendingFailure = null
      const failureProperties =
        pendingFailure ??
        ({
          attempt_id: attemptId,
          failure_phase: 'finalization',
          failure_reason: getFinalizationFallbackReason({ status, stepStatus: params.stepStatus }),
          failure_duration_ms: Math.max(0, Date.now() - attempt.attemptedAt),
        } satisfies EarnFailureAnalyticsProperties)
      logEarnTransactionEvent({
        action,
        status: 'failed',
        properties: {
          ...failureProperties,
          ...finalizedProperties,
        },
      })
    },
    [action, analyticsProperties],
  )

  return {
    logFailed,
    logFinalized,
    logReviewReady,
    logSubmitButtonClicked,
    logSubmitted,
    reviewedEventProperties: analyticsProperties,
  }
}
