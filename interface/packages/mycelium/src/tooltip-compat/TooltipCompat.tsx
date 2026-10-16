/**
 * `tsc` has no platform-extension resolution, so this base leg is what every
 * platformless consumer typechecks against: components restate the web leg's
 * exact value types (`forwardRef` where the web leg forwards refs), and the
 * config context stays real — pure data, not a throw — via the shared
 * `TOOLTIP_DEFAULT_CONFIG` all three legs reference.
 */
import { PlatformSplitStubError } from '@universe/environment'
import * as React from 'react'
import { TOOLTIP_DEFAULT_CONFIG } from './compile'
import type {
  TooltipArrowCompatProps,
  TooltipCompatConfigContextValue,
  TooltipCompatProps,
  TooltipCompatTriggerProps,
  TooltipContentCompatProps,
} from './props'

export const TooltipCompatConfigContext = React.createContext<TooltipCompatConfigContextValue>(TOOLTIP_DEFAULT_CONFIG)

function TooltipCompatRoot(_props: TooltipCompatProps): React.JSX.Element {
  throw new PlatformSplitStubError('TooltipCompat')
}

const TooltipCompatTrigger = React.forwardRef<HTMLDivElement, TooltipCompatTriggerProps>((): React.JSX.Element => {
  throw new PlatformSplitStubError('TooltipCompat.Trigger')
})
TooltipCompatTrigger.displayName = 'TooltipCompat.Trigger'

const TooltipCompatContent = React.forwardRef<HTMLDivElement, TooltipContentCompatProps>((): React.JSX.Element => {
  throw new PlatformSplitStubError('TooltipCompat.Content')
})
TooltipCompatContent.displayName = 'TooltipCompat.Content'

const TooltipCompatArrow = React.forwardRef<HTMLDivElement, TooltipArrowCompatProps>((): React.JSX.Element => {
  throw new PlatformSplitStubError('TooltipCompat.Arrow')
})
TooltipCompatArrow.displayName = 'TooltipCompat.Arrow'

export const TooltipCompat = Object.assign(TooltipCompatRoot, {
  Trigger: TooltipCompatTrigger,
  Content: TooltipCompatContent,
  Arrow: TooltipCompatArrow,
})
