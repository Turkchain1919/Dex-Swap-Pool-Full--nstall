import { DynamicConfigKeys } from '@universe/gating/src/configs'
import { ExperimentProperties, Experiments } from '@universe/gating/src/experiments'
import { FeatureFlags, getFeatureFlagName } from '@universe/gating/src/flags'
import {
  getStatsigClient,
  TypedReturn,
  useDynamicConfig,
  useExperiment,
  useFeatureGate,
  useGateValue,
  useLayer,
  useStatsigClient,
} from '@universe/gating/src/sdk/statsig'
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { logger } from 'utilities/src/logger/logger'

export function useFeatureFlag(flag: FeatureFlags): boolean {
  const name = getFeatureFlagName(flag)
  const value = useGateValue(name)
  return value
}

export function useFeatureFlagWithLoading(flag: FeatureFlags): { value: boolean; isLoading: boolean } {
  const { isStatsigLoading } = useStatsigClientStatus()
  const name = getFeatureFlagName(flag)
  const { value } = useFeatureGate(name)
  return { value, isLoading: isStatsigLoading }
}

export function getFeatureFlag(flag: FeatureFlags): boolean {
  try {
    const name = getFeatureFlagName(flag)
    return getStatsigClient().checkGate(name)
  } catch (e) {
    logger.debug('gating/hooks.ts', 'getFeatureFlag', JSON.stringify({ e }))
    return false
  }
}

export function useFeatureFlagWithExposureLoggingDisabled(flag: FeatureFlags): boolean {
  const name = getFeatureFlagName(flag)
  const value = useGateValue(name, { disableExposureLog: true })
  return value
}

export function getFeatureFlagWithExposureLoggingDisabled(flag: FeatureFlags): boolean {
  const name = getFeatureFlagName(flag)
  return getStatsigClient().checkGate(name, { disableExposureLog: true })
}

export function useExperimentGroupNameWithLoading(experiment: Experiments): {
  value: string | null
  isLoading: boolean
} {
  const { isStatsigLoading } = useStatsigClientStatus()
  const statsigExperiment = useExperiment(experiment)
  return { value: statsigExperiment.groupName, isLoading: isStatsigLoading }
}

export function useExperimentGroupName(experiment: Experiments): string | null {
  const { groupName } = useExperiment(experiment)
  return groupName
}

export function useExperimentValue<
  Exp extends keyof ExperimentProperties,
  Param extends ExperimentProperties[Exp],
  ValType,
>({
  experiment,
  param,
  defaultValue,
  customTypeGuard,
}: {
  experiment: Exp
  param: Param
  defaultValue: ValType
  customTypeGuard?: (x: unknown) => x is ValType
}): ValType {
  const statsigExperiment = useExperiment(experiment)
  const value = statsigExperiment.get(param, defaultValue)
  return checkTypeGuard({ value, defaultValue, customTypeGuard })
}

export function getExperimentValue<
  Exp extends keyof ExperimentProperties,
  Param extends ExperimentProperties[Exp],
  ValType,
>({
  experiment,
  param,
  defaultValue,
  customTypeGuard,
}: {
  experiment: Exp
  param: Param
  defaultValue: ValType
  customTypeGuard?: (x: unknown) => x is ValType
}): ValType {
  const statsigExperiment = getStatsigClient().getExperiment(experiment)
  const value = statsigExperiment.get(param, defaultValue)
  return checkTypeGuard({ value, defaultValue, customTypeGuard })
}

export function useExperimentValueWithExposureLoggingDisabled<
  Exp extends keyof ExperimentProperties,
  Param extends ExperimentProperties[Exp],
  ValType,
>({
  experiment,
  param,
  defaultValue,
  customTypeGuard,
}: {
  experiment: Exp
  param: Param
  defaultValue: ValType
  customTypeGuard?: (x: unknown) => x is ValType
}): ValType {
  const statsigExperiment = useExperiment(experiment, { disableExposureLog: true })
  const value = statsigExperiment.get(param, defaultValue)
  return checkTypeGuard({ value, defaultValue, customTypeGuard })
}

