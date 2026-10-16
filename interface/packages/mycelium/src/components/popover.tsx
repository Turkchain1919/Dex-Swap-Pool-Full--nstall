'use client'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as React from 'react'
import { cn } from '../cn'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

/**
 * `side` and `align` are destructured with explicit defaults so the placement
 * API is discoverable — `side` used to be hard-written as `bottom` below the
 * `{...props}` spread, so callers could override it but nothing said so.
 *
 * The surface/animation classes are the repo's own tokens plus the stock
 * enter/exit pattern shared with DropdownMenuContent, SelectContent and
 * TooltipContent. They used to be fumadocs (`bg-fd-popover`,
 * `animate-fd-popover-in`), which only resolve inside apps/dev-portal —
 * everywhere else the panel had no background and no animation. `surface2`
 * (not `surface1`) is what dev-portal maps `--fd-popover` to, so its popovers
 * are unchanged.
 */
const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', side = 'bottom', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      side={side}
      sideOffset={sideOffset}
      className={cn(
        'z-50 origin-(--radix-popover-content-transform-origin) overflow-y-auto max-h-(--radix-popover-content-available-height) min-w-[240px] max-w-[98vw] rounded-xl border bg-surface2/60 backdrop-blur-lg p-2 text-sm text-neutral1 shadow-lg focus-visible:outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

const PopoverClose = PopoverPrimitive.PopoverClose

export { Popover, PopoverAnchor, PopoverTrigger, PopoverContent, PopoverClose }
