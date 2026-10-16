/**
 * Drop-in for `GetProps<typeof Sheet>['snapPointsMode']` as spelled through the
 * legacy `ui/src` barrel (INFRA-3557): exactly mutually assignable with
 * Tamagui Sheet's `SnapPointsMode`, so the annotation converts by swapping the
 * lookup for this name. The legacy type is a closed keyword union, so no
 * second half is needed. `undefined` is deliberately not a member — the `?:`
 * annotation position re-adds it, and the parity contract pins both spellings.
 * `packages/tailwind/src/parity/sheet-view-props` is the drift guard.
 *
 * Interop/annotation type only — never a runtime or component prop surface.
 */
export type SheetSnapPointsMode = 'percent' | 'constant' | 'fit' | 'mixed'
