// oxlint-disable eslint-js/no-restricted-syntax -- Node-side bun preload for asset imports
/**
 * Bun preload that stubs binary asset imports (png/svg/media/fonts) so Node-side scripts
 * which transitively import app modules (e.g. `uniswap/src/constants/tokens` pulling in
 * network logos) can run under a plain `bun` loader. Without this, `bun scripts/*.ts`
 * fails at the first asset import with `Unexpected <byte>` (bun tries to parse the PNG as JS).
 *
 * Mirrors the `Module._load` asset shim in apps/web/playwright.config.ts, for the
 * scripts that don't go through Playwright (generate-anvil-state, bump-fork-blocks).
 *
 * Usage: bun --preload ./scripts/preload-stub-assets.ts scripts/<name>.ts
 */
import { plugin } from 'bun'

plugin({
  name: 'stub-binary-assets',
  setup(build) {
    build.onLoad({ filter: /\.(png|svg|jpg|jpeg|gif|webp|mp4|webm|ttf|otf|woff2?)$/ }, (args) => ({
      exports: { default: args.path },
      loader: 'object',
    }))
  },
})
