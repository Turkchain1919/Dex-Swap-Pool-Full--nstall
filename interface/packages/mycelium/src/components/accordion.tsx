import * as AccordionPrimitive from '@radix-ui/react-accordion'
import * as React from 'react'
import { useIsMounted } from 'utilities/src/react/useIsMounted'
import { cn } from '../cn'
import { FlexCompat as Flex } from '../flex-compat/FlexCompat'

function Accordion({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>): React.JSX.Element {
  return <AccordionPrimitive.Root data-slot="accordion" className={cn('flex w-full flex-col', className)} {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>): React.JSX.Element {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn(className)} {...props} />
}

// Split-path double chevrons: rendering the top + bottom chevrons as separate <path>s lets a hover
// on the trigger nudge them apart — a subtle "expand" affordance. Geometry mirrors dev-portal's
// ChevronsOut/ChevronsIn spore icons (viewBox 0 0 17 16); translateY is in user units, ~1:1 px at
// the 16px render size. The pair rests ~1px apart; hover spreads a closed pair further apart and
// converges an open pair back together — never past the default gap, so the "collapse" glyph never
// closes into an X. Literal class strings so Tailwind's scanner emits them.
const CHEVRON_PATH = 'transition-transform duration-200 ease-out'
const CHEVRON_CLOSED_UPPER = '[transform:translateY(-1px)] group-hover/accordion-trigger:[transform:translateY(-2px)]'
const CHEVRON_CLOSED_LOWER = '[transform:translateY(1px)] group-hover/accordion-trigger:[transform:translateY(2px)]'
const CHEVRON_OPEN_UPPER = '[transform:translateY(-1px)] group-hover/accordion-trigger:[transform:translateY(0px)]'
const CHEVRON_OPEN_LOWER = '[transform:translateY(1px)] group-hover/accordion-trigger:[transform:translateY(0px)]'

function AccordionChevrons(): React.JSX.Element {
  return (
    <svg
      data-slot="accordion-trigger-icon"
      width="16"
      height="16"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="size-4 shrink-0 text-neutral3"
    >
      {/* Closed: chevrons point outward and spread on hover */}
      <g className="group-data-[state=open]/accordion-trigger:hidden">
        <path
          className={cn(CHEVRON_PATH, CHEVRON_CLOSED_UPPER)}
          d="M6.30471 7.13813L8.50002 4.94281L10.6953 7.13813C10.8253 7.26813 10.996 7.33344 11.1667 7.33344C11.3374 7.33344 11.508 7.26813 11.638 7.13813C11.8987 6.87746 11.8987 6.45609 11.638 6.19542L8.97138 3.52875C8.71071 3.26809 8.28934 3.26809 8.02867 3.52875L5.362 6.19542C5.10134 6.45609 5.10134 6.87746 5.362 7.13813C5.62267 7.39879 6.04405 7.39879 6.30471 7.13813Z"
          fill="currentColor"
        />
        <path
          className={cn(CHEVRON_PATH, CHEVRON_CLOSED_LOWER)}
          d="M11.638 8.86209C11.8987 9.12275 11.8987 9.54413 11.638 9.80479L8.97138 12.4715C8.84138 12.6015 8.67069 12.6668 8.50002 12.6668C8.32936 12.6668 8.15867 12.6015 8.02867 12.4715L5.362 9.80479C5.10134 9.54413 5.10134 9.12275 5.362 8.86209C5.62267 8.60142 6.04405 8.60142 6.30471 8.86209L8.50002 11.0574L10.6953 8.86209C10.956 8.60142 11.3774 8.60142 11.638 8.86209Z"
          fill="currentColor"
        />
      </g>
      {/* Open: chevrons point inward and converge on hover */}
      <g className="hidden group-data-[state=open]/accordion-trigger:block">
        <path
          className={cn(CHEVRON_PATH, CHEVRON_OPEN_UPPER)}
          d="M8.14668 7.02003C8.24402 7.11737 8.37204 7.16668 8.50004 7.16668C8.62804 7.16668 8.75606 7.11803 8.85339 7.02003L11.5201 4.35337C11.7154 4.15804 11.7154 3.84135 11.5201 3.64601C11.3247 3.45068 11.008 3.45068 10.8127 3.64601L8.49939 5.95933L6.18607 3.64601C5.99074 3.45068 5.67405 3.45068 5.47871 3.64601C5.28338 3.84135 5.28338 4.15804 5.47871 4.35337L8.14668 7.02003Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="0.4"
        />
        <path
          className={cn(CHEVRON_PATH, CHEVRON_OPEN_LOWER)}
          d="M11.5201 11.6467C11.7154 11.842 11.7154 12.1587 11.5201 12.354C11.4227 12.4514 11.2947 12.5007 11.1667 12.5007C11.0387 12.5007 10.9107 12.452 10.8134 12.354L8.50004 10.0407L6.18672 12.354C5.99139 12.5494 5.6747 12.5494 5.47937 12.354C5.28403 12.1587 5.28403 11.842 5.47937 11.6467L8.14603 8.98C8.34137 8.78466 8.65806 8.78466 8.85339 8.98L11.5201 11.6467Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="0.4"
        />
      </g>
    </svg>
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>): React.JSX.Element {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger flex flex-1 cursor-pointer items-center justify-between py-4 text-left text-sm font-medium transition-all duration-80 ease-in-out outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          className,
        )}
        {...props}
      >
        {children}
        <AccordionChevrons />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>): React.JSX.Element {
  // Skip animation on initial mount, only animate after hydration
  const shouldAnimate = useIsMounted()

  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        'overflow-hidden text-sm',
        shouldAnimate && 'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
      )}
      {...props}
    >
      <Flex justifyContent="flex-start" flexDirection="column" className={cn('pb-4 pt-0', className)}>
        {children}
      </Flex>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
