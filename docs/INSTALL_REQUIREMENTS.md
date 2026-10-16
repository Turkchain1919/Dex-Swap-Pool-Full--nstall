# First-install requirements and verified blockers

This file is part of the installation contract. Keep it current whenever a clean install
discovers a new requirement. `scripts/install.sh` validates the selected single-chain profile
before it installs packages or builds anything.

## Runtime and build tools

- Node.js **22.22.2** (the public `apps/web` package pins this exact engine).
- Bun **1.3.14 or later**; dependency installation must use the committed lockfiles with
  `--frozen-lockfile`.
- A POSIX shell, `awk`, `sort -V`, `head`, `curl`/HTTPS-capable Node fetch, and outbound HTTPS to
  the configured RPC/API/package registries.
- Enough free disk for source, Bun cache, install tree, test outputs, and production build. The
  deployment host must check available disk before installing; do not prune current/rollback
  releases to make a build fit.

## Required first-install ENV

Copy `.env.example` to a private `.env` and provide one network profile per installation:

- `CHAIN_NAME`, decimal `CHAIN_ID`, matching `CHAIN_ID_HEX`.
- Native currency name/symbol/decimals, gas unit label, HTTP RPC; optional WSS/fallback RPC only
  when those endpoints have been verified.
- Block explorer, DEX public URL/name, DEX API base URL and only API paths that exist on that API.
- Addresses for deployed protocol contracts. Empty optional addresses disable only their feature;
  zero addresses and guessed addresses are rejected.
- Private API/database/cache/auth secrets only in server-side environment configuration. Never
  put secrets in `VITE_*` variables or this archive.
- Branding, logo, documentation, support, legal, status, and social URLs. Blank optional links
  stay absent; they are never replaced with Uniswap URLs.

The test profile is an independent, read-only setup. Do not point it at production write-capable
database/cache credentials. The provided Turkchain profile uses Chain ID 1919 and a public RPC;
alternate EVM chains require their own RPC, verified deployed contracts, API, explorer, and tested
protocol capabilities. Changing a chain ID alone does not deploy or make contracts compatible.

## Verified source/build blocker for this archive

The pinned public source is `Uniswap/interface` release `web/5.166.0` at commit
`6f54d9a474a6036e7043ed52f2a9359003c96c9c`. Its root workspace and lockfile refer to
`tools/uniswap-nx`, and `nx.json` configures generators from `@universe/uniswap-nx`, but this
directory is absent from the public release checkout. A clean frozen Bun install reports
`Workspace not found tools/uniswap-nx`. The installer intentionally refuses to invent a package
or continue to a build/deployment.

Before enabling normal installation, provide a licensed, source-matched copy of that Nx workspace
or a verified upstream release that includes it, then run clean frozen install, Nx generation,
TypeScript, web production build, and browser smoke tests. A fabricated empty workspace is not an
acceptable substitute because the root scripts invoke its generators.

## TurkDex service integration still required before production

The public web source has Uniswap-specific gateway, GraphQL, stats/telemetry, token metadata,
chart, and wallet-product integrations. TurkDex requires first-party equivalents or explicit
feature removal, and network inspection must confirm no requests to Uniswap-owned data/service
hosts. Existing TurkDex API routes are documented in `.env.example`; optional price, analytics,
and logo APIs remain blank because no verified first-party endpoints were established for them.

The pinned `apps/web/src/config.ts` also has production-schema requirements for
`statsigApiKey`, `tradingApiKey`, and `uniswapApiKey`, and currently validates Uniswap gateway and
GraphQL endpoint fields. Do **not** satisfy these with Uniswap credentials/URLs: remove those
requirements and route needed functionality through TurkDex-owned API endpoints before production.
WalletConnect's public `WALLETCONNECT_PROJECT_ID` is a separate wallet-provider requirement; get
it from the operator's WalletConnect Cloud project, or disable that connector while preserving
injected MetaMask support.

The copied API's HTTP listener/data path and websocket RPC are environment-configured, but its
contract registry and transaction authorization still require a complete centralized-config
adapter before an alternate-chain install can be considered supported. Production authorization
must remain disabled until actual route-specific allowance, calldata, `eth_call`, gas estimation,
and security checks pass.

## Validation performed for this archive

- ZIP integrity check: passed.
- Clean extraction and `--validate-only`: passed for Turkchain (`eth_chainId=1919`; configured
  contract bytecode checks passed).
- Config tests: 7/7 passed.
- Normal install: intentionally blocked by the missing official Nx workspace described above.
- No production deployment, database write, wallet approval, token transfer, or contract deployment
  is performed by the installer.
