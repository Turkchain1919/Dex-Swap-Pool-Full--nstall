/**
 * Native entry for the tooltip compat — a REAL leg since INFRA-3514 (the
 * throwing stub INFRA-3021 deferred it behind is gone). `TooltipCompat`
 * renders the legacy native contract (Root/Trigger pass children through,
 * Content/Arrow render null — see TooltipCompat.native.tsx); the className
 * compilers and platform-neutral values re-export the same pure modules as
 * the web leg, so the export surfaces stay identical and compiled output can
 * never drift. Keep the export list in sync with index.ts / index.web.ts.
 */
export {
  mapTooltipDelay,
  TOOLTIP_CONTENT_FRAME_DEFAULTS,
  TOOLTIP_DEFAULT_DELAY,
  TOOLTIP_DEFAULT_OFFSET,
  TOOLTIP_DEFAULT_REST_MS,
  tooltipArrowCompatClassName,
  tooltipArrowInnerCompatClassName,
  tooltipContentCompatClassName,
  tooltipContentFrameClassName,
  tooltipMotionClasses,
} from './compile'
export type {
  PopoverCompatOffset,
  PopoverCompatPlacement,
  TooltipAnimationDirection,
  TooltipArrowCompatProps,
  TooltipCompatConfigContextValue,
  TooltipCompatDelay,
  TooltipCompatProps,
  TooltipCompatTriggerProps,
  TooltipContentCompatProps,
  TooltipContentOwnProps,
  TooltipRootInertProps,
} from './props'
export { TooltipCompat, TooltipCompatConfigContext } from './TooltipCompat.native'
