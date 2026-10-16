/**
 * Resolves an `ipfs://<cid>` launch image — a launchpad's registry logo, or a launched token's
 * own logo — to a fetchable https URL through the org's IPFS CDN.
 *
 * Why not the shared `uriToHttpUrls` ipfs.io resolution: it is a single point of failure on a
 * third-party public gateway, for content WE pin. `uriToHttpUrls` returns a candidate list, but
 * the shared `UniversalImage` consumes only `[0]` — so in practice the main app has exactly one
 * gateway, ipfs.io, with no fallback, for every `ipfs://` launch logo — and per the sampled split
 * below, the large majority of launch logos are IPFS pins. The listed hardbin.com fallback is
 * never reached.
 *
 * ipfs.io has previously served a Cross-Origin-Resource-Policy header that blocks hotlinked
 * `<img>` loads from app.uniswap.org (ERR_BLOCKED_BY_RESPONSE.NotSameOrigin) — that is what
 * latched every launchpad logo onto its color fallback and prompted this resolver in the first
 * place. It is not doing so today (re-measured: 20/20 launch CIDs load fine from ipfs.io), so
 * this is hardening against a recurrence, not a fix for a live breakage.
 *
 * Resolve through the org's IPFS CDN instead — CloudFront in front of the dedicated Pinata
 * gateway holding these pins (backend `rh-cca` infra, which points universe at this host). It
 * serves `/ipfs/<cid>` with `Access-Control-Allow-Origin: *`, no CORP, and immutable 1-year
 * caching, so cross-origin `<img>` embeds work. The dedicated gateway itself
 * (token-launcher-uniswap.mypinata.cloud) is restricted and 401s without the token the CDN
 * injects at its origin, so it must not be hotlinked directly.
 *
 * Scoped to launch surfaces on purpose: the CDN fronts the launcher's own pins, so it is the
 * right gateway for these CIDs specifically and NOT a general replacement for `uriToHttpUrls`,
 * which resolves arbitrary IPFS content across the wallet.
 *
 * Launch metadata also carries logos already baked against a public gateway rather than as a raw
 * `ipfs://` uri. Both forms, measured over the same population — of the `ListLaunches` token
 * logos on chain 4663, ~80% are `https://ipfs.io/ipfs/<cid>` and ~13% are raw `ipfs://`, so the
 * large majority are IPFS pins and most are already pointed at ipfs.io. Same first-party pin,
 * same third-party dependency, so those are re-pointed too.
 *
 * The gateway host is matched structurally, not against a list: the tail is dozens of
 * `*.mypinata.cloud` tenants and vanity gateways, so any enumerated list goes stale on the next
 * tenant. What makes a host-agnostic rewrite safe is that `/ipfs/<cid>` is content-addressed —
 * the same CID names the same bytes on any gateway — and that the CID itself is validated, so a
 * path that merely looks like a gateway url cannot redirect a logo onto arbitrary CDN content.
 *
 * Content-addressing settles only WHICH bytes a CID names, not that this gateway has them, so the
 * rewrite rests on a second premise: the CDN resolves CIDs it does not itself pin (verified
 * against the deployed gateway when this was written). That is what lets a logo baked against an
 * unrelated gateway — `hardbin.com`, a vanity host — be re-pointed here at all. If it ever stops
 * holding, the rewritten url 404s and, since `UniversalImage` consumes only the first candidate,
 * there is no second gateway behind it.
 *
 * Non-ipfs values (arweave, coingecko, `data:`/`blob:`, undefined/empty for logo-less entries)
 * and values whose CID does not validate pass through unchanged — an unresolvable `ipfs://` is
 * left for the shared `uriToHttpUrls` to attempt rather than turned into a broken CDN url.
 */
const LAUNCH_IPFS_GATEWAY_PREFIX = 'https://ipfs.pools.xyz/ipfs/'
const IPFS_PATH_PREFIX = '/ipfs/'

/**
 * The CID shape data-ingestion's `LaunchpadImageResolver` validates against, kept identical so
 * client and server agree on what counts as a CID: CIDv0 base58 (`Qm…`) or CIDv1 lowercase base32
 * (`baf…`), with an optional sub-path. It is what keeps a host-agnostic rewrite safe — whole http
 * urls pasted after the `ipfs://` scheme and filenames that merely contain a CID are rejected by
 * it. Note it has no upper length bound, so it does not catch a base32 CID a character short;
 * matching ingestion is worth more than catching that, which surfaces as a CDN 404.
 *
 * The sub-path is asserted with a lookahead instead of consumed: a quantified group wrapping `.*`
 * reads as nested repetition to the ReDoS linter, and no caller needs the tail captured.
 */
const IPFS_CID_WITH_OPTIONAL_PATH_REGEX = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z2-7]{50,})(?=$|\/)/

/**
 * Mirrors the ipfs match in `uriToHttpUrls`: tolerates `ipfs://<cid>` and `ipfs://ipfs/<cid>`, and
 * splits the query and fragment off the CID so they survive validation and the rewrite. `[^?#]*`
 * already stops at the first `?`/`#`, so the trailing capture is either empty or starts with one of
 * them — expressing it that way keeps a second quantified group out of the pattern.
 */
