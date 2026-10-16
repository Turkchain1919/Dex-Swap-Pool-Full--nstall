/**
 * The popover-compat class compiler: the popup frame defaults mirror the
 * Tamagui `PopperContentFrame` styled variants (`unstyled: false` →
 * `size: '$true'` = 8px padding + 0 radius, `backgroundColor: '$background'`,
 * `alignItems: 'center'`; `$background` resolves to `surface1` in both spore
 * themes), layered under the call site's own Popover.Content style props via
 * the shared Flex compat compiler (tailwind-merge semantics — caller wins).
 * Enter/exit motion is expressed as Base UI starting/ending-style transitions
 * mirroring the legacy ±10px fade (see the exclusions ledger for timing).
 */
import { cn } from '../cn'
import { type CompatEmission, composeCompatEmission } from '../compat/compose'
import { flexCompatClassName } from '../flex-compat/compile'
import { BASE_CLASSES, flexStyleClasses } from '../flex-compat/flex-style-classes'
import type { FlexCompatProps, FlexCompatStyleProps } from '../flex-compat/props'
import type { AdaptiveWebPopoverContentCompatProps, PopoverCompatPlacement } from './props'

const POPUP_FRAME_DEFAULTS: FlexCompatProps = {
  alignItems: 'center',
  p: 8,
  borderRadius: 0,
  backgroundColor: '$surface1',
}

const PADDING_ALIAS_FAMILY = [
  ['p', 'padding'],
  ['px', 'paddingHorizontal'],
  ['py', 'paddingVertical'],
  ['pt', 'paddingTop'],
  ['pb', 'paddingBottom'],
  ['pl', 'paddingLeft'],
  ['pr', 'paddingRight'],
] as const

/**
 * Fold every caller padding spelling into the canonical shorthand keyspace
 * before layering over `POPUP_FRAME_DEFAULTS`. Without this, a caller's
 * `padding`/`paddingTop`-style aliases never collide with the frame's `p` key
 * in the object spread, and the 8px default survives a caller that asked for
 * different padding (the `padding: 4` → 8px regression documented on the
 * OverflowMenu conversion). Folded per-edge resolution matches the rebuilt
 * ui/src Popover (`popoverStyleResolution.ts`): edge ?? axis ?? all ?? frame
 * default, shorthand over longhand within each alias pair; edge-over-axis-
 * over-all precedence rides Tailwind's fixed p < px/py < pt/pr/pb/pl rule
 * order, pinned by the parity suite.
 */
function foldPaddingAliases(props: FlexCompatProps): FlexCompatProps {
  const out = { ...props } as Record<string, unknown>
  const raw = props as Record<string, unknown>
  for (const [shorthand, longhand] of PADDING_ALIAS_FAMILY) {
    const value = raw[shorthand] ?? raw[longhand]
    delete out[shorthand]
    delete out[longhand]
    // An explicitly-undefined caller key stays unset (legacy styled() treats
    // undefined as absent), so the frame default keeps that edge.
    if (value !== undefined) {
      out[shorthand] = value
    }
  }
  return out as FlexCompatProps
}

const NON_STYLE_KEYS = [
  'children',
  'isOpen',
  'isSheet',
  'adaptWhen',
  'placement',
  'webBottomSheetProps',
  'trapFocus',
  'enableRemoveScroll',
  'enableAnimationForPositionChange',
  'size',
  'unstyled',
  'lazyMount',
  'unmountChildrenWhenHidden',
  'flipStyle',
  'arrowBorderColor',
  'arrowBorderWidth',
  'forceMount',
  'forceUnmount',
  'freezeContentsWhenHidden',
  // ThemeableStack styled() variant shorthands: accepted-inert (ledgered
  // "Styled variant shorthands"), never compiled into utilities.
  'bordered',
  'circular',
  'hoverTheme',
  'pressTheme',
  'focusTheme',
  'elevate',
  'elevation',
  'transparent',
  'padded',
  'radiused',
  'fullscreen',
  // The wired FocusScope/Dismissable surface (destructured by the content,
  // listed here so direct compiler calls stay safe).
  'onOpenAutoFocus',
  'onCloseAutoFocus',
  'disableFocusScope',
  'onEscapeKeyDown',
  'onPointerDownOutside',
  'onFocusOutside',
  'onInteractOutside',
  'onFocusCapture',
  'onBlurCapture',
] as const

