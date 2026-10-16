/**
 * Native leg of the tooltip compat (INFRA-3514): a zero-dependency
 * pass-through/null compound matching the legacy native contract. The legacy
 * `ui/src` Tooltip on native re-exports Tamagui's Tooltip ("Tooltip is a noop
 * in native"), whose v1.136.1 native build renders children for Root/Trigger
 * and null for Content/Arrow — the same transcription the ui/src Tooltip
 * rebuild (#39355) ships. NOT render-nothing: real mobile surfaces wrap live UI in
 * `Tooltip.Trigger`, so Root and Trigger keep rendering their children
 * unchanged (style/behavior props are inert, exactly like the legacy no-op)
 * while the floating content stays web-only.
 *
 * The className compilers stay real on native via `./compile` — they are pure
 * string builders over the shared flex-compat compiler (the same modules
 * FlexCompat.native.tsx compiles through), so the web and native legs can
 * never drift on compiled output.
 */
import * as React from 'react'
import { TOOLTIP_DEFAULT_CONFIG } from './compile'
import type {
  TooltipArrowCompatProps,
  TooltipCompatConfigContextValue,
  TooltipCompatProps,
  TooltipCompatTriggerProps,
  TooltipContentCompatProps,
} from './props'

/**
 * Stand-in for the web config context (the real provider lives next to the
 * Base-UI-backed root, which cannot load on native). Content/Arrow render
 * null here, so nothing consumes it — it exists for export parity and carries
 * the shared `TOOLTIP_DEFAULT_CONFIG` like the web provider's fallback.
 */
export const TooltipCompatConfigContext = React.createContext<TooltipCompatConfigContextValue>(TOOLTIP_DEFAULT_CONFIG)

function TooltipCompatRoot({ children }: TooltipCompatProps): React.JSX.Element {
  return <>{children}</>
}

function TooltipCompatTrigger({ children }: TooltipCompatTriggerProps): React.JSX.Element {
  return <>{children}</>
}

function TooltipCompatContent(_props: TooltipContentCompatProps): null {
  return null
}

function TooltipCompatArrow(_props: TooltipArrowCompatProps): null {
  return null
}

export const TooltipCompat = Object.assign(TooltipCompatRoot, {
  Trigger: TooltipCompatTrigger,
  Content: TooltipCompatContent,
  Arrow: TooltipCompatArrow,
})
