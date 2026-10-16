TurkDex Turkchain token index

The token index is restricted to chain ID 1919. It combines bounded, resumable RPC scans from genesis, an independent near-head scanner, transfer logs, successful contract creation receipts, Blockscout ERC-20 candidates, and optional callTracer CREATE/CREATE2 results. Candidate contracts are checked independently for bytecode and ERC-20 metadata, totalSupply, and balanceOf. ERC-721 and ERC-1155 contracts are excluded. Failures for one candidate do not block others.

State is persisted in tokens.sqlite (SQLite, unique chain/address key) and an atomic tokens.json recovery snapshot under TURKDEX_DATA_DIR. Historical scan progress and canonical headers are persisted for restart/reorg recovery. /api/v1/tokens supports page/offset/limit, search/q, trusted, source, and verificationStatus filters. /api/v1/tokens/status reports scan progress. Tokens receive no automatic trust status. Native TURK is not an ERC-20 record. Prices, TVL, and volume are null when no verified market data is available.

A complete genesis scan is incremental and may take a long time on a public RPC endpoint. The near-head scan indexes newly deployed tokens independently while historical scanning continues.
