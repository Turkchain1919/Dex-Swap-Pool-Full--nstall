import type { ComponentProps } from 'react'
import { ButtonProps, ButtonVariantProps } from 'ui/src/components/buttons/Button/types'
import type { RotatableChevron } from 'ui/src/components/icons'

export type DropdownButtonVariantProps = ButtonVariantProps & {
  isExpanded: boolean
}

/** Legacy `DropdownButtonFrame` styled()-extension prop: 'grouped' pairs the icon and label into one flex group instead of spacing them across the frame. Purely a `DropdownButton.tsx` layout decision; the frame itself does not style off it. */
export type DropdownButtonElementPositioning = 'equal' | 'grouped'

export type DropdownButtonProps = Omit<
  ButtonProps,
  'size' | 'iconPosition' | 'buttonType' | 'variant' | 'justifyContent' | 'loading'
> & {
  size?: Extract<ButtonProps['size'], 'small' | 'medium' | 'large'>
  isExpanded: DropdownButtonVariantProps['isExpanded']
  elementPositioning?: DropdownButtonElementPositioning
  /** Paints the trailing chevron independently of the label. Omit to inherit the emphasis text color. */
  chevronColor?: ComponentProps<typeof RotatableChevron>['color']
  /**
   * Sizes the trailing chevron. Omit to keep the glyph's own 24px default, which is what the frame
   * falls back to to since it carries no default `size` of its own.
   */
  chevronSize?: ComponentProps<typeof RotatableChevron>['size']
}
