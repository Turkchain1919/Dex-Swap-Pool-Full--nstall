/**
 * Portal z-index resolution: a pure, platform-agnostic module shared by both
 * legs (the `floating-overlay/geometry.ts` shape).
 *
 * This is a deliberate port of Tamagui's `useStackedZIndex`
 * (`@tamagui/z-index-stack/src/useStackedZIndex.tsx`), because the portals
 * moving onto this primitive were resolving their stacking through it and a
 * different formula would silently reorder overlays. Two of Tamagui's inputs
 * are pinned to the values this repo actually produces, and are not
 * reproduced as knobs:
 *
 * - The nesting level (`ZIndexStackContext`) is always 1. `TamaguiProvider`
 *   provides exactly 1, and the only components that push it deeper (Dialog,
 *   Popover, Sheet, Adapt) are Tamagui's own and are not used here. So the
 *   layer term is the constant {@link PORTAL_STACK_LAYER_STEP}.
 * - The hardcoded override (`ZIndexHardcodedContext`) is always unset, for
 *   the same reason: only those four Tamagui components ever set it.
 *
 * Retained faithfully, including the quirk: `stackZIndex` is gated on
 * TRUTHINESS in Tamagui, so `stackZIndex={0}` does not stack and resolves to
 * {@link PORTAL_DEFAULT_Z_INDEX}. That value is reachable in this repo
 * (`ActionSheetDropdown` maps a boolean `dropdownZIndex` through `Number()`),
 * so it is preserved rather than tidied.
 */

/** Tamagui elevates each nesting level by 5000; this primitive is always at level 1. */
export const PORTAL_STACK_LAYER_STEP = 5000

/** Resolution for a portal that asked for no stacking at all. */
export const PORTAL_DEFAULT_Z_INDEX = 1

export interface PortalStackRegistry {
  /**
   * Highest z-index currently held by a stacked portal in this scope; 0 when
   * none. `excludeKey` drops one portal's own entry, which is what keeps a
   * re-resolve from stacking a mounted portal on top of itself.
   */
  highest: (excludeKey?: string) => number
  register: (key: string, zIndex: number) => void
  unregister: (key: string) => void
}

export function createPortalStackRegistry(): PortalStackRegistry {
  const entries = new Map<string, number>()

  return {
    highest: (excludeKey?: string): number => {
      let highest = 0
      for (const [key, value] of entries) {
        if (key !== excludeKey && value > highest) {
          highest = value
        }
      }
      return highest
    },
    register: (key: string, zIndex: number): void => {
      entries.set(key, zIndex)
    },
    unregister: (key: string): void => {
      entries.delete(key)
    },
  }
}

export interface PortalZIndexInput {
  zIndex?: number
  stackZIndex?: number
  /**
   * The resolving portal's own registry key. Supplying it excludes that
   * portal's already-registered entry from the ceiling, so re-resolving a
   * MOUNTED portal (a `stackZIndex` change from one truthy value to another)
   * measures against its siblings rather than against itself. Without it the
   * value compounds on every change. Unreachable from today's call sites, all
   * of which pass a constant, and it cannot alter a first mount because
   * nothing is registered yet at that point.
   */
  selfKey?: string
}

/**
 * An explicit numeric `zIndex` wins outright. Otherwise a truthy numeric
 * `stackZIndex` lands one above the highest stacked portal already mounted in
 * the same scope, offset by the layer step and by its own value. Neither
 * given resolves to {@link PORTAL_DEFAULT_Z_INDEX}.
 *
 * See {@link PortalZIndexInput.selfKey} for why a mounted portal excludes its
 * own entry from the ceiling.
 */
export function resolvePortalZIndex(
  registry: PortalStackRegistry,
  { zIndex, stackZIndex, selfKey }: PortalZIndexInput,
): number {
  if (typeof zIndex === 'number') {
    return zIndex
  }

  if (stackZIndex) {
    return stackZIndex + PORTAL_STACK_LAYER_STEP + registry.highest(selfKey) + 1
  }

  return PORTAL_DEFAULT_Z_INDEX
}

/**
 * Whether these props resolve through the stacking branch above, and so belong
 * in the ceiling {@link PortalStackRegistry.highest} reports.
 *
 * An explicit numeric `zIndex` wins outright, which leaves `stackZIndex` inert
 * for registration too: registering that portal would publish its explicit
 * value as the ceiling, so `zIndex={100020} stackZIndex={1070}` would lift the
 * next stacked sibling to 106091 while a bare `zIndex={100020}` lifts nothing.
 */
export function portalJoinsStack({ zIndex, stackZIndex }: PortalZIndexInput): boolean {
  return typeof zIndex !== 'number' && Boolean(stackZIndex)
}
