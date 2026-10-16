/**
 * Writes `packages/mycelium/compat-classes.native.gen.txt` (INFRA-3253): the
 * native-safe subset of the generated compat safelist, for the entries that
 * register a `@source` for a uniwind/React Native scan (`apps/mobile/src/
 * global.css`).
 *
 * This is a FILTER, not a generator. INFRA-3217 (#37880) owns compat-class
 * enumeration; this script reads that generator's checked-in output byte-wise
 * and drops only what `src/compat/native-safe.ts` classifies as impossible on
 * native. Regenerating the web safelist and re-running this is the whole
 * maintenance story — there is no second vocabulary to keep in sync, and
 * `src/compat/native-safe.test.ts` fails if the checked-in artifact drifts
 * from a fresh filter.
 *
 * Run: `bun nx run @universe/mycelium:generate:compat-classes:native`
 * (chained after `generate:compat-classes`, which is its nx dependency).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { nativeCompatClassesFileContents, nativeUnsafeCensus, parseSafelistFile } from '../compat/native-safe'

const packageRoot = join(import.meta.dirname, '..', '..')
const safelistPath = join(packageRoot, 'compat-classes.gen.txt')
const nativePath = join(packageRoot, 'compat-classes.native.gen.txt')

const safelistContents = readFileSync(safelistPath, 'utf8')
const contents = nativeCompatClassesFileContents(safelistContents)
writeFileSync(nativePath, contents)

const total = parseSafelistFile(safelistContents).length
const kept = parseSafelistFile(contents).length
const census = nativeUnsafeCensus(parseSafelistFile(safelistContents))
process.stdout.write(
  `Wrote ${kept} of ${total} classes to ${nativePath} (excluded ${total - kept}: ${Object.entries(census)
    .map(([reason, count]) => `${reason} ${count}`)
    .join(', ')})\n`,
)
