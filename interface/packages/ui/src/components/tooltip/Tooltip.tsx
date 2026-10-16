import type {
  TooltipArrowProps,
  TooltipContentProps,
  TooltipProps,
  TooltipTriggerProps,
} from 'ui/src/components/tooltip/types'
import { PlatformSplitStubError } from 'utilities/src/errors'

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

function TooltipStub(_props: TooltipProps): JSX.Element {
  throw new PlatformSplitStubError('Tooltip')
}

export const Tooltip = Object.assign(TooltipStub, {
  Trigger: (_props: TooltipTriggerProps): JSX.Element => {
    throw new PlatformSplitStubError('Tooltip.Trigger')
  },
  Content: (_props: TooltipContentProps): JSX.Element => {
    throw new PlatformSplitStubError('Tooltip.Content')
  },
  Arrow: (_props: TooltipArrowProps): JSX.Element => {
    throw new PlatformSplitStubError('Tooltip.Arrow')
  },
})
