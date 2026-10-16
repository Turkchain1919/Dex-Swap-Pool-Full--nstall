import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import * as React from 'react'
import { cn } from '../cn'

/** ui/src CheckmarkCircle (the legacy selected-row marker), path verbatim, currentColor-driven.
 * Copied from the option-list compat's icons (INFRA-3021 dropdown set) so the Select checkmark
 * matches the network selector — consolidate with option-list-compat once that lands. */
function CheckmarkCircleGlyph({
  size = 20,
  ...rest
}: Omit<React.SVGProps<SVGSVGElement>, 'width' | 'height'> & { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 17 18" fill="none" aria-hidden="true" focusable="false" {...rest}>
      <path
        d="M8.62508 0.666664C4.02508 0.666664 0.291748 4.4 0.291748 9C0.291748 13.6 4.02508 17.3333 8.62508 17.3333C13.2251 17.3333 16.9584 13.6 16.9584 9C16.9584 4.4 13.2251 0.666664 8.62508 0.666664ZM11.9834 7.50001L8.09173 11.3833C7.97507 11.5083 7.81674 11.5667 7.65007 11.5667C7.49174 11.5667 7.3334 11.5083 7.2084 11.3833L5.26675 9.44169C5.02508 9.20002 5.02508 8.79997 5.26675 8.55831C5.50841 8.31664 5.90841 8.31664 6.15008 8.55831L7.65007 10.0583L11.1001 6.61668C11.3417 6.36668 11.7417 6.36668 11.9834 6.61668C12.2251 6.85834 12.2251 7.25001 11.9834 7.50001Z"
        fill="currentColor"
      />
    </svg>
  )
}

type SelectProps = {
  [K in keyof React.ComponentProps<typeof SelectPrimitive.Root>]: React.ComponentProps<typeof SelectPrimitive.Root>[K]
}

type SelectSize = 'sm' | 'default'

/**
 * `size` is a SelectTrigger prop, but the option list renders in a portal as a
 * sibling of the trigger — so the trigger registers its size here and the
 * content/items read it back. Internal only: option text and checkmark stay in
 * step with the trigger without consumers passing size twice.
 */
const SelectSizeContext = React.createContext<{
  size: SelectSize
  setSize: (size: SelectSize) => void
}>({ size: 'default', setSize: () => undefined })

function Select({ ...props }: SelectProps): React.JSX.Element {
  const [size, setSize] = React.useState<SelectSize>('default')
  const sizeContext = React.useMemo(() => ({ size, setSize }), [size])
  return (
    <SelectSizeContext.Provider value={sizeContext}>
      <SelectPrimitive.Root data-slot="select" {...props} />
    </SelectSizeContext.Provider>
  )
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>): React.JSX.Element {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>): React.JSX.Element {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: SelectSize
}): React.JSX.Element {
  const { setSize } = React.useContext(SelectSizeContext)
  React.useEffect(() => {
    setSize(size)
  }, [size, setSize])

  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-surface3 bg-surface2 text-neutral1 data-[placeholder]:text-neutral2 group-has-[[data-slot=field-label]]/field:data-[placeholder]:text-neutral3 [&_svg:not([class*='text-'])]:text-neutral2 focus-visible:ring-1 focus-visible:ring-surface3 flex w-full cursor-pointer items-center justify-between gap-2 rounded-[20px] border px-5 py-2 text-body-2 font-basel-book whitespace-nowrap transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-14 data-[size=sm]:h-10 data-[size=sm]:rounded-12 data-[size=sm]:px-4 data-[size=sm]:text-sm *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>svg]:transition-transform [&>svg]:duration-200 data-[state=open]:[&>svg]:rotate-180",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = 'popper',
  align = 'center',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>): React.JSX.Element {
  const { size } = React.useContext(SelectSizeContext)
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-size={size}
        className={cn(
          'bg-surface1 text-neutral1 border-surface3 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-16 border shadow-none',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>): React.JSX.Element {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('text-neutral2 px-2 py-1.5 text-xs', className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>): React.JSX.Element {
  const { size } = React.useContext(SelectSizeContext)
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      data-size={size}
      className={cn(
        "focus:bg-surface2 focus:text-neutral1 relative flex w-full cursor-pointer items-center gap-2 rounded-12 py-1.5 pr-9 pl-2 outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        // Option text tracks the trigger's size: default trigger is text-body-2 (16px), sm is text-sm (14px)
        size === 'sm' ? 'text-sm' : 'text-body-2',
        className,
      )}
      {...props}
    >
      {/* Always-reserved trailing box so labels don't shift when the checkmark appears —
          the reserved box and the glyph must stay the same size for that to hold */}
      <span className={cn('absolute right-2 flex items-center justify-center', size === 'sm' ? 'size-4' : 'size-5')}>
        <SelectPrimitive.ItemIndicator>
          <CheckmarkCircleGlyph className={cn('text-neutral1', size === 'sm' ? 'size-4' : 'size-5')} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>): React.JSX.Element {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      // mx-0/w-full: flush with the option text box, matching menuSeparatorClassName() in ../menu-compat/compile.ts
      className={cn('bg-surface3 pointer-events-none mx-0 my-1 h-px w-full', className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>): React.JSX.Element {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>): React.JSX.Element {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
export type { SelectProps }
