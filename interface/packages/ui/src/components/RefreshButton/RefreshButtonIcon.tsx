import { TouchableArea } from '@universe/mycelium'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshIcon } from 'ui/src/loading/RefreshIcon'
import { ONE_SECOND_MS } from 'utilities/src/time/time'

/**
 * Refresh icon with 360-degree rotation animation.
 *
 * @param {() => void} onPress - Callback function to execute when the refresh button is pressed
 * @param {boolean} isLoading - Indicates whether a refresh operation is in progress
 * @param {boolean} disabled - Blocks the press handler and hides the button
 *
 * @returns {JSX.Element} A button with refresh icon
 */
export function RefreshButtonIcon({
  onPress,
  isLoading,
  disabled,
}: {
  onPress: () => void
  isLoading: boolean
  disabled?: boolean
}): JSX.Element {
  const [isAnimating, setIsAnimating] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopAnimation = useCallback((): void => {
    setIsAnimating(false)
    timeoutRef.current = null
  }, [])

  const handlePress = useCallback((): void => {
    if (isLoading || disabled) {
      return
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Trigger 360-degree rotation animation
    setIsAnimating(true)
    onPress()

    // Set timeout to stop animation after one second
    timeoutRef.current = setTimeout(stopAnimation, ONE_SECOND_MS)
  }, [isLoading, disabled, onPress, stopAnimation])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  return (
    <TouchableArea
      group
      animation={null}
      $group-hover={{ opacity: 1 }}
      opacity={0}
      // hide entirely when disabled: the disabled variant's 0.6 opacity would otherwise reveal this hover-only button
      display={disabled ? 'none' : 'flex'}
      flex={1}
      alignItems="center"
      transition="all 0.1s ease-in-out"
      justifyContent="center"
      // manually set disabled state using props, so we don't break hover state
      cursor={isLoading || disabled ? 'auto' : 'pointer'}
      disabled={isLoading || disabled}
      onPress={handlePress}
    >
      <RefreshIcon
        isAnimating={isAnimating}
        color="$neutral3"
        $group-hover={{ color: isLoading ? '$neutral3' : '$neutral3Hovered' }}
        size={16}
      />
    </TouchableArea>
  )
}
