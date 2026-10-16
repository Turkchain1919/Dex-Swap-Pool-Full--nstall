import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EXIT_PRESET_CLASSES } from '../../compat/animations'
import { installPresenceExitLane, type PresenceExitLane } from './presence-exit-lane'

let lane: PresenceExitLane

beforeEach(() => {
  lane = installPresenceExitLane()
})

afterEach(() => {
  lane.restore()
})

function exitingNode(className: string): HTMLElement {
  const node = document.createElement('div')
  node.className = className
  node.setAttribute('data-exiting', '')
  return node
}

describe('presence exit lane', () => {
  it('resolves a shipped exit preset to the keyframe it names', () => {
    expect(getComputedStyle(exitingNode(EXIT_PRESET_CLASSES.fadeOut)).animationName).toBe('spore-exit-fade-out')
  })

  it('rejects an exit class naming a keyframe compat.css does not define', () => {
    expect(() => getComputedStyle(exitingNode('data-exiting:animate-spore-exit-fade-ouy'))).toThrow(/does not define/)
  })

  it('does not read an ancestor-gated exit class as unconditional', () => {
    const node = document.createElement('div')
    node.className = 'animate-spore-enter-presence group-data-exiting/presence-child:animate-spore-exit-presence'

    expect(getComputedStyle(node).animationName).toBe('spore-enter-presence')
  })

  it('does not read an ancestor-gated exit class on a node that is itself exiting', () => {
    const className = 'animate-spore-enter-presence group-data-exiting/presence-child:animate-spore-exit-presence'

    expect(getComputedStyle(exitingNode(className)).animationName).toBe('spore-enter-presence')
  })

  it('does not read a variant-prefixed enter token as a running enter animation', () => {
    const node = document.createElement('div')
    node.className = 'media-sm:animate-spore-enter-fade-in-down'

    expect(getComputedStyle(node).animationName).toBe('none')
  })

  it('rejects a misnamed enter class too', () => {
    expect(() => getComputedStyle(exitingNode('animate-spore-enter-fade-inn'))).toThrow(/does not define/)
  })
})
