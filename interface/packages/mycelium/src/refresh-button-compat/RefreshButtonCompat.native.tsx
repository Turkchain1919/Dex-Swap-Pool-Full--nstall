import type { JSX } from 'react'
import type { RefreshButtonCompatProps } from './props'

/**
 * Native stub for the web-only RefreshButton compat (INFRA-3489). The native
 * leg is deliberately deferred — the sole repo consumer
 * (`packages/uniswap/src/features/portfolio/PortfolioBalance/PortfolioBalance.tsx`)
 * web-guards the render (`isWebPlatform`), so no native code path can reach
 * this component today. Throwing keeps an accidental native render loud
 * instead of silently rendering nothing (the TooltipCompat / INFRA-3021
 * precedent). Build a real native leg (legacy reference:
 * `ui/src/components/RefreshButton/RefreshButton.native.tsx`, the bare
 * animated icon without tooltip or keyboard shortcut) before removing any
 * consumer's web guard.
 */
export function RefreshButtonCompat(_props: RefreshButtonCompatProps): JSX.Element {
  throw new Error(
    'RefreshButtonCompat is web-only; the native leg is deferred (INFRA-3489) — its sole consumer web-guards the render.',
  )
}
