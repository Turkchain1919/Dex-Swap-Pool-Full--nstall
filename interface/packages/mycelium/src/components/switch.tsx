import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../cn'

const switchVariants = cva(
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border border-surface3 bg-surface3 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'data-[state=checked]:bg-accent1 data-[state=checked]:border-accent1',
        neutral: 'data-[state=checked]:bg-neutral1 data-[state=checked]:border-neutral1',
      },
      size: {
        sm: 'h-4 w-7',
        default: 'h-5 w-9',
        lg: 'h-6 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-surface1 border border-surface3 shadow-sm shadow-black/10 ring-0 transition-transform data-[state=unchecked]:translate-x-[3px] data-[state=checked]:border-transparent',
  {
    variants: {
      variant: {
        default: 'data-[state=checked]:bg-neutral-50',
        neutral: 'data-[state=checked]:bg-surface1',
      },
      size: {
        sm: 'size-2.5 data-[state=checked]:translate-x-[15px]',
        default: 'size-3.5 data-[state=checked]:translate-x-[19px]',
        lg: 'size-[18px] data-[state=checked]:translate-x-[23px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>, VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, SwitchProps>(
  ({ className, variant, size, ...props }, ref) => (
    <SwitchPrimitives.Root className={cn(switchVariants({ variant, size }), className)} {...props} ref={ref}>
      <SwitchPrimitives.Thumb className={cn(switchThumbVariants({ variant, size }))} />
    </SwitchPrimitives.Root>
  ),
)
Switch.displayName = SwitchPrimitives.Root.displayName

export type { SwitchProps }
export { Switch }
