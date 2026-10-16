/**
 * NATIVE leg of `IconButtonCompat` — the web leg's orchestration over the
 * same shared building blocks, plus the one platform-only behavior: the
 * legacy LayoutAnimation on loading-state changes (a no-op flag on web).
 *
 * The shared prop contract types the press family with DOM events; on native
 * the same handlers receive gesture-responder events through the frame's RNGH
 * Pressable — the `TouchableTextLinkCompat.native` mechanism.
 */
import { forwardRef, type JSX, type Ref } from 'react'
import type { View } from 'react-native'
import { isButtonDisabled } from '../button-compat/compile'
import { ButtonFrameCompat } from '../button-frame-compat/ButtonFrameCompat'
import { useLayoutAnimationOnLoadingChange } from '../button-frame-compat/layout-animation'
import { ThemedIconCompat, ThemedSpinnerCompat } from '../button-frame-compat/ThemedIconCompat'
import type { IconButtonCompatProps } from './props'
import { iconButtonSizeDefaultProps } from './resolve'

export const IconButtonCompat = forwardRef<View, IconButtonCompatProps>(function IconButtonCompat(
  {
    icon,
    shouldAnimateBetweenLoadingStates = true,
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
  useLayoutAnimationOnLoadingChange(loading, shouldAnimateBetweenLoadingStates)

  const isDisabled = isButtonDisabled({ disabled, loading })

  return (
    <ButtonFrameCompat
      // tsc resolves only ButtonFrameCompat's platformless base (web) leg —
      // `moduleSuffixes` is configured nowhere — so the RN View ref crosses
      // the leg boundary with a cast; at runtime Metro resolves
      // ButtonFrameCompat.native, whose ref IS an RN View.
      ref={ref as unknown as Ref<HTMLElement>}
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
