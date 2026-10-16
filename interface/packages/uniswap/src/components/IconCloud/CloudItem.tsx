import { Flex, type FlexCompatProps, validColor } from '@universe/mycelium'
import { startTransition, useEffect, useState } from 'react'
import type { ItemData, ItemPoint } from 'uniswap/src/components/IconCloud/IconCloud'
import { randomChoice } from 'uniswap/src/components/IconCloud/utils'
import { useInjectSingleStylesheet } from 'utilities/src/react/useInjectSingleStylesheet'
import { ONE_SECOND_MS } from 'utilities/src/time/time'

/** Mirrors the `bouncy`/`fast` presets in `ui/src/theme/animations`; spelled as CSS since new Tamagui `animation` props are banned (INFRA-2958). */
const BOUNCY_CURVE = '400ms cubic-bezier(0.34, 1.56, 0.64, 1)'
const FAST_CURVE = '100ms cubic-bezier(0.17, 0.67, 0.45, 1)'

const CLOUD_ITEM_KEYFRAMES_ID = 'uniswap-cloud-item-keyframes'
// Transform function order (translate, scale, rotate) matches the compat transform merge, so the
// enter animation lands exactly on the elements' base transforms.
const CLOUD_ITEM_KEYFRAMES_CSS = `
    @keyframes uniswap-cloud-item-enter {
      from { transform: translateY(30px); }
      to { transform: translateY(0); }
    }
    @keyframes uniswap-cloud-icon-enter {
      from { transform: translateY(30px) scale(0) rotate(-15deg); opacity: 0; }
      to { transform: translateY(0) scale(1) rotate(15deg); opacity: 1; }
    }
  `

function TokenIconPositioner({
  size,
  delay,
  ...rest
}: FlexCompatProps & {
  size: number
  delay: number
}): JSX.Element | null {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const tm = setTimeout(() => {
      startTransition(() => {
        setShow(true)
      })
    }, delay * ONE_SECOND_MS)

    return () => {
      clearTimeout(tm)
    }
  }, [delay])

  if (!show) {
    return null
  }

  return <Flex pointerEvents="auto" width={size} height={size} {...rest} />
}

function FloatContainer({
  duration = 0,
  paused,
  style,
  ...rest
}: FlexCompatProps & { duration?: number; paused?: boolean }): JSX.Element {
  return (
    <Flex
      $platform-web={{ position: 'absolute', transformOrigin: 'center center' }}
      style={{
        animationName: 'cloud-float-animation',
        animationDuration: `${1000 * duration}ms`,
        animationIterationCount: 'infinite',
        animationTimingFunction: 'linear',
        animationPlayState: paused ? 'paused' : 'running',
        ...style,
      }}
      {...rest}
    />
  )
}

function RotateContainer({
  duration = 0,
  paused,
  style,
  ...rest
}: FlexCompatProps & { duration?: number; paused?: boolean }): JSX.Element {
  return (
    <Flex
      $platform-web={{ position: 'absolute', transformOrigin: 'center center' }}
      style={{
        animationName: 'token-rotate-animation',
        animationDuration: `${1000 * duration}ms`,
        animationFillMode: 'forwards',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
        animationDirection: 'alternate-reverse',
        animationPlayState: paused ? 'paused' : 'running',
        ...style,
      }}
      {...rest}
    />
  )
}

function TokenIconRing({
  size,
  rounded,
  style,
  ...rest
}: FlexCompatProps & { size?: number; rounded?: boolean }): JSX.Element {
  return (
    <Flex
      borderWidth={1}
      borderColor="$color"
      transformOrigin="center center"
      position="absolute"
      width={size}
      height={size}
      style={rounded ? { borderRadius: '50%', ...style } : style}
      {...rest}
    />
  )
}

