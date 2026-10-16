/**
 * EMISSION GATE (INFRA-3252): proves the compat safelist registered by
 * `tailwindSources.css` actually turns into CSS. It reads each entry stylesheet
 * off disk and compiles that file — not a copy of it — with the real Tailwind v4
 * engine and the real oxide scanner, which is what `@tailwindcss/vite` does at
 * build time. Dropping or renaming any import in those files changes what this
 * gate compiles, so there is no mirror to drift.
 *
 * The gate runs once per entry stylesheet: `src/app/tailwind.css` (every UI
 * surface) and `src/entrypoints/tailwindDevTest.content/style.css` (the dev-only
 * content-script entry). The dev entry is stripped from non-development builds
 * (wxt.config.ts), so no built-output check — `scripts/checkCompatCss.ts`
 * included — ever sees its CSS; this suite is its only regression coverage.
 *
 * `scripts/checkCompatCss.ts` asserts the same checks — emission and
 * custom-property resolution alike — against built output, but the
 * extension's only PR-time build lives in the E2E workflow,
 * which is not a required check. This gate runs under `unit-tests`, which is —
 * so a dropped `@source`, a gutted safelist or a leaked test probe fails CI
 * instead of shipping unstyled compat surfaces.
 *
 * NO RAW CLASS-NAME LITERALS IN THIS FILE. It sits inside the extension's
 * Tailwind scan with no `@source not` exclusion, so a literal here — comments
 * included — would emit itself into the shipped CSS and make the gate a
 * tautology. Derive everything from the generated safelist; a literal probe
 * must go through `decodeFixture`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { Scanner } from '@tailwindcss/oxide'
import { compile } from 'tailwindcss'
import { beforeAll, describe, expect, it } from 'vitest'
// Relative cross-package import: the unescaping helper and the canary list MUST be shared with
// mycelium's emission gate and the built-output script so the three cannot diverge.
// nx-ignore-next-line
import { emittedClassNames, PROBE_LEAK_CANARIES } from '../../../../packages/mycelium/src/compat/emitted-classes'
// Shared gate helpers (INFRA-3296): closed-set reader, floor, and resolution
// semantics, one copy across the three compat gates.
// nx-ignore-next-line
import {
  assertProbeLeakCanariesNonEmpty,
  assertSidecarGateListsNonEmpty,
  CLOSED_SET_FLOOR,
  declaresKeyframes,
  readClosedSet as readClosedSetFile,
  referencedCustomProperties,
  REGENERATE_HINT,
  SIDECAR_KEYFRAMES,
  SIDECAR_PROPERTY_PREFIXES,
  unresolvedCustomProperties,
} from '../../../../packages/mycelium/src/compat/gate-helpers'

const APP_DIR = __dirname
const REPO_ROOT = join(APP_DIR, '..', '..', '..', '..')
const TAILWIND_PKG_DIR = join(REPO_ROOT, 'packages', 'tailwind')
const SAFELIST_FILE = join(REPO_ROOT, 'packages', 'mycelium', 'compat-classes.gen.txt')
const SAFELIST_NAME = basename(SAFELIST_FILE)

const requireFromHere = createRequire(__filename)

const SRC_DIR = join(APP_DIR, '..')

/**
 * The extension's real entry stylesheets, DISCOVERED rather than
 * hand-maintained (INFRA-3296 folded review item from #38457): every .css
 * under src/ that imports Tailwind itself is a compiled entry, so a new entry
 * stylesheet gets coverage here by default instead of by remembering to add
 * it to a list. Compiling each file itself is what makes the gate non-hollow;
 * `base` is the file's directory so relative imports and the `@source` paths
 * in tailwindSources.css resolve the way the real build resolves them.
 */
