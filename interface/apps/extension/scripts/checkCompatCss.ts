/* oxlint-disable no-console -- CLI script requires console output */
/**
 * Asserts the compat class safelist reaches the extension's built CSS (INFRA-3252).
 *
 * The compat compilers build class names at runtime, so no source scan can find them —
 * they exist only in `packages/mycelium/compat-classes.gen.txt`, registered as a Tailwind
 * `@source` by `src/app/tailwindSources.css`. An `@source` that is removed, or that points
 * at a missing file, is a silent no-op: the build stays green and every compat-styled
 * surface ships unstyled. These assertions close that gap:
 *
 * 1. **Registration** — `src/app/tailwindSources.css` still declares an `@source` naming the
 *    safelist. Fails with one message instead of thousands of missing-class errors.
 * 2. **Floor** — the safelist has not been gutted or truncated.
 * 3. **Subset** — every closed-set class has a rule in the built CSS.
 * 4. **Canaries** — mycelium's test-only probe classes are ABSENT, so the `@source not`
 *    test exclusions cannot silently regress and manufacture the evidence above.
 * 5. **Resolution (INFRA-3262)** — every `var(--stext-*)`/`var(--sbtn-*)` a built
 *    stylesheet references is defined in that stylesheet, and the side-car keyframes
 *    are present. Emission cannot see this: the classes emit unconditionally and
 *    render against undefined custom properties unless the mycelium side-car
 *    stylesheets are imported.
 *
 * The script understands two layouts via flags:
 *   --prod   apps/extension/.output/chrome-mv3/     (WXT production output, incl. the e2e build)
 *   --dev    apps/extension/.output/chrome-mv3-dev/ (WXT dev output)
 *
 * `WXT_ABSOLUTE_OUTDIR` overrides target detection (used by `start:absolute` workflows).
 * With no flag, both layouts are probed and the first one that exists is scanned.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
// Relative cross-package import (script-only): selector unescaping and the canary list MUST
// be shared with mycelium's emission gate so the two cannot diverge.
// nx-ignore-next-line
import { emittedClassNames, PROBE_LEAK_CANARIES } from '../../../packages/mycelium/src/compat/emitted-classes'
// Shared gate helpers (INFRA-3296): closed-set reader, floor, vacuous-pass
// guards and resolution semantics, one copy across the three compat gates.
// nx-ignore-next-line
import {
  assertClosedSetFloor,
  assertProbeLeakCanariesNonEmpty,
  assertSidecarGateListsNonEmpty,
  declaresKeyframes,
  readClosedSet as readClosedSetFile,
  referencedCustomProperties,
  REGENERATE_HINT,
  SIDECAR_KEYFRAMES,
  SIDECAR_PROPERTY_PREFIXES,
  unresolvedCustomProperties,
} from '../../../packages/mycelium/src/compat/gate-helpers'

const WXT_PROD_DIR = '.output/chrome-mv3'
const WXT_DEV_DIR = '.output/chrome-mv3-dev'

const args = process.argv.slice(2)
const devOnly = args.includes('--dev')
const prodOnly = args.includes('--prod')

const absoluteOutDir = process.env['WXT_ABSOLUTE_OUTDIR']

const dirsToCheck = absoluteOutDir
  ? [absoluteOutDir]
  : devOnly
    ? [WXT_DEV_DIR]
    : prodOnly
      ? [WXT_PROD_DIR]
      : [WXT_DEV_DIR, WXT_PROD_DIR]

const SAFELIST_FILE = path.join(__dirname, '..', '..', '..', 'packages', 'mycelium', 'compat-classes.gen.txt')
const SAFELIST_NAME = path.basename(SAFELIST_FILE)
const TAILWIND_SOURCES_FILE = path.join(__dirname, '..', 'src', 'app', 'tailwindSources.css')

function reportFailure(lines: string[]): void {
  console.error('\n❌ COMPAT CSS CHECK FAILED')
  console.error(`${lines.join('\n')}\n`)
}

function walkCssFiles(dir: string): string[] {
  const out: string[] = []
  const stack: string[] = [dir]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (entry.isFile() && entry.name.endsWith('.css')) {
        out.push(full)
      }
    }
  }
  return out
}

// The stylesheet must still register the safelist. Checked before the subset math so a
// removed registration reports itself rather than every class in the closed set.
function assertSafelistRegistered(): void {
  if (!fs.existsSync(TAILWIND_SOURCES_FILE)) {
    reportFailure([
      `Tailwind source registration not found at ${TAILWIND_SOURCES_FILE}.`,
      'Every extension stylesheet imports it; if it moved, update this script to match.',
    ])
    process.exit(1)
  }

  const registration = new RegExp(String.raw`@source\s+"[^"]*${SAFELIST_NAME.replace(/\./g, String.raw`\.`)}"`)
  if (!registration.test(fs.readFileSync(TAILWIND_SOURCES_FILE, 'utf-8'))) {
    reportFailure([
      `${path.relative(process.cwd(), TAILWIND_SOURCES_FILE)} no longer declares an @source for ${SAFELIST_NAME}.`,
      '',
      'The extension imports @universe/tailwind/tailwind.css, not the mycelium entry that registers',
      'the safelist, so without that line every runtime-computed compat class is pruned from the',
      'built CSS and compat-styled surfaces ship unstyled. Restore the @source directive.',
    ])
    process.exit(1)
  }
}

// A missing safelist is a SILENT no-op in Tailwind — the @source resolves to nothing and the
// build stays green. The shared reader throws loudly; keep this gate's report format.
function readClosedSet(): string[] {
  try {
    return readClosedSetFile(SAFELIST_FILE)
  } catch (error) {
    reportFailure([error instanceof Error ? error.message : String(error)])
    process.exit(1)
  }
}

function checkCompatCss(): void {
  let buildDir: string | null = null

  for (const dir of dirsToCheck) {
    const fullPath = path.isAbsolute(dir) ? dir : path.join(__dirname, '..', dir)
    if (fs.existsSync(fullPath)) {
      buildDir = fullPath
      break
    }
  }

  if (!buildDir) {
    console.error('No build output found. Run `bun build:e2e` first.')
    process.exit(1)
  }

  assertSafelistRegistered()
  const closedSet = readClosedSet()

  const cssFiles = walkCssFiles(buildDir)
  if (cssFiles.length === 0) {
    // A build layout change must FAIL here: zero CSS files would otherwise silently
    // disarm every assertion below and pass vacuously.
    reportFailure([
      `No .css files under ${path.relative(process.cwd(), buildDir) || buildDir} — the build output layout may have changed.`,
    ])
    process.exit(1)
  }

  const fileContents = new Map<string, string>()
  for (const file of cssFiles) {
    fileContents.set(file, fs.readFileSync(file, 'utf-8'))
  }

  const emitted = new Set<string>()
  for (const css of fileContents.values()) {
    for (const cls of emittedClassNames(css)) {
      emitted.add(cls)
    }
  }

  let hasErrors = false

  try {
    assertClosedSetFloor(closedSet)
  } catch (error) {
    reportFailure([error instanceof Error ? error.message : String(error)])
    hasErrors = true
  }

  const missing = closedSet.filter((cls) => !emitted.has(cls))
  if (missing.length > 0) {
    reportFailure([
      `${missing.length}/${closedSet.length} closed-set class(es) have no rule in the built CSS.`,
      'A compat-computed class that is not emitted ships silently unstyled surfaces.',
      '',
      'First missing classes:',
      ...missing.slice(0, 40).map((cls) => `  • ${cls}`),
      '',
      `Likely causes: the safelist is stale (${REGENERATE_HINT}), or the @source in`,
      `${path.relative(process.cwd(), TAILWIND_SOURCES_FILE)} no longer resolves to it.`,
    ])
    hasErrors = true
  }

  // Canaries live only in mycelium's test files. Emitting one means test files leaked back
  // into the @source scan, which would let the subset check pass on manufactured evidence.
  // An emptied canary list would make that check pass vacuously, so assert it first.
  try {
    assertProbeLeakCanariesNonEmpty()
  } catch (error) {
    reportFailure([error instanceof Error ? error.message : String(error)])
    process.exit(1)
  }

  const leaked = PROBE_LEAK_CANARIES.filter((cls) => emitted.has(cls))
  if (leaked.length > 0) {
    reportFailure([
      `${leaked.length} test-only probe class(es) found in the built CSS:`,
      ...leaked.map((cls) => `  • ${cls}`),
      '',
      `Restore the '@source not' test exclusions in packages/mycelium/tailwind-sources.css ` +
        `(imported by ${path.relative(process.cwd(), TAILWIND_SOURCES_FILE)}).`,
    ])
    hasErrors = true
  }

  // RESOLUTION gate (INFRA-3262), independent of the emission checks above:
  // arbitrary-property classes emit unconditionally, so every closed-set class can
  // have a rule while its var(--stext-*) dereferences a custom property nothing
  // defines — silently unstyled text, not an error. Custom properties resolve per
  // document, so each built stylesheet must define what it references. The
  // definitions come from mycelium's side-car stylesheets (text-compat.css,
  // shimmer.css, button-compat.css), imported by src/app/tailwind.css.
  //
  // An emptied prefix or keyframe list would make every check below pass with zero
  // assertions executed — the same vacuous pass as an emptied canary list — so assert both first.
  try {
    assertSidecarGateListsNonEmpty()
  } catch (error) {
    reportFailure([error instanceof Error ? error.message : String(error)])
    process.exit(1)
  }

  const sidecarReferencesSeen = new Map<string, number>(SIDECAR_PROPERTY_PREFIXES.map((prefix) => [prefix, 0]))
  for (const [file, css] of fileContents) {
    const relFile = path.relative(process.cwd(), file)

    let fileReferencesSidecars = false
    for (const prefix of SIDECAR_PROPERTY_PREFIXES) {
      const referenced = referencedCustomProperties(css, prefix).size
      if (referenced > 0) {
        fileReferencesSidecars = true
      }
      sidecarReferencesSeen.set(prefix, (sidecarReferencesSeen.get(prefix) ?? 0) + referenced)
      const unresolved = unresolvedCustomProperties(css, prefix)
      if (unresolved.length > 0) {
        reportFailure([
          `${unresolved.length} ${prefix}* custom propert(ies) referenced but never defined in ${relFile}:`,
          ...unresolved.slice(0, 20).map((name) => `  • ${name}`),
          '',
          'A rule that dereferences an undefined custom property ships silently unstyled.',
          'The definitions come from the mycelium side-car stylesheets — restore the',
          `@universe/mycelium/{text-compat,shimmer,button-compat}.css imports in the entry stylesheet that builds ${relFile}.`,
        ])
        hasErrors = true
      }
    }

    // The same side-cars declare the keyframes compat components animate by name at
    // runtime (TextCompat loading shine, Shimmer, ButtonCompat spinner) — equally
    // invisible to emission checks, so pin them wherever compat rules landed. Any
    // side-car reference counts — the twin checks its entries unconditionally, and a
    // stylesheet carrying only ButtonCompat rules still needs its spinner keyframes.
    if (fileReferencesSidecars) {
      const absent = SIDECAR_KEYFRAMES.filter((name) => !declaresKeyframes(css, name))
      if (absent.length > 0) {
        reportFailure([
          `@keyframes ${absent.join(', ')} missing from ${relFile}, which carries compat rules.`,
          `Restore the mycelium side-car stylesheet imports in the entry stylesheet that builds ${relFile}.`,
        ])
        hasErrors = true
      }
    }
  }

  // Every prefix has guaranteed referencing rules — the closed set emits --stext- ones,
  // ButtonCompat's scanned base classes emit --sbtn- ones — so zero references for any
  // one prefix means this gate stopped seeing it (parser or layout drift): fail per
  // prefix, never pass vacuously.
  for (const prefix of SIDECAR_PROPERTY_PREFIXES) {
    if (sidecarReferencesSeen.get(prefix) === 0) {
      reportFailure([
        `No var(${prefix}*) references found in any built stylesheet, but compat rules`,
        'reference such properties — the resolution gate is no longer seeing them.',
      ])
      hasErrors = true
    }
  }

  if (hasErrors) {
    process.exit(1)
  }

  console.log(
    `✅ Compat CSS check passed (${closedSet.length} closed-set classes present across ${cssFiles.length} CSS files in ${path.relative(process.cwd(), buildDir) || buildDir})`,
  )
}

checkCompatCss()