function ItemContainer({
  logoUrl,
  blur,
  size,
  rounded,
  style,
  ...rest
}: FlexCompatProps & { logoUrl?: string; blur?: number; size?: number; rounded?: boolean }): JSX.Element {
  return (
    <Flex
      backgroundSize={logoUrl !== undefined ? 'contain' : 'cover'}
      backgroundPosition="center center"
      backgroundImage={logoUrl !== undefined ? `url(${logoUrl})` : undefined}
      backgroundRepeat={logoUrl !== undefined ? 'no-repeat' : undefined}
      transition={`opacity ${FAST_CURVE}, transform ${FAST_CURVE}, filter ${FAST_CURVE}`}
      transformOrigin="center center"
      width={size}
      height={size}
      filter={blur !== undefined ? `blur(${blur}px)` : undefined}
      style={rounded ? { borderRadius: '50%', ...style } : style}
      {...rest}
    />
  )
}

export function CloudItem<T extends ItemData>({
  point,
  renderOuterElement,
  getElementRounded,
  onPress,
  isPaused = false,
}: {
  point: ItemPoint<T>
  renderOuterElement?: (point: ItemPoint<T>) => JSX.Element
  getElementRounded?: (point: ItemPoint<T>) => boolean
  onPress?: (point: ItemPoint<T>) => void
  isPaused?: boolean
}): JSX.Element {
  useInjectSingleStylesheet({ id: CLOUD_ITEM_KEYFRAMES_ID, css: CLOUD_ITEM_KEYFRAMES_CSS })

  const { x, y, blur, size, rotation, opacity, delay, floatDuration, color } = point

  const borderRadius = size / 8
  const duration = 200 / (22 - rotation)

  return (
    <Flex position="absolute" group="item" top={y} left={x} width={size} height={size} transformOrigin="center center">
      <Flex style={{ animation: `uniswap-cloud-item-enter ${BOUNCY_CURVE}` }}>
        <TokenIconPositioner
          delay={delay}
          rotate="15deg"
          opacity={1}
          scale={1}
          style={{ animation: `uniswap-cloud-icon-enter ${BOUNCY_CURVE}` }}
          size={size}
        >
          <FloatContainer duration={floatDuration} paused={isPaused}>
            {renderOuterElement && renderOuterElement(point)}
            <RotateContainer duration={duration} paused={isPaused}>
              <ItemContainer
                size={size}
                blur={blur}
                backgroundColor={validColor(color)}
                rounded={getElementRounded?.(point)}
                logoUrl={point.itemData.logoUrl}
                opacity={opacity}
                borderRadius={borderRadius}
                $group-item-hover={{
                  opacity: 1,
                  scale: 1.2,
                  rotate: `${randomChoice([0 - rotation, 0 - rotation])}deg`,
                  filter: 'blur(0)',
                  cursor: onPress ? 'pointer' : undefined,
                }}
                onPress={onPress ? (): void => onPress(point) : undefined}
              >
                {getElementRounded && (
                  <>
                    <TokenIconRing
                      opacity={0}
                      transition={`opacity ${BOUNCY_CURVE}, transform ${BOUNCY_CURVE}`}
                      $group-item-hover={{
                        opacity: 0.3,
                        scale: 1.2,
                      }}
                      size={size}
                      rounded={getElementRounded(point)}
                      borderColor={validColor(color)}
                      borderRadius={borderRadius * 1.3}
                    />
                    <TokenIconRing
                      opacity={0}
                      transition={`opacity ${BOUNCY_CURVE}, transform ${BOUNCY_CURVE}`}
                      $group-item-hover={{
                        opacity: 0.1,
                        scale: 1.4,
                      }}
                      size={size}
                      rounded={getElementRounded(point)}
                      borderColor={validColor(color)}
                      borderRadius={borderRadius * 1.6}
                    />
                  </>
                )}
              </ItemContainer>
            </RotateContainer>
          </FloatContainer>
        </TokenIconPositioner>
      </Flex>
    </Flex>
  )
}