function styleProps(props: Partial<AdaptiveWebPopoverContentCompatProps>): FlexCompatProps {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (!(NON_STYLE_KEYS as readonly string[]).includes(key)) {
      out[key] = value
    }
  }
  return out as FlexCompatProps
}

/**
 * Legacy enter/exit: opacity 0 with y ±10 — from below when placed above the
 * trigger, from above otherwise. Expressed as Base UI `data-starting-style` /
 * `data-ending-style` transition states; timing is the fixed compat
 * approximation of the Tamagui `quick` driver config (ledgered).
 *
 * Every class string below is a FULL literal — never assembled via template
 * literals — so Tailwind's static extraction sees the candidates wherever
 * this source (or a generated class manifest) is scanned. The parity suite
 * compiles them through the real Tailwind engine and fails if any stops
 * emitting CSS (`popover-classes.test.ts`).
 */
// `translate`, not `transform`: v4 `translate-y-[…]` sets the separate CSS
// `translate` property, and an arbitrary transition list is literal (unlike
// built-in `transition-transform`, which expands to all four split
// properties) — with `transform` here the slide would snap instead of animate.
const MOTION_BASE_CLASSES =
  'transition-[translate,opacity] duration-150 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0'
/** Placed above the trigger: animate from below (legacy y: +10). */
const MOTION_FROM_BELOW_CLASSES = 'data-starting-style:translate-y-[10px] data-ending-style:translate-y-[10px]'
/** Placed below the trigger or default: animate from above (legacy y: -10). */
const MOTION_FROM_ABOVE_CLASSES = 'data-starting-style:translate-y-[-10px] data-ending-style:translate-y-[-10px]'

function motionClasses(placement?: PopoverCompatPlacement): string {
  const isAboveTrigger = placement?.startsWith('top') ?? false
  return cn(MOTION_BASE_CLASSES, isAboveTrigger ? MOTION_FROM_BELOW_CLASSES : MOTION_FROM_ABOVE_CLASSES)
}

/** Compile the popup frame className for the given Popover.Content-style props. */
export function adaptiveWebPopoverContentCompatClassName(props: Partial<AdaptiveWebPopoverContentCompatProps>): string {
  return cn(
    flexCompatClassName({ ...POPUP_FRAME_DEFAULTS, ...foldPaddingAliases(styleProps(props)) }),
    motionClasses(props.placement),
    'outline-none',
  )
}

/**
 * Every class the popup's own chrome compiles to (frame defaults + both
 * motion placements) — the popover's contribution to the generated safelist
 * and the strict path's membership set (engine-memoized).
 */
export function popoverFixedCompatClasses(): string[] {
  return [adaptiveWebPopoverContentCompatClassName({}), adaptiveWebPopoverContentCompatClassName({ placement: 'top' })]
}

/**
 * Compile the popup frame for rendering (INFRA-3217): guaranteed-emitted
 * classes plus the inline-style lane for caller base-pool values outside the
 * closed set (the frame's own defaults are all safelisted).
 */
export function adaptiveWebPopoverContentCompatEmission(
  props: Partial<AdaptiveWebPopoverContentCompatProps>,
): CompatEmission {
  const emission = composeCompatEmission<FlexCompatStyleProps>({
    props: { ...POPUP_FRAME_DEFAULTS, ...foldPaddingAliases(styleProps(props)) },
    baseClasses: BASE_CLASSES,
    styleClasses: flexStyleClasses,
    fixedClasses: popoverFixedCompatClasses,
  })
  return {
    className: cn(emission.className, motionClasses(props.placement), 'outline-none'),
    style: emission.style,
  }
}
