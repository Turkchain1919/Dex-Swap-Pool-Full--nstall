/**
 * universe-custom/no-throwing-stub-imports — extracted into its own module
 * (rule + manifest loader). Registered by universe-custom.js; colocated
 * tests in no-throwing-stub-imports.test.ts drive the real oxlint binary
 * over fixtures.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Bans importing a @universe/mycelium entry point whose implementation for
// this file's platform reachability throws by design (or is missing). Such an
// import builds, typechecks, and lints green, then throws at render time in
// the wrong platform's bundle — the 2026-08-12 /positions crash (INFRA-3517).
//
// The per-entry-point leg statuses come from the platform-leg manifest,
// packages/mycelium/platform-legs.json. Which platform applies to a file
// comes from per-project overrides in oxlint.config.ts:
//   { platform: 'web' }    — web-bundled projects (apps/web, apps/extension,
//                            apps/dev-portal, apps/mission-control)
//   { platform: 'native' } — native-only projects (apps/mobile)
//   { platform: 'both' }   — dual-bundled shared packages that ship in the
//                            web AND native bundles (packages/uniswap,
//                            packages/wallet, packages/ui, packages/tailwind):
//                            non-suffixed files must import entries whose
//                            legs are real on both platforms
//
// Platform-suffixed files get exactly their own platform's check: a
// `.web.tsx` leg is only ever resolved by web bundlers (so it is exempt from
// the native check but still checked against web legs), and
// `.native/.ios/.android` legs never reach a web bundle (checked against
// native legs only). The suffix is detected as a dot-separated filename
// segment (not an end anchor), so `Foo.native.test.tsx` is still recognized
// as a native leg — an end-anchored `\.native\.tsx$` regex would miss it,
// since `.test` sits between the platform segment and the extension.
//
// Type-only imports are erased at compile time and never checked. A
// namespace import (`import * as M from '@universe/mycelium'`), `export *`,
// or a dynamic `import()` gives the caller access to every named export
// without any specifier this rule can inspect, so those forms are checked
// against ALL of an entry's namedExports conservatively — the same "erring
// toward the false positive an author reads a note and fixes" bias applies
// to bare `import { X }`. Without this, `import * as M from
// '@universe/mycelium'` used as `<M.Unicon />` in native-reachable code would
// import a throwing native leg (INFRA-3516) with zero diagnostics.
//
// Manifest resolution (MYCELIUM_PLATFORM_LEGS env var, tests only):
//   unset  → packages/mycelium/platform-legs.json
//   <path> → alternate manifest file

const __stubPluginDir = dirname(fileURLToPath(import.meta.url))

const MYCELIUM_PACKAGE = '@universe/mycelium'
const MYCELIUM_SUBPATH_PREFIX = `${MYCELIUM_PACKAGE}/`

const NATIVE_SEGMENT_NAMES = new Set(['native', 'ios', 'android'])

/**
 * Which platform a filename's leg-suffix convention declares, from
 * dot-separated segments rather than an end anchor — `Foo.native.test.tsx`
 * must read as native even though `.native.` isn't immediately before the
 * extension. `undefined` means no platform segment: `Foo.tsx`.
 */
function filePlatformSuffix(physicalPath) {
  // Drop segment 0 (the base name itself) before scanning — a file literally
  // named `web.ts` or `native.ts` has its own name equal to a platform token,
  // and that first segment is never a suffix. Everything after it (`.web`,
  // `.native`, `.test`, the extension, ...) is fair game to scan.
  const [, ...suffixSegments] = (physicalPath.split('/').pop() ?? physicalPath).split('.')
  if (suffixSegments.includes('web')) {
    return 'web'
  }
  if (suffixSegments.some((segment) => NATIVE_SEGMENT_NAMES.has(segment))) {
    return 'native'
  }
  return undefined
}

