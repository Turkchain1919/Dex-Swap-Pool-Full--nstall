// Root barrel, not a subpath: `icon-button-compat` is deliberately barrel-only in mycelium.
import { IconButton as IconButtonCompat, type IconButtonProps as IconButtonCompatProps } from '@universe/mycelium'
import { ICON_BUTTON_ICON_SIZE_PX } from '@universe/mycelium/button-frame-compat'
import { cloneElement, forwardRef, type ForwardedRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'

export type IconButtonProps = IconButtonCompatProps

// A `createIcon` glyph's inline `width`/`height`/`defaultFill` beat the compat's `[&_svg]` wrapper
// class, so the box and colour are cloned on, as `../Button/components/ThemedIcon.web.tsx` does.
function IconButtonComponent(
  { icon, size = 'medium', ...rest }: IconButtonProps,
  ref: ForwardedRef<HTMLElement>,
): JSX.Element {
  const box = ICON_BUTTON_ICON_SIZE_PX[size]
  const iconColor = (icon.props as { color?: unknown } | undefined)?.color

  return (
    <IconButtonCompat
      ref={ref}
      size={size}
      icon={cloneElement(icon, { color: iconColor ?? 'currentColor', width: box, height: box })}
      {...rest}
    />
  )
}

// Explicit annotation: the inferred type names non-exported mycelium types (TS2883 under declaration emit).
export const IconButton: ForwardRefExoticComponent<IconButtonProps & RefAttributes<HTMLElement>> =
  forwardRef(IconButtonComponent)

IconButton.displayName = 'IconButton'
