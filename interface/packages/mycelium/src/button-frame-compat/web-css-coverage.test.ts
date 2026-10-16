/**
 * CSS-coverage gate for button-frame-compat's OWN class tables (the
 * IconButtonFrame / DropdownButtonFrame / DropdownButtonText styled()-
 * extension deltas), ported from `../button-compat/web-css-coverage.test.ts`
 * — see that file's header for the full doctrine. Short version: Tailwind v4
 * generates CSS from Oxide's TEXT scan of the registered `@source` roots, so
 * a class that compiles and renders but was never scanner-visible paints
 * NOTHING, silently. These tables introduce compound tokens that exist
 * nowhere else as source text (`group-hover/sbtn:text-neutral2-hovered`,
 * `hover:border-surface3-hovered`, …), so the gate proves, per class:
 *
 *  1. the compiled consumer stylesheet declares a real rule for it
 *     (real `tailwindcss` compile over a real Oxide scan of mycelium src);
 *  2. apps/web's Tailwind entry registers a scan root that reaches this
 *     package, and the class is a candidate in that scan.
 *
 * The closed ButtonCompat surface this module re-emits is already gated by
 * the sibling file; the OPEN emission lane is the engine's own gated concern
 * (`../compat` emission gates). Only this module's literal tables are new.
 *
 * The scan/CSS helpers are vendored from the sibling gate (they are private
 * to that test file); their glob-matcher contract tests live there and are
 * not duplicated here. Promoting the harness to a shared testing module is a
 * primitives-owner follow-up.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve, sep } from 'node:path'
import { Scanner } from '@tailwindcss/oxide'
import { compile } from 'tailwindcss'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  DROPDOWN_EXPANDED_ICON_CLASSES,
  DROPDOWN_FRAME_BASE_CLASSES,
  DROPDOWN_FRAME_EXPANDED_CLASSES,
  DROPDOWN_TEXT_EXPANDED_CLASSES,
  ICON_BUTTON_ICON_SIZE_CLASSES,
  ICON_BUTTON_SIZE_CLASSES,
} from './compile'

const requireFromHere = createRequire(import.meta.url)
const myceliumRoot = resolve(dirname(new URL(import.meta.url).pathname), '..', '..')
const myceliumSrc = join(myceliumRoot, 'src')
const tailwindPkgRoot = join(myceliumRoot, '..', 'tailwind')

/** The consumer that ships the web leg. Read by path only — never imported. */
const webAppRoot = resolve(myceliumRoot, '..', '..', 'apps', 'web')
const webTailwindEntry = join(webAppRoot, 'src', 'tailwind.css')

/* ------------------------ what these tables can emit ----------------------- */

/** Every distinct class token the six tables can put into a className. */
function tableClasses(): Set<string> {
  const all = new Set<string>()
  const add = (classes: string): void => {
    for (const cls of classes.split(' ').filter(Boolean)) {
      all.add(cls)
    }
  }
  for (const table of [ICON_BUTTON_SIZE_CLASSES, ICON_BUTTON_ICON_SIZE_CLASSES, DROPDOWN_FRAME_EXPANDED_CLASSES]) {
    for (const cell of Object.values(table)) {
      add(cell)
    }
  }
  add(DROPDOWN_FRAME_BASE_CLASSES)
  add(DROPDOWN_TEXT_EXPANDED_CLASSES)
  add(DROPDOWN_EXPANDED_ICON_CLASSES)
  return all
}

/* -------------------- vendored scan/CSS helpers (sibling gate) -------------------- */

async function loadStylesheet(id: string, base: string): Promise<{ content: string; base: string; path: string }> {
  let path: string
  if (id.startsWith('.')) {
    path = resolve(base, id)
  } else if (id === 'tailwindcss') {
    path = requireFromHere.resolve('tailwindcss/index.css')
  } else if (id === '@universe/mycelium/tailwind') {
    path = join(myceliumRoot, 'tailwind.css')
  } else if (id === '@universe/tailwind/tailwind') {
    path = join(tailwindPkgRoot, 'tailwind.css')
  } else {
    path = requireFromHere.resolve(id)
  }
  return { content: readFileSync(path, 'utf8'), base: dirname(path), path }
}

