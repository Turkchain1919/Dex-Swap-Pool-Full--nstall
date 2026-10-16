import { useUnitagsUsernameQuery } from 'uniswap/src/data/apiClients/unitagsApi/useUnitagsUsernameQuery'
import { useCanClaimUnitagName } from 'uniswap/src/features/unitags/hooks/useCanClaimUnitagName'
import { renderHook } from 'uniswap/src/test/test-utils'
import { useDebounceWithStatus } from 'utilities/src/time/timing'
import type { Mock } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: (): { t: (key: string) => string } => ({
    t: (key: string) => key,
  }),
}))

vi.mock('utilities/src/time/timing', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('utilities/src/time/timing')>()
  return {
    __esModule: true,
    ...originalModule,
    // Defaults to the real debounce behavior; individual tests override with
    // mockReturnValueOnce to simulate a specific render's debounce state.
    useDebounceWithStatus: vi.fn(originalModule.useDebounceWithStatus),
  }
})

vi.mock('uniswap/src/data/apiClients/unitagsApi/useUnitagsUsernameQuery', async (importOriginal) => {
  const originalModule =
    await importOriginal<typeof import('uniswap/src/data/apiClients/unitagsApi/useUnitagsUsernameQuery')>()
  return {
    __esModule: true,
    ...originalModule,
    useUnitagsUsernameQuery: vi.fn(
      (): {
        isLoading: boolean
        data: { available: boolean; address?: string }
      } => ({
        isLoading: false,
        data: { available: true },
      }),
    ),
  }
})

vi.mock('uniswap/src/features/ens/useENS', () => ({
  useENS: vi.fn((): { loading: boolean } => ({
    loading: false,
  })),
}))

describe('useCanClaimUnitagName', (): void => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useUnitagsUsernameQuery as Mock).mockReturnValue({
      isLoading: false,
      data: { available: true },
    })
  })

  it('should return no error for a valid unitag', (): void => {
    const { result } = renderHook(() => useCanClaimUnitagName({ unitag: 'validunitag' }))

    expect(result.current.error).toBeUndefined()
    expect(result.current.loading).toBe(false)
  })

  it('should return an error for a unitag that is too short', (): void => {
    const { result } = renderHook(() => useCanClaimUnitagName({ unitag: 'ab' }))

    expect(result.current.error).toBe('unitags.username.error.min')
  })

  it('should return an error for a unitag that is too long', (): void => {
    const { result } = renderHook(() => useCanClaimUnitagName({ unitag: 'a'.repeat(21) }))

    expect(result.current.error).toBe('unitags.username.error.max')
  })

  it('should return an error for a unitag with uppercase letters', (): void => {
    const { result } = renderHook(() => useCanClaimUnitagName({ unitag: 'Invalid' }))

    expect(result.current.error).toBe('unitags.username.error.uppercase')
  })

  it('should return an error for a unitag with invalid characters', (): void => {
    const { result } = renderHook(() => useCanClaimUnitagName({ unitag: 'invalid!' }))

    expect(result.current.error).toBe('unitags.username.error.chars')
  })

  it('should return an error if the unitag is unavailable', (): void => {
    const useUnitagsUsernameQueryMock = useUnitagsUsernameQuery as Mock

    useUnitagsUsernameQueryMock.mockReturnValue({
      isLoading: false,
      data: { available: false },
    })
    const { result } = renderHook(() => useCanClaimUnitagName({ unitag: 'unavailable' }))

    expect(result.current.error).toBe('unitags.claim.error.unavailable')
  })

  it('should return an error if the availability query fails', (): void => {
    const useUnitagsUsernameQueryMock = useUnitagsUsernameQuery as Mock

    useUnitagsUsernameQueryMock.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    })
    const { result } = renderHook(() => useCanClaimUnitagName({ unitag: 'validunitag' }))

    expect(result.current.error).toBe('unitags.claim.error.general')
  })

  it('should return no error if the unitag is taken but registered to the claimer address', (): void => {
    const useUnitagsUsernameQueryMock = useUnitagsUsernameQuery as Mock
    const claimer = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'

    useUnitagsUsernameQueryMock.mockReturnValue({
      isLoading: false,
      data: { available: false, address: claimer.toLowerCase() },
    })
    const { result } = renderHook(() => useCanClaimUnitagName({ unitag: 'myunitag', claimerAddress: claimer }))

    expect(result.current.error).toBeUndefined()
    expect(result.current.loading).toBe(false)
  })

  it('stays in the debouncing state when the debounced value has not caught up to a newly-typed unitag, even if the debounce hook reports pending=false', (): void => {
    const useUnitagsUsernameQueryMock = useUnitagsUsernameQuery as Mock
    // The availability data below belongs to the *previous* (already-resolved) debounced
    // value, not the newly-typed one — simulating the one-render window where the debounce
    // hook's pending flag hasn't flipped to true yet.
    useUnitagsUsernameQueryMock.mockReturnValue({
      isLoading: false,
      data: { available: true },
    })
    ;(useDebounceWithStatus as Mock).mockReturnValueOnce(['oldusername', false])

    const { result } = renderHook(() => useCanClaimUnitagName({ unitag: 'newusername' }))

    expect(result.current.isDebouncing).toBe(true)
  })

  it('is not debouncing once the debounced value has caught up to the current unitag', (): void => {
    ;(useDebounceWithStatus as Mock).mockReturnValueOnce(['sameusername', false])

    const { result } = renderHook(() => useCanClaimUnitagName({ unitag: 'sameusername' }))

    expect(result.current.isDebouncing).toBe(false)
  })
})
