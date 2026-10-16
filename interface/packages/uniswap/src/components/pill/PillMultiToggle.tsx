import { isWebPlatform } from '@universe/environment'
import { AnimatedFlex, Flex, Text, TouchableArea } from '@universe/mycelium'
import { SPORE_ANIMATION_CURVE_CSS } from '@universe/tailwind/animations'
import { withSporeCurve } from '@universe/tailwind/animations/reanimated'
import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { LayoutRectangle } from 'react-native'
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'

interface PillMultiToggleOption {
  value: string
  display?: JSX.Element | string
}

const FAST_CSS = SPORE_ANIMATION_CURVE_CSS.fast

/**
 * Web leg of the indicator animation (withSporeCurve is native-only): a plain
 * CSS transition on the layout-derived rest style. Hidden until the selected
 * pill has reported a layout, then fails open to fully visible. First
 * placement transitions opacity only — geometry is seeded untransitioned so
 * the indicator fades in place (native parity) instead of growing from zero;
 * geometry joins the transition once placed, for the selection slide/resize.
 */
export function getPillIndicatorWebStyle(activeLayout: LayoutRectangle | undefined, hasPlaced: boolean): CSSProperties {
  if (!activeLayout) {
    return { opacity: 0 }
  }
  return {
    opacity: 1,
    width: activeLayout.width,
    height: activeLayout.height,
    transform: `translate(${activeLayout.x}px, ${activeLayout.y}px)`,
    transition: hasPlaced
      ? `opacity ${FAST_CSS}, width ${FAST_CSS}, height ${FAST_CSS}, transform ${FAST_CSS}`
      : `opacity ${FAST_CSS}`,
  }
}

// TODO: WALL-4572 add tests for the native indicator animation and selection
// behavior (the web indicator style is covered by PillMultiToggle.test.ts)
export function PillMultiToggle({
  options,
  defaultOption,
  onSelectOption,
}: {
  options: PillMultiToggleOption[]
  defaultOption: string
  onSelectOption?: (option: string | number) => void
}): JSX.Element {
  const [currentTab, setCurrentTab] = useState(defaultOption)
  // Per-option layouts, relative to the shared wrapper the indicator is absolutely positioned in.
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({})

  const indicatorOpacity = useSharedValue(0)
  const indicatorX = useSharedValue(0)
  const indicatorY = useSharedValue(0)
  const indicatorWidth = useSharedValue(0)
  const indicatorHeight = useSharedValue(0)

  const activeLayout = layouts[currentTab]
  // Web twin of the native `indicatorOpacity.value === 0` first-placement check: flips after the
  // placed frame commits, so the next selection render carries the geometry transition.
  const hasPlacedOnWeb = useRef(false)

  useEffect(() => {
    if (isWebPlatform) {
      // Web rides the CSS leg below; shared-value writes would only drive a stale style snapshot.
      hasPlacedOnWeb.current = activeLayout !== undefined
      return
    }
    if (!activeLayout) {
      return
    }
    if (indicatorOpacity.value === 0) {
      // First placement fades in where the selected pill sits (the legacy enter fade).
      indicatorX.value = activeLayout.x
      indicatorY.value = activeLayout.y
      indicatorWidth.value = activeLayout.width
      indicatorHeight.value = activeLayout.height
      indicatorOpacity.value = withSporeCurve('fast', 1)
    } else {
      // Selection changes slide/resize the pill (the legacy `fast` layout animation).
      indicatorX.value = withSporeCurve('fast', activeLayout.x)
      indicatorY.value = withSporeCurve('fast', activeLayout.y)
      indicatorWidth.value = withSporeCurve('fast', activeLayout.width)
      indicatorHeight.value = withSporeCurve('fast', activeLayout.height)
    }
    // oxlint-disable-next-line react/exhaustive-deps -- shared values are stable refs
  }, [activeLayout])

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    width: indicatorWidth.value,
    height: indicatorHeight.value,
    transform: [{ translateX: indicatorX.value }, { translateY: indicatorY.value }],
  }))

  const onSelect = (value: string): void => {
    setCurrentTab(value)
    onSelectOption?.(value)
  }

  const onOptionLayout = (value: string, event: { nativeEvent: { layout: LayoutRectangle } }): void => {
    const layout = event.nativeEvent.layout
    setLayouts((prev) => {
      const existing = prev[value]
      if (
        existing &&
        existing.x === layout.x &&
        existing.y === layout.y &&
        existing.width === layout.width &&
        existing.height === layout.height
      ) {
        return prev
      }
      return { ...prev, [value]: layout }
    })
  }

  return (
    <Flex
      backgroundColor="$background"
      borderColor="$surface3"
      borderRadius="$roundedFull"
      borderWidth="$spacing1"
      flexDirection="column"
      p="$spacing4"
      position="relative"
    >
      <Flex>
        <AnimatedFlex
          backgroundColor="$surface3"
          borderRadius="$roundedFull"
          left={0}
          position="absolute"
          style={isWebPlatform ? getPillIndicatorWebStyle(activeLayout, hasPlacedOnWeb.current) : indicatorStyle}
          top={0}
          zIndex="$mask"
        />
        <Flex row backgroundColor="transparent" gap="$spacing12">
          {options.map((tab) => {
            const { value, display } = tab
            return (
              <TouchableArea
                key={value}
                borderRadius="$roundedFull"
                px="$spacing12"
                py="$spacing6"
                onLayout={(event) => onOptionLayout(value, event)}
                onPress={() => onSelect(value)}
              >
                <Text color={currentTab === value ? '$neutral1' : '$neutral2'} variant="buttonLabel3">
                  {display || value}
                </Text>
              </TouchableArea>
            )
          })}
        </Flex>
      </Flex>
    </Flex>
  )
}
