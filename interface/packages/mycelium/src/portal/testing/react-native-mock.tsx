/**
 * Minimal react-native stand-in for the portal native-leg suite (no Metro in
 * vitest). The portal leg only needs `View` and `StyleSheet`.
 *
 * Host components render as `<div>` so jsdom applies their styles for real:
 * RN style arrays are flattened into one object (what `StyleSheet.flatten`
 * does on device), and `testID` becomes `data-testid` so Testing Library
 * queries work. Test files alias the real module via
 * `vi.mock('react-native', () => import('./testing/react-native-mock'))`.
 */
import {
  createElement,
  type CSSProperties,
  type ForwardRefExoticComponent,
  forwardRef,
  type PropsWithoutRef,
  type ReactNode,
  type RefAttributes,
} from 'react'

type Style = CSSProperties | ReadonlyArray<Style> | false | null | undefined

interface HostProps {
  children?: ReactNode
  style?: Style
  testID?: string
  pointerEvents?: string
}

type HostComponent = ForwardRefExoticComponent<PropsWithoutRef<HostProps> & RefAttributes<unknown>>

function flattenStyle(style: Style): CSSProperties | undefined {
  if (!style) {
    return undefined
  }
  if (Array.isArray(style)) {
    return style.reduce<CSSProperties>((merged, entry) => ({ ...merged, ...flattenStyle(entry) }), {})
  }
  return style as CSSProperties
}

function host(type: string): HostComponent {
  const Host = forwardRef<unknown, HostProps>(({ children, style, testID, pointerEvents }, ref) =>
    createElement(
      // oxlint-disable-next-line react/forbid-elements -- test double, not UI: a real DOM host so jsdom resolves the flattened RN styles
      'div',
      {
        ref,
        'data-testid': testID,
        'data-rn-host': type,
        'data-pointer-events': pointerEvents,
        style: flattenStyle(style),
      },
      children,
    ),
  )
  Host.displayName = type
  return Host
}

export const View = host('View')

export const StyleSheet = {
  create<T>(styles: T): T {
    return styles
  },
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  flatten: flattenStyle,
}
