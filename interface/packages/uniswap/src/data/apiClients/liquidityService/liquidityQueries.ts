import { type PartialMessage } from '@bufbuild/protobuf'
import { type QueryKey } from '@tanstack/react-query'
import type {
  ClaimLPRewardsRequest,
  ClaimLPRewardsResponse,
  MigrateV3ToV4LPPositionRequest,
  MigrateV3ToV4LPPositionResponse,
  PoolInfoRequest,
  PoolInfoResponse,
} from '@uniswap/client-liquidity/dist/uniswap/liquidity/v1/api_pb'
import type {
  ClaimFeesRequest,
  ClaimFeesResponse,
  CreateClassicPositionRequest,
  CreateClassicPositionResponse,
  CreatePositionRequest,
  CreatePositionResponse,
  DecreasePositionRequest,
  DecreasePositionResponse,
  GetPoolHistoryPriceRequest,
  GetPoolHistoryPriceResponse,
  GetPoolHistoryVolumeRequest,
  GetPoolHistoryVolumeResponse,
  GetPoolRequest,
  GetPoolResponse,
  GetPoolTicksRequest,
  GetPoolTicksResponse,
  GetPositionRequest,
  GetPositionResponse,
  GetWalletPositionsBalanceRequest,
  GetWalletPositionsBalanceResponse,
  HookListRequest,
  HookListResponse,
  IncreasePositionRequest,
  IncreasePositionResponse,
  LPApprovalRequest,
  LPApprovalResponse,
  MigrateV2ToV3LPPositionRequest,
  MigrateV2ToV3LPPositionResponse,
} from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/api_pb'
import { type UseQueryApiHelperHookArgs } from '@universe/api'
import {
  V1LiquidityServiceClient,
  V2LiquidityServiceClient,
} from 'uniswap/src/data/apiClients/liquidityService/LiquidityServiceClient'
import {
  getGetPoolHistoryPriceQueryOptions,
  getGetPoolHistoryVolumeQueryOptions,
  getGetPoolQueryOptions,
  getGetPoolTicksQueryOptions,
  getHookListQueryOptions,
  getPoolInfoQueryOptions,
} from 'uniswap/src/data/apiClients/liquidityService/queries/poolQueries'
import {
  getCheckLPApprovalQueryOptions,
  getClaimFeesQueryOptions,
  getClaimLPRewardsQueryOptions,
  getCreateClassicPositionQueryOptions,
  getCreatePositionQueryOptions,
  getDecreasePositionQueryOptions,
  getGetPositionQueryOptions,
  getGetWalletPositionsBalanceQueryOptions,
  getGetWalletPositionsQueryOptions,
  getIncreasePositionQueryOptions,
  getMigrateV2ToV3LPPositionQueryOptions,
  getMigrateV3ToV4LPPositionQueryOptions,
  type GetWalletPositionsInput,
} from 'uniswap/src/data/apiClients/liquidityService/queries/positionQueries'
import { type QueryOptionsResult } from 'utilities/src/reactQuery/queryOptions'

