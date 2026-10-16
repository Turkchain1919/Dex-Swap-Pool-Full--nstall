import { SPORE_ANIMATION_CURVE_CSS, type SporeAnimationCurveName } from '../compat/animations'
import type { TouchableAreaCompatProps } from './props'

/** Must track `DEFAULT_ANIMATION_PROPS` in `ui/src/components/touchable/TouchableArea/TouchableArea.tsx`. */
const DEFAULT_ANIMATION: SporeAnimationCurveName = 'simple'
/** Never a colour property: transitioning a `$` colour token flashes on light/dark toggle (CLAUDE.md). */
const DEFAULT_ANIMATE_ONLY: readonly string[] = ['transform', 'opacity']

// A bare config object names no curve (Tamagui reads an array as `[curve, config]`) and
// animates nothing; an unresolvable NAME is a typo past the closed union, so it throws
// like any other unmapped token rather than reading as that deliberate opt-out.
function curveName(animation: TouchableAreaCompatProps['animation']): SporeAnimationCurveName | undefined {
  const name = Array.isArray(animation) ? animation[0] : animation
  if (typeof name !== 'string') {
    return undefined
  }
  if (!Object.hasOwn(SPORE_ANIMATION_CURVE_CSS, name)) {
    throw new Error(`compat: unknown animation curve "${name}" — no @universe/tailwind counterpart`)
  }
  return name as SporeAnimationCurveName
}

// `animation={null}` drops the `animateOnly` default too (the wrapper omits both:
// Tamagui + React 19 crash fatally alongside `$group-*`), while `animation={undefined}`
// keeps it — the wrapper's `animationProp ?? 'simple'` treats undefined as absent.
export function touchableAreaWebTransition(props: TouchableAreaCompatProps): string | undefined {
  if (props.animation === null) {
    return undefined
  }
  const name = props.animation === undefined ? DEFAULT_ANIMATION : curveName(props.animation)
  if (name === undefined) {
    return undefined
  }
  const curve = SPORE_ANIMATION_CURVE_CSS[name]
  const properties = props.animateOnly ?? DEFAULT_ANIMATE_ONLY
  return properties.length === 0 ? undefined : properties.map((property) => `${property} ${curve}`).join(', ')
}
