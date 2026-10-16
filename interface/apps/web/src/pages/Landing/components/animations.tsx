import '~/pages/Landing/components/animations.css'
import { styled } from '@universe/mycelium/styled'
import type { ComponentPropsWithoutRef } from 'react'

type RiseInProps = {
  delay?: number
  children?: React.ReactNode
}

const RiseInTextFrame = styled('span', {
  platform: 'web',
  base: 'inline-flex landing-rise-in',
})

export function RiseInText({
  delay,
  style,
  ...rest
}: { delay?: number } & ComponentPropsWithoutRef<typeof RiseInTextFrame>): JSX.Element {
  return <RiseInTextFrame style={{ animationDelay: `${1000 * (delay ?? 0)}ms`, ...style }} {...rest} />
}

const RiseInFrame = styled('span', {
  platform: 'web',
  base: 'flex w-full flex-none justify-center pointer-events-none landing-rise-in',
})

export function RiseIn({
  delay,
  style,
  ...rest
}: { delay?: number } & ComponentPropsWithoutRef<typeof RiseInFrame>): JSX.Element {
  return <RiseInFrame style={{ animationDelay: `${1000 * (delay ?? 0)}ms`, ...style }} {...rest} />
}

const HoverContainer = styled('div', {
  platform: 'web',
  base: 'inline-block relative landing-hover-float',
})

export const Hover = (props: RiseInProps) => {
  return <HoverContainer>{props.children}</HoverContainer>
}