const IPFS_URI_REGEX = /^ipfs:(?:\/\/)?(?:ipfs\/)?([^?#]*)([\s\S]*)$/i

// Already canonical: re-pointing would be a no-op, so matching keeps the rewrite exactly idempotent
// across every host the CDN is served on. Only the pools.xyz family — a logo baked against the CDN's
// older pools.trade name is re-pointed onto the canonical host rather than left on the old one.
function isOwnGatewayHost(hostname: string): boolean {
  return hostname === 'pools.xyz' || hostname.endsWith('.pools.xyz')
}

function ipfsPathFromGatewayUrl(url: URL): string | undefined {
  if (url.pathname.startsWith(IPFS_PATH_PREFIX)) {
    // `/ipfs/ipfs/<cid>` occurs in real rows; without this the CID would be the literal `ipfs`.
    const ipfsPath = url.pathname.slice(IPFS_PATH_PREFIX.length).replace(/^ipfs\//, '')
    return IPFS_CID_WITH_OPTIONAL_PATH_REGEX.test(ipfsPath) ? ipfsPath : undefined
  }
  // Subdomain gateways (`https://<cid>.ipfs.dweb.link/…`) address the same content. The hostname
  // is lower-cased by URL parsing, so only base32 CIDv1 can match here — which is the only form
  // subdomain gateways serve, DNS labels being case-insensitive.
  const subdomainCid = url.hostname.match(/^([^.]+)\.ipfs\..+$/)?.[1]
  if (subdomainCid === undefined || !IPFS_CID_WITH_OPTIONAL_PATH_REGEX.test(subdomainCid)) {
    return undefined
  }
  return url.pathname === '/' ? subdomainCid : `${subdomainCid}${url.pathname}`
}

/**
 * Re-points an already-baked gateway url at the CDN, preserving the sub-path, query and fragment
 * after the CID verbatim — signed and sizing params (`?filename=`, `?img-width=`) are part of how
 * some logos resolve, and dropping them silently truncates the url.
 *
 * Anything that is not a gateway `/ipfs/` url is returned untouched: `/ipns/` (which the CDN's
 * CloudFront Function rejects, since it only serves `/ipfs/*`), proxy wrappers carrying an
 * encoded ipfs url in a query param, and files whose *name* happens to contain a CID.
 */
function rewriteBakedIpfsGatewayUrl(uri: string | undefined): string | undefined {
  if (!uri) {
    return uri
  }
  let url: URL
  try {
    url = new URL(uri)
  } catch {
    return uri
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || isOwnGatewayHost(url.hostname)) {
    return uri
  }
  const ipfsPath = ipfsPathFromGatewayUrl(url)
  return ipfsPath === undefined ? uri : `${LAUNCH_IPFS_GATEWAY_PREFIX}${ipfsPath}${url.search}${url.hash}`
}

export function resolveLaunchIpfsImageUrl(uri: string | undefined): string | undefined {
  const ipfsMatch = uri?.match(IPFS_URI_REGEX)
  if (!ipfsMatch) {
    return rewriteBakedIpfsGatewayUrl(uri)
  }
  const [, cid, queryAndFragment = ''] = ipfsMatch
  if (!cid) {
    return rewriteBakedIpfsGatewayUrl(uri)
  }
  // The capture is creator-supplied, so dot segments would walk off the `/ipfs/`
  // route once the browser normalizes the URL — `ipfs://../../x` becomes
  // `https://ipfs.pools.xyz/x`. Same origin, so nothing is reachable that a
  // plain fetch of that host could not already reach, but a launch image has no
  // business addressing anything outside `/ipfs/`. Directory forms
  // (`ipfs://<dirCid>/logo.png`) are unaffected — only `.`/`..` are rejected.
  if (cid.split('/').some((segment) => segment === '.' || segment === '..')) {
    return undefined
  }
  if (!IPFS_CID_WITH_OPTIONAL_PATH_REGEX.test(cid)) {
    return uri
  }
  // The check above only sees segments already spelled `.`/`..`. WHATWG normalization also folds
  // `%2e%2e`, `.%2e`, `%2e.` and — for special schemes — `\` into dot segments, so
  // `ipfs://<cid>/%2e%2e/%2e%2e/x` would land off `/ipfs/`, on `https://ipfs.pools.xyz/x`. Two
  // such segments are needed: the first only cancels the CID (`/ipfs/<cid>/%2e%2e/x` normalizes to
  // `/ipfs/x`, still on the route, and a CID the gateway 404s). Re-checking the route on the parsed
  // url holds the invariant by construction, the same way the baked-gateway branch above does.
  const resolved = new URL(`${LAUNCH_IPFS_GATEWAY_PREFIX}${cid}${queryAndFragment}`)
  return resolved.pathname.startsWith(IPFS_PATH_PREFIX) ? resolved.href : undefined
}
