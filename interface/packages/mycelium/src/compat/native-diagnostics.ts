/**
 * Dev diagnostics for the compat platform legs (INFRA-3229).
 *
 * A uniwind class-map miss is completely silent — `UniwindStore.getStyles` skips
 * unknown classNames with a bare `continue`, and `compileNativeCSS` drops
 * unmapped rules without a warning. Silence is the failure mode this module
 * exists to remove; a redbox in converted production paths would be worse than
 * the bug, so the signal is a `__DEV__`-gated one-time `console.warn`.
 */

import { GROUP_STATE_PROP_PREFIX } from './group'

declare const __DEV__: boolean | undefined

/** Metro defines `__DEV__` (false in release builds); outside Metro these legs only run under test — treat as dev. */
function isDevEnvironment(): boolean {
  return typeof __DEV__ === 'boolean' ? __DEV__ : true
}

const warned = new Set<string>()

/**
 * The one scoped pool that is NOT dead on native, and so gets its own warning.
 *
 * `composeCompatClassName` merges `$platform-web` into the BASE pool (the compat
 * primitives were web-only, so web builds always apply it) and uniwind resolves
 * the merged class natively. The only thing standing between a web-only
 * declaration and a device is the leg's style lane re-asserting the base value
 * over it — which holds for the families the style lane emits and NOT for the
 * className-only ones. The native parity suites measure the residue:
 * `EXPECTED_PLATFORM_WEB_LEAKS` in `packages/tailwind/src/parity/flex/native-expectations.ts`
 * pins `paddingLeft` / `paddingRight` / `cursor`, and its Text twin pins `color`.
 */
export const NATIVE_LEAKY_POOL_KEY = '$platform-web'

/**
 * Deliberately worded at the POOL level, naming no keys.
 *
 * A pool's keys are enumerable here, but WHICH of them reach the device is not:
 * that turns on whether the compiled arbitrary-value class survives uniwind's
 * build-time scanner, which the leg has no handle on (uniwind resolves the
 * className inside the RN host, and the parity harness only reaches it by
 * deep-importing uniwind's private stylesheet map behind a boundary guard).
 * Measured over the existing parity matrix, a per-key "these keys leak" wording
 * would over-warn on 2 of the 4 Flex `$platform-web` cases and on the single Text
 * case. So this states the pool is not inert and stops there.
 */
const LEAKY_POOL_MESSAGE = [
  'is not inert on native — the compiler merges the pool into the base pool and uniwind resolves the merged',
  "class, so any declaration the leg's style lane does not re-assert over it can reach the device. Which ones do",
  "is not knowable at render time (it turns on uniwind's build-time scanner); the native parity suites measure",
  'the residue per case.',
].join(' ')

/**
 * The theme pools are neither dead nor safe, and so also get their own warning
 * rather than a place in the dead-prop ledger.
 *
 * `$theme-dark` and `$theme-light` sit in exactly the same epistemic position
 * as `NATIVE_LEAKY_POOL_KEY`: the `dark:`/`light:` VARIANT compiles and
 * resolves against `Uniwind.setTheme()` (light since INFRA-3263, when the
 * compiler stopped spelling it as the uninvertible `not-dark:` negation) — but
 * the CLASS it prefixes is invisible to the build-time scanner whenever the
 * pool value interpolates (a theme-prefixed `p-[…]` utility) or names a
 * semantic colour, and the leg's style lane reads the BASE pool only, so
 * nothing re-asserts the value. Which side a given declaration falls on turns
 * on uniwind's scanner, which the leg has no handle on at render time.
 * Measured by the native parity suites: `EXPECTED_THEME_DARK_POOL_GAPS` in
 * `packages/tailwind/src/parity/text/native-expectations.ts` pins `opacity`
 * vanishing on a dark-theme case, and the interpolating surface (padding, gap,
 * radii, sizing, offsets) behaves identically; `$theme-light` mirrors it.
 */
export const NATIVE_SCANNER_DEPENDENT_POOL_KEYS = ['$theme-dark', '$theme-light'] as const

