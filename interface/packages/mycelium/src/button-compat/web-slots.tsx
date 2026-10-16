/**
 * WEB `Button.Icon` and the loading spinner, extracted from
 * `ButtonCompat.web.tsx` (oxlint `max-lines`) the same way `./web-text` and
 * `./web-dimensions` were. Imported only by the web leg — never from a
 * `.native.*` graph, like `../compat/dom.tsx`; the native leg keeps its own
 * copies inside `ButtonCompat.native.tsx`.
 */
import { useContext, type JSX } from 'react'
import { cloneGlyphBox, isIconGlyph } from '../compat/primitive-marker'
import { buttonCompatIconClassName, buttonCompatSpinnerClassName, ICON_SIZE_PX, SPINNER_SIZE } from './compile'
import { ButtonContext } from './web-text'

export interface ButtonIconProps {
  children?: JSX.Element
  className?: string
}

/**
 * Equivalent of legacy Button.Icon (ThemedIcon): auto-sized + auto-colored via currentColor.
 *
 * A `createIcon` glyph carries its size/color defaults on inline style, which beats
 * the wrapper's descendant CSS (`[&_svg]:size-*` + text color) — so a bare glyph child
 * is cloned: explicit `color` wins, otherwise `currentColor` (keeps the wrapper's
 * variant/emphasis/hover/disabled cascade live); `width`/`height` always take the
 * slot's box. Gated on `isIconGlyph` (either icon factory) and not the broader
 * `isMyceliumPrimitive`: a marked non-glyph wrapper like `FlexCompat` passed as `icon`
 * keeps the descendant-CSS path. Only the direct child is cloned, matching legacy.
 */
export function ButtonIcon({ children, className }: ButtonIconProps): JSX.Element | null {
  const ctx = useContext(ButtonContext)
  if (!children) {
    return null
  }
  const content = isIconGlyph(children.type) ? cloneGlyphBox(children, ICON_SIZE_PX[ctx.size]) : children
  return <span className={buttonCompatIconClassName({ ...ctx, className })}>{content}</span>
}

/** Ports ui/src/loading/SpinningLoader (unstyled) + the circle-spinner icon. */
export function ButtonSpinner(): JSX.Element {
  const ctx = useContext(ButtonContext)
  const size = SPINNER_SIZE[ctx.size]
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
