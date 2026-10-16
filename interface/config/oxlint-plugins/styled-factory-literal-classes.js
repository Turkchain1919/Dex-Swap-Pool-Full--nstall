/**
 * universe-custom/styled-factory-literal-classes — registered by
 * universe-custom.js; colocated tests in
 * styled-factory-literal-classes.test.ts drive the real oxlint binary over
 * fixtures.
 *
 * Rejects TemplateLiteral nodes in the mycelium styled() factory's class
 * positions: `base`, every `variants` branch, `compoundVariants[].class`, and
 * `hover[].class`.
 *
 * Why a SYNTAX rule and not the type guard: both platform bundles are
 * produced by the static oxide scanner (web CSS emission; uniwind's
 * build-time native stylesheet map — a class it never saw is a silent MISS on
 * device). The factory's `LiteralClass` type guard rejects `string` and holed
 * template types, but a template literal interpolating a `const`
 * (`` `${BASE} p-1` ``) resolves to a finite literal TYPE while its SOURCE
 * text is not the class — the scanner sees the template text, never the
 * joined class list. No type guard can close that case; this rule closes it
 * syntactically.
 *
 * The recommended conversion shape hoists the class tables to same-module
 * consts (`variants: FRAME_VARIANTS`), so the rule follows same-module
 * `Identifier` values to their module-scope initializers (through `as const`
 * and friends) and inspects the resolved literal. A value it cannot resolve
 * statically — an imported table, a call result, computed classes — is
 * reported as unverifiable: fail closed rather than lint clean on the one
 * shape the rule never saw.
 */

const STYLED_FACTORY_IMPORT_SOURCE_RE = /(^@universe\/mycelium\/styled$|\/mycelium\/src\/styled(\/index|\/styled)?$)/
/** Inside packages/mycelium/src the factory is imported relatively (`./styled`, `../styled/styled`). */
const MYCELIUM_INTERNAL_IMPORT_SOURCE_RE = /(^|\/)styled(\/index|\/styled)?$/

const __styledFactoryPluginDir = new URL('.', import.meta.url).pathname
const STYLED_FACTORY_REPO_ROOT = __styledFactoryPluginDir.split('\\').join('/').replace(/config\/oxlint-plugins\/$/, '')

/**
 * The styled-factory parity fixtures compile their class universes explicitly
 * (collectStyledClasses → the harness's own Tailwind compile), so they never
 * depend on the app scanners seeing their source text — template literals
 * over the verbatim compat BASE_CLASSES constants are deliberate there.
 * Everything that ships through an app bundle stays covered by the rule.
 *
 * CAVEAT: this is a whole-subtree exemption — ANY file added under the prefix
 * silently inherits it, with no per-file marker. That is acceptable only
 * because the subtree is the parity harness itself: nothing under it ships in
 * an app bundle, and every fixture's class universe is force-compiled by the
 * gates regardless of what the scanners saw. Do not add app or package source
 * under this prefix, and do not widen the list without the same property.
 */
const STYLED_FACTORY_EXEMPT_PREFIXES = ['packages/tailwind/src/parity/styled-factory/']

const CLASS_POSITIONS_MESSAGE =
  'Template literals are banned in styled() class positions (base / variants / compoundVariants[].class / hover[].class): ' +
  'the oxide scanner reads SOURCE TEXT, so an interpolated class list never reaches the web CSS or the native stylesheet map ' +
  'even when its TYPE is a finite literal. Write the classes as one plain string literal.'

const UNVERIFIABLE_MESSAGE =
  'Unverifiable value in styled() class positions (base / variants / compoundVariants / hover): ' +
  'only inline literals and same-module `const` initializers can be statically inspected, and the oxide scanner ' +
  'must see every class string in source for it to resolve on web CSS and the native stylesheet map. ' +
  'Write the value inline or hoist it to a same-module const literal.'

/** Wrapper nodes that carry the value through unchanged (`as const`, parens, `!`). */
const TRANSPARENT_WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSTypeAssertion',
  'ParenthesizedExpression',
  'ChainExpression',
])

function styledPropertyKeyName(node) {
  return node.key.type === 'Literal' && typeof node.key.value === 'string'
    ? node.key.value
    : node.key.type === 'Identifier'
      ? node.key.name
      : undefined
}

