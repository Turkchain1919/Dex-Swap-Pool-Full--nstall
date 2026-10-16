import { AnimatedFlexCompat } from '@universe/mycelium/animated-flex-compat'
import { type ComponentProps } from 'react'
import type { AnimatedFlexProps } from 'ui/src/components/layout/AnimatedFlex'
// jsdom resolves `.web` legs, so the bare specifier would test the wrong file —
// the leg under test is imported by explicit path (AnimateInOrder precedent).
import { AnimatedFlex } from 'ui/src/components/layout/AnimatedFlex.native'
import { describe, expect, it } from 'vitest'

describe('AnimatedFlex (native)', () => {
  // The wrapper's behavior pins (host delivery, token resolution, array-style
  // composition) live with the implementation:
  // packages/tailwind/src/parity/animated-flex/native-parity.test.tsx, which
  // resolves the real .native legs. This suite pins only what the ui shim owns.
  it('is a re-export of the mycelium implementation — one AnimatedFlex on native', () => {
    expect(AnimatedFlex).toBe(AnimatedFlexCompat as unknown as typeof AnimatedFlex)
  })

  it('accepts the shared AnimatedFlexProps contract (compile-time pin)', () => {
    // Consumers type against the base leg's AnimatedFlexProps while the
    // native export derives its type from FlexCompat — the gap that let
    // zIndex="$sticky" and shadowColor="$shadowColor" compile and crash on
    // device. These assignments turn a future narrowing of FlexCompat's prop
    // surface into a typecheck failure here instead of a runtime drop.
    type NativeAnimatedFlexProps = ComponentProps<typeof AnimatedFlex>

    // Representative shared-contract usage — the live call-site shapes from
    // the consumer sweep: token-typed style props (the crash class), Flex
    // variants, and layout wiring. `satisfies` keeps every value inside the
    // shared contract; the typed assignment below then requires the native
    // export to accept the same values — a token union shrinking on
    // FlexCompat's side fails it naming the prop. (A whole-surface
    // assignability pin is not the contract: Tamagui's value types admit
    // `null` and CSS globals like 'inherit' that the compat surface
    // deliberately narrows away — the tailwind parity suite owns that
    // documented deviation, parity/flex/type-parity.ts.)
    const sharedContractUsage = {
      backgroundColor: '$surface1',
      borderWidth: '$spacing1',
      centered: true,
      flexGrow: 1,
      gap: '$spacing8',
      grow: true,
      onLayout: (): void => {},
      row: true,
      shadowColor: '$shadowColor',
      shadowRadius: '$spacing8',
      testID: 'contract',
      zIndex: '$sticky',
    } satisfies AnimatedFlexProps
    const acceptedByNativeExport: NativeAnimatedFlexProps = sharedContractUsage

    // Key floor: a key FlexCompat removes outright cannot fail the value pin
    // (extra source keys stay width-compatible), so the load-bearing shared
    // keys — the reanimated surface plus the swept prop shapes — are pinned
    // to stay on the native export. Removal fails naming the missing keys.
    type RequiredNativeKey =
      | 'style'
      | 'entering'
      | 'exiting'
      | 'layout'
      | 'onLayout'
      | 'testID'
      | 'zIndex'
      | 'gap'
      | 'row'
      | 'centered'
      | 'fill'
      | 'grow'
      | 'flexGrow'
      | 'borderWidth'
      | 'shadowColor'
      | 'shadowRadius'
      | 'backgroundColor'
    type KeyFloor = [Exclude<RequiredNativeKey, keyof NativeAnimatedFlexProps>] extends [never]
      ? true
      : { missingFromNativeExport: Exclude<RequiredNativeKey, keyof NativeAnimatedFlexProps> }
    const requiredKeysAccepted: KeyFloor = true

    expect(acceptedByNativeExport).toBe(sharedContractUsage)
    expect(requiredKeysAccepted).toBe(true)
  })
})
