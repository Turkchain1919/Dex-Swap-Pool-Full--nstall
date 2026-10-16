import type { StatsigClientEventCallback, StatsigLoadingStatus } from '@statsig/client-core'
import { StatsigContext } from '@statsig/react-bindings'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useStatsigClientStatus } from '@universe/gating/src/hooks'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

type ValuesUpdatedListener = StatsigClientEventCallback<'values_updated'>

/** Minimal stand-in for a StatsigClient: the status field plus the `values_updated` event the hook subscribes to. */
function createFakeClient(initialStatus: StatsigLoadingStatus) {
  const listeners = new Set<ValuesUpdatedListener>()
  const client = {
    loadingStatus: initialStatus,
    on: (_event: string, listener: ValuesUpdatedListener) => {
      listeners.add(listener)
    },
    off: (_event: string, listener: ValuesUpdatedListener) => {
      listeners.delete(listener)
    },
    setStatus(status: StatsigLoadingStatus) {
      client.loadingStatus = status
      listeners.forEach((listener) => listener({ name: 'values_updated', status, values: null }))
    },
    get listenerCount() {
      return listeners.size
    },
  }
  return client
}

type FakeClient = ReturnType<typeof createFakeClient>

function Status(): ReactElement {
  const { isStatsigLoading, isStatsigReady, isStatsigUninitialized } = useStatsigClientStatus()
  const label = isStatsigLoading ? 'loading' : isStatsigReady ? 'ready' : isStatsigUninitialized ? 'uninitialized' : '?'
  return <span data-testid="status">{label}</span>
}

/** Flips the client while rendering, i.e. after an earlier sibling read the status but before any effect ran. */
function FlipDuringRender({ client, to }: { client: FakeClient; to: StatsigLoadingStatus }): null {
  if (client.loadingStatus !== to) {
    client.setStatus(to)
  }
  return null
}

function renderWithClient(client: FakeClient, children: ReactNode) {
  return render(
    // The context expects a full client interface; the hook only touches `loadingStatus`, `on`, and `off`.
    <StatsigContext.Provider value={{ renderVersion: 0, client: client as never }}>{children}</StatsigContext.Provider>,
  )
}

describe('useStatsigClientStatus', () => {
  // Vitest runs without globals, so RTL's automatic cleanup is not registered.
  afterEach(cleanup)

  it('reports the current status on mount', () => {
    renderWithClient(createFakeClient('Ready'), <Status />)
    expect(screen.getByTestId('status').textContent).toBe('ready')
  })

  it('follows values_updated events after mount', () => {
    const client = createFakeClient('Loading')
    renderWithClient(client, <Status />)
    expect(screen.getByTestId('status').textContent).toBe('loading')

    act(() => client.setStatus('Ready'))
    expect(screen.getByTestId('status').textContent).toBe('ready')

    // updateUserAsync re-enters Loading; consumers that need "first report only" handle that themselves.
    act(() => client.setStatus('Loading'))
    expect(screen.getByTestId('status').textContent).toBe('loading')
  })

  // A lazily loaded route can render while the init request is in flight and commit after it resolves.
  // The transition then fires before the subscription exists, so it has to be caught by re-reading.
  it('does not hold a stale status when the client changes between render and subscription', () => {
    const client = createFakeClient('Loading')
    renderWithClient(
      client,
      <>
        <Status />
        <FlipDuringRender client={client} to="Ready" />
      </>,
    )
    expect(client.loadingStatus).toBe('Ready')
    expect(screen.getByTestId('status').textContent).toBe('ready')
  })

  it('unsubscribes on unmount', () => {
    const client = createFakeClient('Loading')
    const { unmount } = renderWithClient(client, <Status />)
    expect(client.listenerCount).toBe(1)
    unmount()
    expect(client.listenerCount).toBe(0)
  })
})
