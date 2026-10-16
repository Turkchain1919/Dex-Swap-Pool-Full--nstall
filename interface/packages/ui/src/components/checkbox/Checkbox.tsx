import { Indicator as CheckboxPrimitiveIndicator, Root as CheckboxPrimitiveRoot } from '@rn-primitives/checkbox'
import { isWebPlatform } from '@universe/environment'
import { type ColorTokens, getTokenValue } from '@universe/mycelium'
import { Flex, FlexProps } from '@universe/mycelium'
import type { CheckboxCompatProps } from '@universe/mycelium/checkbox-compat'
import { ComponentProps, ReactElement, useMemo, useRef, useState } from 'react'
import { Check } from 'ui/src/components/icons'
import { SporeComponentVariant } from 'ui/src/components/types'
import { IconSizeTokens } from 'ui/src/theme'
import { useEvent } from 'utilities/src/react/hooks'

type CheckboxSizes = {
  FocusRing: number
  CheckboxButton: number
  CheckSizeDefault: number
  CheckSizePressed: number
  UnselectedHoverIndicator: number
  UnselectedPressedIndicator: number
}

function getSizes(size?: IconSizeTokens): CheckboxSizes {
  const buttonSize = size ? getTokenValue(size) : 20
  return {
    FocusRing: Math.round(buttonSize * 1.3),
    CheckboxButton: buttonSize, // Default 20
    CheckSizeDefault: buttonSize - 4,
    CheckSizePressed: buttonSize - 2,
    UnselectedHoverIndicator: Math.round(buttonSize * 0.2),
    UnselectedPressedIndicator: Math.round(buttonSize * 0.3),
  }
}

export type CheckboxSizeTokens = '$icon.16' | '$icon.18' | '$icon.20'

// `borderColor` is omitted because it has never had an effect: the Tamagui Checkbox re-declared
// `borderColor` after `{...rest}`, so a caller-passed value was always swallowed (pinned by the
// parity suite). Omitting it makes the compiler say what that comment used to.
//
// The rest of the surface is typed from where each prop actually lands, because
// `CheckboxCompatProps` is the contract of the component that will REPLACE this one, not a
// transcription of what this one still accepts. `pointerEvents` and `style` come from `FlexProps`
// because they are spread onto the box Flex and the compat contract narrowed both (no `'unset'`,
// no `RegisteredStyle`); the press-lifecycle props come from the primitive Root they are forwarded
// to, which the compat contract never declared. Narrowing any of them would be a behavior change
// rather than a tightening.
type CheckboxProps = {
  variant?: SporeComponentVariant
  checked: boolean
  size?: CheckboxSizeTokens
} & Omit<CheckboxCompatProps, 'borderColor' | 'checked' | 'pointerEvents' | 'size' | 'style' | 'variant'> &
  Pick<FlexProps, 'pointerEvents' | 'style'> &
  Partial<Pick<ComponentProps<typeof CheckboxPrimitiveRoot>, 'onLongPress' | 'onPressIn' | 'onPressOut'>>

/**
 * Spore Checkbox
 *
 * Built on `@rn-primitives/checkbox` (press handling + a11y semantics). Two deliberate
 * departures from the original it replaces: the animation preset prop is gone (new usages are
 * banned by INFRA-2958), so state changes snap instead of easing; and the `default` variant's
 * accent is `$neutral1` rather than `$accent3`, moving the checked border, the hovered border
 * and the indicator fill. Both tokens are near-black in light mode — `#222222`
 * becomes `#131313` — and dark mode is unchanged at rest (`#FFFFFF` either way). The hovered
 * token changes in both themes, opaque to translucent. `branded` is unchanged.
 *
 * @param checked - boolean value that determines if the checkbox is checked
 * @param variant - determines the color of the button in the selected state (branded is pink)
 * @param size - determines size of the checkbox - currently supports $icon.16 $icon.18 $icon.20
 * @returns
 */
