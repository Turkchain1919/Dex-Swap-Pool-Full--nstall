/**
 * The `$platform-native` pool on the Text native style lane.
 *
 * Legacy Tamagui applies the pool on device by merging it over the base props
 * at the PROPS level — measured via `renderTamaguiNative` (the tailwind
 * harness): a pool `transform: [{ translateY: 0.75 }]` lands verbatim, never
 * rounded, and RN-only keys like `includeFontPadding` pass through raw. A base
 * shorthand and a pool's explicit declaration on the SAME composite family
 * (transform, the text-shadow triad, the implicit border color) must combine,
 * not clobber — see "combines a base shorthand..." below. Before this lane
 * applied the pool, converted Text silently lost fractional optical nudges and
 * rendered ~1px off legacy on device. The device-parity twin of this suite
 * lives in `packages/tailwind/src/parity/text-platform-native/`.
 */
import { describe, expect, it } from 'vitest'
import { textNativeStyle } from './native-style'
import type { TextCompatProps } from './props'

const asProps = (props: Record<string, unknown>): TextCompatProps => props as TextCompatProps

describe('textNativeStyle — $platform-native pool', () => {
  it('lands a fractional translateY nudge verbatim, exactly like legacy Tamagui (no rounding)', () => {
    const { style, dropped } = textNativeStyle(
      asProps({ '$platform-native': { transform: [{ translateY: 0.75 }], includeFontPadding: false } }),
    )
    expect(style.transform).toEqual([{ translateY: 0.75 }])
    expect((style as Record<string, unknown>)['includeFontPadding']).toBe(false)
    expect(dropped).toEqual([])
  })

  it('passes textAlignVertical through raw (RN-only key, no class lane anywhere)', () => {
    const { style } = textNativeStyle(asProps({ '$platform-native': { textAlignVertical: 'center' } }))
    expect((style as Record<string, unknown>)['textAlignVertical']).toBe('center')
  })

  it('resolves token-valued pool props through the same lanes as the base pool', () => {
    const { style } = textNativeStyle(asProps({ '$platform-native': { mt: '$spacing4', fontSize: 13 } }))
    expect(style.marginTop).toBe(4)
    expect(style.fontSize).toBe(13)
  })

  it('combines a base shorthand and a pool explicit transform, matching the legacy props-level merge', () => {
    // `y: 2` and the pool's `transform` are DIFFERENT prop names, so a genuine
    // props-level merge carries both into one `nativeTransform` call: the
    // shorthand's entry first (translateX/Y/scale/... sort ascending by prop
    // name, then prepend), the explicit array's entries appended after, per
    // `nativeTransform`'s documented ordering — never a wholesale replace that
    // drops the base entry entirely.
    const { style } = textNativeStyle(asProps({ y: 2, '$platform-native': { transform: [{ translateY: 0.75 }] } }))
    expect(style.transform).toEqual([{ translateY: 2 }, { translateY: 0.75 }])
  })

  it('the pool wins over the base lane for the SAME prop name', () => {
    const { style } = textNativeStyle(asProps({ y: 2, '$platform-native': { y: 5 } }))
    expect(style.transform).toEqual([{ translateY: 5 }])
  })

  it('a pool textShadowOffset does not clobber a base textShadowColor with the #000000 default', () => {
    // Compiling the pool independently would see no textShadowColor in the
    // pool's own props and default it to black, overwriting the base's real
    // color. A genuine props-level merge sees the base color as part of the
    // same merged input, so the default never fires.
    const { style } = textNativeStyle(
      asProps({
        textShadowColor: '#ff0000',
        '$platform-native': { textShadowOffset: { width: 1, height: 1 } },
      }),
    )
    expect(style.textShadowColor).toBe('#ff0000')
    expect(style.textShadowOffset).toEqual({ width: 1, height: 1 })
  })

  it('a pool borderWidth does not clobber a base borderColor with the #000000 default', () => {
    const { style } = textNativeStyle(asProps({ borderColor: '#00ff00', '$platform-native': { borderWidth: 2 } }))
    expect((style as Record<string, unknown>)['borderWidth']).toBe(2)
    expect((style as Record<string, unknown>)['borderColor']).toBe('#00ff00')
  })

  it('does not warn at the pool level once applied, and prefixes pool-internal drops', () => {
    const { dropped } = textNativeStyle(
      asProps({ '$platform-native': { transform: [{ translateY: 0.75 }], letterSpacing: '$large' } }),
    )
    expect(dropped).not.toContain('$platform-native')
    expect(dropped).toContain('$platform-native.letterSpacing')
  })

  it('drops-and-warns a theme color token in the pool — no theme-reactive lane exists for it', () => {
    const { style, dropped } = textNativeStyle(asProps({ '$platform-native': { color: '$neutral2' } }))
    expect(style.color).toBeUndefined()
    expect(dropped).toContain('$platform-native.color')
  })

  it('a pool theme-color token actually drops instead of freezing at the base value', () => {
    // A real base color plus a pool THEME color must resolve to "dropped",
    // not to the base's now-stale value: the pool wins the key outright, and
    // a theme token has no style-lane expression at all.
    const { style, dropped } = textNativeStyle(
      asProps({ color: '#0000ff', '$platform-native': { color: '$neutral2' } }),
    )
    expect(style.color).toBeUndefined()
    expect(dropped).toContain('$platform-native.color')
  })

  it('a raw color in the pool still lands, like the base lane', () => {
    const { style } = textNativeStyle(asProps({ '$platform-native': { color: '#123456' } }))
    expect(style.color).toBe('#123456')
  })

  it('emits no font keys for a pool with no typography', () => {
    const { style } = textNativeStyle(asProps({ '$platform-native': { includeFontPadding: false } }))
    expect(style.fontSize).toBeUndefined()
    expect(style.fontFamily).toBeUndefined()
  })

  it('still warns at the pool level when a pool key is className-only, not style-lane', () => {
    // `textAlign` compiles to a literal Tailwind class on every lane — the
    // style-lane compile never even inspects it, so it silently diverges on
    // native with no per-key drop to report. The blanket `$platform-native`
    // warning must survive for this case (INFRA-3500 follow-up).
    const { dropped } = textNativeStyle(asProps({ '$platform-native': { textAlign: 'center' } }))
    expect(dropped).toContain('$platform-native')
  })

  it('still suppresses the pool-level warning when every pool key IS style-lane (no regression)', () => {
    const { dropped } = textNativeStyle(
      asProps({ '$platform-native': { transform: [{ translateY: 0.75 }], color: '$neutral2' } }),
    )
    expect(dropped).not.toContain('$platform-native')
  })

  it('without a pool, nothing changes', () => {
    const { style, dropped } = textNativeStyle(asProps({ variant: 'body2' }))
    expect(style.transform).toBeUndefined()
    expect(dropped).toEqual([])
  })

  it('drops-and-warns a pool backgroundColor theme token — not silent', () => {
    // `applyVisuals` no-ops on a semantic backgroundColor without recording a
    // drop, and backgroundColor is part of the layout surface `poolFullyOwned`
    // already treats as owned — without backgroundColor in
    // `POOL_THEME_COLOR_KEYS`, this used to vanish with zero signal.
    const { style, dropped } = textNativeStyle(asProps({ '$platform-native': { backgroundColor: '$surface2' } }))
    expect(style.backgroundColor).toBeUndefined()
    expect(dropped).toContain('$platform-native.backgroundColor')
  })

  it('drops-and-warns a pool borderColor theme token — not silent', () => {
    const { style, dropped } = textNativeStyle(asProps({ '$platform-native': { borderColor: '$surface2' } }))
    expect(style.borderColor).toBeUndefined()
    expect(dropped).toContain('$platform-native.borderColor')
  })

  it('a pool key explicitly set to undefined does not erase a real base prop', () => {
    // `{ ...props, ...pool }` would otherwise treat an own `undefined` value as
    // "the pool wins with undefined", erasing the base's color — `undefined`
    // in a pool means "the pool doesn't touch this key", matching how legacy
    // Tamagui's props merge treats it.
    const { style, dropped } = textNativeStyle(
      asProps({ color: '#0000ff', '$platform-native': { color: undefined, transform: [{ translateY: 0.75 }] } }),
    )
    expect(style.color).toBe('#0000ff')
    expect(dropped).not.toContain('$platform-native.color')
  })
})