/**
 * Deliberately worded at the POOL level, naming no keys — same reasoning as
 * `LEAKY_POOL_MESSAGE`, and it must never claim that a GIVEN key drops: that
 * needs the build-time fact.
 *
 * Measured before shipping this: there is no literal `dark:`-prefixed class
 * anywhere in either scanned `@source` tree (`packages/mycelium/src` and
 * `apps/mobile/src`), and the only `light:`-prefixed literals to reach the
 * native bundle are the three safelisted box-shadow entries plus the three
 * registration literals the INFRA-3263 QA story spells out for its own pool
 * (`apps/mobile/src/components/mycelium/ThemeLightNativeQA.stories.tsx` —
 * story-scoped by design, invisible to the safelist census, whose generator
 * scans only `packages/mycelium/src`), so today almost no
 * compat-produced theme-pool class reaches the native bundle at all. The "it
 * warns on a pool that actually lands" over-warning case is marginal, which is
 * why this is a warning and not just a ledger comment. A fact about the
 * current snapshot of both scan trees, not an invariant — re-measure when it
 * matters.
 */
const SCANNER_DEPENDENT_POOL_MESSAGE = [
  'pool declarations may not reach the device — the theme variant itself compiles and resolves against',
  '`Uniwind.setTheme()`, but a runtime-composed or semantic-colour class under it is invisible to the build-time',
  "scanner, and this leg's style lane reads the BASE pool only, so nothing re-asserts the value. Which",
  "declarations survive is not knowable at render time (it turns on uniwind's scanner); the native parity suites",
  'measure the residue per case.',
].join(' ')

const SCANNER_DEPENDENT_POOL_KEY_SET: ReadonlySet<string> = new Set(NATIVE_SCANNER_DEPENDENT_POOL_KEYS)

/**
 * The web legs' link form (`tag="a"` + `href`/`target`/`rel`, INFRA-3478's
 * ButtonCompat surface). NOT a style-lane drop, so the generic "web-only
 * Tailwind class" sentence would be false for these: the native legs mount no
 * anchor element, so the props detach link BEHAVIOR — a converted call site
 * keeps compiling and rendering but silently loses its navigation. The
 * dedicated sentence names that mechanism and points at the working
 * alternative (`onPress`).
 */
const NATIVE_LINK_FORM_KEYS = ['tag', 'href', 'target', 'rel'] as const

const LINK_FORM_KEY_SET: ReadonlySet<string> = new Set(NATIVE_LINK_FORM_KEYS)

/** The whole sentence for one prop — the two pools get their own, the ledger shares one. */
function nativeWarningFor(component: string, prop: string): string {
  if (prop === NATIVE_LEAKY_POOL_KEY) {
    return `${component}: "${prop}" ${LEAKY_POOL_MESSAGE}`
  }
  if (SCANNER_DEPENDENT_POOL_KEY_SET.has(prop)) {
    return `${component}: "${prop}" ${SCANNER_DEPENDENT_POOL_MESSAGE}`
  }
  // The display gate: `display` names the direct carriers (the top-level prop
  // and the user style object, filtered in FlexCompat.native.tsx), while
  // `$md.display` / `hoverStyle.display` etc. are pool-scoped values whose
  // compiled class the legs strip under every variant prefix
  // (compat/native-display.ts) — either way the value never reaches Yoga.
  if (prop === 'display' || prop.endsWith('.display')) {
    return `${component}: "${prop}" has no React Native equivalent — RN display accepts only flex/none/contents, so the web-only value is filtered from the native leg (className and style carriers alike) and never reaches Yoga.`
  }
  if (LINK_FORM_KEY_SET.has(prop)) {
    return `${component}: "${prop}" has no React Native equivalent — the native leg renders no anchor element, so the link form is inert and the component never navigates. Drive navigation from onPress instead.`
  }
  return `${component}: "${prop}" has no React Native equivalent — it compiles to a web-only Tailwind class and is dropped on native.`
}

