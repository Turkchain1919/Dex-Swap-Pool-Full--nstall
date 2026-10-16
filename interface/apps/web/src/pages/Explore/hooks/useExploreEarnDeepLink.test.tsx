import { configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter, useNavigate } from 'react-router'
import { uniswapBehaviorHistoryReducer } from 'uniswap/src/features/behaviorHistory/slice'
import { useExploreEarnDeepLink } from '~/pages/Explore/hooks/useExploreEarnDeepLink'

function createStore() {
  return configureStore({
    reducer: {
      uniswapBehaviorHistory: uniswapBehaviorHistoryReducer,
    },
  })
}

function createWrapper({ initialEntry, store }: { initialEntry: string; store: ReturnType<typeof createStore> }) {
  return function Wrapper({ children }: PropsWithChildren): JSX.Element {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </Provider>
    )
  }
}

function Harness(): JSX.Element {
  const navigate = useNavigate()
  const { dismissCoachmark, earnSectionRef, shouldShowCoachmark } = useExploreEarnDeepLink()

  return (
    <>
      <div ref={earnSectionRef}>Earn section</div>
      {shouldShowCoachmark && <div>Earn coachmark</div>}
      <button onClick={dismissCoachmark}>Dismiss coachmark</button>
      <button onClick={() => navigate('/explore')}>Leave deep link</button>
      <button onClick={() => navigate(-1)}>Return to deep link</button>
    </>
  )
}

describe(useExploreEarnDeepLink, () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    scrollIntoView.mockReset()
    vi.restoreAllMocks()
  })

  it('shows the coachmark and scrolls the Earn section into view', async () => {
    render(<Harness />, {
      wrapper: createWrapper({ initialEntry: '/explore?section=earn', store: createStore() }),
    })

    expect(screen.getByText('Earn coachmark')).toBeInTheDocument()
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' })
    })
  })

  it.each(['/explore', '/explore?section=pools', '/explore?section=Earn', '/explore?section=earning'])(
    'ignores non-Earn section params: %s',
    (initialEntry) => {
      render(<Harness />, {
        wrapper: createWrapper({ initialEntry, store: createStore() }),
      })

      expect(screen.queryByText('Earn coachmark')).not.toBeInTheDocument()
      expect(scrollIntoView).not.toHaveBeenCalled()
    },
  )

  it('persists dismissal across deep-link arrivals', () => {
    const store = createStore()
    render(<Harness />, {
      wrapper: createWrapper({ initialEntry: '/explore?section=earn', store }),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss coachmark' }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave deep link' }))
    fireEvent.click(screen.getByRole('button', { name: 'Return to deep link' }))

    expect(store.getState().uniswapBehaviorHistory.hasDismissedExploreEarnCoachmark).toBe(true)
    expect(screen.queryByText('Earn coachmark')).not.toBeInTheDocument()
  })

  it('tracks whether the current URL is the Earn deep link', () => {
    render(<Harness />, {
      wrapper: createWrapper({ initialEntry: '/explore?section=earn', store: createStore() }),
    })

    expect(screen.getByText('Earn coachmark')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Leave deep link' }))
    expect(screen.queryByText('Earn coachmark')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Return to deep link' }))
    expect(screen.getByText('Earn coachmark')).toBeInTheDocument()
  })
})