function loadPlatformLegsManifest() {
  const manifestPath =
    process.env.MYCELIUM_PLATFORM_LEGS || join(__stubPluginDir, '..', '..', 'packages/mycelium/platform-legs.json')
  // A missing, unparsable, or malformed (no `entryPoints` object) manifest
  // must fail the lint run loudly — quietly degrading to "no bans" would
  // hollow the gate out (the INFRA-3241 lesson). readFileSync/JSON.parse
  // already throw for the first two; `entryPoints ?? {}` here would have
  // silently re-introduced exactly that failure mode for the third, so throw
  // explicitly instead of defaulting.
  const { entryPoints } = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (entryPoints === undefined || entryPoints === null || typeof entryPoints !== 'object') {
    throw new Error(`${manifestPath} has no "entryPoints" object — the platform-leg gate cannot run without one.`)
  }
  return entryPoints
}

const platformLegEntryPoints = loadPlatformLegsManifest()

/** Maps an import source to its manifest entry; `./x/*` keys match by prefix. */
function manifestEntryForSource(source) {
  if (source === MYCELIUM_PACKAGE) {
    return platformLegEntryPoints['.']
  }
  if (!source.startsWith(MYCELIUM_SUBPATH_PREFIX)) {
    return undefined
  }
  const key = `./${source.slice(MYCELIUM_SUBPATH_PREFIX.length)}`
  if (platformLegEntryPoints[key]) {
    return platformLegEntryPoints[key]
  }
  for (const candidate of Object.keys(platformLegEntryPoints)) {
    if (candidate.endsWith('/*') && key.startsWith(candidate.slice(0, -1))) {
      return platformLegEntryPoints[candidate]
    }
  }
  return undefined
}

function isTypeOnlySpecifier(specifier) {
  return specifier.importKind === 'type' || specifier.exportKind === 'type'
}

/** ImportSpecifier carries `imported`; ExportSpecifier re-exports carry `local` as the name resolved against the source module. */
function specifierSourceName(specifier) {
  const nameNode = specifier.type === 'ExportSpecifier' ? specifier.local : specifier.imported
  if (!nameNode) {
    return undefined
  }
  return nameNode.type === 'Literal' ? nameNode.value : nameNode.name
}

function hasNamespaceSpecifier(specifiers) {
  return specifiers?.some((specifier) => specifier.type === 'ImportNamespaceSpecifier') ?? false
}

function formatNote(note) {
  return note ? ` ${note}` : ''
}

