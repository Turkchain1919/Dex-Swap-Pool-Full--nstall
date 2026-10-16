const path = require('path')

/**
 * Shared vitest wiring for `@rn-primitives/*` packages (INFRA: Tamagui → rn-primitives migration).
 *
 * These packages publish raw JSX inside their `.js`/`.mjs` dist files (tsup with JSX preserved —
 * Metro transpiles node_modules, so this is normal for RN-ecosystem packages), and their CJS legs
 * reach `react-native` through runtime `require()` calls that bypass vitest alias tables. Every
 * vitest config whose module graph reaches the `ui/src` barrel therefore needs three things:
 *
 *   1. `rnPrimitivesJsxPlugin()` in `plugins` — esbuild-transforms the shipped JSX, the same way
 *      apps/web and apps/extension handle react-native-reanimated (`transform-react-native-jsx`).
 *   2. `rnPrimitivesAliases(nodeModules, leg)` merged into `resolve.alias` — points the bare
 *      specifiers at the ESM (`.mjs`) legs, whose real `import` statements go through the alias
 *      table (so `react-native` resolves to react-native-web / the harness mock), and skips the
 *      package's extensionless internal imports that node's ESM resolver rejects when the dep is
 *      externalized.
 *   3. `RN_PRIMITIVES_INLINE` added to `server.deps.inline` — the plugin and aliases only apply
 *      to deps that flow through vite.
 */

/** @returns {import('vite').Plugin} */
function rnPrimitivesJsxPlugin() {
  return {
    name: 'rn-primitives-jsx',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.includes('node_modules/@rn-primitives/') || !/\.(js|mjs)$/.test(id)) {
        return null
      }
      const { transformWithEsbuild } = await import('vite')
      const result = await transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' })
      return { code: result.code, map: null }
    },
  }
}

/**
 * @param {string} nodeModules absolute path to the workspace root node_modules
 * @param {'web' | 'native'} leg which platform leg to serve, mirroring the app bundlers:
 *   'web' = the `.web.mjs` builds (what apps/web's `.web.js`-first resolution ships),
 *   'native' = the plain `.mjs` builds (what Metro ships).
 * @returns {Record<string, string>} resolve.alias entries
 */
function rnPrimitivesAliases(nodeModules, leg) {
  const checkboxLeg = leg === 'web' ? 'checkbox.web.mjs' : 'checkbox.mjs'
  return {
    '@rn-primitives/checkbox': path.join(nodeModules, '@rn-primitives/checkbox/dist', checkboxLeg),
    // portal ships a single platform-agnostic build (no `.web.mjs` leg)
    '@rn-primitives/portal': path.join(nodeModules, '@rn-primitives/portal/dist/index.mjs'),
    '@rn-primitives/slot': path.join(nodeModules, '@rn-primitives/slot/dist/index.mjs'),
    '@rn-primitives/hooks': path.join(nodeModules, '@rn-primitives/hooks/dist/index.mjs'),
  }
}

/** For `server.deps.inline`. */
const RN_PRIMITIVES_INLINE = /@rn-primitives\//

/**
 * Single-call wiring: wrap a package's vitest config to merge in all three pieces above
 * (JSX transform plugin, ESM-leg aliases, `server.deps.inline` rule) so per-package configs
 * don't have to assemble them by hand.
 *
 * @template {import('vite').UserConfig} T
 * @param {T} config the package's own config (the `defineConfig(...)` result)
 * @param {'web' | 'native'} leg which platform leg to serve — see {@link rnPrimitivesAliases}
 * @returns {T}
 */
function withRnPrimitives(config, leg) {
  const { mergeConfig } = require('vitest/config')
  const nodeModules = path.resolve(__dirname, '../../../node_modules')
  // `inline: true` (inline everything) already covers @rn-primitives; skip the array rule so
  // mergeConfig doesn't degrade the boolean into a matcher array.
  const inlineEverything = config?.test?.server?.deps?.inline === true
  return mergeConfig(config, {
    plugins: [rnPrimitivesJsxPlugin()],
    resolve: {
      alias: rnPrimitivesAliases(nodeModules, leg),
    },
    ...(inlineEverything
      ? {}
      : {
          test: {
            server: {
              deps: {
                inline: [RN_PRIMITIVES_INLINE],
              },
            },
          },
        }),
  })
}

module.exports = { rnPrimitivesJsxPlugin, rnPrimitivesAliases, RN_PRIMITIVES_INLINE, withRnPrimitives }
