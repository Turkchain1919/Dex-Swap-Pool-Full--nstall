/**
 * Platform-leg contract for the checkbox compat pair (INFRA-3233), following
 * `floating-overlay/platform-legs.test.ts`.
 *
 * Why this has to exist: `moduleSuffixes` is configured nowhere in the repo, so
 * `tsc` only ever resolves the BASE leg — a `.native` leg cannot carry a
 * different type, and nothing in the typechecker notices if it exports a
 * different symbol set. A bundler that resolved the native leg would then hit a
 * missing export at runtime. The base leg is a 1-line re-export of the web leg
 * (the `TouchableAreaCompat.tsx` mechanism), so base ≡ web is a structural
 * given; base ≡ native is what this suite proves.
 */
import { describe, expect, it, vi } from 'vitest'
// Explicit .tsx extension: this vitest config resolves `.web.*` first, which
// would silently swap the platformless base leg for the web leg here.
import * as checkboxBase from './CheckboxCompat.tsx'
import * as checkboxWeb from './CheckboxCompat.web'
import * as labeledBase from './LabeledCheckboxCompat.tsx'
import * as labeledWeb from './LabeledCheckboxCompat.web'

vi.mock('react-native', () => import('./testing/react-native-mock'))

describe('base legs re-export the web legs', () => {
  it('CheckboxCompat', () => {
    expect(checkboxBase.CheckboxCompat).toBe(checkboxWeb.CheckboxCompat)
  })

  it('LabeledCheckboxCompat', () => {
    expect(labeledBase.LabeledCheckboxCompat).toBe(labeledWeb.LabeledCheckboxCompat)
  })
})

describe('export parity across the legs', () => {
  it('the CheckboxCompat native leg exports exactly the base leg symbol set', async () => {
    const native = await import('./CheckboxCompat.native')
    expect(Object.keys(native).sort()).toEqual(Object.keys(checkboxBase).sort())
    expect(Object.keys(native)).toContain('CheckboxCompat')
  })

  it('the LabeledCheckboxCompat native leg exports exactly the base leg symbol set', async () => {
    const native = await import('./LabeledCheckboxCompat.native')
    expect(Object.keys(native).sort()).toEqual(Object.keys(labeledBase).sort())
    expect(Object.keys(native)).toContain('LabeledCheckboxCompat')
  })

  it('both legs of each component are real components, not stubs', async () => {
    const checkboxNative = await import('./CheckboxCompat.native')
    const labeledNative = await import('./LabeledCheckboxCompat.native')
    for (const component of [
      checkboxWeb.CheckboxCompat,
      checkboxNative.CheckboxCompat,
      labeledWeb.LabeledCheckboxCompat,
      labeledNative.LabeledCheckboxCompat,
    ]) {
      expect(typeof component).toBe('object')
      expect(component).toHaveProperty('render')
    }
  })

  it('the native legs are NOT the web legs (a real split, not an accidental alias)', async () => {
    const checkboxNative = await import('./CheckboxCompat.native')
    const labeledNative = await import('./LabeledCheckboxCompat.native')
    expect(checkboxNative.CheckboxCompat).not.toBe(checkboxWeb.CheckboxCompat)
    expect(labeledNative.LabeledCheckboxCompat).not.toBe(labeledWeb.LabeledCheckboxCompat)
  })
})

describe('the subpath barrel resolves every symbol on both platforms', () => {
  it('exports both components plus the shared tables', async () => {
    const barrel = await import('./index')
    expect(barrel.CheckboxCompat).toBe(checkboxWeb.CheckboxCompat)
    expect(barrel.LabeledCheckboxCompat).toBe(labeledWeb.LabeledCheckboxCompat)
    expect(barrel.CHECKBOX_COMPAT_CLASS_UNIVERSE.length).toBeGreaterThan(40)
    expect(barrel.CHECKBOX_SIZES_BY_TOKEN['$icon.16'].box).toBe(16)
  })

  it('does not export a bare `Checkbox` — that name belongs to the untouched components/checkbox.tsx', async () => {
    const barrel = (await import('./index')) as Record<string, unknown>
    expect(barrel['Checkbox']).toBeUndefined()
    expect(barrel['LabeledCheckbox']).toBeUndefined()
  })
})
