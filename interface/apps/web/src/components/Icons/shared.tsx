import { cn } from '@universe/mycelium'
import type { SVGProps } from 'react'

type StyledSVGProps = SVGProps<SVGSVGElement> & { size: string }

// stroke/fill reach the paths via SVG attribute inheritance (they ride {...rest}); child paths
// must not set competing presentation attributes for these props.
export function StyledSVG({ size, style, ...rest }: StyledSVGProps): JSX.Element {
  return <svg style={{ height: size, width: size, ...style }} {...rest} />
}

export function StyledRotatingSVG({ className, ...rest }: StyledSVGProps): JSX.Element {
  return <StyledSVG className={cn('rotating-svg', className)} {...rest} />
}
