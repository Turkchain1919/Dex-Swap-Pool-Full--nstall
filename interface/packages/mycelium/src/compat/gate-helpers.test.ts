/**
 * Unit gates for the shared compat-gate helpers (INFRA-3296): the three app
 * gates consume these, so each failure mode is proven red HERE, once, instead
 * of three diverging copies proving nothing.
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertClosedSetFloor,
  assertProbeLeakCanariesNonEmpty,
  assertSidecarGateListsNonEmpty,
  CLOSED_SET_FLOOR,
  declaresKeyframes,
  definedCustomProperties,
  readClosedSet,
  referencedCustomProperties,
  unresolvedCustomProperties,
} from './gate-helpers'

describe('readClosedSet', () => {
  it('throws loudly on a missing file — an @source at a missing path is a silent Tailwind no-op', () => {
    expect(() => readClosedSet(join(tmpdir(), 'does-not-exist', 'compat-classes.gen.txt'))).toThrow(/silent\s+no-op/)
  })

  it('applies the comment-and-blank filter every gate must share', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gate-helpers-'))
    const file = join(dir, 'safelist.txt')
    writeFileSync(file, '/* header */\nalpha\n\nbeta\n/* trailing */\n')
    expect(readClosedSet(file)).toEqual(['alpha', 'beta'])
  })
})

describe('assertClosedSetFloor', () => {
  it('throws below the floor, passes at it', () => {
    expect(() => assertClosedSetFloor(['one', 'two'])).toThrow(/looks gutted/)
    expect(() => assertClosedSetFloor(Array.from({ length: CLOSED_SET_FLOOR }, (_, i) => String(i)))).not.toThrow()
  })
})

describe('vacuous-pass guards', () => {
  it('the shipped lists are non-empty, so the guards pass today', () => {
    expect(() => assertProbeLeakCanariesNonEmpty()).not.toThrow()
    expect(() => assertSidecarGateListsNonEmpty()).not.toThrow()
  })
})

describe('custom-property resolution helpers', () => {
  it('collects references and definitions by prefix', () => {
    const css = '.a { color: var(--stext-x); } :root { --stext-y: red; --other-z: blue; }'
    expect(referencedCustomProperties(css, '--stext-')).toEqual(new Set(['--stext-x']))
    expect(definedCustomProperties(css, '--stext-')).toEqual(new Set(['--stext-y']))
    expect(unresolvedCustomProperties(css, '--stext-')).toEqual(['--stext-x'])
  })

  it('a fallback-carrying reference is resolvable, not unresolved (INFRA-3296 folded finding)', () => {
    const css = '.a { color: var(--stext-x, red); }'
    expect(referencedCustomProperties(css, '--stext-')).toEqual(new Set(['--stext-x']))
    expect(unresolvedCustomProperties(css, '--stext-')).toEqual([])
    // Whitespace before the comma still counts as a fallback.
    expect(unresolvedCustomProperties('.a { color: var(--stext-x , red); }', '--stext-')).toEqual([])
  })

  it('a property referenced elsewhere WITHOUT a fallback still needs a definition', () => {
    const css = '.a { color: var(--stext-x, red); } .b { color: var(--stext-x); }'
    expect(unresolvedCustomProperties(css, '--stext-')).toEqual(['--stext-x'])
  })

  it('runtime-assigned properties are never unresolved', () => {
    expect(unresolvedCustomProperties('.a { outline: var(--sbtn-custom-outline); }', '--sbtn-')).toEqual([])
  })

  it('a bare `--stext-` match is a known oxide parser artifact, never unresolved (INFRA-3599, filtered at the root in `referencedWithoutFallback`)', () => {
    expect(unresolvedCustomProperties('.a { color: var(--stext-); }', '--stext-')).toEqual([])
    // A real, non-artifact property under the same prefix is still caught —
    // this would false-negative if the root filter over-excluded by prefix
    // instead of exact name.
    expect(unresolvedCustomProperties('.a { color: var(--stext-); color: var(--stext-x); }', '--stext-')).toEqual([
      '--stext-x',
    ])
  })

  it('a bare `--stext-` artifact does not count as a reference — both gate callers size() this set for their vacuous-pass guard', () => {
    // Artifact-only: must report 0 referenced, not 1 (a stylesheet carrying
    // only the artifact would otherwise report "1 referenced, all resolved").
    expect(referencedCustomProperties('.a { color: var(--stext-); }', '--stext-')).toEqual(new Set())
    // A real reference alongside the artifact is still counted.
    expect(referencedCustomProperties('.a { color: var(--stext-); color: var(--stext-x); }', '--stext-')).toEqual(
      new Set(['--stext-x']),
    )
  })

  it('declaresKeyframes matches whole names only', () => {
    const css = '@keyframes stext-shine { from { opacity: 0 } }'
    expect(declaresKeyframes(css, 'stext-shine')).toBe(true)
    expect(declaresKeyframes(css, 'shine')).toBe(false)
  })
})
