// Stage 1 discovery filtering stays client-side: backend filtering (CONS-3234) and list removal
// (CONS-3247) are canceled. Revisit removal only when backend filtering covers lookup and discovery.
// Direct auction links still resolve. Match backend auctionId exactly, using the same
// `${chainId}_${checksummedAuctionAddress}` form as DEFAULT_VERIFIED_AUCTION_IDS.
const HIDDEN_AUCTION_IDS = new Set<string>([
  '1_0xD9E8355f9f57185928347a5BdDEe164006b16e58', // Abandoned Interfold (FOLD) auction, superseded by 0x687Cc3...
])

export function isHiddenAuction({ auctionId }: { auctionId: string | undefined }): boolean {
  return auctionId !== undefined && HIDDEN_AUCTION_IDS.has(auctionId)
}
