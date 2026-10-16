import { Flex } from '@universe/mycelium'
import { useIsTouchDevice, useSporeColors } from '@universe/mycelium/theme-hooks-compat'
import type { ReactNode } from 'react'
import { CarouselEdgeFade } from '~/components/TokenCardCarousel/CarouselEdgeFade'
import { CarouselScrollButtonOverlay } from '~/components/TokenCardCarousel/CarouselScrollButtonOverlay'
import { CAROUSEL_CARD_GAP } from '~/components/TokenCardCarousel/constants'
import { TokenCardSkeletonRow, type TokenCardSkeletonLayout } from '~/components/TokenCardCarousel/TokenCardSkeleton'
import type { useHorizontalSnapCarousel } from '~/components/TokenCardCarousel/useHorizontalSnapCarousel'

export function TokenCardCarousel<T>({
  items,
  getItemKey,
  renderItem,
  isLoading,
  skeletonCount,
  skeletonLayout = 'vertical',
  carousel,
  cardWidth,
  fadeWidth,
  showArrowButtons,
  disableScrollSnap = false,
  forceLeftFade = false,
  fadeOnHoverOnly = true,
}: {
  items: T[]
  getItemKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  isLoading: boolean
  skeletonCount: number
  /** Shape of the loading placeholders; match the layout of the cards renderItem produces. */
  skeletonLayout?: TokenCardSkeletonLayout
  carousel: ReturnType<typeof useHorizontalSnapCarousel>
  cardWidth: number
  fadeWidth: number
  showArrowButtons: boolean
  /** Turns off CSS scroll snapping — for consumers that drive scrollLeft themselves (e.g. a marquee). */
  disableScrollSnap?: boolean
  /** Keeps the left edge fade on regardless of scroll state — for looping strips that always have content past the left edge. */
  forceLeftFade?: boolean
  /** Rests the edge fades hidden, showing them only while hovered alongside the arrow buttons. Set false for strips whose fades must stay up at rest (e.g. an active marquee). */
  fadeOnHoverOnly?: boolean
}): JSX.Element {
  const colors = useSporeColors()
  const isTouchDevice = useIsTouchDevice()
  const { setScrollRef, isAtEnd, isAtStart, isScrollSettled, isHovered, showButton, hideButton, onNext, onPrev } =
    carousel
  // Hover mode needs an arrow-capable layout with a pointer that can hover: showArrowButtons is
  // width-derived, so a wide touch device would otherwise rest-hide fades it can never reveal.
  const hoverFadeMode = fadeOnHoverOnly && showArrowButtons && !isTouchDevice
  // In hover mode each fade mirrors its arrow; the left settle heuristic is for resting fades only.
  const leftFadeShown =
    forceLeftFade || (hoverFadeMode ? isHovered && !isAtStart : !isAtStart && (isAtEnd || !isScrollSettled))
  const rightFadeShown = !hoverFadeMode || isHovered

  return (
    <Flex position="relative" width="100%" pointerEvents="auto" onMouseEnter={showButton} onMouseLeave={hideButton}>
      {isLoading ? (
        <Flex row gap={CAROUSEL_CARD_GAP} flexWrap="nowrap" overflow="hidden" width="100%">
          <TokenCardSkeletonRow cardWidth={cardWidth} count={skeletonCount} layout={skeletonLayout} />
        </Flex>
      ) : (
        /* oxlint-disable-next-line react/forbid-elements -- scroll container needs a real DOM node for the scroll ref plus web-only scroll-snap/scrollbar CSS that Flex doesn't expose */
        <div
          ref={setScrollRef}
          className="scrollbar-hidden"
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            gap: CAROUSEL_CARD_GAP,
            width: '100%',
            overflowX: 'scroll',
            overscrollBehaviorX: 'none',
            ...(disableScrollSnap ? {} : { scrollSnapType: 'x mandatory' as const }),
            scrollbarWidth: 'none',
          }}
        >
          {items.map((item) => (
            <Flex key={getItemKey(item)} flexShrink={0} className="snap-start">
              {renderItem(item)}
            </Flex>
          ))}
        </div>
      )}
      {!isLoading && (
        <CarouselEdgeFade
          side="left"
          fadeWidth={fadeWidth}
          surfaceColor={colors.surface1.val}
          opacity={leftFadeShown ? 1 : 0}
        />
      )}
      {(isLoading || !isAtEnd) && (
        <CarouselEdgeFade
          side="right"
          fadeWidth={fadeWidth}
          surfaceColor={colors.surface1.val}
          opacity={isLoading || rightFadeShown ? 1 : 0}
        />
      )}
      {showArrowButtons &&
        !isLoading &&
        (['left', 'right'] as const).map((direction) => {
          const isScrollable = direction === 'left' ? !isAtStart : !isAtEnd
          if (!isScrollable) {
            return null
          }

          return (
            <CarouselScrollButtonOverlay
              key={direction}
              direction={direction}
              visible={isHovered}
              onPress={direction === 'left' ? onPrev : onNext}
            />
          )
        })}
    </Flex>
  )
}
