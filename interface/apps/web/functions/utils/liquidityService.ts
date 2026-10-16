// The uniswap.liquidity.v2.LiquidityService, the same source the in-app Pool Details Page reads.
// Unlike the data-api (fronted by a keyless gateway), it's only reachable at its direct backend
// host with the trading-API key. That key is baked into the bundle at build time from the build env
// (the same value the in-app trading client uses via `config.tradingApiKey`) — read under both env
// names the config accepts. If the SSR build ever resolves env at runtime instead, the key must be
// present in that runtime env. Absent a key, the backend rejects the read and `liquidityServicePost`
// returns undefined, degrading the OG surface to the default meta tags rather than erroring.
const PROD_LIQUIDITY_BASE_URL = 'https://liquidity.backend-prod.api.uniswap.org'
const TRADING_API_KEY = process.env.TRADING_API_KEY ?? process.env.REACT_APP_TRADING_API_KEY

// Overridable so the cloud-function tests replay canned responses from the local fixture server,
// but the override is gated to a loopback host: it's the base the x-api-key is sent to, so an
// arbitrary override host would exfiltrate the key. Mirrors the loopback guard in globalSetup.ts.
function resolveBaseUrl(): string {
  const override = process.env.CLOUD_FUNCTIONS_LIQUIDITY_ENDPOINT_OVERRIDE
  if (override) {
    try {
      const { hostname } = new URL(override)
      if (hostname === '127.0.0.1' || hostname === 'localhost') {
        return override
      }
    } catch {
      // fall through to the prod backend on a malformed override
    }
  }
  return PROD_LIQUIDITY_BASE_URL
}

const LIQUIDITY_BASE_URL = resolveBaseUrl()

// Shared response shape: the liquidity service returns token metadata (symbol + logo) on both pool
// and position reads. Kept next to the transport so getPool.ts and getPosition.ts don't redeclare
// it and drift.
export interface LiquidityTokenMetadata {
  symbol?: string
  logoUrl?: string
}

/**
 * Formats a liquidity fee tier for the OG card. A dynamic-fee pool's fee is a flag, not a rate, so
 * those read "Dynamic"; V2 has a fixed 0.30% and the backend may omit the zero-valued field, so the
 * default is gated to V2 rather than applied to any absent fee.
 */
export function formatLiquidityFeeTier({
  feeTier,
  isDynamicFee,
  isV2,
}: {
  feeTier?: number
  isDynamicFee?: boolean
  isV2?: boolean
}): string | undefined {
  if (isDynamicFee) {
    return 'Dynamic'
  }
  if (feeTier) {
    return `${feeTier / 10_000}%`
  }
  return isV2 ? '0.3%' : undefined
}

/**
 * Connect-over-HTTP unary call to the liquidity v2 service, JSON codec — the response body is the
 * bare message. A non-2xx status or a thrown error collapses to undefined so a missing pool/position
 * degrades to the default meta tags rather than a 500 — but both are logged, so a fleet-wide auth
 * failure (missing/rejected key → 401 on every request) is distinguishable from a real "not found".
 */
export async function liquidityServicePost<T>(method: string, body: object): Promise<T | undefined> {
  try {
    const response = await fetch(`${LIQUIDITY_BASE_URL}/uniswap.liquidity.v2.LiquidityService/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Connect-Protocol-Version': '1',
        ...(TRADING_API_KEY ? { 'x-api-key': TRADING_API_KEY } : {}),
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      console.error(`[liquidityService] ${method} failed with status ${response.status}`)
      return undefined
    }
    return (await response.json()) as T
  } catch (error) {
    console.error(`[liquidityService] ${method} request errored`, error)
    return undefined
  }
}
