import { Flex } from '@universe/mycelium'

export function CarouselEdgeFade({
  side,
  opacity,
  fadeWidth,
  surfaceColor,
}: {
  side: 'left' | 'right'
  opacity: number
  fadeWidth: number
  surfaceColor: string
}): JSX.Element {
  const isLeft = side === 'left'

  return (
    <Flex
      position="absolute"
      top={0}
      bottom={0}
      left={isLeft ? 0 : undefined}
      right={isLeft ? undefined : 0}
      width={fadeWidth}
      pointerEvents="none"
      opacity={opacity}
      // Gradient interpolates the runtime surface color, so it stays an inline style rather than a class.
      style={{
        background: isLeft
          ? `linear-gradient(to left, transparent, ${surfaceColor})`
          : `linear-gradient(to right, transparent, ${surfaceColor})`,
        transition: 'opacity 0.2s ease',
      }}
    />
  )
}