const styledFactoryLiteralClasses = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow TemplateLiteral nodes in mycelium styled() class positions (base, variants branches, compoundVariants[].class, hover[].class) — the oxide scanner cannot see through interpolation. Same-module const tables are resolved and inspected; values the rule cannot resolve statically are reported as unverifiable.',
    },
    schema: [],
    messages: {
      templateClass: CLASS_POSITIONS_MESSAGE,
      unverifiableClass: UNVERIFIABLE_MESSAGE,
    },
  },
  create(context) {
    const fn = context.filename ?? context.getFilename?.()
    const physicalPath = typeof fn === 'string' ? fn.split('\\').join('/') : ''
    const relPath = physicalPath.startsWith(STYLED_FACTORY_REPO_ROOT)
      ? physicalPath.slice(STYLED_FACTORY_REPO_ROOT.length)
      : physicalPath
    if (STYLED_FACTORY_EXEMPT_PREFIXES.some((prefix) => relPath.startsWith(prefix))) {
      return {}
    }

    const styledLocalNames = new Set()
    /** Module-scope `const NAME = <init>` initializers, by name (exported or not). */
    const moduleInitializers = new Map()

    /**
     * Follow a class-position value to the literal node the scanner would
     * have to see: unwraps `as const`-style wrappers and same-module
     * identifier references (the hoisted-table shape every conversion uses).
     * Returns undefined when the value does not bottom out at a same-module
     * node — imported, computed, or shadowed — i.e. statically unverifiable.
     */
    function resolveValue(node) {
      let current = node
      const seenNames = new Set()
      while (current !== null && current !== undefined) {
        if (TRANSPARENT_WRAPPERS.has(current.type)) {
          current = current.expression
          continue
        }
        if (current.type === 'Identifier') {
          if (current.name === 'undefined') {
            return current
          }
          if (seenNames.has(current.name) || !moduleInitializers.has(current.name)) {
            return undefined
          }
          seenNames.add(current.name)
          current = moduleInitializers.get(current.name)
          continue
        }
        return current
      }
      return undefined
    }

    function reportUnverifiable(node) {
      context.report({ node, messageId: 'unverifiableClass' })
    }

    /** A single class-string position: literal ok, template banned, anything else unverifiable. */
    function checkClassValue(valueNode) {
      const resolved = resolveValue(valueNode)
      if (resolved === undefined) {
        reportUnverifiable(valueNode)
        return
      }
      if (resolved.type === 'TemplateLiteral') {
        context.report({ node: resolved, messageId: 'templateClass' })
        return
      }
      if (resolved.type !== 'Literal' && resolved.name !== 'undefined') {
        // Concatenations, conditionals, call results: the scanner sees none
        // of them as a class list.
        reportUnverifiable(valueNode)
      }
    }

    function checkRuleArray(arrayNode) {
      const resolvedArray = resolveValue(arrayNode)
      if (resolvedArray === undefined || resolvedArray.type !== 'ArrayExpression') {
        reportUnverifiable(arrayNode)
        return
      }
      for (const element of resolvedArray.elements) {
        if (element === null) {
          continue
        }
        const resolvedElement = resolveValue(element)
        if (resolvedElement === undefined || resolvedElement.type !== 'ObjectExpression') {
          reportUnverifiable(element)
          continue
        }
        for (const property of resolvedElement.properties) {
          if (property.type === 'Property' && styledPropertyKeyName(property) === 'class') {
            checkClassValue(property.value)
          }
        }
      }
    }

    function checkVariantsTable(tableNode) {
      const resolvedTable = resolveValue(tableNode)
      if (resolvedTable === undefined || resolvedTable.type !== 'ObjectExpression') {
        reportUnverifiable(tableNode)
        return
      }
      for (const group of resolvedTable.properties) {
        if (group.type !== 'Property') {
          // A spread inside the table hides its branches from this walk.
          reportUnverifiable(group)
          continue
        }
        const resolvedGroup = resolveValue(group.value)
        if (resolvedGroup === undefined || resolvedGroup.type !== 'ObjectExpression') {
          reportUnverifiable(group.value)
          continue
        }
        for (const branch of resolvedGroup.properties) {
          if (branch.type === 'Property') {
            checkClassValue(branch.value)
          } else {
            reportUnverifiable(branch)
          }
        }
      }
    }

    return {
      Program(node) {
        // Collected up front (the Program node visits first) so a styled()
        // call above its hoisted table still resolves it.
        for (const statement of node.body) {
          const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
          if (declaration?.type !== 'VariableDeclaration') {
            continue
          }
          for (const declarator of declaration.declarations) {
            if (declarator.id.type === 'Identifier' && declarator.init != null) {
              moduleInitializers.set(declarator.id.name, declarator.init)
            }
          }
        }
      },
      ImportDeclaration(node) {
        const source = node.source.value
        if (typeof source !== 'string') {
          return
        }
        const isFactorySource =
          STYLED_FACTORY_IMPORT_SOURCE_RE.test(source) ||
          // Relative internal imports only count inside the factory's own package.
          (relPath.startsWith('packages/mycelium/src/') &&
            source.startsWith('.') &&
            MYCELIUM_INTERNAL_IMPORT_SOURCE_RE.test(source))
        if (!isFactorySource) {
          return
        }
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') {
            continue
          }
          const importedName =
            specifier.imported?.type === 'Identifier' ? specifier.imported.name : specifier.imported?.value
          if (importedName === 'styled') {
            styledLocalNames.add(specifier.local.name)
          }
        }
      },
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !styledLocalNames.has(node.callee.name)) {
          return
        }
        const configArgument = node.arguments[1]
        if (configArgument === undefined) {
          return
        }
        const config = resolveValue(configArgument)
        if (config === undefined || config.type !== 'ObjectExpression') {
          reportUnverifiable(configArgument)
          return
        }
        for (const property of config.properties) {
          if (property.type !== 'Property') {
            continue
          }
          const key = styledPropertyKeyName(property)
          if (key === 'base') {
            checkClassValue(property.value)
          } else if (key === 'variants') {
            checkVariantsTable(property.value)
          } else if (key === 'compoundVariants' || key === 'hover') {
            checkRuleArray(property.value)
          }
        }
      },
    }
  },
}

export default styledFactoryLiteralClasses
