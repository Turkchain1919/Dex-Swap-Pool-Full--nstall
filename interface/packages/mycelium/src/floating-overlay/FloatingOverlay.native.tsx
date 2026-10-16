/**
 * Native floating-overlay primitive (INFRA-2965): the positioning/overlay
 * engine for native tooltips and popovers. Anatomy mirrors the Base UI
 * grammar the web menus family uses (INFRA-3021) so the two tracks
 * reconcile: Provider (portal layer) → Root (state + anchor) → Anchor /
 * anchorPoint (virtual `openAt(x, y)`) → Content (positioner + popup) →
 * Arrow.
 *
 * Coordinates: anchors are measured in window space (`measureInWindow`) and
 * translated into the nearest provider layer's space, so a provider mounted
 * inside a native modal window keeps overlays in that window — the native
 * analog of the web z-index bridge (`EffectiveOverlayZIndexContext`).
 */
import {
  createContext,
  type JSX,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { BackHandler, InteractionManager, Pressable, StyleSheet, View } from 'react-native'
import {
  anchorRectFromPoint,
  computeArrowPosition,
  computeFloatingPosition,
  type FloatingOverlayAnchorPoint,
  type FloatingOverlayPosition,
  type FloatingOverlayRect,
  type FloatingOverlaySize,
} from './geometry'
import { FLOATING_OVERLAY_LAYER_TEST_ID } from './types'
import type {
  FloatingOverlayAnchorProps,
  FloatingOverlayArrowProps,
  FloatingOverlayContentProps,
  FloatingOverlayProviderProps,
  FloatingOverlayRootProps,
  FloatingOverlayState,
} from './types'

const DEFAULT_ARROW_SIZE = 12

declare const __DEV__: boolean | undefined

/** Metro defines `__DEV__` (false in release builds); outside Metro this leg only runs under test — treat as dev. */
function isDevEnvironment(): boolean {
  return typeof __DEV__ === 'boolean' ? __DEV__ : true
}

interface OverlayEntry {
  node: ReactNode
  /** Stacking of this overlay's wrapper among the layer's children. */
  zIndex?: number
}

interface HostContextValue {
  mount: (key: string, entry: OverlayEntry) => void
  unmount: (key: string) => void
  /** Layer frame in window coordinates; null until measured. */
  layerFrame: FloatingOverlayRect | null
}

const HostContext = createContext<HostContextValue | null>(null)

interface RootContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  anchorRef: RefObject<View | null>
  anchorPoint: FloatingOverlayAnchorPoint | undefined
}

const RootContext = createContext<RootContextValue | null>(null)

interface PositionContextValue {
  position: FloatingOverlayPosition
  contentSize: FloatingOverlaySize
}

const PositionContext = createContext<PositionContextValue | null>(null)

/**
 * Mounts the overlay layer every `FloatingOverlayContent` below it portals
 * into. Mount once inside each full-screen container that hosts overlays —
 * including inside native modal windows, where the nearest provider keeps
 * overlays in the modal's own window.
 */
export function FloatingOverlayProvider({ children }: FloatingOverlayProviderProps): JSX.Element {
  const [overlays, setOverlays] = useState<ReadonlyMap<string, OverlayEntry>>(new Map())
  const layerRef = useRef<View>(null)
  const [layerFrame, setLayerFrame] = useState<FloatingOverlayRect | null>(null)

  const measureLayer = useCallback((): void => {
    // oxlint-disable-next-line max-params -- react-native measureInWindow callback shape
    layerRef.current?.measureInWindow((x, y, width, height) => {
      setLayerFrame({ x, y, width, height })
    })
  }, [])

  const mount = useCallback((key: string, entry: OverlayEntry): void => {
    setOverlays((current) => new Map(current).set(key, entry))
  }, [])

  const unmount = useCallback((key: string): void => {
    setOverlays((current) => {
      if (!current.has(key)) {
        return current
      }
      const next = new Map(current)
      next.delete(key)
      return next
    })
  }, [])

  const host = useMemo<HostContextValue>(() => ({ mount, unmount, layerFrame }), [mount, unmount, layerFrame])

  return (
    <HostContext.Provider value={host}>
      {children}
      <View
        ref={layerRef}
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
        testID={FLOATING_OVERLAY_LAYER_TEST_ID}
        onLayout={measureLayer}
      >
        {[...overlays.entries()].map(([key, entry]) => (
          <View
            key={key}
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, entry.zIndex !== undefined && { zIndex: entry.zIndex }]}
          >
            {entry.node}
          </View>
        ))}
      </View>
    </HostContext.Provider>
  )
}

