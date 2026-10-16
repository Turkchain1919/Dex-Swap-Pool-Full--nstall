/**
 * EMISSION GATE (INFRA-3217): proves the generated safelist actually turns
 * into CSS through the REAL pipeline — mycelium's tailwind entry (with its
 * `@source "./compat-classes.gen.txt"`) is compiled with the real Tailwind
 * v4 engine, candidates are extracted by the real oxide scanner from the
 * checked-in file (exactly what `@tailwindcss/vite` does at app build time),
 * and every closed-set class must appear in the output stylesheet.
 *
 * This is the required-CI gate: it runs under the unit-tests check via
 * `bun nx affected -t test`, so a change that breaks emission (a dropped
 * `@source`, a scanner-invisible candidate shape, a family the theme no
 * longer defines) fails CI instead of shipping unstyled pages. It also pins
 * the round-2 ruling's cascade conditions FOR THE VARIANT TWINS: variant
 * twin rules sort after their base-tier counterparts, shorthand twins sort
 * before longhand twins within a variant, and media twins sit under the
 * correct (max-width, never min-width) at-rules.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { Scanner } from '@tailwindcss/oxide'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { compile } from 'tailwindcss'
import { beforeAll, describe, expect, it } from 'vitest'
import { Check } from '../components/icons/Check'
import { FlexCompat } from '../flex-compat/FlexCompat'
import { compatClosedSetEntries } from './closed-set-manifest'
import { CURATED_SURFACE_3496_FIXTURE, emittedClassNames, NAMED_GROUP_REVEAL_TWINS } from './emitted-classes'
import { arbitraryPropertyVarClass, REACHABLE_VARIANT_PREFIXES, varIndirectionClasses } from './inline-style'
import { VARIANT_TWIN_PROPS } from './twin-tiers'

const mycRoot = join(__dirname, '..', '..')
const requireFromHere = createRequire(__filename)

/** The app-side stack, minus app sources: only mycelium's own @source registrations feed the scanner. */
const ENTRY_CSS = '@import "tailwindcss" source(none);\n@import "@universe/mycelium/tailwind";\n'

/** The compiled selector of a twin class (Tailwind backslash-escapes every non-word character). */
function twinSelector(className: string): string {
  return `.${className.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)}`
}

async function loadStylesheet(id: string, base: string): Promise<{ content: string; base: string; path: string }> {
  let path: string
  if (id.startsWith('.')) {
    path = resolve(base, id)
  } else if (id === 'tailwindcss') {
    path = requireFromHere.resolve('tailwindcss/index.css')
  } else if (id === '@universe/mycelium/tailwind') {
    path = join(mycRoot, 'tailwind.css')
  } else if (id === '@universe/tailwind/tailwind') {
    path = join(mycRoot, '..', 'tailwind', 'tailwind.css')
  } else {
    path = requireFromHere.resolve(id)
  }
  return { content: readFileSync(path, 'utf8'), base: dirname(path), path }
}

