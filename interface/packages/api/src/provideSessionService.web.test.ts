import { isE2eTestEnv } from '@universe/environment'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { provideSessionService } from './provideSessionService.web'

vi.mock('@universe/environment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/environment')>()
  return { ...actual, isE2eTestEnv: vi.fn() }
})

// Tag the two constructors so the branch taken is observable without standing up a transport.
vi.mock('@universe/sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@universe/sessions')>()
  return {
    ...actual,
    createNoopSessionService: vi.fn(() => ({ tag: 'noop' })),
    createSessionService: vi.fn(() => ({ tag: 'real' })),
  }
})

const mockIsE2eTestEnv = vi.mocked(isE2eTestEnv)

describe('provideSessionService (web)', () => {
  beforeEach(() => {
    mockIsE2eTestEnv.mockReturnValue(false)
  })

  it('defaults to enabled when no getIsSessionServiceEnabled is supplied', () => {
    expect(provideSessionService({ getBaseUrl: () => 'https://example.test' })).toEqual({ tag: 'real' })
  })

  it('defaults to the noop service in the e2e environment', () => {
    mockIsE2eTestEnv.mockReturnValue(true)

    expect(provideSessionService({ getBaseUrl: () => 'https://example.test' })).toEqual({ tag: 'noop' })
  })
})
