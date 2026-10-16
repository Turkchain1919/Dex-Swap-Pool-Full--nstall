import { renderHook } from '@testing-library/react'
import { useEarnAmountEntryAnalytics } from 'uniswap/src/features/earn/hooks/useEarnAmountEntryAnalytics'
import { EarnEventName } from 'uniswap/src/features/telemetry/constants/features'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import type { EarnAnalyticsBaseProperties } from 'uniswap/src/features/telemetry/types'

vi.mock('uniswap/src/features/telemetry/send', () => ({
  sendAnalyticsEvent: vi.fn(),
}))

const mockSendAnalyticsEvent = vi.mocked(sendAnalyticsEvent)

const BASE_PROPERTIES: EarnAnalyticsBaseProperties = {
  surface: 'web',
  entry_point: 'global_modal',
  vault_id: '1-0xvault',
  vault_address: '0xvault',
  vault_chain_id: 1,
  underlying_token_address: '0xunderlying',
  underlying_token_symbol: 'USDC',
  underlying_chain_id: 1,
  has_existing_position: false,
}

describe(useEarnAmountEntryAnalytics, () => {
  beforeEach(() => {
    mockSendAnalyticsEvent.mockClear()
  })

  it('logs every preset tap without emitting an amount entry itself', () => {
    const { result } = renderHook(() => useEarnAmountEntryAnalytics({ analyticsProperties: BASE_PROPERTIES }))

    result.current.logPresetSelected({ action: 'deposit', pct: 0.25 })
    result.current.logPresetSelected({ action: 'deposit', pct: 1 })

    // The call site sends Entered after the preset resolves to a non-zero amount.
    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(2)
    expect(mockSendAnalyticsEvent).toHaveBeenNthCalledWith(1, EarnEventName.EarnAmountPresetSelected, {
      ...BASE_PROPERTIES,
      action: 'deposit',
      preset_percent: 25,
    })
    expect(mockSendAnalyticsEvent).toHaveBeenNthCalledWith(2, EarnEventName.EarnAmountPresetSelected, {
      ...BASE_PROPERTIES,
      action: 'deposit',
      preset_percent: 100,
    })
  })

  it('logs a preset-attributed entry once when the call site reports the resolved amount', () => {
    const { result } = renderHook(() => useEarnAmountEntryAnalytics({ analyticsProperties: BASE_PROPERTIES }))

    result.current.logPresetSelected({ action: 'deposit', pct: 0.25 })
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'preset', pct: 0.25, value: '250' })
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '100' })

    const enteredCalls = mockSendAnalyticsEvent.mock.calls.filter(([name]) => name === EarnEventName.EarnAmountEntered)
    expect(enteredCalls).toHaveLength(1)
    expect(enteredCalls[0]?.[1]).toEqual({
      ...BASE_PROPERTIES,
      action: 'deposit',
      input_method: 'preset',
      preset_percent: 25,
    })
  })

  it('ignores zero and empty values so an unresolved preset cannot arm the dedup', () => {
    const { result } = renderHook(() => useEarnAmountEntryAnalytics({ analyticsProperties: BASE_PROPERTIES }))

    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'preset', pct: 1, value: '' })
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'preset', pct: 1, value: '0' })
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '100' })

    const enteredCalls = mockSendAnalyticsEvent.mock.calls.filter(([name]) => name === EarnEventName.EarnAmountEntered)
    expect(enteredCalls).toHaveLength(1)
    expect(enteredCalls[0]?.[1]).toEqual(expect.objectContaining({ input_method: 'manual' }))
  })

  it('logs manual entry once per action, even across repeated keystrokes', () => {
    const { result } = renderHook(() => useEarnAmountEntryAnalytics({ analyticsProperties: BASE_PROPERTIES }))

    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '100' })
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '100' })
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '100' })

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(1)
    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(EarnEventName.EarnAmountEntered, {
      ...BASE_PROPERTIES,
      action: 'deposit',
      input_method: 'manual',
      preset_percent: undefined,
    })
  })

  it('tracks first entry independently per action (mobile toggles deposit/withdraw in one screen)', () => {
    const { result } = renderHook(() => useEarnAmountEntryAnalytics({ analyticsProperties: BASE_PROPERTIES }))

    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '100' })
    result.current.logAmountEntered({ action: 'withdraw', inputMethod: 'manual', value: '50' })
    result.current.logAmountEntered({ action: 'withdraw', inputMethod: 'manual', value: '50' })

    const enteredCalls = mockSendAnalyticsEvent.mock.calls.filter(([name]) => name === EarnEventName.EarnAmountEntered)
    expect(enteredCalls).toHaveLength(2)
    expect(enteredCalls[0]?.[1]).toEqual(expect.objectContaining({ action: 'deposit' }))
    expect(enteredCalls[1]?.[1]).toEqual(expect.objectContaining({ action: 'withdraw' }))
  })

  it('does not re-log entry when a preset follows manual input', () => {
    const { result } = renderHook(() => useEarnAmountEntryAnalytics({ analyticsProperties: BASE_PROPERTIES }))

    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '100' })
    result.current.logPresetSelected({ action: 'deposit', pct: 0.5 })

    const eventNames = mockSendAnalyticsEvent.mock.calls.map(([name]) => name)
    expect(eventNames).toEqual([EarnEventName.EarnAmountEntered, EarnEventName.EarnAmountPresetSelected])
  })

  it('defers a preset tap and its entry made before the properties resolve and flushes both once', () => {
    const { result, rerender } = renderHook(
      (props: { analyticsProperties: EarnAnalyticsBaseProperties | undefined }) => useEarnAmountEntryAnalytics(props),
      { initialProps: { analyticsProperties: undefined as EarnAnalyticsBaseProperties | undefined } },
    )

    // Cold open: the user taps Max before the position query resolves.
    result.current.logPresetSelected({ action: 'deposit', pct: 1 })
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'preset', pct: 1, value: '250' })
    expect(mockSendAnalyticsEvent).not.toHaveBeenCalled()

    rerender({ analyticsProperties: BASE_PROPERTIES })

    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(2)
    expect(mockSendAnalyticsEvent).toHaveBeenNthCalledWith(1, EarnEventName.EarnAmountPresetSelected, {
      ...BASE_PROPERTIES,
      action: 'deposit',
      preset_percent: 100,
    })
    expect(mockSendAnalyticsEvent).toHaveBeenNthCalledWith(2, EarnEventName.EarnAmountEntered, {
      ...BASE_PROPERTIES,
      action: 'deposit',
      input_method: 'preset',
      preset_percent: 100,
    })

    // A later rerender must not flush again. The flushed entry armed the dedup.
    rerender({ analyticsProperties: { ...BASE_PROPERTIES } })
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '100' })
    expect(mockSendAnalyticsEvent).toHaveBeenCalledTimes(2)
  })

  it('does not queue zero-value gated entries', () => {
    const { result, rerender } = renderHook(
      (props: { analyticsProperties: EarnAnalyticsBaseProperties | undefined }) => useEarnAmountEntryAnalytics(props),
      { initialProps: { analyticsProperties: undefined as EarnAnalyticsBaseProperties | undefined } },
    )

    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'preset', pct: 1, value: '0' })
    rerender({ analyticsProperties: BASE_PROPERTIES })

    expect(mockSendAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('is a no-op without analytics properties', () => {
    const { result } = renderHook(() => useEarnAmountEntryAnalytics({ analyticsProperties: undefined }))

    result.current.logPresetSelected({ action: 'deposit', pct: 0.25 })
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '100' })

    expect(mockSendAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('flushes the first gated entry per action and dedups later live entries against it', () => {
    const initialProps: { analyticsProperties: EarnAnalyticsBaseProperties | undefined } = {
      analyticsProperties: undefined,
    }
    const { result, rerender } = renderHook(
      (props: { analyticsProperties: EarnAnalyticsBaseProperties | undefined }) => useEarnAmountEntryAnalytics(props),
      { initialProps },
    )

    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '100' })
    // The queue keeps only the first gated entry for each action.
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'preset', pct: 0.5, value: '50' })
    expect(mockSendAnalyticsEvent).not.toHaveBeenCalled()

    rerender({ analyticsProperties: BASE_PROPERTIES })
    result.current.logAmountEntered({ action: 'deposit', inputMethod: 'manual', value: '150' })

    expect(mockSendAnalyticsEvent).toHaveBeenCalledOnce()
    expect(mockSendAnalyticsEvent).toHaveBeenCalledWith(
      EarnEventName.EarnAmountEntered,
      expect.objectContaining({ ...BASE_PROPERTIES, action: 'deposit', input_method: 'manual' }),
    )
  })
})
