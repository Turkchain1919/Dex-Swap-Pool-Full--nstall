import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'
import { cn } from '../cn'

const Tabs = TabsPrimitive.Root

interface IndicatorRect {
  left: number
  width: number
}

/**
 * TabsList renders a measured, absolutely-positioned indicator that slides between triggers.
 * SSR-safe: before hydration (or with JS off) the indicator is absent and the active trigger's
 * own static chrome (see TabsTrigger) renders the same look; once measured, `data-indicator`
 * on the list suppresses the static chrome and the sliding element takes over.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, forwardedRef) => {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [indicator, setIndicator] = React.useState<IndicatorRect | null>(null)
  const [animated, setAnimated] = React.useState(false)

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
    },
    [forwardedRef],
  )

  React.useEffect(() => {
    const list = listRef.current
    if (!list) {
      return undefined
    }
    const measure = (): void => {
      const active = list.querySelector<HTMLElement>('[data-slot=tabs-trigger][data-state=active]')
      if (!active) {
        setIndicator(null)
        return
      }
      // 0 width = display:none subtree; keep the last rect so the chip doesn't fly in from 0/0 on reveal
      if (active.offsetWidth === 0) {
        return
      }
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
    }
    measure()
    const mutations = new MutationObserver(measure)
    mutations.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state'] })
    const resizes = new ResizeObserver(measure)
    resizes.observe(list)
    return () => {
      mutations.disconnect()
      resizes.disconnect()
    }
  }, [])

  // The first position is applied without a transition so the indicator doesn't
  // slide in from the list's edge on mount; subsequent moves animate.
  React.useEffect(() => {
    if (!indicator || animated) {
      return undefined
    }
    const frame = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(frame)
  }, [indicator, animated])

  return (
    <TabsPrimitive.List
      ref={setRefs}
      data-slot="tabs-list"
      data-indicator={indicator ? 'true' : undefined}
      // gap-0: triggers are flex-1 and abut, so there is no un-hoverable strip between them
      className={cn('group/tabs-list relative flex gap-0 p-1 bg-surface2 rounded-16 w-full', className)}
      {...props}
    >
      {indicator ? (
        // Active chrome — keep in sync with TabsTrigger's static data-[state=active] classes
        <span
          aria-hidden
          data-slot="tabs-indicator"
          className={cn(
            'absolute inset-y-1 left-0 z-0 pointer-events-none rounded-12 bg-surface1 dark:bg-surface3 border border-surface2 shadow-sm',
            animated && 'transition-[transform,width] duration-200 ease-out',
          )}
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      ) : null}
      {children}
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    data-slot="tabs-trigger"
    className={cn(
      'relative flex-1 px-3 py-1.5 rounded-12 border border-transparent text-body-3 text-neutral2 transition-colors whitespace-nowrap cursor-pointer',
      'hover:text-neutral1 data-[state=inactive]:hover:bg-surface3',
      // Static active chrome — the no-JS / pre-hydration fallback; keep in sync with the tabs-indicator span in TabsList
      'data-[state=active]:bg-surface1 dark:data-[state=active]:bg-surface3 data-[state=active]:border-surface2 data-[state=active]:shadow-sm data-[state=active]:text-neutral1',
      // Once the list has a measured indicator, it owns the active chrome.
      // The dark override needs its own rule: `dark:data-[state=active]:bg-surface3` above is
      // (0,3,0), the same as the un-prefixed suppressor, and is emitted later, so it would win
      // and compound with the indicator's own dark:bg-surface3 (two rgba(255,255,255,0.12)
      // layers = #515151, not surface3's #3A3A3A). Adding `dark:` here makes it (0,4,0) and
      // order-independent.
      'group-data-[indicator=true]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[indicator=true]/tabs-list:data-[state=active]:bg-transparent group-data-[indicator=true]/tabs-list:data-[state=active]:border-transparent group-data-[indicator=true]/tabs-list:data-[state=active]:shadow-none',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
