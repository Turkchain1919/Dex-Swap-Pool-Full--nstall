import { type QueryKey, queryOptions } from '@tanstack/react-query'
import type { PoolInfoRequest, PoolInfoResponse } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/api_pb'
import type {
  GetPoolHistoryPriceRequest,
  GetPoolHistoryPriceResponse,
  GetPoolHistoryVolumeRequest,
  GetPoolHistoryVolumeResponse,
  GetPoolRequest,
  GetPoolResponse,
  GetPoolTicksRequest,
  GetPoolTicksResponse,
  HookListRequest,
  HookListResponse,
} from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/api_pb'
import { type UseQueryApiHelperHookArgs } from '@universe/api'
import {
  V1LiquidityServiceClient,
  V2LiquidityServiceClient,
} from 'uniswap/src/data/apiClients/liquidityService/LiquidityServiceClient'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'
import { type QueryOptionsResult } from 'utilities/src/reactQuery/queryOptions'
import { ONE_MINUTE_MS } from 'utilities/src/time/time'

const HOOK_LIST_STALE_TIME = 5 * ONE_MINUTE_MS
const HOOK_LIST_GC_TIME = 30 * ONE_MINUTE_MS

export function getPoolInfoQueryOptions(
  client: typeof V1LiquidityServiceClient,
  { params, ...rest }: UseQueryApiHelperHookArgs<PoolInfoRequest, PoolInfoResponse>,
): QueryOptionsResult<PoolInfoResponse, Error, PoolInfoResponse, QueryKey> {
  return queryOptions({
    queryKey: [ReactQueryCacheKey.LiquidityService, 'poolInfo', params],
    queryFn: async () => {
      if (!params) {
        throw new Error('params required')
      }
      return client.poolInfo(params)
    },
    ...rest,
  })
}

export function getHookListQueryOptions(
  client: typeof V2LiquidityServiceClient,
  { params, ...rest }: UseQueryApiHelperHookArgs<HookListRequest, HookListResponse>,
): QueryOptionsResult<HookListResponse, Error, HookListResponse, QueryKey> {
  return queryOptions({
    queryKey: [ReactQueryCacheKey.LiquidityService, 'hookList', params],
    queryFn: async () => {
      if (!params) {
        throw new Error('params required')
      }
      return client.hookList(params)
    },
    staleTime: HOOK_LIST_STALE_TIME,
    gcTime: HOOK_LIST_GC_TIME,
    ...rest,
  })
}

export function getGetPoolQueryOptions(
  client: typeof V2LiquidityServiceClient,
  { params, ...rest }: UseQueryApiHelperHookArgs<GetPoolRequest, GetPoolResponse>,
): QueryOptionsResult<GetPoolResponse, Error, GetPoolResponse, QueryKey> {
  return queryOptions({
    queryKey: [ReactQueryCacheKey.LiquidityService, 'getPool', params],
    queryFn: async () => {
      if (!params) {
        throw new Error('params required')
      }
      return client.getPool(params)
    },
    ...rest,
  })
}

export function getGetPoolHistoryPriceQueryOptions(
  client: typeof V2LiquidityServiceClient,
  { params, ...rest }: UseQueryApiHelperHookArgs<GetPoolHistoryPriceRequest, GetPoolHistoryPriceResponse>,
): QueryOptionsResult<GetPoolHistoryPriceResponse, Error, GetPoolHistoryPriceResponse, QueryKey> {
  return queryOptions({
    queryKey: [ReactQueryCacheKey.LiquidityService, 'getPoolHistoryPrice', params],
    queryFn: async () => {
      if (!params) {
        throw new Error('params required')
      }
      return client.getPoolHistoryPrice(params)
    },
    ...rest,
  })
}

export function getGetPoolHistoryVolumeQueryOptions(
  client: typeof V2LiquidityServiceClient,
  { params, ...rest }: UseQueryApiHelperHookArgs<GetPoolHistoryVolumeRequest, GetPoolHistoryVolumeResponse>,
): QueryOptionsResult<GetPoolHistoryVolumeResponse, Error, GetPoolHistoryVolumeResponse, QueryKey> {
  return queryOptions({
    queryKey: [ReactQueryCacheKey.LiquidityService, 'getPoolHistoryVolume', params],
    queryFn: async () => {
      if (!params) {
        throw new Error('params required')
      }
      return client.getPoolHistoryVolume(params)
    },
    ...rest,
  })
}

export function getGetPoolTicksQueryOptions(
  client: typeof V2LiquidityServiceClient,
  { params, ...rest }: UseQueryApiHelperHookArgs<GetPoolTicksRequest, GetPoolTicksResponse>,
): QueryOptionsResult<GetPoolTicksResponse, Error, GetPoolTicksResponse, QueryKey> {
  return queryOptions({
    queryKey: [ReactQueryCacheKey.LiquidityService, 'getPoolTicks', params],
    queryFn: async () => {
      if (!params) {
        throw new Error('params required')
      }
      return client.getPoolTicks(params)
    },
    ...rest,
  })
}