/**
 * One warning per component × prop — the same shape as `Shimmer.native.tsx`'s
 * theme-wiring diagnostic.
 */
export function warnUnsupportedNativeProps(component: string, dropped: readonly string[]): void {
  if (!isDevEnvironment()) {
    return
  }
  for (const prop of dropped) {
    const key = `${component}:${prop}`
    if (warned.has(key)) {
      continue
    }
    warned.add(key)
    // oxlint-disable-next-line no-console -- __DEV__-only diagnostic; the alternative is a silently missing style (uniwind drops unknown classes without any signal)
    console.warn(nativeWarningFor(component, prop))
  }
}

/** Test hook: the warn ledger is process-wide, so suites must be able to reset it. */
export function __resetNativeStyleWarnings(): void {
  warned.clear()
}

/**
 * A shadow color `$` token outside the compat color maps reached the NATIVE
 * className lane. The web compiler throws for it (`style-classes.ts`), but the
 * native legs compile their className while rendering — always-mounted chrome
 * must degrade to a missing shadow, not a startup crash — so the box-shadow
 * declaration is dropped and the loss made visible here, once per token
 * (the same doctrine as the style lane's `applyShadows` drop).
 */
export function warnDroppedNativeShadowColorToken(token: string): void {
  if (!isDevEnvironment()) {
    return
  }
  const key = `shadow-color-token:${token}`
  if (warned.has(key)) {
    return
  }
  warned.add(key)
  // oxlint-disable-next-line no-console -- __DEV__-only diagnostic; the alternative is a silently missing box-shadow (the web lane throws for this token instead)
  console.warn(
    `compat: shadow color token "${token}" has no @universe/tailwind counterpart — dropping the box-shadow declaration on native instead of throwing.`,
  )
}

/**
 * The prop names actually SET on a literal of accepted-but-dropped props — the
 * legs' one-liner for building a `warnUnsupportedNativeProps` list (the
 * INFRA-3478 ButtonCompat layout + link lanes). Pure; `undefined` means "not
 * passed", the same gate `nativeWarningProps` applies.
 */
export function droppedPropNames(props: Readonly<Record<string, unknown>>): string[] {
  return Object.keys(props).filter((key) => props[key] !== undefined)
}

/**
 * `droppedPropNames` for the link-form lane, gated on the link form actually
 * being REQUESTED: only `tag="a"` detaches navigation on native. Without it
 * the web legs' button path ignores `href`/`target`/`rel` just the same, so
 * there is no cross-platform divergence to warn about — and an explicit
 * `tag="button"` must never get the link sentence. The parameter keys are
 * typed off `NATIVE_LINK_FORM_KEYS`, the same array `LINK_FORM_KEY_SET` (which
 * routes these props to that sentence) is built from, so a call-site literal
 * cannot drift from the sentence set.
 */
export function droppedLinkFormPropNames(
  props: Readonly<Record<(typeof NATIVE_LINK_FORM_KEYS)[number], unknown>>,
): string[] {
  return props.tag === 'a' ? droppedPropNames(props) : []
}

