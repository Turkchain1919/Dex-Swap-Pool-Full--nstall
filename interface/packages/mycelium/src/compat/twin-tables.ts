/**
 * Enum / semantic-color conversion tables for the var-indirection lane
 * (INFRA-3217): built by inverting the SAME maps the per-style compilers
 * read — one source, no drift. See `inline-style.ts` for the conversion
 * itself and `variant-codes.ts` for the prefix namespaces.
 */
import { DISPLAY_CLASS } from '../flex-compat/flex-style-classes'
import { TEXT_DECORATION_CLASS, TEXT_TRANSFORM_CLASS, WHITE_SPACE_CLASS } from '../text-compat/typography-classes'
import { TEXT_ALIGN_CLASS } from './inherited-text-classes'
import {
  ALIGN_ITEMS_CLASS,
  ALIGN_SELF_CLASS,
  DIRECTION_CLASS,
  JUSTIFY_CLASS,
  POSITION_CLASS,
  WRAP_CLASS,
} from './style-classes'
import { COLOR_TOKEN_CLASS, LITERAL_SEMANTIC_COLORS, THEMED_COLOR_TOKEN_CLASSES } from './tokens'

// ── Enum / semantic-color conversion tables ────────────────────────────

/**
 * Enum utility → the (property, value) declaration it compiles from, built by
 * inverting the SAME maps the per-style compilers read — one source, no
 * drift. Under variant prefixes these convert to arbitrary-property twins;
 * in the base tier they are in the closed set and never reach conversion.
 */
export function buildEnumDeclarations(): ReadonlyMap<string, { prop: string; value: string }> {
  const decl = new Map<string, { prop: string; value: string }>()
  const invert = (map: Record<string, string>, prop: string): void => {
    for (const [value, cls] of Object.entries(map)) {
      // Arbitrary-property fallbacks in the maps convert via the generic path.
      if (!cls.startsWith('[')) {
        decl.set(cls, { prop, value })
      }
    }
  }
  invert(DIRECTION_CLASS, 'flex-direction')
  invert(ALIGN_ITEMS_CLASS, 'align-items')
  invert(ALIGN_SELF_CLASS, 'align-self')
  invert(JUSTIFY_CLASS, 'justify-content')
  invert(WRAP_CLASS, 'flex-wrap')
  invert(POSITION_CLASS, 'position')
  invert(DISPLAY_CLASS, 'display')
  invert(TEXT_ALIGN_CLASS, 'text-align')
  invert(TEXT_TRANSFORM_CLASS, 'text-transform')
  invert(TEXT_DECORATION_CLASS, 'text-decoration-line')
  invert(WHITE_SPACE_CLASS, 'white-space')
  for (const overflow of ['visible', 'hidden', 'clip', 'scroll', 'auto']) {
    decl.set(`overflow-${overflow}`, { prop: 'overflow', value: overflow })
  }
  decl.set('text-ellipsis', { prop: 'text-overflow', value: 'ellipsis' })
  decl.set('text-clip', { prop: 'text-overflow', value: 'clip' })
  decl.set('italic', { prop: 'font-style', value: 'italic' })
  decl.set('not-italic', { prop: 'font-style', value: 'normal' })
  return decl
}

export const ENUM_DECLARATION: ReadonlyMap<string, { prop: string; value: string }> = buildEnumDeclarations()

/** Enum singles that convert to utility twins instead (flex/grow/shrink shorthands, `w-max`, `basis-auto`). */
export const ENUM_UTILITY_VALUE: ReadonlyMap<string, { util: string; value: string }> = new Map([
  ['basis-auto', { util: 'basis', value: 'auto' }],
  ['grow', { util: 'grow', value: '1' }],
  ['m-0', { util: 'm', value: '0px' }],
  ['max-w-full', { util: 'max-w', value: '100%' }],
  ['shrink', { util: 'shrink', value: '1' }],
  ['shrink-0', { util: 'shrink', value: '0' }],
  ['w-max', { util: 'w', value: 'max-content' }],
])

/**
 * Semantic color utility suffix → the CSS value its var twin carries. The
 * plain semantic tokens ride the AUTO-SWITCHING `--<suffix>` variables
 * (`variables.css` emits them under both `:root` and `.dark`), so one twin
 * covers both themes; the theme-invariant trio uses its pinned literals
 * (their `--color-*` palette vars are tree-shaken from app CSS).
 */
export function semanticColorValue(suffix: string): string {
  return LITERAL_SEMANTIC_COLORS[suffix as keyof typeof LITERAL_SEMANTIC_COLORS] ?? `var(--${suffix})`
}

export const SEMANTIC_COLOR_SUFFIXES: ReadonlySet<string> = new Set(Object.values(COLOR_TOKEN_CLASS))

/**
 * The themed color pairs (`$surface1Hovered` → `bg-surface1-hovered` +
 * `dark:bg-surface1-hovered-dark`) collapse to ONE twin: the light suffix
 * doubles as an auto-switching variable (`--surface1-hovered` flips with the
 * theme, pinned by the icon parity matrix), so the light class converts to a
 * twin reading it and the `dark:` sibling is REDUNDANT and dropped. The same
 * holds for the outline-color pair shape (`var(--color-` + light suffix).
 * NOTE: this comment must never spell a bracketed candidate with `<`/`>`
 * placeholders — apps/mobile's uniwind scanner extracts candidates from
 * comments in this tree and fails the native CSS compile on them.
 */
export function buildThemedTables(): {
  rewrite: ReadonlyMap<string, { kind: 'bg' | 'border' | 'outline'; value: string }>
  drop: ReadonlySet<string>
} {
  const rewrite = new Map<string, { kind: 'bg' | 'border' | 'outline'; value: string }>()
  const drop = new Set<string>()
  for (const { light, dark } of Object.values(THEMED_COLOR_TOKEN_CLASSES)) {
    const value = `var(--${light})`
    rewrite.set(`bg-${light}`, { kind: 'bg', value })
    rewrite.set(`border-${light}`, { kind: 'border', value })
    rewrite.set(`[outline-color:var(--color-${light})]`, { kind: 'outline', value })
    drop.add(`dark:bg-${dark}`)
    drop.add(`dark:border-${dark}`)
    drop.add(`dark:[outline-color:var(--color-${dark})]`)
  }
  return { rewrite, drop }
}

export const THEMED_TABLES = buildThemedTables()
