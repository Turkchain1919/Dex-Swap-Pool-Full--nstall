import {
  ICON_BUTTON_ICON_SIZE_PX,
  ThemedIconCompat,
  type ThemedIconCompatProps,
} from '@universe/mycelium/button-frame-compat'
import { cloneElement } from 'react'

export type ThemedIconProps = ThemedIconCompatProps

// The button label's line height. Literal because mycelium's `ICON_SIZE_PX` has no public
// subpath export; the `'icon'` lane's table does, so that one is imported. The literal is
// pinned to the compat's own emission by `../../ButtonLabelIconSize.web.test.tsx`.
const BUTTON_LABEL_ICON_SIZE_PX: Record<NonNullable<ThemedIconCompatProps['size']>, number> = {
  xxsmall: 13.8,
  xsmall: 16.1,
  small: 16.1,
  medium: 20.7,
  large: 20.7,
}

// `createIcon` glyphs carry an inline `width`/`height` default and may bake a `defaultFill`,
// both of which beat `ThemedIconCompat`'s wrapper classes; cloning restores the legacy
// precedence, where a caller's `color` on the glyph wins but its `size` does not.
export function ThemedIcon(props: ThemedIconProps): JSX.Element | null {
  const { children, size = 'medium', typeOfButton } = props

  if (!children) {
    return null
  }

  const box = typeOfButton === 'icon' ? ICON_BUTTON_ICON_SIZE_PX[size] : BUTTON_LABEL_ICON_SIZE_PX[size]
  const childColor = (children.props as { color?: unknown } | undefined)?.color

  return (
    <ThemedIconCompat {...props}>
      {cloneElement(children, { color: childColor ?? 'currentColor', width: box, height: box })}
    </ThemedIconCompat>
  )
}
