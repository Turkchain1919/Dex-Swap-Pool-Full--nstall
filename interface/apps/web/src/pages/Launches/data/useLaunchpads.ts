import type { PlainMessage } from '@bufbuild/protobuf'
import { useQuery } from '@tanstack/react-query'
import type { Launchpad } from '@uniswap/client-launches/dist/launches/v1/types_pb'
import { useMemo } from 'react'
import { getListLaunchpadsQueryOptions } from 'uniswap/src/data/apiClients/dataApiService/launches/queries'
import { resolveLaunchIpfsImageUrl } from '~/pages/Launches/data/resolveLaunchIpfsImageUrl'

const EMPTY_LAUNCHPADS: PlainMessage<Launchpad>[] = []

/**
 * Fetches the launchpad registry backing the Launches surface (launches.v1.LaunchService ListLaunchpads).
 * Launchpad ids are the stable slugs accepted by ListLaunches' launchpad_id filter.
 */
export function useLaunchpads(): {
  launchpads: PlainMessage<Launchpad>[]
  launchpadById: Map<string, PlainMessage<Launchpad>>
  isLoading: boolean
  isError: boolean
  error: Error | null
} {
  const { data, isLoading, isError, error } = useQuery(getListLaunchpadsQueryOptions({ params: {} }))

  const launchpads = useMemo(
    () =>
      data?.launchpads
        ? data.launchpads.map((launchpad) => ({ ...launchpad, logoUrl: resolveLaunchIpfsImageUrl(launchpad.logoUrl) }))
        : EMPTY_LAUNCHPADS,
    [data],
  )

  const launchpadById = useMemo(() => new Map(launchpads.map((launchpad) => [launchpad.id, launchpad])), [launchpads])

  return { launchpads, launchpadById, isLoading, isError, error }
}