/** Unescape a CSS class selector (`.hover\:bg-x:hover` → `hover:bg-x`). */
function unescapeClass(raw: string): string {
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '\\') {
      i++
      out += i < raw.length ? raw[i] : ''
    } else {
      out += raw[i]
    }
  }
  return out
}

function plainUtilityClass(selector: string): string | undefined {
  if (!selector.startsWith('.')) {
    return undefined
  }
  const withoutEscapes = selector.slice(1).replaceAll(/\\./g, 'x')
  return /[\s>+~:[\]()&*,]/.test(withoutEscapes) ? undefined : unescapeClass(selector.slice(1))
}

function hasDeclaration(subtree: string): boolean {
  return /[-a-zA-Z]+\s*:[^;{}]*;/.test(subtree)
}

/** Class names the compiled stylesheet actually declares something for. */
function declaredClasses(css: string): Set<string> {
  const declared = new Set<string>()
  const walk = (block: string): void => {
    let i = 0
    let preludeStart = 0
    while (i < block.length) {
      const ch = block[i]
      if (ch === '{') {
        const prelude = block.slice(preludeStart, i).trim()
        const bodyStart = i + 1
        let depth = 1
        let j = bodyStart
        while (j < block.length && depth > 0) {
          if (block[j] === '{') {
            depth++
          } else if (block[j] === '}') {
            depth--
          }
          j++
        }
        const body = block.slice(bodyStart, depth === 0 ? j - 1 : j)
        if (hasDeclaration(body)) {
          for (const part of prelude.split(',')) {
            const cls = plainUtilityClass(part.trim())
            if (cls !== undefined) {
              declared.add(cls)
            }
          }
        }
        walk(body)
        i = j
        preludeStart = i
        continue
      }
      if (ch === '}' || ch === ';') {
        preludeStart = i + 1
      }
      i++
    }
  }
  walk(css)
  return declared
}

interface CompiledSheet {
  css: string
  candidates: string[]
  declared: Set<string>
}

interface ScanSource {
  base: string
  pattern: string
  negated: boolean
}

const MYCELIUM_SOURCE: ScanSource = { base: myceliumSrc, pattern: '**/*', negated: false }

function scanCandidates(sources: ScanSource[]): string[] {
  return new Scanner({ sources }).scan()
}

async function compileFromScannedSources(): Promise<CompiledSheet> {
  const { build } = await consumerEntry()
  const candidates = scanCandidates([MYCELIUM_SOURCE])
  const css = build(candidates)
  return { css, candidates, declared: declaredClasses(css) }
}

interface ConsumerEntry {
  roots: ScanSource[]
  build: (candidates: string[]) => string
}

let entryCompile: Promise<ConsumerEntry> | undefined

function consumerEntry(): Promise<ConsumerEntry> {
  entryCompile ??= (async () => {
    const { root, sources, build } = await compile(readFileSync(webTailwindEntry, 'utf8'), {
      base: dirname(webTailwindEntry),
      loadStylesheet,
    })
    const implicit: ScanSource[] =
      root === 'none'
        ? []
        : root === null
          ? [{ base: webAppRoot, pattern: '**/*', negated: false }]
          : [{ ...root, negated: false }]
    return { roots: [...implicit, ...sources], build }
  })()
  return entryCompile
}

function rootPath(source: ScanSource): string {
  return resolve(source.base, source.pattern)
}

