import { buildCreatePositionHref } from '~/utils/createPositionRoute'

describe('buildCreatePositionHref', () => {
  it('should open the pool browser', () => {
    expect(buildCreatePositionHref()).toBe('/positions/add')
  })

  it('should carry the entry point so the destination can breadcrumb back to it', () => {
    expect(buildCreatePositionHref({ entryPoint: '/portfolio/pools' })).toBe(
      '/positions/add?entryPoint=%2Fportfolio%2Fpools',
    )
  })
})
