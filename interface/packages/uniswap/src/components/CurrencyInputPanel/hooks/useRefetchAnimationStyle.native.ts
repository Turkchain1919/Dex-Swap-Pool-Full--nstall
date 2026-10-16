import { useEffect } from 'react'
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { CurrencyInputPanelProps } from 'uniswap/src/components/CurrencyInputPanel/types'
import { usePrevious } from 'utilities/src/react/hooks'

/** Returns an animated opacity based on current indicative and full quote state  */
export function useRefetchAnimationStyle({
  currencyAmount,
  isLoading,
  isIndicativeLoading,
  valueIsIndicative,
}: Pick<CurrencyInputPanelProps, 'currencyAmount' | 'isLoading' | 'isIndicativeLoading' | 'valueIsIndicative'>): {
  opacity: number
} {
  const loadingFlexProgress = useSharedValue(1)

  const previousAmount = usePrevious(currencyAmount)

  const amountIsTheSame = currencyAmount && previousAmount?.equalTo(currencyAmount)
  const noIndicativeUI = !isIndicativeLoading && !valueIsIndicative

  // The component is 'refetching' the full quote when the amount hasn't changed, and there is no indicative UI being displayed.
  const isRefetching = Boolean(isLoading && amountIsTheSame && noIndicativeUI)

  // Pulse only while refetching: an always-on repeat ticks at 60fps and, on the new
  // architecture, each tick is a Fabric commit — starving gesture rendering.
  useEffect(() => {
    if (isRefetching) {
      loadingFlexProgress.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 400, easing: Easing.ease }),
          withTiming(1, { duration: 400, easing: Easing.ease }),
        ),
        -1,
        true,
      )
    } else {
      cancelAnimation(loadingFlexProgress)
      loadingFlexProgress.value = 1
    }
    return () => cancelAnimation(loadingFlexProgress)
  }, [isRefetching, loadingFlexProgress])

  // reanimated 4 returns an AnimatedStyleHandle; cast to the shared cross-platform shape.
  return useAnimatedStyle(
    () => ({
      opacity: isRefetching ? loadingFlexProgress.value : 1,
    }),
    [isRefetching, loadingFlexProgress],
  ) as unknown as { opacity: number }
}
