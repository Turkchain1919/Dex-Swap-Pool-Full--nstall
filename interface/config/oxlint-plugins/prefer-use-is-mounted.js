/**
 * universe-custom/prefer-use-is-mounted — in its own module alongside the other
 * cross-node rules; registered by universe-custom.js, with colocated tests in
 * prefer-use-is-mounted.test.ts driving the real oxlint binary over fixtures.
 */

// Flags the hand-rolled "have we mounted yet" flag — a `useState(false)` whose
// setter is called with a literal `true` as a direct statement of an empty-dep
// `useEffect` in the same function — and points at the shared
// `utilities/src/react/useIsMounted`.
//
// Deliberately narrow, because a false positive here rewrites working render
// timing. Five shapes stay silent, each standing for a real family of call
// sites in the repo:
//   - a non-`false` initial value (`useState(!isWebIOS)` defers a render on one
//     platform only, so the shared hook is not equivalent)
//   - a non-empty dependency array (a data-dependent latch, not a mount flag)
//   - a setter ever called with anything but a literal `true` (a flag that
//     resets is a latch, and replacing it would break what it gates)
//   - a setter call that is not a direct statement of the effect body, which is
//     what separates the mount gate from `setTimeout`/`requestAnimationFrame`/
//     IntersectionObserver-scheduled flags whose timing is load-bearing
//   - a setter that escapes as a value (`promise.then(setMounted)`, handed to
//     another hook, aliased into a variable), since whoever ends up holding it
//     can call it with anything and this rule cannot see that call

const MOUNT_EFFECT_CALLEES = new Set(['useEffect', 'useLayoutEffect'])

// The hook the message points at is itself the pattern, by definition. Skipping
// its module structurally beats a suppression comment there, which would have to
// name a rule that does not exist yet lower in this stack.
const HOOK_MODULE_SUFFIX = 'utilities/src/react/useIsMounted.ts'

/** Bare `useState` or `React.useState`-style member access. */
function calleeHookName(node) {
  const { callee } = node
  if (callee.type === 'Identifier') {
    return callee.name
  }
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name
  }
  return undefined
}

function isLiteral(node, value) {
  return node?.type === 'Literal' && node.value === value
}

function enclosingFunction(node) {
  let current = node.parent
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      return current
    }
    current = current.parent
  }
  return undefined
}

/**
 * The `[]`-dep mount effect whose body consists of this setter call, if any.
 * Only a direct statement counts: anything scheduled inside a callback has
 * timing the shared hook does not reproduce.
 */
function directMountEffect(setterCall) {
  const parent = setterCall.parent
  let callback
  if (parent?.type === 'ExpressionStatement' && parent.parent?.type === 'BlockStatement') {
    callback = parent.parent.parent
  } else if (parent?.type === 'ArrowFunctionExpression' && parent.body === setterCall) {
    callback = parent
  }
  if (callback?.type !== 'ArrowFunctionExpression' && callback?.type !== 'FunctionExpression') {
    return undefined
  }
  const effect = callback.parent
  if (
    effect?.type !== 'CallExpression' ||
    effect.arguments[0] !== callback ||
    !MOUNT_EFFECT_CALLEES.has(calleeHookName(effect)) ||
    effect.arguments[1]?.type !== 'ArrayExpression' ||
    effect.arguments[1].elements.length !== 0
  ) {
    return undefined
  }
  return effect
}

const preferUseIsMounted = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow hand-rolling a mount flag as useState(false) plus a mount-only useEffect; use the shared useIsMounted hook',
    },
    schema: [],
    messages: {
      preferUseIsMounted:
        'Do not hand-roll a mount flag. Use useIsMounted() from utilities/src/react/useIsMounted instead of a useState(false) plus a mount-only useEffect.',
    },
  },
  create(context) {
    const filename = (context.filename ?? context.getFilename?.() ?? '').split(/[/\\]/).join('/')
    if (filename.endsWith(HOOK_MODULE_SUFFIX)) {
      return {}
    }

    // Keyed by enclosing function so two components in one file never mix, then
    // by setter name. Disqualification is tracked per file: over-suppressing a
    // shadowed name costs a missed report, while under-suppressing costs a
    // rewrite of code whose timing matters.
    const declarations = new Map()
    const mountSetters = new Map()
    const disqualified = new Set()

    function keyFor(fn, setterName) {
      return `${fn ? fn.range?.[0] ?? fn.start : 'module'}:${setterName}`
    }

    return {
      CallExpression(node) {
        const hookName = calleeHookName(node)

        if (hookName === 'useState') {
          const declarator = node.parent
          if (
            declarator?.type !== 'VariableDeclarator' ||
            declarator.id.type !== 'ArrayPattern' ||
            declarator.init !== node ||
            node.arguments.length !== 1 ||
            !isLiteral(node.arguments[0], false)
          ) {
            return
          }
          const setter = declarator.id.elements[1]
          if (setter?.type !== 'Identifier') {
            return
          }
          declarations.set(keyFor(enclosingFunction(node), setter.name), { node, setterName: setter.name })
          return
        }

        // Setter calls. `set*` is not assumed: the binding is matched by name
        // against a recorded declaration instead.
        if (node.callee.type !== 'Identifier') {
          return
        }
        const setterName = node.callee.name
        if (node.arguments.length !== 1 || !isLiteral(node.arguments[0], true)) {
          disqualified.add(setterName)
          return
        }
        const effect = directMountEffect(node)
        if (effect) {
          // Keyed off the effect's enclosing function rather than the setter
          // call's: walking up from the call lands on the effect callback, which
          // never matches the component-level key the declaration recorded, so
          // the tempting `enclosingFunction(node)` would silently stop the rule
          // from ever reporting.
          mountSetters.set(keyFor(enclosingFunction(effect), setterName), true)
        }
      },

      // The call-argument guard above only ever sees a setter in callee
      // position. A setter that escapes as a value instead is out of this
      // rule's reach entirely — the holder can call it with anything — so any
      // reference that is not the callee of a call disqualifies the name.
      Identifier(node) {
        const parent = node.parent
        if (
          !parent ||
          // Judged by the CallExpression branch instead.
          (parent.type === 'CallExpression' && parent.callee === node) ||
          // The binding site, `const [flag, setFlag] = useState(false)`.
          parent.type === 'ArrayPattern' ||
          // A property *name* that merely collides with the setter's name
          // (`obj.setFlag`, `{ setFlag: other }`) is not a reference to it.
          (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) ||
          (parent.type === 'Property' && parent.key === node && !parent.shorthand)
        ) {
          return
        }
        disqualified.add(node.name)
      },

      'Program:exit'() {
        for (const [key, { node: declarationNode, setterName }] of declarations) {
          if (disqualified.has(setterName) || !mountSetters.has(key)) {
            continue
          }
          context.report({ node: declarationNode, messageId: 'preferUseIsMounted' })
        }
      },
    }
  },
}

export default preferUseIsMounted