function discoverEntryStylesheets(): { entry: string; file: string }[] {
  const cssFiles: string[] = []
  const stack = [SRC_DIR]
  while (stack.length > 0) {
    const dir = stack.pop()
    if (dir === undefined) {
      continue
    }
    for (const dirent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, dirent.name)
      if (dirent.isDirectory()) {
        stack.push(full)
      } else if (dirent.isFile() && dirent.name.endsWith('.css')) {
        cssFiles.push(full)
      }
    }
  }
  return cssFiles
    .filter((file) => /@import\s+["']tailwindcss/.test(readFileSync(file, 'utf8')))
    .sort()
    .map((file) => ({ entry: join('src', relative(SRC_DIR, file)), file }))
}

const ENTRY_STYLESHEETS = discoverEntryStylesheets()

// An empty discovery would silently skip every describe.each below — the same
// vacuous pass as an emptied canary list — and both known entries must be
// found (a rename is news here, not a silent coverage loss).
it('entry-stylesheet discovery floor: the known entries are found', () => {
  const entries = ENTRY_STYLESHEETS.map(({ entry }) => entry)
  expect(entries).toContain('src/app/tailwind.css')
  expect(entries).toContain('src/entrypoints/tailwindDevTest.content/style.css')
  expect(entries.length).toBeGreaterThanOrEqual(2)
})

const UNIVERSE_TAILWIND_PKG = '@universe/tailwind'

/** Vite resolves @universe/tailwind through its `exports` map, so the entry imports declared
 * subpaths ("./fonts"), not package-relative file paths. Read the same map rather than guessing
 * physical paths, so any specifier the real entry can use resolves here too. */
function resolveUniverseTailwind(subpath: string): string {
  const pkg: unknown = JSON.parse(readFileSync(join(TAILWIND_PKG_DIR, 'package.json'), 'utf8'))
  // Values may be conditional-export OBJECTS, not just strings (#37306 is
  // reshaping this map) — a non-string value must fall through to the
  // deliberate undeclared-subpath error below, not crash join() with an
  // opaque ERR_INVALID_ARG_TYPE (INFRA-3296 fix bar item 4).
  const map = (pkg as { exports?: Record<string, unknown> }).exports ?? {}

  const exact = map[subpath]
  if (typeof exact === 'string') {
    return join(TAILWIND_PKG_DIR, exact)
  }
  for (const [pattern, target] of Object.entries(map)) {
    const star = pattern.indexOf('*')
    if (star === -1 || typeof target !== 'string' || !target.includes('*')) {
      continue
    }
    const prefix = pattern.slice(0, star)
    const suffix = pattern.slice(star + 1)
    if (subpath.length >= prefix.length + suffix.length && subpath.startsWith(prefix) && subpath.endsWith(suffix)) {
      return join(TAILWIND_PKG_DIR, target.replace('*', subpath.slice(prefix.length, subpath.length - suffix.length)))
    }
  }
  // An undeclared subpath fails the real Vite build too, so surface it rather than falling back.
  throw new Error(
    `"${UNIVERSE_TAILWIND_PKG}${subpath.slice(1)}" is not a declared export of packages/tailwind/package.json, ` +
      `so it cannot resolve in the real build either. Add the subpath to that "exports" map.`,
  )
}

async function loadStylesheet(id: string, base: string): Promise<{ content: string; base: string; path: string }> {
  let path: string
  if (id.startsWith('.')) {
    path = resolve(base, id)
  } else if (id === UNIVERSE_TAILWIND_PKG || id.startsWith(`${UNIVERSE_TAILWIND_PKG}/`)) {
    path = resolveUniverseTailwind(`.${id.slice(UNIVERSE_TAILWIND_PKG.length)}`)
  } else if (id === 'tailwindcss') {
    path = requireFromHere.resolve('tailwindcss/index.css')
  } else {
    path = requireFromHere.resolve(id)
  }
  return { content: readFileSync(path, 'utf8'), base: dirname(path), path }
}

// A missing safelist is a SILENT no-op in Tailwind — the @source resolves to nothing and the
// build stays green. The shared reader fails loudly, never skips.
function readClosedSet(): string[] {
  return readClosedSetFile(SAFELIST_FILE)
}

describe.each(ENTRY_STYLESHEETS)('extension compat emission gate ($entry)', ({ entry, file }) => {
  let css = ''
  let closedSet: string[] = []
  let sources: { base: string; pattern: string; negated: boolean }[] = []

  beforeAll(async () => {
    closedSet = readClosedSet()
    const compiler = await compile(readFileSync(file, 'utf8'), { base: dirname(file), loadStylesheet })
    sources = compiler.sources
    const scanner = new Scanner({ sources: compiler.sources })
    css = compiler.build(scanner.scan())
  }, 120_000)

  it('the entry chain still registers the checked-in safelist as a source', () => {
    const registered = sources.some(
      (source) => !source.negated && join(source.base, source.pattern).endsWith(SAFELIST_NAME),
    )
    expect(
      registered,
      `No non-negated @source names ${SAFELIST_NAME} (${sources.length} source registration(s) found).\n` +
        'The extension imports @universe/tailwind/tailwind.css, not the mycelium entry that registers\n' +
        'the safelist, so without that line in src/app/tailwindSources.css every runtime-computed\n' +
        'compat class is pruned from the built CSS and compat-styled surfaces ship unstyled.',
    ).toBe(true)
  })

  it('the safelist has not been gutted', () => {
    expect(
      closedSet.length,
      `The closed set has ${closedSet.length} classes (< ${CLOSED_SET_FLOOR}); the safelist looks gutted. ${REGENERATE_HINT}`,
    ).toBeGreaterThanOrEqual(CLOSED_SET_FLOOR)
  })

  it('every closed-set class appears in the compiled stylesheet', () => {
    // Single aggregate assertion: one expect per entry costs seconds of matcher overhead and
    // times out on loaded runners.
    const emitted = emittedClassNames(css)
    const missing = closedSet.filter((cls) => !emitted.has(cls))
    expect(
      missing,
      `${missing.length}/${closedSet.length} closed-set class(es) have no rule in the compiled CSS.\n` +
        `Likely causes: the safelist is stale (${REGENERATE_HINT}), or the @source no longer resolves to it.\n` +
        `${missing.slice(0, 25).join('\n')}`,
    ).toHaveLength(0)
  })

  it('every side-car custom property the compiled CSS references is defined in it', () => {
    // RESOLUTION gate (INFRA-3262), independent of emission: arbitrary-property classes
    // emit unconditionally, so every closed-set class can have a rule while its
    // var(--stext-*) dereferences a custom property nothing defines — silently unstyled
    // text, not an error. The definitions come from mycelium's side-car stylesheets
    // (text-compat.css, shimmer.css, button-compat.css) imported by each entry.
    // An emptied prefix list would make this check pass vacuously, so assert it first.
    assertSidecarGateListsNonEmpty()

    for (const prefix of SIDECAR_PROPERTY_PREFIXES) {
      // Every prefix has guaranteed referencing rules — the closed set emits --stext-
      // ones, ButtonCompat's scanned base classes emit --sbtn- ones — so zero references
      // means this gate stopped seeing them: fail, never pass vacuously.
      expect(
        referencedCustomProperties(css, prefix).size,
        `No var(${prefix}*) references in the compiled CSS, but compat rules reference such ` +
          'properties — the resolution gate is no longer seeing them.',
      ).toBeGreaterThan(0)

      const unresolved = unresolvedCustomProperties(css, prefix)
      expect(
        unresolved,
        `${unresolved.length} ${prefix}* custom propert(ies) referenced but never defined in the compiled CSS.\n` +
          'A rule that dereferences an undefined custom property ships silently unstyled. Restore the\n' +
          `@universe/mycelium/{text-compat,shimmer,button-compat}.css imports in ${entry}.\n` +
          unresolved.slice(0, 20).join('\n'),
      ).toHaveLength(0)
    }
  })

  it('the side-car keyframes compat components animate by name are compiled in', () => {
    // TextCompat's loading shine, Shimmer's sweep and ButtonCompat's spinner reference
    // these keyframes from runtime style objects — invisible to any class-emission check.
    // An emptied keyframe list would make this check pass vacuously, so assert it first.
    assertSidecarGateListsNonEmpty()

    const absent = SIDECAR_KEYFRAMES.filter((name) => !declaresKeyframes(css, name))
    expect(
      absent,
      `@keyframes ${absent.join(', ')} missing from the compiled CSS. Restore the mycelium\n` +
        `side-car stylesheet imports in ${entry}.`,
    ).toHaveLength(0)
  })

  it('no test-only probe class reaches the compiled stylesheet', () => {
    // Canaries live only in mycelium's test files. Emitting one means test files leaked back into
    // the scan, which would let the subset check pass on manufactured evidence.
    // An emptied canary list would make this assertion pass vacuously, so check it first.
    assertProbeLeakCanariesNonEmpty()

    const emitted = emittedClassNames(css)
    const leaked = PROBE_LEAK_CANARIES.filter((cls) => emitted.has(cls))
    expect(
      leaked,
      `Test-only probe class(es) in the compiled CSS — restore the '@source not' test exclusions in\n` +
        `src/app/tailwindSources.css:\n${leaked.slice(0, 25).join('\n')}`,
    ).toHaveLength(0)
  })
})
