/**
 * Web leg of the `ScrollView` compat — the drop-in twin of the
 * legacy `ui/src` Tamagui `ScrollView` (a styled react-native-web ScrollView):
 * an overflow-scrolling frame around a content-container element, with the
 * RNW scroll surface reproduced from its source:
 *
 *  - `onScroll` receives the RNW-normalized event (`contentOffset` /
 *    `contentSize` / `layoutMeasurement`), throttled by `scrollEventThrottle`
 *    exactly like RNW's `ScrollViewBase` (throttle 0 → only the start and the
 *    trailing 100ms scroll-end emissions fire);
 *  - `onContentSizeChange` notifies from a ResizeObserver on the content
 *    container (RNW drives it from the container's `onLayout`);
 *  - `showsHorizontal/VerticalScrollIndicator={false}` hides the scrollbar,
 *    `scrollEnabled={false}` freezes both axes (each applied OVER the
 *    caller's styles, like RNW's style-array order);
 *  - the ref exposes the imperative trio real call sites use (`scrollTo`,
 *    `scrollToEnd`, `getScrollableNode`) mapped onto DOM scrolling.
 *
 * Inherited native-only RN props are inert here, matching RNW. Known
 * deliberate divergences from RNW, all unused by web-reachable call sites:
 * `pagingEnabled` (RNW clones every child to add scroll-snap alignment), the
 * drag/momentum handler family (RNW's responder system), and
 * `stickyHeaderIndices` (RNW wraps the indexed children in sticky-positioned
 * Views; the native leg forwards it for real, this leg dev-warns below so a
 * converted web path cannot lose sticky headers silently) are
 * accepted-and-ignored.
 */
