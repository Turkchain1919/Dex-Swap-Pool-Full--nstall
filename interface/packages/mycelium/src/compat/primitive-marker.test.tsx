/**
 * Pins the legacy-color-injection opt-out contract (#38813): every mycelium
 * primitive a legacy `TouchableArea` might clone carries the marker. `ui/src`'s
 * `TouchableArea` (`WithInjectedColors`) imports `isMyceliumPrimitive`/
 * `isMyceliumIcon` directly from `@universe/mycelium/compat` (`packages/ui`
 * already depends on `@universe/mycelium`), so the two sides can't drift on
 * behavior. This suite still pins `MYCELIUM_PRIMITIVE_KEY`'s literal string:
 * that one is a registered `Symbol.for` key (any other reader of the global
 * registry depends on the exact spelling), unlike the icon marker's plain
 * `Symbol()`, which has no such cross-registry contract.
 */
import { describe, expect, it } from 'vitest'
import { Check } from '../components/icons/Check'
import { FlexCompat } from '../flex-compat/FlexCompat.web'
import { LinearGradientCompat } from '../linear-gradient-compat/LinearGradientCompat.web'
import { ScrollViewCompat } from '../scroll-view-compat/ScrollViewCompat.web'
import { TextCompat } from '../text-compat/TextCompat.web'
import { TouchableAreaCompat } from '../touchable-area/TouchableAreaCompat.web'
import { ViewCompat } from '../view-compat/ViewCompat.web'
import {
  isMyceliumIcon,
  isMyceliumPrimitive,
  markMyceliumIcon,
  markMyceliumPrimitive,
  MYCELIUM_PRIMITIVE_KEY,
} from './primitive-marker'

describe('mycelium primitive marker', () => {
  it('the symbol registry key is the frozen literal', () => {
    expect(MYCELIUM_PRIMITIVE_KEY).toBe('mycelium.primitive')
  })

  it('a component stamped via the registry key alone is recognized (registry lookup, not identity)', () => {
    const Component = (): null => null
    Object.defineProperty(Component, Symbol.for('mycelium.primitive'), { value: true, configurable: true })
    expect(isMyceliumPrimitive(Component)).toBe(true)
  })

  it('createIcon output is marked (the $accent3-injection crash vector)', () => {
    expect(isMyceliumPrimitive(Check)).toBe(true)
  })

  it('compat primitives are marked — factory-built and hand-rolled legs alike', () => {
    expect(isMyceliumPrimitive(FlexCompat)).toBe(true)
    expect(isMyceliumPrimitive(ViewCompat)).toBe(true)
    expect(isMyceliumPrimitive(TextCompat)).toBe(true)
    expect(isMyceliumPrimitive(TouchableAreaCompat)).toBe(true)
    expect(isMyceliumPrimitive(LinearGradientCompat)).toBe(true)
    expect(isMyceliumPrimitive(ScrollViewCompat)).toBe(true)
    // The native legs' marks are pinned in their own platform-legs suites,
    // which carry the react-native mocks those legs need to import.
  })

  it('unmarked types stay unmarked — legacy children keep receiving injection', () => {
    expect(isMyceliumPrimitive('div')).toBe(false)
    expect(isMyceliumPrimitive((): null => null)).toBe(false)
    expect(isMyceliumPrimitive(null)).toBe(false)
    expect(isMyceliumPrimitive(undefined)).toBe(false)
  })

  it('markMyceliumPrimitive returns the component it stamps, non-enumerably', () => {
    const Component = (): null => null
    expect(markMyceliumPrimitive(Component)).toBe(Component)
    expect(isMyceliumPrimitive(Component)).toBe(true)
    // Non-enumerable: a props-style spread of the component must not copy the mark.
    expect(isMyceliumPrimitive({ ...Component })).toBe(false)
  })

  it('isMyceliumIcon is a strict SUBSET of isMyceliumPrimitive: createIcon output only', () => {
    // Check (createIcon output) carries both marks.
    expect(isMyceliumIcon(Check)).toBe(true)
    // Other compat primitives carry the generic mark but aren't glyphs.
    expect(isMyceliumIcon(FlexCompat)).toBe(false)
    expect(isMyceliumIcon(ViewCompat)).toBe(false)
    expect(isMyceliumIcon(TextCompat)).toBe(false)
    expect(isMyceliumIcon(TouchableAreaCompat)).toBe(false)
  })
})

describe('mycelium icon marker (the strict subset, INFRA-3537)', () => {
  it('createIcon output carries BOTH markers — the hover-recolor opt-in rides the icon one', () => {
    expect(isMyceliumIcon(Check)).toBe(true)
    expect(isMyceliumPrimitive(Check)).toBe(true)
  })

  it('markMyceliumIcon implies the generic marker — an icon is always a primitive', () => {
    const Component = (): null => null
    expect(markMyceliumIcon(Component)).toBe(Component)
    expect(isMyceliumIcon(Component)).toBe(true)
    expect(isMyceliumPrimitive(Component)).toBe(true)
  })

  it('non-icon compat primitives are NOT icon-marked — gating icon logic on the generic marker is a bug', () => {
    expect(isMyceliumIcon(FlexCompat)).toBe(false)
    expect(isMyceliumIcon(ViewCompat)).toBe(false)
    expect(isMyceliumIcon(TextCompat)).toBe(false)
    expect(isMyceliumIcon(TouchableAreaCompat)).toBe(false)
  })

  it('a generically-marked component is not an icon', () => {
    const Component = (): null => null
    markMyceliumPrimitive(Component)
    expect(isMyceliumIcon(Component)).toBe(false)
  })
})
