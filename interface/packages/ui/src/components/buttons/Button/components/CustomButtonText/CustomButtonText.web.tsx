import { ButtonTextCompat, type ButtonTextCompatProps } from '@universe/mycelium/button-frame-compat'
import { forwardRef, type ForwardedRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'

export type CustomButtonTextProps = ButtonTextCompatProps

// Defaulted ahead of the spread so a caller can still override it. A value above `1`
// emits the clamp classes but renders no second line (INFRA-3895).
function CustomButtonTextComponent(
  { numberOfLines = 1, ...props }: CustomButtonTextProps,
  ref: ForwardedRef<HTMLSpanElement>,
): JSX.Element {
  return <ButtonTextCompat ref={ref} numberOfLines={numberOfLines} {...props} />
}

// Explicit annotation: the inferred type names non-exported mycelium types (TS2883 under declaration emit).
export const CustomButtonText: ForwardRefExoticComponent<CustomButtonTextProps & RefAttributes<HTMLSpanElement>> =
  forwardRef(CustomButtonTextComponent)

CustomButtonText.displayName = 'CustomButtonText'
