import type { TooltipCompatProps as TooltipProps } from '@universe/mycelium/tooltip-compat'
import { ReactNode } from 'react'

export type InfoTooltipProps = {
  title?: string
  text: ReactNode
  icon?: Maybe<JSX.Element>
  button?: ReactNode
  trigger: ReactNode
  triggerPlacement?: 'start' | 'end'
  maxWidth?: number
  /** By default, tooltip will automatically open/close on hover. Set this prop to manually control open/close. */
  open?: boolean
  enabled?: boolean
  onOpenChange?: (isOpen: boolean) => void
} & Pick<TooltipProps, 'placement'>
