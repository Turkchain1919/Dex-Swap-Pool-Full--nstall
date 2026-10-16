/**
 * The single group-state parser for the Tamagui-compatible group surface.
 *
 * A group-state identifier is a group state name (`hover`) optionally prefixed
 * by a group name (`item-hover`, or `item_hover` in Tamagui's marker-class
 * spelling). Everything that reads one goes through this module: the
 * FlexCompat compiler (`$group-*` props → Tailwind `group-*` variants), the
 * parity harness's scope canonicalization (Tamagui `.t_group_*` marker
 * classes), and the workbench parity page/manifest (deriving the group
 * container a `$group-*` case renders inside).
 */
import type { GroupState } from './props'

/** Longest-first so `focusVisible`/`focusWithin` never suffix-match as `focus`. */
export const GROUP_STATES: readonly GroupState[] = ['focusVisible', 'focusWithin', 'hover', 'press', 'focus']

/** The style-prop prefix every group-state key carries — parsed below, composed by `groupStatePropKey`. */
export const GROUP_STATE_PROP_PREFIX = '$group-'

/** Tailwind variant per group state — also the harness's canonical scope spelling. */
export const GROUP_STATE_VARIANT: Record<GroupState, string> = {
  hover: 'group-hover',
  press: 'group-active',
  focus: 'group-focus',
  focusVisible: 'group-focus-visible',
  focusWithin: 'group-focus-within',
}

export interface GroupStateParts {
  /** The group name; undefined targets any ancestor group. */
  name?: string
  state: GroupState
}

/**
 * The registered group names of the compat surface (INFRA-3481). A named
 * group pool (`$group-item-hover`) compiles to a name-parameterized Tailwind
 * variant (`group-hover/item:`), so the var-indirection twin matrix
 * (`inline-style.ts`) can only carry names enumerated ahead of time —
 * arbitrary names stay the documented open set (dev-throw / prod
 * keep-and-warn in `compose.ts`). Values map each name to its single-letter
 * var-namespace code, appended to the group-state code
 * (`group-hover/item` → `ghi`); `closed-set.test.ts` gates code uniqueness
 * and var-name length. A new name is one entry here plus
 * `bun nx run @universe/mycelium:generate:compat-classes` (and `:native`).
 */
export const REGISTERED_GROUP_NAMES: Readonly<Record<string, string>> = {
  card: 'c',
  item: 'i',
}

/**
 * Split a group-state identifier (`hover`, `item-hover`, `item_hover`, …)
 * into its optional group name and state, given the separator (`-` in prop
 * keys, `_` in Tamagui marker classes). Undefined when the identifier does
 * not end in a group state.
 */
export function parseGroupStateSuffix(identifier: string, separator: '-' | '_'): GroupStateParts | undefined {
  for (const state of GROUP_STATES) {
    if (identifier === state) {
      return { state }
    }
    if (identifier.endsWith(`${separator}${state}`)) {
      return { name: identifier.slice(0, -(state.length + 1)), state }
    }
  }
  return undefined
}

/** Parse a `$group-*` prop key; undefined for non-group keys and container-size group queries. */
export function parseGroupStateProp(key: string): GroupStateParts | undefined {
  if (!key.startsWith(GROUP_STATE_PROP_PREFIX)) {
    return undefined
  }
  return parseGroupStateSuffix(key.slice(GROUP_STATE_PROP_PREFIX.length), '-')
}

/**
 * Compose a group-state style-prop key — the inverse of `parseGroupStateProp`.
 * Callers name the state they mean (`hover`) and this module owns the spelling,
 * so no second site transcribes the prefix literal.
 */
export function groupStatePropKey<S extends GroupState>(state: S): `${typeof GROUP_STATE_PROP_PREFIX}${S}` {
  return `${GROUP_STATE_PROP_PREFIX}${state}`
}

/** The Tailwind variant (= canonical scope) for parsed group-state parts: `group-hover`, `group-active/item`, … */
export function groupStateVariant(parts: GroupStateParts): string {
  const variant = GROUP_STATE_VARIANT[parts.state]
  return parts.name === undefined ? variant : `${variant}/${parts.name}`
}

/**
 * The marker class a `group` prop renders — `group` for `true`, `group/<name>`
 * for a named group: the anchor the compiled `group-*` variants above match.
 * Shared by the compose engine and the bounded components that emit their
 * frame classes outside it (ButtonCompat's caller-visible anchor).
 */
export function groupMarkerClasses(group: string | boolean | undefined): string[] {
  if (group === undefined || group === false) {
    return []
  }
  return [group === true ? 'group' : `group/${group}`]
}
