import type {
  ComponentPropsWithoutRef,
  ComponentRef,
  ElementType,
  ForwardRefExoticComponent,
  PropsWithoutRef,
  RefAttributes,
} from 'react'

/**
 * Class-select lane guard: every class the factory can emit must be a literal
 * string written in source, because both platform bundles are produced by the
 * static oxide scanner (web CSS emission; uniwind's build-time native
 * stylesheet map — a class it never saw is silently dropped on device).
 *
 * `Record<never, never> extends Record<S, 1>` is true exactly when `S` has an
 * index-signature-like domain — `string` itself AND template-literal types
 * with holes (`` `bg-${string}` ``) — so both fail here, where a bare
 * `string extends S` check lets the template-literal case through. What no
 * type guard can close is the CONST-INTERPOLANT case (`` `${BASE} p-1` ``
 * over a const: the TYPE is a finite literal, but the SOURCE text is not the
 * class) — that half is closed syntactically by the
 * `universe-custom/styled-factory-literal-classes` oxlint rule.
 */
export type LiteralClass<S extends string> = Record<never, never> extends Record<S, 1> ? never : S

/** Literal-class guard applied to each rule's `class` (compoundVariants / hover arrays). */
export type LiteralRuleClasses<Rules extends ReadonlyArray<{ class: string }>> = {
  [I in keyof Rules]: Rules[I] & { class: LiteralClass<Rules[I]['class']> }
}

/** `variants` table shape: variant name → option → literal class string. */
export type StyledVariants = Record<string, Record<string, string>>

type StringToBoolean<K> = K extends 'true' ? true : K extends 'false' ? false : K

export type VariantOption<V extends StyledVariants, K extends keyof V> = StringToBoolean<keyof V[K]>

/** The variant props a styled component accepts (`{true,false}` tables become booleans). */
export type VariantSelection<V extends StyledVariants> = {
  [K in keyof V]?: VariantOption<V, K>
}

/**
 * cva-shaped compound rule: `class` applies when every named variant matches.
 * `class` is literal-guarded at the styled() call site (LiteralRuleClasses).
 */
export type CompoundRule<V extends StyledVariants> = {
  [K in keyof V]?: VariantOption<V, K> | ReadonlyArray<VariantOption<V, K>>
} & { class: string }

/**
 * Hover lane rule: `class` applies while the component is hovered AND the
 * named variants match. State-driven (hover seam → React state) on both
 * platforms — never `hover:` classes, which are a silent MISS in uniwind's
 * native stylesheet map. `class` is literal-guarded at the styled() call
 * site (LiteralRuleClasses).
 */
export type HoverRule<V extends StyledVariants> = CompoundRule<V>

/**
 * Inline-style lane output: open-domain values (props-driven numerics, RN
 * shadows) no literal class can express. Strictly the platform style shape —
 * a string / class list is not assignable, and the `className`/`class` keys
 * are banned outright, so the lane can never smuggle a class name out (the
 * class-select lane stays the only class emitter, and the oxide scanner's
 * class universe stays closed).
 */
export type InlineStyle = Record<string, unknown> & {
  className?: never
  class?: never
}

/**
 * The raw prop bag `inlineStyle` receives as its second argument: every prop
 * except `className`/`style`, exactly as the caller passed them (variant
 * defaults NOT applied — read variant values from the selection argument).
 * Values are `unknown` on purpose: open-domain props must be narrowed at the
 * point of use.
 */
export type InlineStyleProps = Readonly<Record<string, unknown>>

export interface StyledConfig<V extends StyledVariants> {
  /**
   * Which platforms the component can reach. `'universal'` (the default)
   * enforces the native-MISS class bans (`hover:`, `media-*`, `aria-*`, …);
   * `'web'` declares the component never rides a native bundle and lifts the
   * native-only bans (e.g. the inclusive `media-*` compat variants become
   * legal, matching Tamagui's `$md` boundary semantics exactly).
   */
  platform?: 'web' | 'universal'
  /** Always-on classes. */
  base?: string
  /** Class-select variant tables. Empty-string branches are legal marker props (read by rules, no classes). */
  variants?: V
  compoundVariants?: ReadonlyArray<CompoundRule<V>>
  /** Maps 1:1 from Tamagui's `defaultVariants`. */
  defaultVariants?: VariantSelection<V>
  /** Hover lane (see HoverRule). Declaring it makes the component track hover state. */
  hover?: ReadonlyArray<HoverRule<V>>
  /**
   * Inline-style lane. Receives the resolved variant selection (defaults
   * applied) plus the raw prop bag (open-domain prop VALUES — hex colors,
   * layout numerics — that no enumerable variant can express); returns a
   * style object merged under the caller's `style`. This lane is invisible
   * to the class-select gates by design: whatever it computes lands on
   * `style`, never on `className`.
   */
  inlineStyle?: (selection: VariantSelection<V>, props: InlineStyleProps) => InlineStyle | undefined
  /**
   * Variant props that ALSO forward to the base component (normally variant
   * props are consumed). E.g. `disabled` styles via its variant branch and
   * still reaches Pressable for press gating + accessibilityState.
   */
  forwardProps?: ReadonlyArray<keyof V & string>
}

/**
 * The config shape the factory EXPOSES on `component.styledConfig` — the
 * public `StyledConfig` plus the link to a composed base's own exposed
 * config. `baseStyledConfig` lives here, off the public config type, so a
 * call site cannot hand-write it: the factory populates it when the base is
 * another factory product, and `collectStyledClasses` walks it to enumerate
 * the full class universe (outer + every inner layer) for the emission gates.
 */
export interface ExposedStyledConfig<V extends StyledVariants> extends StyledConfig<V> {
  baseStyledConfig?: ExposedStyledConfig<StyledVariants>
}

export type StyledProps<B extends ElementType, V extends StyledVariants> = Omit<
  ComponentPropsWithoutRef<B>,
  keyof V | 'className'
> &
  VariantSelection<V> & { className?: string }

export type StyledComponent<B extends ElementType, V extends StyledVariants> = ForwardRefExoticComponent<
  PropsWithoutRef<StyledProps<B, V>> & RefAttributes<ComponentRef<B>>
> & {
  /** The factory config, exposed for the class-universe test gate and tooling. */
  readonly styledConfig: ExposedStyledConfig<StyledVariants>
}

/**
 * Drop-in replacement for Tamagui's `GetProps<typeof X>` during conversion:
 * the factory component's inferred prop surface (base props minus consumed
 * variant keys, plus the variant props and `className`).
 */
export type GetProps<C extends ElementType> = ComponentPropsWithoutRef<C>
