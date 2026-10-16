/**
 * WEB leg of `IconButtonCompat` — the drop-in twin of the legacy `ui/src`
 * `IconButton`, assembled exactly as legacy assembles it from the Tamagui
 * internals: `ButtonFrameCompat` carrying the `IconButtonFrame` size variant
 * (./resolve), wrapping the `typeOfButton: 'icon'` themed icon/spinner.
 *
 * Prop flow mirrors the legacy orchestrator: `fill={false}` sits ahead of the
 * rest spread so a caller's `fill` still wins, and the disabled/
 * onDisabledPress dispatch semantics live in the frame, as on legacy.
 * Note the legacy asymmetry this preserves: the onPress→onDisabledPress swap
 * lives in legacy `Button.tsx` ONLY — `IconButton.tsx` spreads props straight
 * into the styled frame, where `onDisabledPress` is styling-only (keeps the
 * button interactive) and a disabled-interactive click still dispatches the
 * regular `onPress`, never `onDisabledPress` (pinned in the test suites).
 * `shouldAnimateBetweenLoadingStates` is accepted for API parity — the legacy
 * hook is RN LayoutAnimation, a no-op on web; the native leg wires it.
 */
import { forwardRef, type JSX } from 'react'
import { isButtonDisabled } from '../button-compat/compile'
import { ButtonFrameCompat } from '../button-frame-compat/ButtonFrameCompat'
import { ThemedIconCompat, ThemedSpinnerCompat } from '../button-frame-compat/ThemedIconCompat'
import type { IconButtonCompatProps } from './props'
import { iconButtonSizeDefaultProps } from './resolve'

export const IconButtonCompat = forwardRef<HTMLElement, IconButtonCompatProps>(function IconButtonCompat(
  {
    icon,
    shouldAnimateBetweenLoadingStates: _shouldAnimateBetweenLoadingStates = true,
    loading,
    disabled,
    size = 'medium',
    variant = 'default',
    emphasis = 'primary',
    focusScaling = 'equal:smaller-button',
    ...rest
  },
  ref,
): JSX.Element {
  const isDisabled = isButtonDisabled({ disabled, loading })

  return (
    <ButtonFrameCompat
      ref={ref}
      fill={false}
      isDisabled={isDisabled}
      size={size}
      variant={variant}
      emphasis={emphasis}
      focusScaling={focusScaling}
      {...rest}
      // After rest: an EXPLICIT p={undefined} in rest must not erase the
      // emitted default (legacy skips undefined props); a defined caller
      // value still wins because the guard withholds the default instead.
      {...iconButtonSizeDefaultProps({ size, p: rest.p, padding: rest.padding, borderRadius: rest.borderRadius })}
    >
      <ThemedIconCompat isDisabled={isDisabled} emphasis={emphasis} size={size} variant={variant} typeOfButton="icon">
        {loading ? undefined : icon}
      </ThemedIconCompat>

      {loading ? (
        <ThemedSpinnerCompat
          isDisabled={isDisabled}
          emphasis={emphasis}
          size={size}
          variant={variant}
          typeOfButton="icon"
        />
      ) : null}
    </ButtonFrameCompat>
  )
})