import {
  forwardRef,
  type JSX,
  type Ref,
  type UIEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { cn } from '../cn'
import { mergeCompatStyle } from '../compat/compose'
import { domProps, useOnLayout } from '../compat/dom'
import { markMyceliumPrimitive } from '../compat/primitive-marker'
import {
  SCROLL_VIEW_DISABLED_CLASSES,
  SCROLL_VIEW_HIDE_SCROLLBAR_CLASSES,
  scrollViewCompatEmission,
  scrollViewContentContainerEmission,
} from './compile'
import { warnStickyHeadersUnsupported } from './diagnostics'
import type { ScrollViewCompatProps, ScrollViewCompatRef, ScrollViewCompatScrollEvent } from './props'

function normalizeScrollEvent(node: HTMLElement): ScrollViewCompatScrollEvent {
  return {
    nativeEvent: {
      contentOffset: { x: node.scrollLeft, y: node.scrollTop },
      contentSize: { width: node.scrollWidth, height: node.scrollHeight },
      layoutMeasurement: { width: node.offsetWidth, height: node.offsetHeight },
    },
    timeStamp: Date.now(),
  }
}

/** RNW `ScrollViewBase.shouldEmitScrollEvent`: throttle 0 emits no mid-scroll ticks. */
function shouldEmitScrollEvent(lastTick: number, eventThrottle: number): boolean {
  const timeSinceLastTick = Date.now() - lastTick
  return eventThrottle > 0 && timeSinceLastTick >= eventThrottle
}

const SCROLL_END_DEBOUNCE_MS = 100

function useContentSizeChange(
  onContentSizeChange: ((width: number, height: number) => void) | undefined,
): (node: HTMLElement | null) => void {
  const handlerRef = useRef(onContentSizeChange)
  handlerRef.current = onContentSizeChange
  const cleanupRef = useRef<(() => void) | undefined>(undefined)
  return useCallback((node: HTMLElement | null) => {
    cleanupRef.current?.()
    cleanupRef.current = undefined
    // No handler guard: the ref callback fires once at mount, so gating on the
    // CURRENT handler would strand a late-arriving onContentSizeChange with no
    // observer. notify reads the live ref and optional-chains instead.
    if (node === null) {
      return
    }
    const notify = (): void => {
      const rect = node.getBoundingClientRect()
      handlerRef.current?.(rect.width, rect.height)
    }
    if (typeof ResizeObserver === 'undefined') {
      notify()
      return
    }
    const observer = new ResizeObserver(notify)
    observer.observe(node)
    cleanupRef.current = (): void => observer.disconnect()
  }, [])
}

export const ScrollViewCompat = forwardRef<ScrollViewCompatRef, ScrollViewCompatProps>((props, ref): JSX.Element => {
  const {
    children,
    style,
    testID,
    horizontal,
    scrollEnabled = true,
    scrollEventThrottle = 0,
    showsHorizontalScrollIndicator,
    showsVerticalScrollIndicator,
    onScroll,
    onContentSizeChange,
    contentContainerStyle,
    centerContent,
  } = props

  const scrollNodeRef = useRef<HTMLElement | null>(null)
  const scrollState = useRef({ isScrolling: false, scrollLastTick: 0 })
  const scrollEndTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const layoutRef = useOnLayout(props.onLayout)
  const contentSizeRef = useContentSizeChange(onContentSizeChange)

  const setScrollRef = useCallback(
    (node: HTMLElement | null): void => {
      scrollNodeRef.current = node
      layoutRef(node)
    },
    [layoutRef],
  )

  useImperativeHandle(
    ref,
    (): ScrollViewCompatRef => ({
      scrollTo(options?: { x?: number; y?: number; animated?: boolean } | number, deprecatedX?: number): void {
        const node = scrollNodeRef.current
        if (node === null) {
          return
        }
        // RN's deprecated positional form: scrollTo(y, x).
        const target = typeof options === 'number' ? { y: options, x: deprecatedX } : (options ?? {})
        node.scrollTo({
          left: target.x ?? node.scrollLeft,
          top: target.y ?? node.scrollTop,
          // RNW's `animated !== false`: smooth unless explicitly opted out.
          behavior: target.animated !== false ? 'smooth' : 'auto',
        })
      },
      scrollToEnd(options?: { animated?: boolean }): void {
        const node = scrollNodeRef.current
        if (node === null) {
          return
        }
        node.scrollTo({
          left: horizontal === true ? node.scrollWidth : node.scrollLeft,
          top: horizontal === true ? node.scrollTop : node.scrollHeight,
          behavior: options?.animated !== false ? 'smooth' : 'auto',
        })
      },
      getScrollableNode(): unknown {
        return scrollNodeRef.current
      },
    }),
    [horizontal],
  )

  useEffect(
    () => (): void => {
      if (scrollEndTimeout.current !== undefined) {
        clearTimeout(scrollEndTimeout.current)
      }
    },
    [],
  )

  const handleScroll = (event: UIEvent<HTMLElement>): void => {
    // RNW stops propagation so a nested ScrollView never notifies its parent.
    event.stopPropagation()
    const node = scrollNodeRef.current
    if (node === null || event.target !== node) {
      return
    }
    if (scrollEndTimeout.current !== undefined) {
      clearTimeout(scrollEndTimeout.current)
    }
    scrollEndTimeout.current = setTimeout(() => {
      scrollState.current.isScrolling = false
      onScroll?.(normalizeScrollEvent(node))
    }, SCROLL_END_DEBOUNCE_MS)
    const emitTick =
      !scrollState.current.isScrolling || shouldEmitScrollEvent(scrollState.current.scrollLastTick, scrollEventThrottle)
    scrollState.current.isScrolling = true
    if (emitTick) {
      scrollState.current.scrollLastTick = Date.now()
      onScroll?.(normalizeScrollEvent(node))
    }
  }

  if (props.stickyHeaderIndices !== undefined && props.stickyHeaderIndices.length > 0) {
    warnStickyHeadersUnsupported()
  }

  const emission = scrollViewCompatEmission(props)
  const contentEmission = scrollViewContentContainerEmission({ horizontal, centerContent, contentContainerStyle })
  const hideScrollbar = showsHorizontalScrollIndicator === false || showsVerticalScrollIndicator === false

  return (
    // oxlint-disable-next-line react/forbid-elements -- the compat scroll frame IS the raw DOM boundary (no Tamagui Flex here)
    <div
      {...domProps(props)}
      ref={setScrollRef as Ref<HTMLDivElement>}
      className={cn(
        emission.className,
        !scrollEnabled && SCROLL_VIEW_DISABLED_CLASSES,
        hideScrollbar && SCROLL_VIEW_HIDE_SCROLLBAR_CLASSES,
      )}
      style={mergeCompatStyle(emission.style, style)}
      data-testid={testID}
      onScroll={onScroll !== undefined ? handleScroll : undefined}
    >
      {/* oxlint-disable-next-line react/forbid-elements -- the RNW content container IS the raw DOM boundary */}
      <div
        ref={contentSizeRef as Ref<HTMLDivElement>}
        className={contentEmission.className}
        style={contentEmission.style}
      >
        {children}
      </div>
    </div>
  )
})

ScrollViewCompat.displayName = 'ScrollViewCompat'
markMyceliumPrimitive(ScrollViewCompat)
