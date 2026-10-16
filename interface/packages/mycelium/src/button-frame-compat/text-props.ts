/**
 * Public prop contract of `ButtonTextCompat` (the rebuilt legacy
 * `CustomButtonText`): the closed selection props (context-overridable) over
 * the open compat Text style surface.
 */
import type { ReactNode } from 'react'
import type { ColorValue, CompatProps } from '../compat/props'
import type { TextCompatStyleProps } from '../text-compat/props'
import type { ButtonEmphasis, ButtonSize, ButtonVariant } from './compile'

// `variant` is omitted from the open Text surface because the legacy
// CustomButtonText's `variant` IS the button variant (styled() override), not
// text-compat's typography variant.
export type ButtonTextCompatProps = Omit<CompatProps<TextCompatStyleProps>, 'color' | 'variant'> & {
  variant?: ButtonVariant
  emphasis?: ButtonEmphasis
  size?: ButtonSize
  isDisabled?: boolean
  /** Hex/rgb pins the label color in every state; a theme token styles normally. */
  color?: ColorValue
  /** Contrast source when the parent button has a custom background. */
  'custom-background-color'?: ColorValue
  /** Legacy stringly-typed flag (`'true'`/`'false'`), kept for the existing call sites. */
  'line-height-disabled'?: string
  /** Drop the text line-height (languages with special characters). */
  lineHeightDisabled?: boolean
  children?: ReactNode
}
