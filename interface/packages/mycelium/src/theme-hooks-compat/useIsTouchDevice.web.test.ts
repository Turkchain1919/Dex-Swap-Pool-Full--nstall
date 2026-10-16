import { renderHook } from '@testing-library/react'
import { isTouchable } from '@universe/environment'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useIsTouchDevice } from './useIsTouchDevice.web'

describe('useIsTouchDevice (web)', () => {
  it('returns the @universe/environment isTouchable constant on the client', () => {
    const { result } = renderHook(() => useIsTouchDevice())
    expect(result.current).toBe(isTouchable)
  })

  it('returns false on the server snapshot (Tamagui SSR parity)', () => {
    function Probe(): null {
      // Literal deliberately not derived from the hook: the SSR leg must render `false`
      // whatever the client capability is (Tamagui: `useDidFinishSSR() ? isTouchable : false`).
      expect(useIsTouchDevice()).toBe(false)
      return null
    }
    renderToString(createElement(Probe))
  })
})
