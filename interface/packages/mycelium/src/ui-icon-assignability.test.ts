import type { GeneratedIcon as UiGeneratedIcon } from 'ui/src'
// Deliberately deep: the size table is factory-internal (not barrel-exported on purpose) and the
// pin must compare the factory's own source of truth, not a re-export.
import { ICON_SIZE_TOKEN_PX as UI_ICON_SIZE_TOKEN_PX } from 'ui/src/components/factories/iconTokens'
import { describe, expect, it } from 'vitest'
import { ICON_SIZE_TOKEN_PX as MYCELIUM_ICON_SIZE_TOKEN_PX } from './compat/tokens'
import type { GeneratedIcon as MyceliumGeneratedIcon } from './components/factories/createIcon'

/**
 * Cross-system icon assignability (INFRA-3314 acceptance criterion, added 2026-08-07).
 *
 * PRIMARY DIRECTION (pinned): a ui/src icon VALUE typechecks where mycelium's `GeneratedIcon` is
 * EXPECTED, so converted receivers (mycelium-typed `Icon` slots) accept unconverted ui/src
 * producers and the per-receiver producer import flips (#38747's `AccountSwitcherScreen` case)
 * stop recurring. Lives in this package's non-composite `tsconfig.test.json` program — the same
 * carve-out as `tokens.parity.test.ts` — so the ui import mints no project reference.
 *
 * REVERSE DIRECTION (documented, deliberately not forced): a mycelium icon value does NOT satisfy
 * ui's `GeneratedIcon`. Since INFRA-3508 the ref is no longer the blocker — mycelium's
 * `GeneratedIcon` carries the same honest `Ref<Svg | SVGSVGElement>` union (its native leg,
 * `createIcon.native.tsx`, renders a real react-native-svg `Svg`) and `style` accepts both
 * platform flavors. `hoverColor` closed too (mycelium admits it as of #39964). What still blocks
 * the reverse is `OpaqueColorValue`/`DynamicColor` colors, RN-only values mycelium's string-token
 * union does not admit. Widening mycelium's types past its runtime would be a lie, so the reverse
 * stays unpinned; the `@ts-expect-error` below goes stale (and fails this program) the day the
 * surfaces genuinely converge, prompting a revisit.
 */
type Pin<T extends true> = T

type PrimaryDirectionPin = Pin<[UiGeneratedIcon] extends [MyceliumGeneratedIcon] ? true : false>

/** Value-level pins with full assignability diagnostics; referenced by the suite, never invoked. */
function assignabilityPins(
  uiIcon: UiGeneratedIcon,
  uiIconConcrete: (typeof import('ui/src/components/icons/Check'))['Check'],
  mycIcon: MyceliumGeneratedIcon,
): void {
  /** A ui icon value satisfies a mycelium-typed receiver slot. */
  const primaryDirection: MyceliumGeneratedIcon = uiIcon
  /** And so does a concrete generated icon (the real shape receivers hold). */
  const primaryDirectionConcrete: MyceliumGeneratedIcon = uiIconConcrete
  // @ts-expect-error reverse direction is deliberately unpinned — see the header; if this line stops
  // erroring the surfaces have converged and the reverse pin should be promoted to a real assignment
  const reverseDirection: UiGeneratedIcon = mycIcon
  void primaryDirection
  void primaryDirectionConcrete
  void reverseDirection
}

describe('cross-system icon assignability (INFRA-3314)', () => {
  it('carries the compile-time pins', () => {
    const primaryDirectionHolds: PrimaryDirectionPin = true
    expect(primaryDirectionHolds).toBe(true)
    expect(typeof assignabilityPins).toBe('function')
  })

  it("mycelium's $icon size tokens are a subset of ui's, at identical px", () => {
    for (const [token, px] of Object.entries(MYCELIUM_ICON_SIZE_TOKEN_PX)) {
      expect(UI_ICON_SIZE_TOKEN_PX[token as keyof typeof UI_ICON_SIZE_TOKEN_PX], token).toBe(px)
    }
  })
})
