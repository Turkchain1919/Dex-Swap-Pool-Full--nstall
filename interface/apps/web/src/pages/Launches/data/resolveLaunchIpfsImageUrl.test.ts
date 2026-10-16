import { resolveLaunchIpfsImageUrl } from '~/pages/Launches/data/resolveLaunchIpfsImageUrl'

const CID_V1 = 'bafkreicr5qh6v5b2lrn7734xkx7hy7vxgho4fqffahii5xy6bob36uvss4'
const CID_V1_DIR = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
const CID_V0 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
const CDN = 'https://ipfs.pools.xyz/ipfs/'

describe('resolveLaunchIpfsImageUrl', () => {
  it('resolves an ipfs:// uri to the dedicated IPFS CDN', () => {
    expect(resolveLaunchIpfsImageUrl(`ipfs://${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
    expect(resolveLaunchIpfsImageUrl(`ipfs://${CID_V0}`)).toBe(`${CDN}${CID_V0}`)
  })

  it('tolerates the ipfs://ipfs/<cid> form', () => {
    expect(resolveLaunchIpfsImageUrl(`ipfs://ipfs/${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
  })

  it('rejects dot segments that would walk off the /ipfs/ route', () => {
    expect(resolveLaunchIpfsImageUrl('ipfs://../../x')).toBeUndefined()
    expect(resolveLaunchIpfsImageUrl(`ipfs://${CID_V1}/../../x`)).toBeUndefined()
    expect(resolveLaunchIpfsImageUrl('ipfs://./x')).toBeUndefined()
  })

  it('rejects the encoded and backslash dot segments only the URL parser normalizes', () => {
    // A literal-segment check cannot see these: WHATWG folds `%2e%2e`/`.%2e`/`%2e.` into `..` and
    // rewrites `\` to `/` for special schemes, both after the CID has already validated.
    expect(resolveLaunchIpfsImageUrl(`ipfs://${CID_V1}/%2e%2e/%2e%2e/x`)).toBeUndefined()
    expect(resolveLaunchIpfsImageUrl(`ipfs://${CID_V1}/.%2e/%2e./x`)).toBeUndefined()
    expect(resolveLaunchIpfsImageUrl(`ipfs://${CID_V1}/..\\..\\x`)).toBeUndefined()
  })

  it('stays on the route for a single dot segment, which only cancels the CID', () => {
    // The load-bearing half of the two-segments argument: one `%2e%2e` normalizes
    // `/ipfs/<cid>/%2e%2e/x` to `/ipfs/x`, which passes the route check and 404s as a bogus CID
    // rather than escaping. Two are needed to pop past `/ipfs/`.
    expect(resolveLaunchIpfsImageUrl(`ipfs://${CID_V1}/%2e%2e/x`)).toBe(`${CDN}x`)
  })

  it('still resolves directory forms, which are the reason the path is kept', () => {
    expect(resolveLaunchIpfsImageUrl(`ipfs://${CID_V1_DIR}/logo.png`)).toBe(`${CDN}${CID_V1_DIR}/logo.png`)
  })

  it('passes https urls through unchanged', () => {
    expect(resolveLaunchIpfsImageUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png')
  })

  it('re-points an already-baked ipfs.io gateway url — 80% of launch logos', () => {
    expect(resolveLaunchIpfsImageUrl(`https://ipfs.io/ipfs/${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
    expect(resolveLaunchIpfsImageUrl(`https://ipfs.io/ipfs/${CID_V0}`)).toBe(`${CDN}${CID_V0}`)
  })

  it('re-points any gateway host, since /ipfs/<cid> is content-addressed', () => {
    expect(resolveLaunchIpfsImageUrl(`https://gateway.pinata.cloud/ipfs/${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
    expect(resolveLaunchIpfsImageUrl(`https://token-launcher-uniswap.mypinata.cloud/ipfs/${CID_V1}`)).toBe(
      `${CDN}${CID_V1}`,
    )
    expect(resolveLaunchIpfsImageUrl(`https://hardbin.com/ipfs/${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
    expect(resolveLaunchIpfsImageUrl(`https://some-new-vanity-gateway.xyz/ipfs/${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
    expect(resolveLaunchIpfsImageUrl(`http://ipfs.io/ipfs/${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
    expect(resolveLaunchIpfsImageUrl(`https://IPFS.IO/ipfs/${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
  })

  it('re-points the subdomain-gateway form', () => {
    expect(resolveLaunchIpfsImageUrl(`https://${CID_V1}.ipfs.dweb.link`)).toBe(`${CDN}${CID_V1}`)
    // A bare subdomain-gateway root is normalized: the trailing slash is the host's, not the CID's.
    expect(resolveLaunchIpfsImageUrl(`https://${CID_V1}.ipfs.nftstorage.link/`)).toBe(`${CDN}${CID_V1}`)
    expect(resolveLaunchIpfsImageUrl(`https://${CID_V1_DIR}.ipfs.inbrowser.link/logo.png?v=2`)).toBe(
      `${CDN}${CID_V1_DIR}/logo.png?v=2`,
    )
  })

  it('preserves the sub-path, trailing slash, query and fragment after the CID', () => {
    expect(resolveLaunchIpfsImageUrl(`https://ipfs.io/ipfs/${CID_V1_DIR}/1905`)).toBe(`${CDN}${CID_V1_DIR}/1905`)
    expect(resolveLaunchIpfsImageUrl(`https://ipfs.io/ipfs/${CID_V1_DIR}/`)).toBe(`${CDN}${CID_V1_DIR}/`)
    expect(resolveLaunchIpfsImageUrl(`https://ipfs.io/ipfs/${CID_V1}?filename=logo.png`)).toBe(
      `${CDN}${CID_V1}?filename=logo.png`,
    )
    expect(resolveLaunchIpfsImageUrl(`https://ipfs.io/ipfs/${CID_V1}?img-width=256&variant=card`)).toBe(
      `${CDN}${CID_V1}?img-width=256&variant=card`,
    )
    expect(resolveLaunchIpfsImageUrl(`https://ipfs.io/ipfs/${CID_V1}?gmgn_exp=1756000000&gmgn_sig=abc123`)).toBe(
      `${CDN}${CID_V1}?gmgn_exp=1756000000&gmgn_sig=abc123`,
    )
    expect(resolveLaunchIpfsImageUrl(`https://ipfs.io/ipfs/${CID_V1_DIR}/logo.png?a=1#frag`)).toBe(
      `${CDN}${CID_V1_DIR}/logo.png?a=1#frag`,
    )
    expect(resolveLaunchIpfsImageUrl(`ipfs://${CID_V1}?filename=logo.png`)).toBe(`${CDN}${CID_V1}?filename=logo.png`)
    expect(resolveLaunchIpfsImageUrl(`ipfs://${CID_V1_DIR}/logo.png?img-width=256`)).toBe(
      `${CDN}${CID_V1_DIR}/logo.png?img-width=256`,
    )
  })

  it('guards the /ipfs/ipfs/<cid> double path, which would otherwise yield the CID "ipfs"', () => {
    expect(resolveLaunchIpfsImageUrl(`https://ipfs.io/ipfs/ipfs/${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
  })

  it('is idempotent — a url already on the CDN is left alone', () => {
    expect(resolveLaunchIpfsImageUrl(`${CDN}${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
    expect(resolveLaunchIpfsImageUrl(`https://pools.xyz/ipfs/${CID_V1}`)).toBe(`https://pools.xyz/ipfs/${CID_V1}`)
    expect(resolveLaunchIpfsImageUrl(resolveLaunchIpfsImageUrl(`ipfs://${CID_V1_DIR}/logo.png`))).toBe(
      `${CDN}${CID_V1_DIR}/logo.png`,
    )
  })

  it("re-points a logo baked against the CDN's older pools.trade name onto the canonical host", () => {
    expect(resolveLaunchIpfsImageUrl(`https://ipfs.pools.trade/ipfs/${CID_V1}`)).toBe(`${CDN}${CID_V1}`)
  })

  it('does not re-point ipns, which the CDN does not serve', () => {
    expect(resolveLaunchIpfsImageUrl('https://ipfs.io/ipns/example.com/logo.png')).toBe(
      'https://ipfs.io/ipns/example.com/logo.png',
    )
    expect(resolveLaunchIpfsImageUrl('ipns://example.com/logo.png')).toBe('ipns://example.com/logo.png')
  })

  it('leaves a url alone when the CID does not validate', () => {
    expect(resolveLaunchIpfsImageUrl('ipfs://bafytest')).toBe('ipfs://bafytest')
    expect(resolveLaunchIpfsImageUrl('ipfs://https://pbs.twimg.com/media/abc.jpg')).toBe(
      'ipfs://https://pbs.twimg.com/media/abc.jpg',
    )
    expect(resolveLaunchIpfsImageUrl('https://ipfs.io/ipfs/not-a-cid.png')).toBe('https://ipfs.io/ipfs/not-a-cid.png')
    expect(resolveLaunchIpfsImageUrl('https://ipfs.io/ipfs/')).toBe('https://ipfs.io/ipfs/')
  })

  it('still re-points a base32 CID one character short, which shape alone cannot catch', () => {
    // The shared shape has no upper length bound, so a truncated `baf…` is indistinguishable from
    // a longer hash function's CID. Left un-special-cased on purpose: tightening past what
    // ingestion accepts would reject CIDs the pinning side considers valid, and the cost of
    // being wrong here is the CDN 404 that the image fallback already covers.
    const oneCharShort = CID_V1.slice(0, -1)
    expect(resolveLaunchIpfsImageUrl(`ipfs://${oneCharShort}`)).toBe(`${CDN}${oneCharShort}`)
  })

  it('does not match a CID that only appears in a filename or a wrapped query param', () => {
    const coingecko = `https://assets.coingecko.com/coins/images/15144/large/${CID_V1_DIR}.ipfs.infura-ipfs.io.png?1622176770`
    expect(resolveLaunchIpfsImageUrl(coingecko)).toBe(coingecko)
    const wrapped = `https://wsrv.nl/?url=https%3A%2F%2Fipfs.io%2Fipfs%2F${CID_V1}`
    expect(resolveLaunchIpfsImageUrl(wrapped)).toBe(wrapped)
    const proxied = `https://image.solanatracker.io/proxy?url=https%3A%2F%2Fipfs.io%2Fipfs%2F${CID_V1}`
    expect(resolveLaunchIpfsImageUrl(proxied)).toBe(proxied)
  })

  it('leaves other non-ipfs logo sources alone', () => {
    expect(resolveLaunchIpfsImageUrl('https://arweave.net/abc123')).toBe('https://arweave.net/abc123')
    expect(resolveLaunchIpfsImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(resolveLaunchIpfsImageUrl('blob:https://app.uniswap.org/abc-123')).toBe(
      'blob:https://app.uniswap.org/abc-123',
    )
    expect(resolveLaunchIpfsImageUrl('not a url')).toBe('not a url')
  })

  it('passes the empty string through unchanged', () => {
    expect(resolveLaunchIpfsImageUrl('')).toBe('')
  })

  it('passes undefined through for logo-less entries', () => {
    expect(resolveLaunchIpfsImageUrl(undefined)).toBeUndefined()
  })
})
