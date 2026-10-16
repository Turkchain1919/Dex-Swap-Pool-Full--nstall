/**
 * Minimal react-native stand-in for the native-leg vitest suites
 * (node env — no Metro). Host components render as plain host elements so
 * react-test-renderer can walk them; refs get their `measureInWindow` from
 * the renderer's `createNodeMock`. Test files alias the real module via
 * `vi.mock('react-native', () => import('./testing/react-native-mock'))`.
 */
import {
  createElement,
  type ForwardRefExoticComponent,
  forwardRef,
  type PropsWithoutRef,
  type ReactNode,
  type RefAttributes,
} from 'react'

export * from '../../compat/testing/window-dimensions-mock'

type HostProps = Record<string, unknown> & { children?: ReactNode }
type HostComponent = ForwardRefExoticComponent<PropsWithoutRef<HostProps> & RefAttributes<unknown>>

function host(type: string): HostComponent {
  const Host = forwardRef<unknown, HostProps>((props, ref) => createElement(type, { ...props, ref }))
  Host.displayName = type
  return Host
}

export const View = host('View')
export const Text = host('Text')
export const Pressable = host('Pressable')

export const StyleSheet = {
  create<T>(styles: T): T {
    return styles
  },
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  flatten(style: unknown): unknown {
    return style
  },
}

type BackPressHandler = () => boolean

const backPressHandlers: BackPressHandler[] = []

export const BackHandler = {
  addEventListener(_event: 'hardwareBackPress', handler: BackPressHandler): { remove: () => void } {
    backPressHandlers.push(handler)
    return {
      remove: (): void => {
        const index = backPressHandlers.indexOf(handler)
        if (index >= 0) {
          backPressHandlers.splice(index, 1)
        }
      },
    }
  },
}

/** Test hook: fires the registered hardwareBackPress handlers like Android would (last registered first). */
export function __triggerBackPress(): boolean {
  for (const handler of [...backPressHandlers].reverse()) {
    if (handler()) {
      return true
    }
  }
  return false
}

/** Test hook: how many back-press subscriptions are live (leak check). */
export function __backPressHandlerCount(): number {
  return backPressHandlers.length
}

/** Test hook: drop subscriptions leaked by renderers previous tests never unmounted. */
export function __resetBackPressHandlers(): void {
  backPressHandlers.length = 0
}

export const InteractionManager = {
  runAfterInteractions(callback?: () => void): { cancel: () => void } {
    callback?.()
    return { cancel: (): void => undefined }
  },
}
