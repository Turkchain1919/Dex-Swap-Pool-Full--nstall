import { useEffect, useRef } from 'react'
import { logEarnAmountEntered, logEarnAmountPresetSelected } from 'uniswap/src/features/earn/analytics'
import type {
  EarnAmountInputMethod,
  EarnAnalyticsAction,
  EarnAnalyticsBaseProperties,
} from 'uniswap/src/features/telemetry/types'
import { useEvent } from 'utilities/src/react/hooks'

// Presets arrive as fractions (0.25). Events send an integer percent (25).
// One conversion point keeps Preset Selected and Entered equal for the same tap.
function toPresetPercent(pct: number): number {
  return Math.round(pct * 100)
}

/**
 * Amount-entry analytics for the earn deposit and withdraw amount screens.
 *
 * Preset taps log on each press. Amount-entered logs only the first non-zero entry
 * for each action in a mount. Callers gate `analyticsProperties` while the position
 * query resolves. Gated preset taps and the first gated entry for each action go
 * into a queue and flush when the properties resolve. A live entry wins over a
 * queued one.
 */
export function useEarnAmountEntryAnalytics({
  analyticsProperties,
}: {
  analyticsProperties: EarnAnalyticsBaseProperties | undefined
}): {
  logPresetSelected: ({ action, pct }: { action: EarnAnalyticsAction; pct: number }) => void
  logAmountEntered: ({
    action,
    inputMethod,
    pct,
    value,
  }: {
    action: EarnAnalyticsAction
    inputMethod: EarnAmountInputMethod
    pct?: number
    value: string
  }) => void
} {
  const enteredActionsRef = useRef<Set<EarnAnalyticsAction>>(new Set())
  const pendingPresetsRef = useRef<{ action: EarnAnalyticsAction; pct: number }[]>([])
  const pendingEnteredRef = useRef<Map<EarnAnalyticsAction, { inputMethod: EarnAmountInputMethod; pct?: number }>>(
    new Map(),
  )

  useEffect(() => {
    if (!analyticsProperties || (pendingPresetsRef.current.length === 0 && pendingEnteredRef.current.size === 0)) {
      return
    }
    // Flush queued events. Presets go first to keep the live event order.
    const pendingPresets = pendingPresetsRef.current
    pendingPresetsRef.current = []
    for (const { action, pct } of pendingPresets) {
      logEarnAmountPresetSelected({
        ...analyticsProperties,
        action,
        preset_percent: toPresetPercent(pct),
      })
    }
    const pendingEntered = pendingEnteredRef.current
    pendingEnteredRef.current = new Map()
    for (const [action, { inputMethod, pct }] of pendingEntered) {
      // A live entry armed the dedup first. Skip the stale queued entry.
      if (enteredActionsRef.current.has(action)) {
        continue
      }
      enteredActionsRef.current.add(action)
      logEarnAmountEntered({
        ...analyticsProperties,
        action,
        input_method: inputMethod,
        preset_percent: pct === undefined ? undefined : toPresetPercent(pct),
      })
    }
  }, [analyticsProperties])

  const logAmountEntered = useEvent(
    ({
      action,
      inputMethod,
      pct,
      value,
    }: {
      action: EarnAnalyticsAction
      inputMethod: EarnAmountInputMethod
      pct?: number
      value: string
    }): void => {
      // Zero and empty values are not an entry and must not arm the dedup.
      if (!(Number(value) > 0) || enteredActionsRef.current.has(action)) {
        return
      }
      if (!analyticsProperties) {
        // Keep only the first gated entry for each action.
        if (!pendingEnteredRef.current.has(action)) {
          pendingEnteredRef.current.set(action, { inputMethod, pct })
        }
        return
      }

      pendingEnteredRef.current.delete(action)
      enteredActionsRef.current.add(action)
      logEarnAmountEntered({
        ...analyticsProperties,
        action,
        input_method: inputMethod,
        preset_percent: pct === undefined ? undefined : toPresetPercent(pct),
      })
    },
  )

  const logPresetSelected = useEvent(({ action, pct }: { action: EarnAnalyticsAction; pct: number }): void => {
    if (!analyticsProperties) {
      pendingPresetsRef.current.push({ action, pct })
      return
    }

    logEarnAmountPresetSelected({
      ...analyticsProperties,
      action,
      preset_percent: toPresetPercent(pct),
    })
  })

  return { logPresetSelected, logAmountEntered }
}
