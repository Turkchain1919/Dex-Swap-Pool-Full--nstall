import { Flex, Skeleton } from '@universe/mycelium'

export function TokenDetailsAuctionSkeleton(): JSX.Element {
  return (
    <Flex
      aria-busy
      gap="$spacing24"
      p="$spacing16"
      borderRadius="$rounded24"
      borderWidth="$spacing1"
      borderColor="$surface3"
    >
      <Skeleton>
        <Flex height="$spacing24" width="60%" borderRadius="$rounded4" backgroundColor="$surface3" />
      </Skeleton>
      <Skeleton>
        <Flex height="$spacing32" width="80%" borderRadius="$rounded4" backgroundColor="$surface3" />
      </Skeleton>
      <Skeleton>
        <Flex height="$spacing48" width="100%" borderRadius="$rounded16" backgroundColor="$surface3" />
      </Skeleton>
    </Flex>
  )
}
