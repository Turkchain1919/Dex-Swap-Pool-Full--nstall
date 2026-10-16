// Exercises the wired position OG path (metaTagInjector → getPosition → liquidity GetPosition) end
// to end against the fixture server, so a regression that drops back to the default meta tags fails
// here rather than passing silently. Mirrors explore/pools/pool.test.ts for /positions/:v/:chain/:id.
export {}

function extractInjectedMetaTags(body: string): string {
  return (body.match(/<meta[^>]*data-rh="true"[^>]*>/g) ?? []).join('\n')
}

const positions = [
  { version: 'v3', network: 'ethereum', tokenId: '40001', name: 'WBTC/WETH' },
  { version: 'v4', network: 'ethereum', tokenId: '40002', name: 'DAI/USDC' },
]

test.each(positions)('should inject metadata for valid positions', async (position) => {
  const url = `http://localhost:3000/positions/${position.version}/${position.network}/${position.tokenId}`
  const image = `http://localhost:3000/api/image/positions/${position.version}/${position.network}/${position.tokenId}`
  const body = await fetch(new Request(url)).then((res) => res.text())

  expect(body).toContain(`<meta property="og:title" content="${position.name} on Uniswap" data-rh="true">`)
  expect(body).toContain(`<meta property="og:image" content="${image}" data-rh="true">`)
  expect(body).toContain(`<meta property="og:image:width" content="1200" data-rh="true">`)
  expect(body).toContain(`<meta property="og:image:height" content="630" data-rh="true">`)
  expect(body).toContain(`<meta property="og:image:alt" content="${position.name} on Uniswap" data-rh="true">`)
  expect(body).toContain(`<meta property="og:type" content="website" data-rh="true">`)
  expect(body).toContain(`<meta property="og:url" content="${url}" data-rh="true">`)
  expect(body).toContain(`<meta property="twitter:card" content="summary_large_image" data-rh="true">`)
  expect(body).toContain(`<meta property="twitter:title" content="${position.name} on Uniswap" data-rh="true">`)
  expect(body).toContain(`<meta property="twitter:image" content="${image}" data-rh="true">`)
  // The default fallback card must not win.
  expect(body).not.toContain('<meta property="og:title" content="Uniswap Interface" data-rh="true">')
})

const invalidPositions = [
  // No fixture for this token id → empty message → getPosition returns undefined.
  'http://localhost:3000/positions/v3/ethereum/99999999',
  // Unknown chain → no chain id resolved.
  'http://localhost:3000/positions/v3/invalidnetwork/40001',
]

test.each(invalidPositions)('should not inject metadata for invalid positions', async (url) => {
  const body = await fetch(new Request(url)).then((res) => res.text())
  const injectedMetaTags = extractInjectedMetaTags(body)

  expect(injectedMetaTags).not.toContain('og:title')
  expect(injectedMetaTags).not.toContain('og:image')
  expect(injectedMetaTags).not.toContain('twitter:title')
})