export function useDynamicConfigValue<
  Conf extends keyof DynamicConfigKeys,
  Key extends DynamicConfigKeys[Conf],
  ValType,
>({
  config,
  key,
  defaultValue,
  customTypeGuard,
}: {
  config: Conf
  key: Key
  defaultValue: ValType
  customTypeGuard?: (x: unknown) => x is ValType
}): ValType {
  const dynamicConfig = useDynamicConfig(config)
  const value = dynamicConfig.get(key, defaultValue)
  return checkTypeGuard({ value, defaultValue, customTypeGuard })
}

export function getDynamicConfigValue<
  Conf extends keyof DynamicConfigKeys,
  Key extends DynamicConfigKeys[Conf],
  ValType,
>({
  config,
  key,
  defaultValue,
  customTypeGuard,
}: {
  config: Conf
  key: Key
  defaultValue: ValType
  customTypeGuard?: (x: unknown) => x is ValType
}): ValType {
  const dynamicConfig = getStatsigClient().getDynamicConfig(config)
  const value = dynamicConfig.get(key, defaultValue)
  return checkTypeGuard({ value, defaultValue, customTypeGuard })
}

export function getExperimentValueFromLayer<Layer extends string, Exp extends keyof ExperimentProperties, ValType>({
  layerName,
  param,
  defaultValue,
  customTypeGuard,
}: {
  layerName: Layer
  param: ExperimentProperties[Exp]
  defaultValue: ValType
  customTypeGuard?: (x: unknown) => x is ValType
}): ValType {
  const layer = getStatsigClient().getLayer(layerName)
  const value = layer.get(param, defaultValue)
  // we directly get param from layer; these are spread from experiments
  return checkTypeGuard({ value, defaultValue, customTypeGuard })
}

export function useExperimentValueFromLayer<Layer extends string, Exp extends keyof ExperimentProperties, ValType>({
  layerName,
  param,
  defaultValue,
  customTypeGuard,
}: {
  layerName: Layer
  param: ExperimentProperties[Exp]
  defaultValue: ValType
  customTypeGuard?: (x: unknown) => x is ValType
}): ValType {
  const layer = useLayer(layerName)
  const value = layer.get(param, defaultValue)
  // we directly get param from layer; these are spread from experiments
  return checkTypeGuard({ value, defaultValue, customTypeGuard })
}

export function checkTypeGuard<ValType>({
  value,
  defaultValue,
  customTypeGuard,
}: {
  value: TypedReturn<ValType>
  defaultValue: ValType
  customTypeGuard?: (x: unknown) => x is ValType
}): ValType {
  // A supplied guard is authoritative: `typeof` can't tell an array from `null` or `{}`, so falling
  // back to it would let a config the guard rejected through to callers that then treat it as the
  // shape it isn't. Only configs without a guard get the loose `typeof` check.
  if (customTypeGuard) {
    return customTypeGuard(value) ? value : defaultValue
  }

  const isOfDefaultValueType = (val: unknown): val is ValType => typeof val === typeof defaultValue

  return isOfDefaultValueType(value) ? value : defaultValue
}

export function useStatsigClientStatus(): {
  isStatsigLoading: boolean
  isStatsigReady: boolean
  isStatsigUninitialized: boolean
} {
  const { client } = useStatsigClient()
  const subscribe = useCallback(
    (onStatusChange: () => void) => {
      client.on('values_updated', onStatusChange)
      return () => {
        client.off('values_updated', onStatusChange)
      }
    },
    [client],
  )
  // useSyncExternalStore re-reads the snapshot after subscribing, so a Loading -> Ready transition that
  // lands between this component's render and its effects (e.g. a lazy route committing while the init
  // request resolves) is picked up instead of leaving a stale Loading for the life of the mount.
  const getStatus = useCallback(() => client.loadingStatus, [client])
  const statsigStatus = useSyncExternalStore(subscribe, getStatus, getStatus)

  return useMemo(
    () => ({
      isStatsigLoading: statsigStatus === 'Loading',
      isStatsigReady: statsigStatus === 'Ready',
      isStatsigUninitialized: statsigStatus === 'Uninitialized',
    }),
    [statsigStatus],
  )
}
