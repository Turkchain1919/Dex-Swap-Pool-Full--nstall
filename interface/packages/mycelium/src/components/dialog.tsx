import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../cn'
import { FlexCompat as Flex } from '../flex-compat/FlexCompat'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('overlay-backdrop fixed inset-0 z-50 bg-black/50', className)}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Spore dialog 15079:22112: radius 20 on all four corners (unconditional — it used
        // to be sm:rounded-lg, so below the sm breakpoint the dialog had square corners),
        // padding 16 top / 24 sides / 24 bottom, container gap 16.
        // Centring comes from `.dialog-content` (see packages/tailwind/css/animations.css).
        'dialog-content fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 rounded-20 border bg-background px-6 pt-4 pb-6 shadow-lg',
        className,
      )}
      {...props}
    >
      {children}
      {/* 24x24 hit area, flush to the 24px right padding and level with the 16px top padding */}
      <DialogPrimitive.Close className="absolute right-6 top-4 grid size-6 cursor-pointer place-content-center rounded-sm opacity-70 ring-offset-background transition-all duration-80 ease-in-out hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground active:scale-90">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

// Spore dialog 15079:22112 — title/description gap 8, centred at every width (it used to be
// text-center sm:text-left). Text alignment only: no `items-center`, which would collide with
// Flex's default `items-stretch` and shrink every header child to fit its content.
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => (
  <Flex justifyContent="flex-start" flexDirection="column" className={cn('gap-2 text-center', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => (
  <Flex
    flexDirection="row"
    justifyContent="flex-start"
    className={cn('flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  // Subheading/1 token, not text-lg + font-semibold: 600 is not a Basel weight (Basel is
  // 485/535), so it was synthesising a bold. The token carries 18px/24px at 485 and owns
  // its own line-height and tracking — don't layer a font-weight class back on.
  <DialogPrimitive.Title ref={ref} className={cn('text-subheading-1 text-neutral1', className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  // Body/3 token (14px/20px at 485), matching SheetDescription — the already-Spore-ified twin
  <DialogPrimitive.Description ref={ref} className={cn('text-body-3 text-neutral2', className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
