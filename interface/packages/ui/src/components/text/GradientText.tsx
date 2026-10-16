import type { LinearGradientCompatProps } from '@universe/mycelium/linear-gradient-compat'
import { TextCompat, type TextCompatProps } from '@universe/mycelium/text-compat'
import { PropsWithChildren } from 'react'

export type GradientTextProps = PropsWithChildren<TextCompatProps & { gradient: LinearGradientCompatProps }>

// TODO(WEB-4313): Implement GradientText for web
// `gradient` is destructured out (unused) so it doesn't spread onto TextCompat as an unknown prop.
export function GradientText({ children, gradient: _gradient, ...props }: GradientTextProps): JSX.Element {
  return <TextCompat {...props}>{children}</TextCompat>
}
