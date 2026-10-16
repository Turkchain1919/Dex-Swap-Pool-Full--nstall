import type {
  TooltipArrowProps,
  TooltipContentProps,
  TooltipProps,
  TooltipTriggerProps,
} from 'ui/src/components/tooltip/types'

export type {
  TooltipAnimationDirection,
  TooltipArrowProps,
  TooltipContentProps,
  TooltipDelay,
  TooltipOffset,
  TooltipPlacement,
  TooltipProps,
  TooltipTriggerProps,
} from 'ui/src/components/tooltip/types'

/**
 * Native leg: a zero-dependency pass-through/null compound matching the legacy contract
 * (the tamagui `Tooltip` re-export, whose v1.136.1 native build renders children for
 * Root/Trigger and null for Content/Arrow). NOT render-nothing: real mobile surfaces wrap
 * live UI in `Tooltip.Trigger` (e.g. the token selector's TokenGridTile), so Root and
 * Trigger keep rendering their children unchanged while the floating content stays
 * web-only.
 *
 * Describe that legacy re-export in prose, never as a literal import statement: the
 * tamagui-free ledger scans file text without stripping comments, so a quoted statement
 * taints this node.
 */
function TooltipRoot({ children }: TooltipProps): JSX.Element {
  return <>{children}</>
}

function TooltipTrigger({ children }: TooltipTriggerProps): JSX.Element {
  return <>{children}</>
}

function TooltipContent(_props: TooltipContentProps): null {
  return null
}

function TooltipArrow(_props: TooltipArrowProps): null {
  return null
}

export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Arrow: TooltipArrow,
})
