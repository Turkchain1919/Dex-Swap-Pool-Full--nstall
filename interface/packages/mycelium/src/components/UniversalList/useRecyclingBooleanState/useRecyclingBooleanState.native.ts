import { useRecyclingState } from '@legendapp/list/react-native'
import { useCallback } from 'react'
import type { RecyclingBooleanState } from './useRecyclingBooleanState'

export function useRecyclingBooleanState(initialValue = false): RecyclingBooleanState {
  const [value, setValue] = useRecyclingState(initialValue)

  const setTrue = useCallback(() => setValue(true), [setValue])
  const setFalse = useCallback(() => setValue(false), [setValue])
  const toggle = useCallback(() => setValue((prevValue) => !prevValue), [setValue])

  return { value, setTrue, setFalse, toggle, setValue }
}
