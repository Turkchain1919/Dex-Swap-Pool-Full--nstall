import { Route, Routes } from 'react-router'
import { CreatePositionRedirects } from '~/pages/CreatePosition/redirects'
import { render } from '~/test-utils/render'

/**
 * Mounts the retired routes at `from` and reports where they redirect to. The shared `render` helper
 * supplies a BrowserRouter, so the entry URL is seeded through history the way the other route tests
 * in this app do.
 */
function redirectTarget(from: string): string {
  globalThis.window.history.replaceState(null, '', from)
  render(
    <Routes>
      <Route path="/positions/create" element={<CreatePositionRedirects />} />
      <Route path="/positions/create/:protocolVersion" element={<CreatePositionRedirects />} />
      <Route path="/positions/add/new" element={<div />} />
    </Routes>,
  )
  return `${globalThis.window.location.pathname}${globalThis.window.location.search}`
}

describe('CreatePositionRedirects', () => {
  it('sends the bare legacy path to the create-pool leg', () => {
    expect(redirectTarget('/positions/create')).toBe('/positions/add/new')
  })

  // The add leg has no `:protocolVersion` segment, so the version has to survive as a search param —
  // otherwise a v2/v3 deep link silently lands on the v4 default.
  it.each([
    ['v2', '/positions/create/v2'],
    ['v3', '/positions/create/v3'],
    ['v4', '/positions/create/v4'],
  ])('carries the %s path segment into the protocolVersion param', (version, from) => {
    expect(redirectTarget(from)).toBe(`/positions/add/new?protocolVersion=${version}`)
  })

  it('normalizes a mixed-case version segment', () => {
    expect(redirectTarget('/positions/create/V3')).toBe('/positions/add/new?protocolVersion=v3')
  })

  // Forwarding it would write a value the destination reads as "no version" anyway, so drop it.
  it('drops an unparseable version segment', () => {
    expect(redirectTarget('/positions/create/garbage')).toBe('/positions/add/new')
  })

  // These params are what make a deep link open a pre-seeded form instead of a blank one.
  it('preserves the existing search params alongside the version', () => {
    expect(redirectTarget('/positions/create/v3?currencyA=NATIVE&currencyB=0xusdc&chain=base')).toBe(
      '/positions/add/new?currencyA=NATIVE&currencyB=0xusdc&chain=base&protocolVersion=v3',
    )
  })

  // The path segment is the legacy carrier, so it wins over a param that came along for the ride.
  it('lets the path segment win over an existing protocolVersion param', () => {
    expect(redirectTarget('/positions/create/v2?protocolVersion=v4')).toBe('/positions/add/new?protocolVersion=v2')
  })
})
