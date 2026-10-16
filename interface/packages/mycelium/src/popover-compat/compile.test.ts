/**
 * Padding-default resolution for the popup frame (INFRA-3494): the frame
 * ships the legacy 8px `PopperContentFrame` default, and EVERY caller padding
 * spelling (`p`, `padding`, axis, per-edge, long or short) must beat it per
 * edge — matching the rebuilt ui/src Popover's resolution
 * (`popoverStyleResolution.ts`): edge ?? axis ?? all ?? frame default,
 * shorthand over longhand within each alias pair. The regression pinned here
 * shipped 8px popover padding where a converted caller asked for 4px
 * (`padding: 4` never collided with the frame's `p` key).
 *
 * Expected class literals are deliberately written out, not derived through
 * the compiler under test.
 */
import { describe, expect, it } from 'vitest'
import { adaptiveWebPopoverContentCompatClassName, adaptiveWebPopoverContentCompatEmission } from './compile'
import type { AdaptiveWebPopoverContentCompatProps } from './props'

function paddingClasses(props: Partial<AdaptiveWebPopoverContentCompatProps>): string[] {
  return adaptiveWebPopoverContentCompatClassName(props)
    .split(' ')
    .filter((cls) => /^p[xytblr]?-\[/.test(cls))
}

describe('popup frame padding resolution — alias folding over the 8px default (INFRA-3494)', () => {
  it('keeps the legacy 8px frame default when the caller passes no padding', () => {
    expect(paddingClasses({})).toEqual(['p-[8px]'])
    expect(paddingClasses({ backgroundColor: '$surface2', gap: '$gap8' })).toEqual(['p-[8px]'])
  })

  it('caller `padding` (the longhand alias) replaces the default on all sides — the 8px-vs-4px regression', () => {
    expect(paddingClasses({ padding: 4 })).toEqual(['p-[4px]'])
    expect(paddingClasses({ padding: '$spacing4' })).toEqual(['p-[4px]'])
  })

  it('caller `p` replaces the default on all sides', () => {
    expect(paddingClasses({ p: '$none' })).toEqual(['p-[0px]'])
  })

  it('a literal `0` (falsy but not nullish) is preserved through the `??` fold, not treated as absent', () => {
    // `foldPaddingAliases` uses `raw[shorthand] ?? raw[longhand]` and only
    // treats the result as unset when it is `undefined` — `0` is a real
    // value, not nullish, so it must win over the 8px default just like
    // `$none` does above.
    expect(paddingClasses({ p: 0 })).toEqual(['p-[0px]'])
    expect(paddingClasses({ padding: 0 })).toEqual(['p-[0px]'])
  })

  it('a per-edge value overrides only that edge; the other edges keep the 8px default', () => {
    expect(paddingClasses({ pt: '$spacing12' })).toEqual(['p-[8px]', 'pt-[12px]'])
    expect(paddingClasses({ paddingTop: '$spacing12' })).toEqual(['p-[8px]', 'pt-[12px]'])
    expect(paddingClasses({ paddingBottom: 2 })).toEqual(['p-[8px]', 'pb-[2px]'])
  })

  it('an axis value overrides both its edges; the cross axis keeps the 8px default', () => {
    expect(paddingClasses({ paddingVertical: 12 })).toEqual(['p-[8px]', 'py-[12px]'])
    expect(paddingClasses({ px: '$spacing16' })).toEqual(['p-[8px]', 'px-[16px]'])
  })

  it('all four per-edge longhands land on their own edges', () => {
    expect(paddingClasses({ paddingTop: 1, paddingBottom: 2, paddingLeft: 3, paddingRight: 4 })).toEqual([
      'p-[8px]',
      'pt-[1px]',
      'pb-[2px]',
      'pl-[3px]',
      'pr-[4px]',
    ])
  })

  it('edge + axis + all compose like the rebuilt Popover: edge ?? axis ?? all ?? default', () => {
    // top=2 (edge), left/right=4 (axis), bottom=6 (all) — nothing left for the default.
    expect(paddingClasses({ pt: 2, paddingHorizontal: 4, padding: 6 })).toEqual(['p-[6px]', 'px-[4px]', 'pt-[2px]'])
  })

  it('shorthand beats longhand within an alias pair (`p ?? padding`, `px ?? paddingHorizontal`)', () => {
    expect(paddingClasses({ p: 4, padding: 2 })).toEqual(['p-[4px]'])
    expect(paddingClasses({ px: 2, paddingHorizontal: 4 })).toEqual(['p-[8px]', 'px-[2px]'])
  })

  it('an explicitly-undefined caller key stays unset: the frame default survives', () => {
    expect(paddingClasses({ padding: undefined })).toEqual(['p-[8px]'])
    expect(paddingClasses({ pt: undefined, paddingTop: undefined })).toEqual(['p-[8px]'])
  })

  it('folding is scoped to the padding family: margins pass through untouched', () => {
    expect(adaptiveWebPopoverContentCompatClassName({ marginTop: 4 })).toContain('mt-[4px]')
    expect(paddingClasses({ marginTop: 4 })).toEqual(['p-[8px]'])
  })

  it('paddingStart/paddingEnd (no ps/pe shorthand exists in this compiler) are accepted long-tail props, not aliases: the 8px default is left in place alongside them', () => {
    // Unlike pt/pb/pl/pr, `paddingStart`/`paddingEnd` have no colliding
    // shorthand key in `POPUP_FRAME_DEFAULTS` to fold against, so they are
    // NOT part of `PADDING_ALIAS_FAMILY` — they pass through to the generic
    // long-tail lane as `[padding-inline-start:…]` / `[padding-inline-end:…]`.
    // Overriding the frame default per edge still works correctly (see the
    // real-Tailwind-engine rule-order pin in
    // `parity/popover/popover-classes.test.ts`), because Tailwind buckets an
    // arbitrary property matching a known CSS property into that property's
    // rule-order slot (between axis and per-edge utilities) regardless of
    // object-key folding.
    const className = adaptiveWebPopoverContentCompatClassName({ paddingStart: 4 })
    const classes = className.split(' ')
    expect(classes).toContain('p-[8px]')
    expect(classes).toContain('[padding-inline-start:4px]')

    const endClassName = adaptiveWebPopoverContentCompatClassName({ paddingEnd: '$spacing16' })
    expect(endClassName.split(' ')).toEqual(expect.arrayContaining(['p-[8px]', '[padding-inline-end:16px]']))
  })

  it('the strict emission path resolves the same way (no dead 8px default alongside the caller value)', () => {
    const emission = adaptiveWebPopoverContentCompatEmission({ padding: 4 })
    const emitted = emission.className.split(' ').filter((cls) => /^p[xytblr]?-\[/.test(cls))
    expect(emitted).toHaveLength(1)
    expect(emitted).not.toContain('p-[8px]')
    const style = (emission.style ?? {}) as Record<string, string>
    const viaClass = emitted[0] === 'p-[4px]'
    const viaVarLane = emitted[0] === 'p-[var(--c-p)]' && style['--c-p'] === '4px'
    expect(viaClass || viaVarLane).toBe(true)
  })
})
