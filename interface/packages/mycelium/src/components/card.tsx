import * as React from 'react'
import { cn } from '../cn'
import { FlexCompat as Flex } from '../flex-compat/FlexCompat'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <Flex
    justifyContent="flex-start"
    ref={ref}
    flexDirection="column"
    className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Flex
      justifyContent="flex-start"
      ref={ref}
      flexDirection="column"
      className={cn('space-y-1.5 p-6', className)}
      {...props}
    />
  ),
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    // Subheading/1 token, same treatment as DialogTitle: font-semibold (600) is not a Basel
    // weight (485/535), so it was synthesising a bold. Card isn't in the Figma nodes that
    // were read — the shared Subheading/1 style is an assumption, see the PR body.
    <Flex
      flexDirection="row"
      justifyContent="flex-start"
      ref={ref}
      className={cn('text-subheading-1 text-neutral1', className)}
      {...props}
    />
  ),
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Flex
      flexDirection="row"
      justifyContent="flex-start"
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  ),
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Flex
      justifyContent="flex-start"
      ref={ref}
      flexDirection="column"
      className={cn('p-6 pt-0', className)}
      {...props}
    />
  ),
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Flex
      flexDirection="row"
      justifyContent="flex-start"
      ref={ref}
      alignItems="center"
      className={cn('p-6 pt-0', className)}
      {...props}
    />
  ),
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
