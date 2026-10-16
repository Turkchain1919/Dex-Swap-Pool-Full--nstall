/**
 * CSS-existence contract for the shadcn recipe class constants (INFRA-3021
 * shadcn set): every recipe class ships as a FULL literal collected in the
 * per-recipe `*_RECIPE_CLASS_NAMES` map (template-literal assembly would
 * hide candidates from Tailwind's static scanner). This suite pins:
 * - the constants stay full literals in their recipe sources;
 * - every class they contain produces CSS through the real Tailwind engine.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// Relative cross-package imports: a package dep edge tailwind → mycelium would cycle (mycelium already depends on tailwind).
// nx-ignore-next-line
import { COMMAND_RECIPE_CLASS_NAMES } from '../../../mycelium/src/shadcn/command'
// nx-ignore-next-line
import { DROPDOWN_MENU_RECIPE_CLASS_NAMES } from '../../../mycelium/src/shadcn/dropdown-menu'
// nx-ignore-next-line
import { POPOVER_RECIPE_CLASS_NAMES } from '../../../mycelium/src/shadcn/popover'
// nx-ignore-next-line
import { SELECT_RECIPE_CLASS_NAMES } from '../../../mycelium/src/shadcn/select'
import { BASE_SCOPE } from '../tailwind-compile/scope'
import { compileTailwindClasses } from '../tailwind-compile/tailwind-compile'

const SHADCN_SRC = join(dirname(fileURLToPath(import.meta.url)), '../../../mycelium/src/shadcn')

const GROUPS: Array<{ sourceFile: string; constants: Record<string, string> }> = [
  { sourceFile: join(SHADCN_SRC, 'command.tsx'), constants: COMMAND_RECIPE_CLASS_NAMES },
  { sourceFile: join(SHADCN_SRC, 'dropdown-menu.tsx'), constants: DROPDOWN_MENU_RECIPE_CLASS_NAMES },
  { sourceFile: join(SHADCN_SRC, 'popover.tsx'), constants: POPOVER_RECIPE_CLASS_NAMES },
  { sourceFile: join(SHADCN_SRC, 'select.tsx'), constants: SELECT_RECIPE_CLASS_NAMES },
]

/** CSS-escape a utility class the way Tailwind writes its selector. */
function escapeForSelector(cls: string): string {
  return cls.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)
}

function splitClasses(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

describe('shadcn recipe class constants — Tailwind CSS existence', () => {
  it('every class appears as a full literal in its recipe source (static-extraction guarantee)', () => {
    for (const group of GROUPS) {
      const source = readFileSync(group.sourceFile, 'utf8')
      for (const [name, value] of Object.entries(group.constants)) {
        for (const cls of splitClasses(value)) {
          expect(source, `"${cls}" (from ${name}) must appear literally in ${group.sourceFile}`).toContain(cls)
        }
      }
    }
  })

  it('every class produces CSS through the real Tailwind engine', async () => {
    const candidates = new Set<string>()
    for (const group of GROUPS) {
      for (const value of Object.values(group.constants)) {
        for (const cls of splitClasses(value)) {
          candidates.add(cls)
        }
      }
    }
    expect(candidates.size).toBeGreaterThan(40)
    const compiled = await compileTailwindClasses([...candidates])
    for (const cls of candidates) {
      // Invalid candidates are dropped from Tailwind's output entirely, so a
      // present (escaped) selector proves the CSS exists.
      expect(compiled.css, `no CSS emitted for class "${cls}"`).toContain(`.${escapeForSelector(cls)}`)
    }
  }, 120_000)

  it('the content transitions watch the split `scale` property the scale-* utilities set', async () => {
    // Existence isn't enough here: `transition-[transform,opacity]` also
    // compiles to valid CSS, but v4 `scale-*` sets the separate `scale`
    // property and the popover zoom snaps — pin the compiled
    // transition-property value itself.
    const contents: Record<string, string> = {
      popover: POPOVER_RECIPE_CLASS_NAMES.content,
      dropdownMenu: DROPDOWN_MENU_RECIPE_CLASS_NAMES.content,
      select: SELECT_RECIPE_CLASS_NAMES.content,
    }
    for (const [recipe, className] of Object.entries(contents)) {
      const transitionClasses = splitClasses(className).filter((cls) => cls.startsWith('transition-'))
      expect(transitionClasses, `${recipe} content transition class`).toEqual(['transition-[scale,opacity]'])
    }
    const compiled = await compileTailwindClasses(['transition-[scale,opacity]'])
    const declarations = compiled.classScopes.get('transition-[scale,opacity]')?.get(BASE_SCOPE)
    expect(declarations?.['transition-property']).toBe('scale,opacity')
  }, 120_000)
})