/** Owns the open state and the anchor (element ref or virtual point). */
export function FloatingOverlayRoot({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  anchorPoint,
  children,
}: FloatingOverlayRootProps): JSX.Element {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const anchorRef = useRef<View>(null)

  const isControlled = openProp !== undefined
  const setOpen = useCallback(
    (next: boolean): void => {
      if (!isControlled) {
        setUncontrolledOpen(next)
      }
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  const value = useMemo<RootContextValue>(
    () => ({ open, setOpen, anchorRef, anchorPoint }),
    [open, setOpen, anchorPoint],
  )

  return <RootContext.Provider value={value}>{children}</RootContext.Provider>
}

function useRootContext(consumer: string): RootContextValue {
  const context = useContext(RootContext)
  if (!context) {
    throw new Error(`${consumer} must be rendered inside a FloatingOverlayRoot`)
  }
  return context
}

/** Open state + setter for building triggers inside a `FloatingOverlayRoot`. */
export function useFloatingOverlayState(): FloatingOverlayState {
  const { open, setOpen } = useRootContext('useFloatingOverlayState')
  return { open, setOpen }
}

/** Measurable wrapper the content positions against (unless the root uses `anchorPoint`). */
export function FloatingOverlayAnchor({ children, style, testID }: FloatingOverlayAnchorProps): JSX.Element {
  const { anchorRef } = useRootContext('FloatingOverlayAnchor')
  return (
    <View ref={anchorRef} collapsable={false} style={style} testID={testID}>
      {children}
    </View>
  )
}

/**
 * The positioned popup. Portals into the nearest provider layer, measures
 * the anchor and itself, and floats per the pure geometry engine (offset →
 * flip → shift). Stays transparent until measured to avoid a misplaced
 * first frame.
 */
export function FloatingOverlayContent({
  placement,
  offset,
  viewportPadding,
  flip,
  dismissOnPressOutside = true,
  dismissOnBackPress = true,
  onPressOutside,
  zIndex,
  style,
  testID,
  children,
}: FloatingOverlayContentProps): JSX.Element | null {
  const host = useContext(HostContext)
  if (!host) {
    throw new Error('FloatingOverlayContent must be rendered inside a FloatingOverlayProvider')
  }
  const rootContext = useRootContext('FloatingOverlayContent')
  const { open, setOpen, anchorRef, anchorPoint } = rootContext
  const key = useId()

  const [measuredAnchorRect, setMeasuredAnchorRect] = useState<FloatingOverlayRect | null>(null)
  const [contentSize, setContentSize] = useState<FloatingOverlaySize | null>(null)

  const measureAnchor = useCallback((): void => {
    // oxlint-disable-next-line max-params -- react-native measureInWindow callback shape
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setMeasuredAnchorRect({ x, y, width, height })
    })
  }, [anchorRef])

  useEffect(() => {
    if (!open) {
      setMeasuredAnchorRect(null)
      setContentSize(null)
      return undefined
    }
    if (anchorPoint) {
      return undefined
    }
    if (!anchorRef.current && isDevEnvironment()) {
      // oxlint-disable-next-line no-console -- dev-only misuse warning; mycelium has no logger dep
      console.warn(
        'FloatingOverlayContent is open but has no anchor: render a FloatingOverlayAnchor inside the FloatingOverlayRoot or pass anchorPoint. The content will stay hidden (opacity 0).',
      )
    }
    measureAnchor()
    // Re-measure once in-flight animations/navigation settle (Coachmark precedent).
    const interaction = InteractionManager.runAfterInteractions(measureAnchor)
    return () => interaction.cancel()
  }, [open, anchorPoint, measureAnchor, anchorRef])

  useEffect(() => {
    if (!open || !dismissOnBackPress) {
      return undefined
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false)
      return true
    })
    return () => subscription.remove()
  }, [open, dismissOnBackPress, setOpen])

  const anchorWindowRect = anchorPoint ? anchorRectFromPoint(anchorPoint) : measuredAnchorRect
  const layerFrame = host.layerFrame

  const positioned = useMemo<PositionContextValue | null>(() => {
    if (!open || !anchorWindowRect || !contentSize || !layerFrame) {
      return null
    }
    const position = computeFloatingPosition({
      anchor: {
        x: anchorWindowRect.x - layerFrame.x,
        y: anchorWindowRect.y - layerFrame.y,
        width: anchorWindowRect.width,
        height: anchorWindowRect.height,
      },
      size: contentSize,
      viewport: { width: layerFrame.width, height: layerFrame.height },
      placement,
      offset,
      viewportPadding,
      flip,
    })
    return { position, contentSize }
  }, [open, anchorWindowRect, contentSize, layerFrame, placement, offset, viewportPadding, flip])

  const handleOutsidePress = useCallback((): void => {
    onPressOutside?.()
    setOpen(false)
  }, [onPressOutside, setOpen])

  const onContentLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }): void => {
    const { width, height } = event.nativeEvent.layout
    setContentSize((current) => (current?.width === width && current.height === height ? current : { width, height }))
  }, [])

  const node = useMemo<ReactNode>(
    () =>
      open ? (
        <>
          {/* Gate on positioned, not open: a full-screen touch absorber must
              not go live before the overlay is measured, or an unpositioned
              overlay silently swallows every touch in the provider. */}
          {dismissOnPressOutside && positioned ? (
            <Pressable
              accessible={false}
              style={StyleSheet.absoluteFill}
              testID={testID ? `${testID}-backdrop` : undefined}
              onPress={handleOutsidePress}
            />
          ) : null}
          <View
            collapsable={false}
            style={[
              styles.content,
              {
                left: positioned?.position.x ?? 0,
                top: positioned?.position.y ?? 0,
                opacity: positioned ? 1 : 0,
              },
              style,
            ]}
            testID={testID}
            onLayout={onContentLayout}
          >
            {/* The portal boundary strips React context — re-provide the root
                context (like PositionContext) so hooks such as
                useFloatingOverlayState work inside portaled content, e.g. a
                dismiss button in a popover. */}
            <RootContext.Provider value={rootContext}>
              <PositionContext.Provider value={positioned}>{children}</PositionContext.Provider>
            </RootContext.Provider>
          </View>
        </>
      ) : null,
    [
      open,
      dismissOnPressOutside,
      testID,
      handleOutsidePress,
      positioned,
      style,
      onContentLayout,
      children,
      rootContext,
    ],
  )

  // Portal: publish the memoized node into the provider layer only when it
  // actually changes (or the nearest host does) — unrelated Content commits
  // don't churn the provider Map, and the provider bails out of re-rendering
  // its children on publish, so this can't loop.
  useEffect(() => {
    if (node) {
      // zIndex rides the mount so the provider applies it to the per-overlay
      // WRAPPER — siblings in the layer — where it can actually reorder
      // overlays (on the inner content View it could never escape its own
      // wrapper).
      host.mount(key, { node, zIndex })
    } else {
      host.unmount(key)
    }
  }, [node, host, key, zIndex])

  useEffect(() => {
    return () => host.unmount(key)
  }, [host, key])

  return null
}