export function Checkbox({
  checked,
  variant = 'default',
  size = '$icon.20',
  onCheckedChange,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  name,
  value,
  required,
  ...rest
}: CheckboxProps): ReactElement {
  // Untyped callers can still smuggle `borderColor` past the Omit-ed prop type; strip it so it
  // stays swallowed at runtime exactly like the Tamagui Checkbox, which re-declared `borderColor`
  // after `{...rest}` (pinned byte-for-byte by the parity suite).
  const { borderColor: _borderColor, ...styleProps } = rest as FlexProps
  // The Tamagui Checkbox carried `name`/`value`/`required` through to the DOM on web but dropped
  // them on device; a plain Flex host would forward them everywhere, so keep the platform split.
  const formProps = isWebPlatform ? { name, value, required } : undefined
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const accentColor = getAccentColor(variant, isHovered)
  const sizes = useMemo(() => getSizes(size), [size])

  // WEB ONLY: the primitive can report the same toggle through both its Radix and its Pressable
  // press paths in a single click — collapse duplicate reports so consumers see one call, as
  // they did with the Tamagui Checkbox. BOTH callbacks are guarded, consistently:
  // `onCheckedChange` is provably double-reported per click (Radix's own click handler plus the
  // primitive's Slot-composed press path both fire it), and `onPress` gets the same tick-scoped
  // guard so a press path that ever double-delivers can never double-fire consumers either —
  // guarding one but not the other would leave toggle-style `onPress` consumers netting zero.
  // On native the primitive has exactly one press path (its Pressable), so neither guard runs
  // there: deduping the only path risks swallowing real toggles (e.g. two taps landing before a
  // controlled `checked` re-render).
  const lastReportedValue = useRef<boolean | undefined>(undefined)
  const handleCheckedChange = useEvent((next: boolean | 'indeterminate'): void => {
    const nextValue = next === 'indeterminate' ? true : next
    if (isWebPlatform) {
      if (lastReportedValue.current === nextValue) {
        return
      }
      lastReportedValue.current = nextValue
      // Release the guard after this tick so a follow-up genuine toggle to the same value still lands.
      setTimeout(() => {
        lastReportedValue.current = undefined
      }, 0)
    }
    onCheckedChange?.(nextValue)
  })
  const hasReportedPress = useRef(false)
  const handlePress = useEvent((event: Parameters<NonNullable<typeof onPress>>[0]): void => {
    if (isWebPlatform) {
      if (hasReportedPress.current) {
        return
      }
      hasReportedPress.current = true
      // Same release schedule as above: duplicates land in the same tick, real presses don't.
      setTimeout(() => {
        hasReportedPress.current = false
      }, 0)
    }
    onPress?.(event)
  })

  return (
    // This outer ring is only shown when the button is focused.
    <Flex
      alignItems="center"
      borderColor={getFocusedRingColor({ variant, isFocused, isSelected: checked, accentColor })}
      borderRadius="$rounded6"
      borderWidth="$spacing1"
      height={sizes.FocusRing}
      justifyContent="center"
      width={sizes.FocusRing}
    >
      {/* Caller press handlers ride the Root, not the box Flex: on web the Root Slot-merges them
          onto the box anyway, so placement there is unchanged. */}
      <CheckboxPrimitiveRoot
        asChild
        checked={checked}
        disabled={rest.disabled ?? false}
        onCheckedChange={handleCheckedChange}
        onLongPress={onLongPress}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {/* `styleProps` is `rest` cast to FlexProps (see the strip above): TamaguiCheckboxProps and
            FlexProps disagree on a few style prop shapes (e.g. `inset`), but every prop call sites
            actually pass is valid on both. */}
        <Flex
          {...styleProps}
          {...formProps}
          alignItems="center"
          backgroundColor="transparent"
          borderColor={rest.disabled ? '$neutral3' : checked ? accentColor : '$neutral2'}
          borderRadius="$rounded4"
          borderWidth="$spacing2"
          cursor="pointer"
          disabledStyle={{
            borderColor: '$neutral3',
          }}
          height={sizes.CheckboxButton}
          hoverStyle={{
            borderColor: checked ? accentColor : '$neutral2',
          }}
          justifyContent="center"
          pointerEvents={rest.disabled ? 'none' : 'auto'}
          // The primitive's web leg re-labels the element role="button" (it sets role="checkbox"
          // only as a DOM property); declare the checkbox role explicitly, as the Tamagui
          // Checkbox did — child props win the primitive's Slot merge. Web only: on native the
          // primitive already announces role="checkbox", and an explicit role on a Tamagui view
          // announces a second one.
          //
          // tag="button" is load-bearing for the keyboard: the Tamagui Checkbox rendered a real
          // <button>, and Space/Enter activation comes from the user agent — Radix's only key
          // handler is `Enter → preventDefault` and Tamagui has no keyboard→press mapping, so a
          // div here is tab-focusable but keyboard-inert (pinned by the parity suite).
          {...(isWebPlatform ? { role: 'checkbox' as const, tag: 'button' as const } : undefined)}
          width={sizes.CheckboxButton}
          onBlur={() => setIsFocused(false)}
          onFocus={() => setIsFocused(true)}
          {...(isWebPlatform
            ? {
                onMouseDown: () => setIsPressed(true),
                onMouseEnter: () => setIsHovered(true),
                onMouseLeave: () => setIsHovered(false),
                onMouseUp: () => setIsPressed(false),
              }
            : undefined)}
        >
          {/* CheckboxPrimitive.Indicator is a container around the inner checkmark icon which is shown when the item is selected. */}
          <CheckboxPrimitiveIndicator asChild>
            {/* role={undefined} overrides the primitive's role="presentation": the Tamagui
                Checkbox.Indicator announced no role, and announced roles are pinned by the
                tailwind parity suite. */}
            <Flex
              alignItems="center"
              role={undefined}
              backgroundColor={rest.disabled ? '$neutral3' : accentColor}
              height={sizes.CheckSizePressed}
              justifyContent="center"
              width={sizes.CheckSizePressed}
            >
              <Check
                color={rest.disabled ? '$neutral2' : variant === 'branded' ? 'white' : '$surface1'}
                size={isPressed ? sizes.CheckSizePressed : sizes.CheckSizeDefault}
              />
            </Flex>
          </CheckboxPrimitiveIndicator>
          {/* Inner dot shown in *unselected* hovered states. It mounts and unmounts with no exit
              animation: the Tamagui `AnimatePresence` wrapper it used to sit inside never
              registered it (no `animation` prop), so the exit was always immediate. A real exit
              lane is mycelium `Presence`'s to add if design wants one. */}
          {!checked && isHovered && !rest.disabled && (
            <Flex
              backgroundColor="$neutral2"
              borderRadius="$roundedFull"
              enterStyle={{ scale: 0 }}
              height={isPressed ? sizes.UnselectedPressedIndicator : sizes.UnselectedHoverIndicator}
              position="absolute"
              width={isPressed ? sizes.UnselectedPressedIndicator : sizes.UnselectedHoverIndicator}
            />
          )}
        </Flex>
      </CheckboxPrimitiveRoot>
    </Flex>
  )
}

// `default` paints `$neutral1`, not legacy's `$accent3`: accent3 is on the rejected side of
// mycelium's colour boundary, where the Flex lane emits no colour at all.
function getAccentColor(variant: SporeComponentVariant, isHovered: boolean): ColorTokens {
  if (variant === 'branded') {
    return isHovered ? '$accent1Hovered' : '$accent1'
  }
  return isHovered ? '$neutral1Hovered' : '$neutral1'
}

function getFocusedRingColor({
  variant,
  isFocused,
  isSelected,
  accentColor,
}: {
  variant: SporeComponentVariant
  isFocused: boolean
  isSelected: boolean
  accentColor: ColorTokens
}): ColorTokens | 'transparent' {
  if (!isFocused) {
    return 'transparent'
  }
  if (variant === 'branded') {
    return isSelected ? accentColor : '$neutral3'
  }
  return '$neutral3'
}