describe('compat emission gate', () => {
  let css = ''
  let candidates: string[] = []
  let compiler: Awaited<ReturnType<typeof compile>>

  beforeAll(async () => {
    compiler = await compile(ENTRY_CSS, { base: mycRoot, loadStylesheet })
    // The compiler's sources are exactly the @source registrations (the
    // tailwindcss import is source(none)) — scan them like the vite plugin.
    if (compiler.sources.length === 0) {
      throw new Error('mycelium tailwind entry registers no @source — the compat safelist registration is gone')
    }
    const scanner = new Scanner({ sources: compiler.sources })
    candidates = scanner.scan()
    css = compiler.build(candidates)
  }, 120_000)

  it('the @source registration points at the checked-in safelist', () => {
    const entry = readFileSync(join(mycRoot, 'tailwind.css'), 'utf8')
    expect(entry).toContain('@source "./compat-classes.gen.txt"')
  })

  it('the oxide scanner extracts the closed set from the safelist file', () => {
    // Single aggregate assertion: one expect per entry costs seconds of
    // matcher overhead and times out on loaded CI runners.
    const scanned = new Set(candidates)
    const missed = compatClosedSetEntries().filter((cls) => !scanned.has(cls))
    expect(missed, `scanner missed candidates:\n${missed.slice(0, 25).join('\n')}`).toHaveLength(0)
  })

  it('every closed-set class appears in the compiled stylesheet', () => {
    const emitted = emittedClassNames(css)
    const missing = compatClosedSetEntries().filter((cls) => !emitted.has(cls))
    expect(missing, `classes with no emitted CSS:\n${missing.slice(0, 25).join('\n')}`).toHaveLength(0)
  })

  it('var-indirection twins emit the correct CSS property (data-type hints resolve)', () => {
    // The hinted twins are the ambiguous ones — an untyped var() arbitrary
    // value could resolve to the wrong property for text/bg/border.
    expect(css).toContain('background-color: var(--c-bg)')
    expect(css).toContain('font-size: var(--c-text)')
    expect(css).toContain('border-width: var(--c-border)')
    expect(css).toContain('border-color: var(--c-bdc)')
    expect(css).toContain('min-width: var(--c-min-w)')
    expect(css).toContain('cursor: var(--c-c)')
    // And the same hints hold under variant prefixes.
    expect(css).toContain('background-color: var(--ch-bg)')
    expect(css).toContain('background-color: var(--cEh-bg)')
  })

  it('shorthand var twins sort before their longhands (the {m:7, mt:token} cascade)', () => {
    // Legacy {m:7, mt:'$spacing12'} rendered 12px on top because .mt-* sorts
    // after .m-* — the var twin must keep that cascade position.
    const mIndex = css.indexOf('.m-\\[var\\(--c-m\\)\\]')
    const mtIndex = css.indexOf('.mt-\\[12px\\]')
    expect(mIndex).toBeGreaterThan(-1)
    expect(mtIndex).toBeGreaterThan(mIndex)
    const pIndex = css.indexOf('.p-\\[var\\(--c-p\\)\\]')
    const ptIndex = css.indexOf('.pt-\\[12px\\]')
    expect(pIndex).toBeGreaterThan(-1)
    expect(ptIndex).toBeGreaterThan(pIndex)
  })

  it('variant twins keep the shorthand-before-longhand cascade within their own tier', () => {
    const mIndex = css.indexOf('.hover\\:m-\\[var\\(--ch-m\\)\\]')
    const mtIndex = css.indexOf('.hover\\:mt-\\[var\\(--ch-mt\\)\\]')
    expect(mIndex).toBeGreaterThan(-1)
    expect(mtIndex).toBeGreaterThan(mIndex)
  })

  it('the border-color shorthand twin sorts before every side-longhand twin in each tier carrying the family (INFRA-3654)', () => {
    // borderColor + a side longhand in the same pool resolve at equal
    // single-class specificity, so stylesheet order IS the cascade: the
    // shorthand rule must precede each side rule for the side to win.
    // Data-driven off the tier tables so regeneration keeps it honest: every
    // prefix whose twin row carries the shorthand (base + all variant
    // prefixes; named-group rows carry no border-color family) must carry
    // all four side longhands, emitted after it.
    const sideProps = VARIANT_TWIN_PROPS.filter((prop) => /^border-(?:top|right|bottom|left)-color$/.test(prop))
    expect(sideProps, 'the side-color quartet must stay in the variant tier table').toHaveLength(4)
    const covered: string[] = []
    const violations: string[] = []
    for (const prefix of ['', ...REACHABLE_VARIANT_PREFIXES]) {
      const row = new Set(varIndirectionClasses(prefix))
      const shorthand = arbitraryPropertyVarClass('border-color', prefix)
      if (!row.has(shorthand)) {
        continue
      }
      covered.push(prefix)
      const shorthandIndex = css.indexOf(twinSelector(shorthand))
      if (shorthandIndex === -1) {
        violations.push(`${shorthand}: no emitted rule`)
        continue
      }
      for (const prop of sideProps) {
        const longhand = arbitraryPropertyVarClass(prop, prefix)
        if (!row.has(longhand)) {
          violations.push(`${longhand}: missing from its tier's twin row`)
          continue
        }
        const longhandIndex = css.indexOf(twinSelector(longhand))
        if (longhandIndex === -1) {
          violations.push(`${longhand}: no emitted rule`)
        } else if (longhandIndex < shorthandIndex) {
          violations.push(`${longhand}: sorts before its shorthand twin ${shorthand}`)
        }
      }
    }
    expect(violations, `cascade violations:\n${violations.slice(0, 25).join('\n')}`).toHaveLength(0)
    // Anchor the loop's coverage so a tier-table change cannot silently
    // reduce this test to a no-op.
    expect(covered[0]).toBe('')
    expect(covered).toContain('hover')
    expect(covered).toContain('media-md:hover')
  })

  it('variant twins sort after the base tier for the same surface (variant wins at equal specificity)', () => {
    const cases: [string, string][] = [
      // Base enumerated class vs its variant twin (enum → arbitrary-property twin).
      ['.flex-col', '.media-md\\:\\[flex-direction\\:var\\(--cE-fd\\)\\]'],
      ['.items-stretch', '.media-md\\:\\[align-items\\:var\\(--cE-ai\\)\\]'],
      ['.bg-surface2', '.hover\\:bg-\\[color\\:var\\(--ch-bg\\)\\]'],
      // Base enumerated value vs the composite twin (the flipped round-2 probe).
      ['.gap-\\[8px\\]', '.media-md\\:hover\\:gap-\\[var\\(--cEh-gap\\)\\]'],
      // Base twin vs variant twin of the same utility.
      ['.gap-\\[var\\(--c-gap\\)\\]', '.hover\\:gap-\\[var\\(--ch-gap\\)\\]'],
    ]
    for (const [base, variant] of cases) {
      const baseIndex = css.indexOf(base)
      const variantIndex = css.indexOf(variant)
      expect(baseIndex, base).toBeGreaterThan(-1)
      expect(variantIndex, variant).toBeGreaterThan(baseIndex)
    }
  })

  it('media twins compile to the real Tamagui breakpoint (inclusive max-width 640)', () => {
    // NEVER Tailwind's mobile-first `md:` (min-width) — the compat contract
    // is byte-identical to ui/src/theme/media.ts.
    const index = css.indexOf('.media-md\\:gap-\\[var\\(--cE-gap\\)\\]')
    expect(index).toBeGreaterThan(-1)
    const enclosingMedia = css.indexOf('@media', index)
    expect(enclosingMedia).toBeGreaterThan(-1)
    expect(css.slice(enclosingMedia, enclosingMedia + 60)).toContain('@media (max-width: 640px)')
    expect(css).not.toContain('@media (min-width: 640px)')
  })

  it('a pooled margin shorthand beats a hoisted base longhand (icon pool overrides win the outcome, not just the channel)', () => {
    // `<Check mr="$spacing8" $xs={{ margin: 0 }} />` hoists the base `mr`
    // into the class channel (MARGIN_FAMILY, composeIconPools) and the pooled
    // shorthand rides the media var twin. Tailwind's shorthand-before-longhand
    // property sort is WITHIN a tier; the variant tier sorts after the ENTIRE
    // base tier, so at the xs breakpoint the pooled `margin: var(--cG-m)`
    // beats `margin-right: 8px` at equal single-class specificity by source
    // order — the resolved cascade outcome, not merely class presence.
    const markup = renderToStaticMarkup(createElement(Check, { mr: '$spacing8', $xs: { margin: 0 } }))
    expect(markup).toContain('mr-[8px]')
    expect(markup).toContain('media-xs:m-[var(--cG-m)]')
    expect(markup).toContain('--cG-m:0px')
    const baseIndex = css.indexOf('.mr-\\[8px\\]')
    const twinIndex = css.indexOf('.media-xs\\:m-\\[var\\(--cG-m\\)\\]')
    // Bare single-class selectors on both sides — equal specificity, so the
    // later rule owns the shared margin channel when the media query matches.
    expect(css.slice(baseIndex, baseIndex + 60)).toMatch(/^\.mr-\\\[8px\\\] \{\s+margin-right: 8px;/)
    expect(twinIndex, 'the variant twin must sort after the whole base tier').toBeGreaterThan(baseIndex)
    const twinWindow = css.slice(twinIndex, twinIndex + 160)
    expect(twinWindow).toContain('@media (max-width: 380px)')
    expect(twinWindow).toContain('margin: var(--cG-m)')
  })

  it('raw-CSS base margins hoist as emitted classes and still lose to the pooled override in the cascade (round 6)', () => {
    const markup = renderToStaticMarkup(createElement(Check, { mr: '16px', $xs: { margin: 0 } }))
    expect(markup).toContain('mr-[16px]')
    expect(markup).toContain('media-xs:m-[var(--cG-m)]')
    expect(markup).toContain('--cG-m:0px')
    // "16px" coincides with a token px, so the hoisted class is in-set; a
    // raw string outside the token set rides the base mr twin instead. Both
    // sort before the pooled variant twin, which owns the channel at ≤380px.
    const twinIndex = css.indexOf('.media-xs\\:m-\\[var\\(--cG-m\\)\\]')
    for (const base of ['.mr-\\[16px\\]', '.mr-\\[var\\(--c-mr\\)\\]']) {
      const baseIndex = css.indexOf(base)
      expect(baseIndex, base).toBeGreaterThan(-1)
      expect(twinIndex, 'the variant twin must sort after the base tier').toBeGreaterThan(baseIndex)
    }
    expect(css.slice(twinIndex, twinIndex + 160)).toContain('@media (max-width: 380px)')
  })

  it('a non-token base size hoists onto the safelisted var twins and the pooled sizing wins the cascade (round 6)', () => {
    const markup = renderToStaticMarkup(createElement(Check, { size: { width: 120, height: 34 }, $xs: { size: 16 } }))
    for (const cls of ['w-[var(--c-w)]', 'h-[var(--c-h)]', 'media-xs:w-[var(--cG-w)]', 'media-xs:h-[var(--cG-h)]']) {
      expect(markup, 'both tiers ride safelisted var twins').toContain(cls)
    }
    expect(markup).toContain('--c-w:120px')
    expect(markup).toContain('--c-h:34px')
    const baseIndex = css.indexOf('.w-\\[var\\(--c-w\\)\\]')
    const twinIndex = css.indexOf('.media-xs\\:w-\\[var\\(--cG-w\\)\\]')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(twinIndex, 'the pooled sizing twin must sort after the base twin').toBeGreaterThan(baseIndex)
    const twinWindow = css.slice(twinIndex, twinIndex + 160)
    expect(twinWindow).toContain('@media (max-width: 380px)')
    expect(twinWindow).toContain('width: var(--cG-w)')
  })

  it('container descendant CSS outranks the hoisted sizing channel — the pool lane accepts FlexCompat class semantics', () => {
    // Pooling the sizing channel hoists the base size out of inline style
    // (inline would beat the pooled twin unconditionally, killing the
    // override)…
    const markup = renderToStaticMarkup(createElement(Check, { size: '$icon.20', $xs: { size: '$icon.16' } }))
    for (const cls of ['w-[20px]', 'h-[20px]', 'media-xs:w-[var(--cG-w)]', 'media-xs:h-[var(--cG-h)]']) {
      expect(markup, 'pooled sizing rides the class channel').toContain(cls)
    }
    expect(markup, 'the hoisted base size must leave the inline channel').not.toContain('width:20px')
    // …which trades the BASE lane's container-CSS invariant (the parity
    // channel matrix pins `[&_svg]:size-4` losing to inline style for the
    // pool-free case): the container rule compiles to one class + one type
    // selector — specificity (0,1,1) — while the hoisted class and the twin
    // are bare classes at (0,1,0), so under an active sizing pool the
    // container rule wins. That is the same cascade position as every
    // FlexCompat style (Flex has no inline lane at all): accepted compat
    // class-channel semantics, pinned here because no class can beat it —
    // only inline style outranks it, and inline can't be variant-overridden.
    const withContainer = compiler.build([...candidates, '[&_svg]:size-4'])
    const containerIndex = withContainer.indexOf('.\\[\\&_svg\\]\\:size-4')
    expect(containerIndex).toBeGreaterThan(-1)
    const containerWindow = withContainer.slice(containerIndex, containerIndex + 200)
    expect(containerWindow, 'the descendant svg type selector is the extra specificity').toContain('& svg')
    expect(containerWindow).toContain('width: calc(var(--spacing) * 4)')
    expect(
      withContainer.slice(withContainer.indexOf('.w-\\[20px\\]'), withContainer.indexOf('.w-\\[20px\\]') + 40),
    ).toMatch(/^\.w-\\\[20px\\\] \{\s+width: 20px;/)
  })

  it('named-group reveal twins are emitted and scope to the group/<name> anchor (INFRA-3481)', () => {
    // The INFRA-3143 repro pair, rendered through the real component: a
    // `group="item"` anchor (HookSearchModal row) revealing a hidden child on
    // hover (HookCard's copy affordance).
    const markup = renderToStaticMarkup(
      createElement(
        FlexCompat,
        { group: 'item' },
        createElement(FlexCompat, { display: 'none', '$group-item-hover': { display: 'flex' } }),
      ),
    )
    expect(markup).toContain('group/item')
    expect(markup).toContain('group-hover/item:[display:var(--cghi-di)]')
    expect(markup).toContain('--cghi-di:flex')
    // The compiled stylesheet carries a real rule for every reveal twin —
    // before INFRA-3481 there was none, so the reveal silently no-opped.
    const emitted = emittedClassNames(css)
    const missing = NAMED_GROUP_REVEAL_TWINS.filter((cls) => !emitted.has(cls))
    expect(missing, `named-group reveal twins with no emitted CSS:\n${missing.join('\n')}`).toHaveLength(0)
    // And the display-flip rule resolves against the NAMED anchor's marker
    // class under :hover, reading the twin's custom property.
    const index = css.indexOf('.group-hover\\/item\\:\\[display\\:var\\(--cghi-di\\)\\]')
    expect(index).toBeGreaterThan(-1)
    const window = css.slice(index, index + 220)
    expect(window).toContain('.group\\/item')
    expect(window).toContain(':hover')
    expect(window).toContain('display: var(--cghi-di)')
  })

  it('the P6-P8 curated-surface classes compile to real rules (INFRA-3496)', () => {
    // Every fixture entry has a rule in the compiled stylesheet — before
    // INFRA-3496 the values were outside the curated unions entirely.
    const emitted = emittedClassNames(css)
    const missing = CURATED_SURFACE_3496_FIXTURE.filter((cls) => !emitted.has(cls))
    expect(missing, `curated-surface classes with no emitted CSS:\n${missing.join('\n')}`).toHaveLength(0)
    // The declarations are the real ones, not just selectors.
    for (const [selector, declaration] of [
      ['.\\[white-space\\:wrap\\]', 'white-space: wrap'],
      ['.\\[white-space\\:initial\\]', 'white-space: initial'],
      ['.\\[overflow-wrap\\:anywhere\\]', 'overflow-wrap: anywhere'],
      ['.\\[text-decoration\\:underline\\]', 'text-decoration: underline'],
      ['.\\[display\\:grid\\]', 'display: grid'],
    ] as const) {
      const index = css.indexOf(selector)
      expect(index, selector).toBeGreaterThan(-1)
      expect(css.slice(index, index + 120), selector).toContain(declaration)
    }
    // The grid utilities the Flex display map now points at.
    expect(css).toMatch(/\.grid \{\s+display: grid;/)
    expect(css).toMatch(/\.inline-grid \{\s+display: inline-grid;/)
  })

  it('composite twins nest the media at-rule OUTSIDE the pseudo state', () => {
    const index = css.indexOf('.media-md\\:hover\\:gap-\\[var\\(--cEh-gap\\)\\]')
    expect(index).toBeGreaterThan(-1)
    const window = css.slice(index, index + 220)
    const mediaIndex = window.indexOf('@media (max-width: 640px)')
    const hoverIndex = window.indexOf('&:hover')
    expect(mediaIndex).toBeGreaterThan(-1)
    expect(hoverIndex).toBeGreaterThan(mediaIndex)
  })
})
