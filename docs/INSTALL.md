# TurkDex installation bundle

This package is configured for one chain per installation. The provided profile is Turkchain
Mainnet (1919); a separate deployment can use a different EVM network by changing deployment ENV,
RPC and deployed contract addresses. Protocols with missing required addresses remain disabled.

First install:
1. Copy `.env.example` to a private `.env`. Enter exactly one EVM network, its verified contracts,
   first-party API/site URLs, and server-only secrets privately. See `INSTALL_REQUIREMENTS.md`.
2. Run `./scripts/install.sh --env=/absolute/path/.env --validate-only`. It checks configured chain
   ID against `eth_chainId` and bytecode for each configured protocol address, without writing to
   chain.
3. Run `./scripts/install.sh --env=/absolute/path/.env` to install from frozen lockfiles, run API
   tests, and build. This archive currently stops before installation because the pinned public
   interface source is missing its required Nx workspace. Do not bypass that check.
4. After the source/build and TurkDex first-party service integration blockers are resolved,
   deployment automation must configure the host service manager and reverse proxy, smoke-test, and
   atomically activate the new release with rollback retained.

The archive contains no production secrets or `.env` files. It never deploys contracts or submits
user transactions. It does not activate Nginx/systemd because those are host-specific.

Set DEX_NAME=TurkDex and DEX_X_NAME=TurkDexX. Documentation, social, support, legal and logo URLs
are ENV values; blanks remain absent, never substituted with Uniswap URLs. Protocol package and ABI
names remain upstream technical identifiers.

Each install uses one CHAIN_ID, one native currency, one RPC and one contract registry. The live
TurkDex deployment is Turkchain 1919 only. Alternate-chain ENV profiles are for separate installs,
not a multichain selector inside TurkDex.
