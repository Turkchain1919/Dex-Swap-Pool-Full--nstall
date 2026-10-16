import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Exports-map resolution contract (INFRA-2956 review follow-up).
 *
 * `@universe/mycelium` resolution must go through package.json `exports` in
 * every tool (tsc, vite, vitest). A `@universe/mycelium/*` wildcard in the
 * base tsconfig `paths` would let package-root deep imports like
 * `@universe/mycelium/src/anything` typecheck (and bundle in apps using
 * vite-tsconfig-paths) even though the exports map forbids them — code that
 * the extension, which resolves via `exports`, could never bundle.
 */
describe('exports-map resolution contract', () => {
  it('tsconfig.base.json declares no @universe/mycelium path mapping', () => {
    const base = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'tsconfig.base.json'), 'utf-8')) as {
      compilerOptions?: { paths?: Record<string, string[]> }
    }
    const myceliumPaths = Object.keys(base.compilerOptions?.paths ?? {}).filter((alias) =>
      alias.startsWith('@universe/mycelium'),
    )
    expect(myceliumPaths).toEqual([])
  })
})
