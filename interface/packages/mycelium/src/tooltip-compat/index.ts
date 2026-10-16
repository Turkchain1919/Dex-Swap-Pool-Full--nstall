/**
 * Keep the `TooltipCompat` re-export below extensionless — an explicit `.tsx`
 * specifier defeats `.web`-priority bundler resolution and silently pins
 * production consumers to the throwing stub (this happened before and broke
 * real apps/web and apps/extension consumers, not just this package's tests).
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
export { TooltipCompat, TooltipCompatConfigContext } from './TooltipCompat'