/**
 * Border-triangle arrow on the content edge facing the anchor, centered on
 * the anchor and clamped away from the corners. Renders once the content is
 * measured.
 */
export function FloatingOverlayArrow({
  size = DEFAULT_ARROW_SIZE,
  color,
  edgePadding,
  style,
  testID,
}: FloatingOverlayArrowProps): JSX.Element | null {
  const positioned = useContext(PositionContext)
  if (positioned === null) {
    return null
  }
  const { position, contentSize } = positioned
  const arrow = computeArrowPosition({
    side: position.side,
    size: contentSize,
    crossAxisAnchorLine: position.crossAxisAnchorLine,
    arrowSize: size,
    edgePadding,
  })
  const half = size / 2

  const triangle =
    arrow.edge === 'top'
      ? { borderLeftWidth: half, borderRightWidth: half, borderBottomWidth: size, borderBottomColor: color }
      : arrow.edge === 'bottom'
        ? { borderLeftWidth: half, borderRightWidth: half, borderTopWidth: size, borderTopColor: color }
        : arrow.edge === 'left'
          ? { borderTopWidth: half, borderBottomWidth: half, borderRightWidth: size, borderRightColor: color }
          : { borderTopWidth: half, borderBottomWidth: half, borderLeftWidth: size, borderLeftColor: color }

  return (
    <View
      pointerEvents="none"
      style={[styles.arrow, { left: arrow.left, top: arrow.top }, triangle, style]}
      testID={testID}
    />
  )
}

const styles = StyleSheet.create({
  content: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderColor: 'transparent',
  },
})
