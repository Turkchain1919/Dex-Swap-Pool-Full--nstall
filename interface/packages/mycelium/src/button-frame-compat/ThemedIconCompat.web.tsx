/**
 * WEB legs of `ThemedIconCompat` / `ThemedSpinnerCompat` — the rebuilt legacy
 * `ThemedIcon` / `ThemedSpinningLoader` (INFRA-3315), on the parity-proven
 * ButtonCompat mechanism: a wrapper box carrying the state color classes,
 * the glyph themed by CSS `color` inheritance (`currentColor`) and sized via
 * `[&_svg]:size-*`. A glyph's own explicit `color` prop still wins — it lands
 * on the element itself, beating inheritance.
 *
 * `typeOfButton: 'icon'` swaps the box to the `$icon.16/20/24` sizes
 * (legacy `useIconSizes`' IconButton lane); the size override is merged after
 * the button-size class so tailwind-merge resolves the conflict.
 */
import { type JSX } from 'react'
import {
  buttonCompatIconClassName,
  buttonCompatSpinnerClassName,
  getContrastTextClass,
  ICON_SIZE_PX,
  SPINNER_SIZE,
} from '../button-compat/compile'
import { cn } from '../cn'
import { cloneGlyphBox, isIconGlyph } from '../compat/primitive-marker'
import { ICON_BUTTON_ICON_SIZE_CLASSES, ICON_BUTTON_ICON_SIZE_PX } from './compile'
import { useButtonFrameContext } from './context'
import { getMaybeHexOrRgbColor } from './custom-color'
import type { ThemedIconCompatProps, ThemedSpinnerCompatProps } from './themed-icon-props'

export type { ThemedIconCompatProps, ThemedSpinnerCompatProps } from './themed-icon-props'

function useContentContext(props: ThemedSpinnerCompatProps): {
  variant: NonNullable<ThemedIconCompatProps['variant']>
  emphasis: NonNullable<ThemedIconCompatProps['emphasis']>
  size: NonNullable<ThemedIconCompatProps['size']>
  isDisabled: boolean
  customTextClass?: string
} {
  const ctx = useButtonFrameContext()
  const customBackground =
    getMaybeHexOrRgbColor(props['custom-background-color']) ??
    (props['custom-background-color'] === undefined ? ctx.customBackgroundColor : undefined)
  return {
    variant: props.variant ?? ctx.variant,
    emphasis: props.emphasis ?? ctx.emphasis,
    size: props.size ?? ctx.size,
    isDisabled: props.isDisabled ?? ctx.isDisabled,
    customTextClass: customBackground ? getContrastTextClass(customBackground) : undefined,
  }
}

export function ThemedIconCompat(props: ThemedIconCompatProps): JSX.Element | null {
  const ctx = useContentContext(props)
  const { children, className, typeOfButton } = props
  if (!children) {
    return null
  }
  const sizeOverride = typeOfButton === 'icon' ? ICON_BUTTON_ICON_SIZE_CLASSES[ctx.size] : undefined
  // A glyph's inline size beats the wrapper's `[&_svg]:size-*` class, so the box is
  // cloned on; a non-glyph child keeps the descendant-CSS path.
  const box = typeOfButton === 'icon' ? ICON_BUTTON_ICON_SIZE_PX[ctx.size] : ICON_SIZE_PX[ctx.size]
  const content = isIconGlyph(children.type) ? cloneGlyphBox(children, box) : children
  return <span className={cn(buttonCompatIconClassName({ ...ctx, className }), sizeOverride)}>{content}</span>
}

export function ThemedSpinnerCompat(props: ThemedSpinnerCompatProps): JSX.Element {
  const ctx = useContentContext(props)
  const size = props.typeOfButton === 'icon' ? ICON_BUTTON_ICON_SIZE_PX[ctx.size] : SPINNER_SIZE[ctx.size]
  return (
    <span className={buttonCompatSpinnerClassName(ctx)}>
      <svg className="sbtn-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.1"
        />
        <path d="M21 12C21 7.02944 16.9706 3 12 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  )
}