function segmentMatches(segment: string, literal: string): boolean {
  if (!/[*?[{]/.test(segment)) {
    return segment === literal
  }
  let source = ''
  let braces = 0
  let inClass = false
  for (const ch of segment) {
    if (inClass) {
      source += ch
      inClass = ch !== ']'
    } else if (ch === '*') {
      source += '.*'
    } else if (ch === '?') {
      source += '.'
    } else if (ch === '[') {
      source += '['
      inClass = true
    } else if (ch === '{') {
      braces++
      source += '(?:'
    } else if (ch === '}' && braces > 0) {
      braces--
      source += ')'
    } else if (ch === ',' && braces > 0) {
      source += '|'
    } else {
      source += ch.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    }
  }
  return new RegExp(`^${source}$`).test(literal)
}

function globReaches(glob: string, dir: string): boolean {
  const globSegments = glob.split(sep).filter(Boolean)
  const dirSegments = dir.split(sep).filter(Boolean)
  for (let i = 0; i < Math.min(globSegments.length, dirSegments.length); i++) {
    const segment = globSegments[i] ?? ''
    if (segment === '**') {
      return true
    }
    if (!segmentMatches(segment, dirSegments[i] ?? '')) {
      return false
    }
  }
  return true
}

function positiveRootsReaching(sources: ScanSource[], dir: string): ScanSource[] {
  return sources.filter((source) => !source.negated && globReaches(rootPath(source), dir))
}

function consumerScan(sources: ScanSource[], dir: string): { positives: ScanSource[]; candidates: Set<string> } {
  const positives = positiveRootsReaching(sources, dir)
  const negations = sources.filter((source) => source.negated)
  return { positives, candidates: new Set(scanCandidates([...positives, ...negations])) }
}

/* --------------------------------- the gate -------------------------------- */

describe('every class in the button-frame-compat tables resolves to a compiled CSS rule', () => {
  let sheet: CompiledSheet
  beforeAll(async () => {
    sheet = await compileFromScannedSources()
  })

  it('compiles the consumer stylesheet from a real Oxide scan of mycelium sources', () => {
    const { css, candidates, declared } = sheet
    expect(candidates.length).toBeGreaterThan(0)
    expect(css.length).toBeGreaterThan(0)
    expect(declared.size).toBeGreaterThan(0)
  })

  it('generates a rule for every table class (compound tokens included)', () => {
    const { declared, candidates } = sheet
    const classes = [...tableClasses()].sort()
    // Guard against the tables silently collapsing to nothing to assert on.
    expect(classes.length).toBeGreaterThanOrEqual(15)

    const missing = classes.filter((cls) => !declared.has(cls))
    const diagnosis = missing.map((cls) => `${cls} (scanner candidate: ${candidates.includes(cls) ? 'yes' : 'NO'})`)
    expect(
      diagnosis,
      'these table classes get emitted into the DOM but Tailwind generated no rule for them — they paint nothing. ' +
        'A "scanner candidate: NO" means the class exists nowhere in the scanned source text, so Oxide never saw it: ' +
        'the literal must live in ./compile.ts (runtime concatenation is invisible to the scanner).',
    ).toEqual([])
  })
})

describe('the app that ships the web leg scans mycelium for the table classes', () => {
  it('the apps/web Tailwind entry registers a root that scans them', async () => {
    const { roots } = await consumerEntry()
    const registered = roots.map((source) => `${source.negated ? '!' : ''}${rootPath(source)}`).join('\n  ')
    const { positives, candidates } = consumerScan(roots, myceliumSrc)
    expect(
      positives.length,
      `apps/web/src/tailwind.css registers no scan root reaching ${myceliumSrc}. Roots it registers:\n  ${registered}`,
    ).toBeGreaterThan(0)

    const classes = [...tableClasses()].sort()
    const unscanned = classes.filter((cls) => !candidates.has(cls))
    expect(
      unscanned,
      "these table classes are not candidates in apps/web's own build, so the app's Tailwind generates no rule for " +
        `them: widen the @source root back to cover ${myceliumSrc}, or drop the excluding @source not (marked "!"). ` +
        `Roots it registers:\n  ${registered}`,
    ).toEqual([])
  })
})
