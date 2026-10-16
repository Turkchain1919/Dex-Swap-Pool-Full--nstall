/**
 * Enter/exit animation presets mirroring `ui/src/animations/presets.ts`.
 *
 * Each preset maps to a `--animate-spore-*` utility from
 * `@universe/tailwind/css/compat.css`:
 *  - Enter presets apply on mount — the keyframes declare only the start frame
 *    (the Tamagui `enterStyle`), so the animation ends at the element's own
 *    computed style, exactly like Tamagui animating enterStyle → base style.
 *    Presets with an opacity enter state also pin the base `opacity` end
 *    state, mirroring what Tamagui emits for the same props.
 *  - Exit presets are gated behind `[data-exiting]`: pure CSS cannot observe
 *    unmount, so the `Presence` primitive (../presence) — or any caller —
 *    sets `data-exiting` to run the exit animation before removal. The
 *    keyframe end frames equal the Tamagui `exitStyle` definitions; the
 *    parity suite checks both.
 *
 * Animation timing is a fixed CSS approximation — Tamagui's runtime timing
 * comes from its animation driver (`animation` prop) and is out of scope for
 * the static parity contract.
 *
 * The `animation` prop's preset vocabulary itself (`quick`, `fast`, `300ms`,
 * …) lives in the shared Spore curve library, ported number-exact from the
 * legacy driver configs: `@universe/tailwind/animations` (pure data + CSS
 * shorthands, re-exported below) and
 * `@universe/tailwind/animations/reanimated` (the native adapter for
 * hand-written Reanimated code and the native compat layer).
 */
export {
  SPORE_ANIMATION_CURVE_CSS,
  SPORE_ANIMATION_CURVE_NAMES,
  SPORE_ANIMATION_CURVES,
} from '@universe/tailwind/animations'
export type {
  SporeAnimationCurve,
  SporeAnimationCurveName,
  SporeEasing,
  SporeSpringCurve,
  SporeSpringCurveName,
  SporeTimingCurve,
  SporeTimingCurveName,
} from '@universe/tailwind/animations'

export const ENTER_PRESET_CLASSES = {
  fadeIn: 'animate-spore-enter-fade-in opacity-[1]',
  fadeInDown: 'animate-spore-enter-fade-in-down opacity-[1]',
  // Directional presets are named for the enter ORIGIN (from the left / right
  // / below), matching their keyframe names — fadeInDown is motion-named.
  fadeInLeft: 'animate-spore-enter-fade-in-left opacity-[1]',
  fadeInRight: 'animate-spore-enter-fade-in-right opacity-[1]',
  fadeInBelow: 'animate-spore-enter-fade-in-below opacity-[1]',
} as const

export const EXIT_PRESET_CLASSES = {
  fadeOut: 'data-exiting:animate-spore-exit-fade-out opacity-[1]',
  fadeOutUp: 'data-exiting:animate-spore-exit-fade-out-up opacity-[1]',
  fadeOutDown: 'data-exiting:animate-spore-exit-fade-out-down opacity-[1]',
} as const

/**
 * Keyframe-name prefix every `EXIT_PRESET_CLASSES` entry resolves to
 * (`spore-exit-fade-out`, `spore-exit-fade-out-up`, `spore-exit-fade-out-down`
 * — see the `@keyframes` in `@universe/tailwind/css/compat.css`). Kept next to
 * the class map so the two contracts can't drift: `../presence` uses this to
 * tell a resolved `animation-name` (or an `animationend`'s
 * `event.animationName`) apart from an enter animation or anything unrelated
 * still resolving on the same node.
 */
export const EXIT_ANIMATION_NAME_PREFIX = 'spore-exit-'

/** True if a resolved `animation-name` (comma-separated when multiple animations apply) includes an exit-family name. */
export function hasExitAnimationName(animationName: string): boolean {
  return animationName.split(',').some((name) => name.trim().startsWith(EXIT_ANIMATION_NAME_PREFIX))
}

/**
 * Matches one top-level component of an animation-timing shorthand: a
 * functional easing (whose parentheses may contain spaces, e.g.
 * `cubic-bezier(0.17, 0.67, 0.45, 1)`) or a space-free token.
 */
const CURVE_COMPONENT_REGEX = /[a-z-]+\([^)]*\)|\S+/gi

/**
 * Splits a `SPORE_ANIMATION_CURVE_CSS` shorthand into the inline animation
 * timing overrides keyframe consumers apply when an animation should run on a
 * legacy Spore curve instead of its pinned default timing.
 *
 * Accepts exactly the shape those entries have — `'<duration> <easing>'` or
 * `'<duration> <easing> <delay>'`, where `<easing>` is a single timing
 * function. A delayed curve's third component is returned as `animationDelay`;
 * anything else (a space-less string, more than three components) throws
 * rather than silently emitting a combined `animationTimingFunction` value the
 * browser would drop.
 */
export function curveToAnimationTiming(curve: string): {
  animationDuration: string
  animationTimingFunction: string
  animationDelay?: string
} {
  const [animationDuration, animationTimingFunction, animationDelay, ...rest] = curve.match(CURVE_COMPONENT_REGEX) ?? []
  if (animationDuration === undefined || animationTimingFunction === undefined || rest.length > 0) {
    throw new Error(`curveToAnimationTiming expects '<duration> <easing> [<delay>]', got '${curve}'`)
  }
  return animationDelay === undefined
    ? { animationDuration, animationTimingFunction }
    : { animationDuration, animationTimingFunction, animationDelay }
}

export const ENTER_EXIT_PRESET_CLASSES = {
  fadeInDownOutUp: `${ENTER_PRESET_CLASSES.fadeInDown} ${EXIT_PRESET_CLASSES.fadeOutUp}`,
  fadeInDownOutDown: `${ENTER_PRESET_CLASSES.fadeInDown} ${EXIT_PRESET_CLASSES.fadeOutDown}`,
  fadeInOut: `${ENTER_PRESET_CLASSES.fadeIn} ${EXIT_PRESET_CLASSES.fadeOut}`,
} as const

export type AnimateEnterPreset = keyof typeof ENTER_PRESET_CLASSES
export type AnimateExitPreset = keyof typeof EXIT_PRESET_CLASSES
export type AnimateEnterExitPreset = keyof typeof ENTER_EXIT_PRESET_CLASSES
