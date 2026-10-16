/**
 * Pins the z-index arithmetic ported from Tamagui's `useStackedZIndex`.
 * Stacking is the entire reason the web portal was on hold, so the formula is
 * tested directly rather than only through a rendered tree.
 */
import { describe, expect, it } from 'vitest'
import {
  createPortalStackRegistry,
  PORTAL_DEFAULT_Z_INDEX,
  PORTAL_STACK_LAYER_STEP,
  portalJoinsStack,
  resolvePortalZIndex,
} from './stack'

describe('resolvePortalZIndex', () => {
  it('returns an explicit numeric zIndex unchanged', () => {
    const registry = createPortalStackRegistry()
    expect(resolvePortalZIndex(registry, { zIndex: 100020 })).toBe(100020)
  })

  it('lets an explicit zIndex win over stackZIndex', () => {
    const registry = createPortalStackRegistry()
    expect(resolvePortalZIndex(registry, { zIndex: 42, stackZIndex: 1070 })).toBe(42)
  })

  it('resolves to the default when neither prop is given', () => {
    const registry = createPortalStackRegistry()
    expect(resolvePortalZIndex(registry, {})).toBe(PORTAL_DEFAULT_Z_INDEX)
  })

  it('offsets stackZIndex by the layer step above an empty scope', () => {
    const registry = createPortalStackRegistry()
    expect(resolvePortalZIndex(registry, { stackZIndex: 1070 })).toBe(1070 + PORTAL_STACK_LAYER_STEP + 1)
  })

  it('lands a second stacked portal above the first', () => {
    const registry = createPortalStackRegistry()
    const first = resolvePortalZIndex(registry, { stackZIndex: 1070 })
    registry.register('first', first)

    const second = resolvePortalZIndex(registry, { stackZIndex: 1070 })

    expect(second).toBeGreaterThan(first)
    expect(second).toBe(1070 + PORTAL_STACK_LAYER_STEP + first + 1)
  })

  it('drops back to the empty-scope value once the first portal unregisters', () => {
    const registry = createPortalStackRegistry()
    registry.register('first', resolvePortalZIndex(registry, { stackZIndex: 1070 }))
    registry.unregister('first')

    expect(resolvePortalZIndex(registry, { stackZIndex: 1070 })).toBe(1070 + PORTAL_STACK_LAYER_STEP + 1)
  })

  it('treats stackZIndex 0 as no stacking, matching Tamagui truthiness', () => {
    // Reachable: ActionSheetDropdown maps a boolean dropdownZIndex through Number().
    const registry = createPortalStackRegistry()
    expect(resolvePortalZIndex(registry, { stackZIndex: 0 })).toBe(PORTAL_DEFAULT_Z_INDEX)
  })

  it("excludes the resolving portal's own entry, so a re-resolve cannot compound", () => {
    const registry = createPortalStackRegistry()
    const first = resolvePortalZIndex(registry, { stackZIndex: 1070, selfKey: 'self' })
    registry.register('self', first)

    // Same portal, new stackZIndex: measures against siblings (none), not itself.
    expect(resolvePortalZIndex(registry, { stackZIndex: 1080, selfKey: 'self' })).toBe(
      1080 + PORTAL_STACK_LAYER_STEP + 1,
    )
    // A different portal still stacks above it.
    expect(resolvePortalZIndex(registry, { stackZIndex: 1080, selfKey: 'other' })).toBe(
      1080 + PORTAL_STACK_LAYER_STEP + first + 1,
    )
  })

  it('keeps registry scopes independent', () => {
    const a = createPortalStackRegistry()
    const b = createPortalStackRegistry()
    a.register('one', 9000)

    expect(b.highest()).toBe(0)
    expect(resolvePortalZIndex(b, { stackZIndex: 1070 })).toBe(1070 + PORTAL_STACK_LAYER_STEP + 1)
  })
})

/** The gate on registration: only a portal that stacked publishes a ceiling. */
describe('portalJoinsStack', () => {
  it('joins the stack for a truthy stackZIndex alone', () => {
    expect(portalJoinsStack({ stackZIndex: 1070 })).toBe(true)
  })

  it('does not join the stack when an explicit zIndex wins over stackZIndex', () => {
    expect(portalJoinsStack({ zIndex: 100020, stackZIndex: 1070 })).toBe(false)
  })

  it('does not join the stack for stackZIndex 0, matching the resolver truthiness gate', () => {
    expect(portalJoinsStack({ stackZIndex: 0 })).toBe(false)
  })

  it('does not join the stack when neither prop is given', () => {
    expect(portalJoinsStack({})).toBe(false)
  })
})
