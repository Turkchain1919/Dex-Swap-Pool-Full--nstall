import type {
  PopoverAdaptContentsProps,
  PopoverAdaptProps,
  PopoverAnchorProps,
  PopoverArrowProps,
  PopoverCloseProps,
  PopoverTriggerProps,
} from 'ui/src/components/popover/types'
import { PlatformSplitStubError } from 'utilities/src/errors'

/**
 * Platform-split base stubs for the rebuilt Popover's parts (INFRA-3318) —
 * bundlers resolve `PopoverInternal.web` / `PopoverInternal.native`.
 */

export function PopoverTrigger(_props: PopoverTriggerProps): JSX.Element {
  throw new PlatformSplitStubError('PopoverTrigger')
}

export function PopoverAnchor(_props: PopoverAnchorProps): JSX.Element {
  throw new PlatformSplitStubError('PopoverAnchor')
}

export function PopoverClose(_props: PopoverCloseProps): JSX.Element {
  throw new PlatformSplitStubError('PopoverClose')
}

export function PopoverArrow(_props: PopoverArrowProps): JSX.Element {
  throw new PlatformSplitStubError('PopoverArrow')
}

function PopoverAdaptRoot(_props: PopoverAdaptProps): JSX.Element {
  throw new PlatformSplitStubError('PopoverAdapt')
}

function PopoverAdaptContents(_props: PopoverAdaptContentsProps): JSX.Element {
  throw new PlatformSplitStubError('PopoverAdapt.Contents')
}

export const PopoverAdapt = Object.assign(PopoverAdaptRoot, { Contents: PopoverAdaptContents })
