/**
 * The public prop contract of `ButtonFrameCompat` — the rebuilt legacy
 * `CustomButtonFrame` surface: the closed variant props (`ButtonVariantProps`
 * in ui/src Button/types.ts) over the full open compat style surface
 * (`./compile` `ButtonFrameOpenProps`), plus raw `data-*` passthrough.
 *
 * `tsc` has no platform-extension resolution, so this (via the base stub) is
 * what every consumer typechecks against — the ButtonCompat strategy. The
 * native leg declares RN handler divergences in `./native-props`.
 */
import type * as React from 'react'
import type { ColorValue } from '../compat/props'
import type {
  ButtonEmphasis,
  ButtonFocusScaling,
  ButtonFrameOpenProps,
  ButtonIconPosition,
  ButtonSize,
  ButtonVariant,
} from './compile'

/** Legacy `ButtonVariantProps` + the frame-only custom props. */
export interface ButtonFrameVariantProps {
  size?: ButtonSize
  variant?: ButtonVariant
  emphasis?: ButtonEmphasis
  /** Stretch to fill the parent (legacy default: true). */
  fill?: boolean
  focusScaling?: ButtonFocusScaling
  iconPosition?: ButtonIconPosition
  /**
   * Styling-only disabled state (legacy split: `disabled` detaches
   * interaction, `isDisabled` paints the disabled cell — see
   * ui/src Button/types.ts for why they are distinct).
   */
  isDisabled?: boolean
  /** Threaded to label/icon for contrast when the button has a custom background. */
  'custom-background-color'?: ColorValue
  /** Custom focus-outline color for custom-background buttons. */
  'primary-color'?: string
  /** Keeps the button interactive while showing the disabled styling. */
  onDisabledPress?: (event: React.MouseEvent<HTMLElement>) => void
  /** Datadog action name, rendered as a DOM attribute. */
  'dd-action-name'?: string
}

export type ButtonFrameCompatProps = ButtonFrameOpenProps &
  ButtonFrameVariantProps & {
    [key: `data-${string}`]: string | number | boolean | undefined
  }