function provideLiquidityQueries(
  v1Client: typeof V1LiquidityServiceClient,
  v2Client: typeof V2LiquidityServiceClient,
): {
  poolInfo: (
    input: UseQueryApiHelperHookArgs<PoolInfoRequest, PoolInfoResponse>,
  ) => QueryOptionsResult<PoolInfoResponse, Error, PoolInfoResponse, QueryKey>
  checkApproval: (
    input: UseQueryApiHelperHookArgs<LPApprovalRequest, LPApprovalResponse>,
  ) => QueryOptionsResult<LPApprovalResponse, Error, LPApprovalResponse, QueryKey>
  claimFees: (
    input: UseQueryApiHelperHookArgs<ClaimFeesRequest, ClaimFeesResponse>,
  ) => QueryOptionsResult<ClaimFeesResponse, Error, ClaimFeesResponse, QueryKey>
  claimRewards: (
    input: UseQueryApiHelperHookArgs<ClaimLPRewardsRequest, ClaimLPRewardsResponse>,
  ) => QueryOptionsResult<ClaimLPRewardsResponse, Error, ClaimLPRewardsResponse, QueryKey>
  createClassicPosition: (
    input: UseQueryApiHelperHookArgs<CreateClassicPositionRequest, CreateClassicPositionResponse>,
  ) => QueryOptionsResult<CreateClassicPositionResponse, Error, CreateClassicPositionResponse, QueryKey>
  createPosition: (
    input: UseQueryApiHelperHookArgs<CreatePositionRequest, CreatePositionResponse>,
  ) => QueryOptionsResult<CreatePositionResponse, Error, CreatePositionResponse, QueryKey>
  decreasePosition: (
    input: UseQueryApiHelperHookArgs<DecreasePositionRequest, DecreasePositionResponse>,
  ) => QueryOptionsResult<DecreasePositionResponse, Error, DecreasePositionResponse, QueryKey>
  migrateV2ToV3: (
    input: UseQueryApiHelperHookArgs<MigrateV2ToV3LPPositionRequest, MigrateV2ToV3LPPositionResponse>,
  ) => QueryOptionsResult<MigrateV2ToV3LPPositionResponse, Error, MigrateV2ToV3LPPositionResponse, QueryKey>
  migrateV3ToV4: (
    input: UseQueryApiHelperHookArgs<MigrateV3ToV4LPPositionRequest, MigrateV3ToV4LPPositionResponse>,
  ) => QueryOptionsResult<MigrateV3ToV4LPPositionResponse, Error, MigrateV3ToV4LPPositionResponse, QueryKey>
  increasePosition: (
    input: UseQueryApiHelperHookArgs<IncreasePositionRequest, IncreasePositionResponse>,
  ) => QueryOptionsResult<IncreasePositionResponse, Error, IncreasePositionResponse, QueryKey>
  hookList: (
    input: UseQueryApiHelperHookArgs<HookListRequest, HookListResponse>,
  ) => QueryOptionsResult<HookListResponse, Error, HookListResponse, QueryKey>
  getPool: (
    input: UseQueryApiHelperHookArgs<GetPoolRequest, GetPoolResponse>,
  ) => QueryOptionsResult<GetPoolResponse, Error, GetPoolResponse, QueryKey>
  getPoolHistoryPrice: (
    input: UseQueryApiHelperHookArgs<GetPoolHistoryPriceRequest, GetPoolHistoryPriceResponse>,
  ) => QueryOptionsResult<GetPoolHistoryPriceResponse, Error, GetPoolHistoryPriceResponse, QueryKey>
  getPoolHistoryVolume: (
    input: UseQueryApiHelperHookArgs<GetPoolHistoryVolumeRequest, GetPoolHistoryVolumeResponse>,
  ) => QueryOptionsResult<GetPoolHistoryVolumeResponse, Error, GetPoolHistoryVolumeResponse, QueryKey>
  getPoolTicks: (
    input: UseQueryApiHelperHookArgs<GetPoolTicksRequest, GetPoolTicksResponse>,
  ) => QueryOptionsResult<GetPoolTicksResponse, Error, GetPoolTicksResponse, QueryKey>
  getPosition: (
    input: UseQueryApiHelperHookArgs<GetPositionRequest, GetPositionResponse>,
  ) => QueryOptionsResult<GetPositionResponse, Error, GetPositionResponse, QueryKey>
  getWalletPositionsBalance: (
    input: UseQueryApiHelperHookArgs<
      PartialMessage<GetWalletPositionsBalanceRequest>,
      GetWalletPositionsBalanceResponse
    >,
  ) => QueryOptionsResult<GetWalletPositionsBalanceResponse, Error, GetWalletPositionsBalanceResponse, QueryKey>
  // getWalletPositions is a paginated read surfaced as an infinite query, so it has a distinct input/return shape.
  getWalletPositions: (input: GetWalletPositionsInput) => ReturnType<typeof getGetWalletPositionsQueryOptions>
} {
  return {
    poolInfo: (input: UseQueryApiHelperHookArgs<PoolInfoRequest, PoolInfoResponse>) =>
      getPoolInfoQueryOptions(v1Client, input),
    checkApproval: (input: UseQueryApiHelperHookArgs<LPApprovalRequest, LPApprovalResponse>) =>
      getCheckLPApprovalQueryOptions(v2Client, input),
    claimFees: (input: UseQueryApiHelperHookArgs<ClaimFeesRequest, ClaimFeesResponse>) =>
      getClaimFeesQueryOptions(v2Client, input),
    claimRewards: (input: UseQueryApiHelperHookArgs<ClaimLPRewardsRequest, ClaimLPRewardsResponse>) =>
      getClaimLPRewardsQueryOptions(v1Client, input),
    createClassicPosition: (
      input: UseQueryApiHelperHookArgs<CreateClassicPositionRequest, CreateClassicPositionResponse>,
    ) => getCreateClassicPositionQueryOptions(v2Client, input),
    createPosition: (input: UseQueryApiHelperHookArgs<CreatePositionRequest, CreatePositionResponse>) =>
      getCreatePositionQueryOptions(v2Client, input),
    decreasePosition: (input: UseQueryApiHelperHookArgs<DecreasePositionRequest, DecreasePositionResponse>) =>
      getDecreasePositionQueryOptions(v2Client, input),
    migrateV2ToV3: (
      input: UseQueryApiHelperHookArgs<MigrateV2ToV3LPPositionRequest, MigrateV2ToV3LPPositionResponse>,
    ) => getMigrateV2ToV3LPPositionQueryOptions(v2Client, input),
    migrateV3ToV4: (
      input: UseQueryApiHelperHookArgs<MigrateV3ToV4LPPositionRequest, MigrateV3ToV4LPPositionResponse>,
    ) => getMigrateV3ToV4LPPositionQueryOptions(v1Client, input),
    increasePosition: (input: UseQueryApiHelperHookArgs<IncreasePositionRequest, IncreasePositionResponse>) =>
      getIncreasePositionQueryOptions(v2Client, input),
    hookList: (input: UseQueryApiHelperHookArgs<HookListRequest, HookListResponse>) =>
      getHookListQueryOptions(v2Client, input),
    getPool: (input: UseQueryApiHelperHookArgs<GetPoolRequest, GetPoolResponse>) =>
      getGetPoolQueryOptions(v2Client, input),
    getPoolHistoryPrice: (input: UseQueryApiHelperHookArgs<GetPoolHistoryPriceRequest, GetPoolHistoryPriceResponse>) =>
      getGetPoolHistoryPriceQueryOptions(v2Client, input),
    getPoolHistoryVolume: (
      input: UseQueryApiHelperHookArgs<GetPoolHistoryVolumeRequest, GetPoolHistoryVolumeResponse>,
    ) => getGetPoolHistoryVolumeQueryOptions(v2Client, input),
    getPoolTicks: (input: UseQueryApiHelperHookArgs<GetPoolTicksRequest, GetPoolTicksResponse>) =>
      getGetPoolTicksQueryOptions(v2Client, input),
    getPosition: (input: UseQueryApiHelperHookArgs<GetPositionRequest, GetPositionResponse>) =>
      getGetPositionQueryOptions(v2Client, input),
    getWalletPositionsBalance: (
      input: UseQueryApiHelperHookArgs<
        PartialMessage<GetWalletPositionsBalanceRequest>,
        GetWalletPositionsBalanceResponse
      >,
    ) => getGetWalletPositionsBalanceQueryOptions(v2Client, input),
    getWalletPositions: (input: GetWalletPositionsInput) => getGetWalletPositionsQueryOptions(v2Client, input),
  }
}

export const liquidityQueries = provideLiquidityQueries(V1LiquidityServiceClient, V2LiquidityServiceClient)
