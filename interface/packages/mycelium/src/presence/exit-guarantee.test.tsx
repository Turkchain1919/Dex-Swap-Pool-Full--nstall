import { act, render } from '@testing-library/react'
import type { CSSProperties, JSX, Ref } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnimatedFlexCompat } from '../animated-flex-compat/AnimatedFlexCompat.web'
import { EXIT_PRESET_CLASSES } from '../compat/animations'
import { Presence } from './Presence.web'
import { fireExitAnimationEnd, installPresenceExitLane, type PresenceExitLane } from './testing/presence-exit-lane'

vi.mock('@universe/environment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/environment')>()
  const { presenceExitsEnabledEnvironment } = await import('./testing/presence-exit-environment')
  return presenceExitsEnabledEnvironment(actual)
})

let lane: PresenceExitLane

beforeEach(() => {
  lane = installPresenceExitLane()
})

afterEach(() => {
  lane.restore()
})

function Wired({ ref }: { ref?: Ref<HTMLDivElement> }): JSX.Element {
  return <div ref={ref} data-testid="child" className={EXIT_PRESET_CLASSES.fadeOut} />
}

function Unwired({ ref, className = 'opacity-100' }: { ref?: Ref<HTMLDivElement>; className?: string }): JSX.Element {
  return <div ref={ref} data-testid="child" className={className} />
}

/** `animatePresence` is read off the element's props, so the child has to declare it. */
function OptedOut({ ref }: { ref?: Ref<HTMLDivElement>; animatePresence?: boolean }): JSX.Element {
  return <div ref={ref} data-testid="child" className="opacity-100" />
}

/** The `ActionSheetDropdown` shape: the exit animation is on a descendant, and the ref never reaches a node. */
function RefDropping(): JSX.Element {
  return <div data-testid="child" className={EXIT_PRESET_CLASSES.fadeOut} />
}

function child(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-testid="child"]')
}

describe('Presence exit guarantee', () => {
  it('holds a correctly wired child for its exit animation, then unmounts it on animationend', () => {
    const { container, rerender } = render(
      <Presence>
        <Wired key="a" />
      </Presence>,
    )
    const node = child(container)
    expect(node).not.toBeNull()

    rerender(<Presence />)
    expect(child(container)).toBe(node)
    expect(node?.hasAttribute('data-exiting')).toBe(true)

    act(() => {
      fireExitAnimationEnd(node as Element)
    })
    expect(child(container)).toBeNull()
  })

  it('fails when a child unmounts with no resolvable exit animation', () => {
    const { rerender } = render(
      <Presence>
        <Unwired key="a" />
      </Presence>,
    )
    expect(() => rerender(<Presence />)).toThrow(/no exit animation resolved for <Unwired> \(key "a"\)/)
  })

  it('fails when a child never resolves its forwarded ref to a node', () => {
    const { rerender } = render(
      <Presence>
        <RefDropping key="a" />
      </Presence>,
    )
    expect(() => rerender(<Presence />)).toThrow(/<RefDropping> \(key "a"\) never resolved its forwarded ref/)
  })

  it('fails at mount, not at unmount, for a Fragment child', () => {
    expect(() =>
      render(
        <Presence>
          <>
            <Wired />
          </>
        </Presence>,
      ),
    ).toThrow(/is a Fragment, which takes no ref/)
  })

  it('stays silent for a child that opts out of the exit hold', () => {
    const { container, rerender } = render(
      <Presence>
        <OptedOut key="a" animatePresence={false} />
      </Presence>,
    )
    expect(child(container)).not.toBeNull()

    rerender(<Presence />)
    expect(child(container)).toBeNull()
  })

  it('holds an AnimatedFlexCompat carrying the parameterized presence keyframes', () => {
    const presenceStyle = {
      '--spore-presence-enter-x': '40px',
      '--spore-presence-exit-x': '40px',
    } as CSSProperties
    const { container, rerender } = render(
      <Presence childOwnsNativeAnimation>
        <AnimatedFlexCompat
          key="a"
          data-testid="child"
          className="animate-spore-enter-presence data-exiting:animate-spore-exit-presence opacity-[1]"
          style={presenceStyle}
        />
      </Presence>,
    )
    const node = child(container)
    expect(node).not.toBeNull()

    rerender(<Presence childOwnsNativeAnimation />)
    expect(child(container)).toBe(node)
    expect(node?.hasAttribute('data-exiting')).toBe(true)

    act(() => {
      fireExitAnimationEnd(node as Element)
    })
    expect(child(container)).toBeNull()
  })

  it('stays silent for a child whose exit classes arrive through getExitProps', () => {
    const getExitProps = (): { className: string } => ({ className: EXIT_PRESET_CLASSES.fadeOut })
    const { container, rerender } = render(
      <Presence getExitProps={getExitProps}>
        <Unwired key="a" />
      </Presence>,
    )
    rerender(<Presence getExitProps={getExitProps} />)
    const node = child(container)
    expect(node?.hasAttribute('data-exiting')).toBe(true)

    act(() => {
      fireExitAnimationEnd(node as Element)
    })
    expect(child(container)).toBeNull()
  })
})
