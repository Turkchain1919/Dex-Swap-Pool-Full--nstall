import { noop } from 'utilities/src/react/noop'
import { holdQueryResult } from 'utilities/src/reactQuery/holdQueryResult'

describe(holdQueryResult, () => {
  it('withholds data and forces isLoading while held', () => {
    const held = holdQueryResult({
      result: { data: [1, 2], isLoading: false, error: null, refetch: noop },
      hold: true,
    })

    expect(held.data).toBeUndefined()
    expect(held.isLoading).toBe(true)
  })

  it('passes the result through untouched when not held', () => {
    const result = { data: [1, 2], isLoading: true, error: null, refetch: noop }

    expect(holdQueryResult({ result, hold: false })).toBe(result)
  })
})
