/**
 * Drift guard for the compat wiring in tailwind.css: the entry stylesheet is
 * plain text no typechecker covers, so pin the load-bearing TextCompat token
 * CSS import — every `[color:var(--stext-…)]` declaration silently falls back
 * to the inherited color without it (INFRA-3262 found the same hole in
 * apps/extension).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// vitest runs with cwd = apps/web (import.meta.url is not a file: URL here).
const entry = readFileSync(join(process.cwd(), 'src/tailwind.css'), 'utf8')

describe('tailwind.css compat wiring', () => {
  it('imports the TextCompat token CSS (--stext-* vars) alongside the mycelium entry', () => {
    expect(entry).toContain('@import "@universe/mycelium/text-compat.css";')
  })
})
