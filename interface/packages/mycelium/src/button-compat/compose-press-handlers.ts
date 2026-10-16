/**
 * Composes the consumer's press handler with a separately-supplied `onClick`
 * into the ONE handler the web leg attaches (INFRA-3511).
 *
 * Why both must run: on web, `Trace` (utilities/src/telemetry/trace) logs a
 * press by clone-injecting an `onClick` onto its child — so an
 * analytics-wrapped Button receives the consumer's `onPress` AND an injected
 * `onClick`, and keeping only one (`onPress ?? onClick`) silently drops the
 * analytics call: the button works, clicks never report. Legacy Button never
 * had this problem because Tamagui folds `onClick` and `onPress` into a single
 * composed DOM click handler (@tamagui/web createComponent getWebEvents).
 *
 * Semantics, pinned by ./trace-press-compose.test.tsx (DOM-level parity,
 * including ordering and preventDefault/stopPropagation) and
 * ./compose-press-handlers.test.ts (direct unit tests, including the
 * throw/rethrow case and the undefined-handler identity passthroughs):
 * - Both handlers always run, exactly once, on the same event object — even
 *   if the consumer handler throws, so a throwing handler can't silently
 *   drop the injected `onClick` (the same analytics-loss shape this PR
 *   exists to fix). The consumer's exception still propagates afterward
 *   (via `finally`, not a catch) — it is surfaced, never swallowed.
 * - `preventDefault()`/`stopPropagation()` in one handler does NOT suppress
 *   the other — matching legacy, whose composed handler calls both back to
 *   back with no `defaultPrevented` check.
 * - Order is consumer handler first, then `onClick`. NOTE this is the ruling's
 *   order (the consumer's intent runs before instrumentation), which is the
 *   REVERSE of legacy Tamagui (`onClick?.(e), onPress?.(e)`). Observable only
 *   when a handler throws or reads state the other mutates; the tests pin it.
 */
import type { ButtonPressHandler, WebButtonPressEvent } from './press-handler'

type WebComposablePressHandler = ButtonPressHandler | ((event: WebButtonPressEvent) => void)

export function composeWebPressHandlers(
  consumerHandler: WebComposablePressHandler | undefined,
  injectedOnClick: WebComposablePressHandler | undefined,
): ((event: WebButtonPressEvent) => void) | undefined {
  if (!consumerHandler || !injectedOnClick) {
    return consumerHandler ?? injectedOnClick
  }
  return (event: WebButtonPressEvent): void => {
    // finally (not try/catch) so a throwing consumer handler still runs the
    // injected onClick, but the exception still propagates afterward.
    try {
      consumerHandler(event)
    } finally {
      injectedOnClick(event)
    }
  }
}

/**
 * Resolves the ONE click handler `ButtonCompat.web` attaches:
 * - enabled → the consumer's `onPress` composed with the (Trace-injectable) `onClick`
 * - disabled but interactive (`onDisabledPress` present) → `onDisabledPress` composed with `onClick`
 * - fully disabled → `undefined`: legacy attaches no events at all on a disabled frame.
 * Lives here rather than inline in ButtonCompat.web.tsx for the oxlint `max-lines`
 * cap — the same pressure that extracted ./compile and ./native-props.
 */
export function resolveWebButtonClickHandler({
  isDisabled,
  onPress,
  onClick,
  onDisabledPress,
}: {
  isDisabled: boolean
  onPress?: WebComposablePressHandler
  onClick?: WebComposablePressHandler
  onDisabledPress?: WebComposablePressHandler
}): ((event: WebButtonPressEvent) => void) | undefined {
  if (isDisabled) {
    return onDisabledPress ? composeWebPressHandlers(onDisabledPress, onClick) : undefined
  }
  return composeWebPressHandlers(onPress, onClick)
}