const noThrowingStubImports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow importing a @universe/mycelium entry point whose leg for this file's platform reachability throws by design or is missing (platform-leg manifest: packages/mycelium/platform-legs.json).",
    },
    schema: [
      {
        type: 'object',
        properties: {
          platform: { enum: ['web', 'native', 'both'] },
        },
        required: ['platform'],
        additionalProperties: false,
      },
    ],
    messages: {
      throwingLeg:
        "Wrong-platform mycelium import: the {{platform}} leg of '{{source}}' is a deliberate throwing stub. This import builds and typechecks green, then throws at render time in the {{platform}} bundle (the 2026-08-12 /positions crash — INFRA-3517).{{note}}",
      missingLeg:
        "Wrong-platform mycelium import: '{{source}}' has no {{platform}} implementation, so the bundler resolves the other platform's code into the {{platform}} bundle (INFRA-3517).{{note}}",
      throwingNamedExport:
        "Wrong-platform mycelium import: the {{platform}} leg of '{{name}}' (from '{{source}}') is a deliberate throwing stub. This import builds and typechecks green, then throws at render time in the {{platform}} bundle (INFRA-3517).{{note}}",
      missingNamedExport:
        "Wrong-platform mycelium import: '{{name}}' (from '{{source}}') has no {{platform}} implementation (INFRA-3517).{{note}}",
    },
  },
  create(context) {
    const { platform } = context.options[0] ?? {}
    if (platform !== 'web' && platform !== 'native' && platform !== 'both') {
      return {}
    }

    const fn = context.filename ?? context.getFilename?.()
    const physicalPath = typeof fn === 'string' ? fn.split('\\').join('/') : ''
    // A platform-suffixed file gets exactly its own platform's check — its
    // opposite-platform legs never reach the bundle under scrutiny. Under
    // 'both', a non-suffixed file ships in both bundles and checks both legs.
    const fileSuffix = filePlatformSuffix(physicalPath)
    let platformsToCheck
    if (fileSuffix === 'web') {
      platformsToCheck = platform === 'native' ? [] : ['web']
    } else if (fileSuffix === 'native') {
      platformsToCheck = platform === 'web' ? [] : ['native']
    } else {
      platformsToCheck = platform === 'both' ? ['web', 'native'] : [platform]
    }
    if (platformsToCheck.length === 0) {
      return {}
    }

    function checkSource({ sourceNode, specifiers, declarationKind, isWildcard }) {
      if (declarationKind === 'type') {
        return
      }
      const source = sourceNode?.value
      if (typeof source !== 'string') {
        return
      }
      const entry = manifestEntryForSource(source)
      if (!entry) {
        return
      }
      // A namespace import, `export *`, or dynamic `import()` exposes every
      // named export with no specifier list to inspect — check all of them.
      const wildcard = isWildcard || !specifiers

      for (const legPlatform of platformsToCheck) {
        const noteKey = legPlatform === 'web' ? 'webNote' : 'nativeNote'
        const status = entry[legPlatform] ?? 'real'
        if (status === 'throws' || status === 'missing') {
          // A specifier list that is entirely type-only is erased at compile
          // time; an empty list (side-effect import, export *) is a value use.
          const hasValueSpecifier =
            !specifiers || specifiers.length === 0 || specifiers.some((specifier) => !isTypeOnlySpecifier(specifier))
          if (!hasValueSpecifier) {
            continue
          }
          context.report({
            node: sourceNode,
            messageId: status === 'throws' ? 'throwingLeg' : 'missingLeg',
            data: { source, platform: legPlatform, note: formatNote(entry[noteKey]) },
          })
          continue
        }

        const namedExports = entry.namedExports
        if (!namedExports) {
          continue
        }
        if (wildcard) {
          for (const [name, named] of Object.entries(namedExports)) {
            const namedStatus = named[legPlatform] ?? 'real'
            if (namedStatus !== 'throws' && namedStatus !== 'missing') {
              continue
            }
            context.report({
              node: sourceNode,
              messageId: namedStatus === 'throws' ? 'throwingNamedExport' : 'missingNamedExport',
              data: { name, source, platform: legPlatform, note: formatNote(named[noteKey]) },
            })
          }
          continue
        }
        for (const specifier of specifiers) {
          if (isTypeOnlySpecifier(specifier)) {
            continue
          }
          const name = specifierSourceName(specifier)
          const named = name === undefined ? undefined : namedExports[name]
          if (!named) {
            continue
          }
          const namedStatus = named[legPlatform] ?? 'real'
          if (namedStatus !== 'throws' && namedStatus !== 'missing') {
            continue
          }
          context.report({
            node: specifier,
            messageId: namedStatus === 'throws' ? 'throwingNamedExport' : 'missingNamedExport',
            data: { name, source, platform: legPlatform, note: formatNote(named[noteKey]) },
          })
        }
      }
    }

    return {
      ImportDeclaration(node) {
        checkSource({
          sourceNode: node.source,
          specifiers: node.specifiers,
          declarationKind: node.importKind,
          isWildcard: hasNamespaceSpecifier(node.specifiers),
        })
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkSource({ sourceNode: node.source, specifiers: node.specifiers, declarationKind: node.exportKind })
        }
      },
      ExportAllDeclaration(node) {
        checkSource({
          sourceNode: node.source,
          specifiers: undefined,
          declarationKind: node.exportKind,
          isWildcard: true,
        })
      },
      ImportExpression(node) {
        if (node.source?.type === 'Literal') {
          checkSource({ sourceNode: node.source, specifiers: undefined, declarationKind: undefined, isWildcard: true })
        }
      },
    }
  },
}

export default noThrowingStubImports