/**
 * Every prop key whose effect is lost on native, in one ledger so the legs have
 * a single dev-warning path — scoped pools whose Tailwind variant does not
 * survive `compileNativeCSS` (all measured against uniwind's own pipeline by
 * the native parity suites):
 *
 * - the repo's `media-*` custom variants live in `packages/tailwind/css/compat.css`,
 *   which `native.css` never imports, so Tailwind discards the candidate before
 *   uniwind sees it;
 * - `hover:`, `focus-visible:`, `focus-within:`, `group-*:` and the `group` marker
 *   compile but get no native stylesheet entry;
 * - `aria-disabled:` (from `disabledStyle`) drops because uniwind tracks a
 *   disabled STATE, not the ARIA attribute;
 * - the `animate-spore-*` utilities and `data-exiting` variant are in the same
 *   unimported file;
 * - `$platform-native` pools are compiled away by the compiler itself —
 *   except on TextCompat, whose native style lane applies the pool like legacy
 *   Tamagui and strips this key from its own warning list, but only once every
 *   key the pool declared has a real style-lane expression; see
 *   `text-compat/native-style.ts` for the mechanism. This is the only place
 *   `nativeWarningProps` is consulted for it — TextCompat's native leg warns off
 *   `textNativeStyle`'s own `dropped` output alone, so the two mechanisms cannot
 *   fight.
 *
 * `forceStyle` is deliberately absent — it works natively. `$theme-dark` and
 * `$theme-light` are absent too, but NOT because they are clean: they go through
 * `NATIVE_SCANNER_DEPENDENT_POOL_KEYS` instead, because a dead-prop sentence
 * would be a false statement about them. Both theme VARIANTS survive
 * `compileNativeCSS` and resolve against `Uniwind.setTheme()` (`light:` since
 * INFRA-3263 respelled the pool away from the uninvertible `not-dark:`), yet the
 * CLASS carrying one is scanner-invisible whenever the pool value interpolates
 * (`{ p: 12 }` → `p-[12px]` under a theme prefix) or names a semantic colour, so
 * a real Metro build ships no rule for it — and the style lane reads the BASE
 * pool only, so nothing re-asserts the value. MEASURED silently dropping in the
 * dark theme: padding, gap, radii, sizing, offsets and opacity, i.e. the whole
 * interpolating surface, not just the colours the escalation already pins. Root
 * fix is still the compiler/safelist change, INFRA-3229 follow-up; the
 * pool-level warning makes the uncertainty visible in the meantime.
 * `$platform-web` must never be added here either: it LANDS rather than
 * dropping, so it would get the wrong sentence — it goes through
 * `NATIVE_LEAKY_POOL_KEY`.
 * `pressStyle` / `focusStyle` DO survive compilation (uniwind has
 * `active`/`focus` state buckets), but nothing drives that state on these
 * hosts, so they are listed too. The press HANDLERS themselves are deliberately
 * NOT here any more: since INFRA-3536 the legs dispatch them (RN `Text`'s
 * built-in pressability; responder-level press wiring on the layout legs,
 * compat/native-pressability.ts) — only the
 * press-scoped STYLE pool stays dead, because the legs do not wire the pressed
 * state into uniwind's `active` bucket.
 */
const NATIVE_DEAD_PROP_KEYS = [
  'hoverStyle',
  'pressStyle',
  'focusStyle',
  'focusVisibleStyle',
  'focusWithinStyle',
  'disabledStyle',
  '$xxs',
  '$xs',
  '$sm',
  '$md',
  '$lg',
  '$xl',
  '$xxl',
  '$xxxl',
  '$short',
  '$midHeight',
  '$lgHeight',
  '$platform-native',
  '$platform-ios',
  '$platform-android',
  'animateEnter',
  'animateExit',
  'animateEnterExit',
  'group',
] as const

/**
 * Every prop a leg must dev-warn about — dropped ones and the two pool keys
 * alike. `nativeWarningFor` owns which sentence each gets, so a caller must never
 * restate this list's meaning in its own message.
 */
export function nativeWarningProps(props: Readonly<Record<string, unknown>>): string[] {
  const keys = NATIVE_DEAD_PROP_KEYS.filter((key) => props[key] !== undefined) as string[]
  for (const pool of [NATIVE_LEAKY_POOL_KEY, ...NATIVE_SCANNER_DEPENDENT_POOL_KEYS]) {
    if (props[pool] !== undefined) {
      keys.push(pool)
    }
  }
  for (const key of Object.keys(props)) {
    // Same `!== undefined` gate the two ledgers above apply: an explicitly-undefined
    // pool (a group-state prop handed the literal `undefined` — nothing strips it
    // before the leg calls this) is a pool that is not there, so warning is a false alarm.
    if (key.startsWith(GROUP_STATE_PROP_PREFIX) && props[key] !== undefined) {
      keys.push(key)
    }
  }
  return keys
}
