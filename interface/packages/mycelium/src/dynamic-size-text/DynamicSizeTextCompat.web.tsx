import { useCallback, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react'
import { flattenCompatStyle } from '../compat/compose'
import { FlexCompat } from '../flex-compat/FlexCompat'
import { TextCompat } from '../text-compat/TextCompat'
import { DEFAULT_MAX_WEB_FONT_SIZE, DEFAULT_MIN_WEB_FONT_SIZE, type DynamicSizeTextProps } from './props'

const RESIZING_STEP_SIZE = 2

/**
 * The legacy fallback measuring font — `bodyFont.family`, whose web value is
 * the Basel stack (`ui/src/theme/fonts.ts` `baselBook`). Transcribed literal:
 * mycelium never imports `packages/ui`, and canvas `context.font` cannot
 * resolve the `--stext-font-book` CSS variable that pins the same stack.
 */
const WEB_BODY_FONT_STACK =
  'Basel, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

/**
 * Web `DynamicSizeText`: binary-search auto-shrinking text, the compat twin of
 * the legacy `ui/src` `DynamicSizeText.web.tsx` — steps the font size (2px
 * grain) until the canvas-measured text fits the container.
 */
export function DynamicSizeTextCompat({
  minWebFontSize = DEFAULT_MIN_WEB_FONT_SIZE,
  maxWebFontSize = DEFAULT_MAX_WEB_FONT_SIZE,
  children,
  style,
  floatingSuffix,
  gap,
  ...props
}: DynamicSizeTextProps): JSX.Element {
  const measureRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [fontSize, setFontSize] = useState<number | null>(null)

  // `style` is the full `CompatStyleProp` union (RN arrays/falsy included);
  // flatten once so the canvas fit and the spread below see one CSS object.
  const flatStyle = useMemo(() => flattenCompatStyle(style), [style])

  const fitText = useCallback(
    (width: number) => {
      let canvas = canvasRef.current
      if (!canvas) {
        canvas = document.createElement('canvas')
        canvasRef.current = canvas
      }

      const context = canvas.getContext('2d')
      if (!context) {
        return minWebFontSize
      }

      if (!width || !children) {
        return minWebFontSize
      }

      // Non-string children measure as '' (width 0), so the fit silently
      // returns maxWebFontSize — inherited legacy behavior, kept on purpose.
      const text = typeof children === 'string' ? children : ''

      const ff = flatStyle?.fontFamily
      const fontFamily = typeof ff === 'string' ? ff : WEB_BODY_FONT_STACK

      let low = minWebFontSize
      let high = maxWebFontSize
      let best = minWebFontSize

      while (low <= high) {
        let mid = Math.floor((low + high) / 2)
        mid = mid - (mid % RESIZING_STEP_SIZE)

        context.font = `${mid}px ${fontFamily}`
        const measured = context.measureText(text).width

        if (measured <= width) {
          best = mid
          low = mid + RESIZING_STEP_SIZE
        } else {
          high = mid - RESIZING_STEP_SIZE
        }
      }

      return best
    },
    [children, minWebFontSize, maxWebFontSize, flatStyle],
  )

  // Text is measured against a zero-height twin row, so this slot's width is
  // pure flex math — a large font can't block its own container from
  // shrinking. ResizeObserver + window resize cover layout that skips RO
  // callbacks.
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) {
      return () => {}
    }

    const readWidth = (): number => {
      const node = measureRef.current
      return node ? node.getBoundingClientRect().width : 0
    }

    const measureAndSet = (): void => {
      setFontSize(fitText(readWidth()))
    }

    measureAndSet()

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(measureAndSet)
    })

    observer.observe(el)

    globalThis.addEventListener('resize', measureAndSet)

    const vv = globalThis.visualViewport
    vv?.addEventListener('resize', measureAndSet)

    return () => {
      observer.disconnect()
      globalThis.removeEventListener('resize', measureAndSet)
      vv?.removeEventListener('resize', measureAndSet)
    }
  }, [children, fitText, minWebFontSize, maxWebFontSize, flatStyle])

  return (
    <FlexCompat overflow="hidden" flexGrow={0} width="100%">
      <FlexCompat row gap={gap} height={0} overflow="hidden">
        <FlexCompat ref={measureRef} overflow="hidden" flexGrow={1} />
        {floatingSuffix}
      </FlexCompat>
      <FlexCompat shrink row gap={gap} alignItems="center" minWidth={0} overflow="hidden" width="100%">
        {fontSize !== null && (
          <TextCompat
            {...props}
            style={{ ...flatStyle, fontSize, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
          >
            {children}
          </TextCompat>
        )}
        {floatingSuffix}
      </FlexCompat>
    </FlexCompat>
  )
}
