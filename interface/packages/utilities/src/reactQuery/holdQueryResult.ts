import type { DerivedQueryResult } from 'utilities/src/reactQuery/types'

export function holdQueryResult<TData, TError = Error>({
  result,
  hold,
}: {
  result: DerivedQueryResult<TData, TError>
  hold: boolean
}): DerivedQueryResult<TData, TError> {
  return hold ? { ...result, data: undefined, isLoading: true } : result
}
