/**
 * WEB `Button.Text` plus the styled-context channel, extracted from
 * `ButtonCompat.web.tsx` (oxlint `max-lines`) when the INFRA-3550 styled
 * surface landed. Imported only by the web leg — never from a `.native.*`
 * graph, like `../compat/dom.tsx`.
 *
 * Composition mirrors `../button-frame-compat/ButtonTextCompat.web.tsx` (the
 * rebuilt CustomButtonText):
 *
 *  1. the CLOSED cell via `./compile`'s `buttonCompatTextClassName` —
 *     byte-identical to the parity-proven label whenever no styled prop is
 *     set (`web-class-pin.test.tsx` digests the whole DOM);
 *  2. the OPEN scoped surface (`./text-props`) through the
 *     deterministic-emission engine with the shared Text style compiler,
 *     merged after the cell so a caller prop beats it — Tamagui precedence.
 *
 * The legacy custom-color branch is preserved: a concrete hex/rgb `color`
 * pins the label in EVERY state via inline style (legacy also pinned the
 * group-hover pool to the same value, so hover changed nothing); it yields to
 * the disabled palette and to a custom frame background's contrast class,
 * both of which legacy also let win.
 */
import { createContext, useContext, type CSSProperties, type HTMLAttributes, type JSX } from 'react'
import { getMaybeHexOrRgbColor } from '../button-frame-compat/custom-color'
import { composeCompatEmission, mergeCompatStyle, type CompatEmission } from '../compat/compose'
import type { CompatProps } from '../compat/props'
import type { TextCompatStyleProps } from '../text-compat/props'
import { styleClasses as textStyleClasses } from '../text-compat/style-classes'
import { buttonCompatTextClassName, type ButtonContentClassProps } from './compile'
import type { ButtonTextStyleSurface } from './text-props'

/** The styled context the label/icon/spinner read off the parent Button. */
export const ButtonContext = createContext<ButtonContentClassProps>({
  variant: 'default',
  emphasis: 'primary',
  size: 'medium',
  isDisabled: false,
})

// `color` moves from the DOM-attribute surface to the styled surface — the
// legacy Button.Text `color` is a style prop, never a presentational attribute.
export interface ButtonTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'>, ButtonTextStyleSurface {
  lineHeightDisabled?: boolean
}

const EMPTY_FIXED_CLASSES = (): string[] => []

/**
 * The label's three inline-style layers, lowest precedence first: the
 * emission, then the custom-color pin, then the caller's `style` — each later
 * layer beats the ones before it (the Tamagui caller-wins ordering).
 */
function layerTextStyle({
  emissionStyle,
  customColorStyle,
  callerStyle,
}: {
  emissionStyle: CSSProperties | undefined
  customColorStyle: CSSProperties | undefined
  callerStyle: CSSProperties | undefined
}): CSSProperties | undefined {
  return mergeCompatStyle(mergeCompatStyle(emissionStyle, customColorStyle), callerStyle)
}

function buttonTextStyledEmission(props: CompatProps<TextCompatStyleProps>): CompatEmission {
  return composeCompatEmission<TextCompatStyleProps>({
    props,
    baseClasses: '',
    styleClasses: (style) => textStyleClasses(style),
    fixedClasses: EMPTY_FIXED_CLASSES,
  })
}

/** Equivalent of legacy Button.Text (CustomButtonText): themed from the parent Button. */
export function ButtonText({
  className,
  lineHeightDisabled = false,
  children,
  variant,
  color,
  opacity,
  position,
  top,
  whiteSpace,
  transition,
  // Accepted for compatibility; timing rides the explicit `transition` (see ./text-props).
  animation: _animation,
  '$group-hover': groupHover,
  style,
  ...rest
}: ButtonTextProps): JSX.Element {
  const ctx = useContext(ButtonContext)
  const customColor = getMaybeHexOrRgbColor(color)
  // A theme-token color styles normally through the emission (so the cell's
  // hover scope still wins on hover, matching the scoped-selector cascade).
  const emission = buttonTextStyledEmission({
    color: customColor === undefined ? color : undefined,
    opacity,
    position,
    top,
    whiteSpace,
    transition,
    '$group-hover': groupHover,
    className,
  })
  const customColorStyle =
    customColor !== undefined && !ctx.isDisabled && ctx.customTextClass === undefined
      ? { color: customColor }
      : undefined
  return (
    <span
      className={buttonCompatTextClassName({
        ...ctx,
        variant: variant ?? ctx.variant,
        lineHeightDisabled,
        className: emission.className,
      })}
      style={layerTextStyle({ emissionStyle: emission.style, customColorStyle, callerStyle: style })}
      {...rest}
    >
      {children}
    </span>
  )
}
