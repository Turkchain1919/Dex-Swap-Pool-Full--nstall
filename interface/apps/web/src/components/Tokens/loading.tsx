import { View, type ViewCompatProps as ViewProps } from '@universe/mycelium'
import { lighten } from 'polished'
import { createContext, useContext } from 'react'
import type { ComponentProps } from 'react'
import { Shine, useSporeColors } from 'ui/src'
/** When true, LoadingBubbles render as static skeletons (no shine). E.g. a table's error state. */
export const StaticSkeletonContext = createContext(false)

interface LoadingBubbleProps {
  delay?: string
  round?: boolean
  height?: ViewProps['height']
  width?: ViewProps['width']
  // Typed against the legacy Shine the props spread onto (its own props convert with it).
  containerProps?: Partial<ComponentProps<typeof Shine>>
  skeletonProps?: ViewProps
}

export const LoadingBubble = ({
  delay,
  round,
  height = '$spacing24',
  width = '50%',
  containerProps,
  skeletonProps,
}: LoadingBubbleProps) => {
  const colors = useSporeColors()
  const isStatic = useContext(StaticSkeletonContext)

  return (
    <Shine
      disabled={isStatic}
      flexDirection="row"
      width="100%"
      $platform-web={{ animationDelay: delay }}
      {...containerProps}
    >
      <View
        borderRadius={round ? '$roundedFull' : '$rounded12'}
        height={height}
        width={width}
        $platform-web={{
          background: `linear-gradient(to left, ${colors.surface3.val} 25%, ${lighten(0.075, colors.surface3.val)} 50%, ${colors.surface3.val} 75%)`,
        }}
        {...skeletonProps}
      />
    </Shine>
  )
}
