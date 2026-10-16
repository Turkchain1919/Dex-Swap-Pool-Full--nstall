/**
 * Writes the closed compat class set (INFRA-3217):
 *  - `packages/mycelium/compat-classes.gen.txt` — the Tailwind `@source`
 *    safelist registered from `packages/mycelium/tailwind.css`;
 *  - `src/compat/family-classes.generated.ts` — the runtime membership
 *    literal (`closed-set-runtime.ts`), so the browser neither ships nor
 *    re-runs the enumeration module.
 *
 * The set is enumerated from the same token maps / enum tables / frame
 * defaults the runtime compilers read (`src/compat/closed-set.ts`, the twin
 * matrix in `src/compat/inline-style.ts`, and the per-component fixed
 * providers), so regeneration is the only maintenance step when tokens or
 * frame defaults change — `src/compat/closed-set.test.ts` fails on drift.
 *
 * Run: `bun nx run @universe/mycelium:generate:compat-classes`
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  compatClassesFileContents,
  compatClosedSetEntries,
  familyClassesFileContents,
} from '../compat/closed-set-manifest'

const entries = compatClosedSetEntries()

const safelistPath = join(import.meta.dirname, '..', '..', 'compat-classes.gen.txt')
writeFileSync(safelistPath, compatClassesFileContents(entries))
process.stdout.write(`Wrote ${entries.length} classes to ${safelistPath}\n`)

const familyPath = join(import.meta.dirname, '..', 'compat', 'family-classes.generated.ts')
writeFileSync(familyPath, familyClassesFileContents())
process.stdout.write(`Wrote the runtime family membership literal to ${familyPath}\n`)
