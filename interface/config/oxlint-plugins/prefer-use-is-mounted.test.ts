/**
 * Run with `bun test config/oxlint-plugins/prefer-use-is-mounted.test.ts`
 *
 * Colocated tests for `universe-custom/prefer-use-is-mounted` (rule module:
 * prefer-use-is-mounted.js, registered by universe-custom.js — the harness
 * lints through that registration, i.e. the exact wiring CI uses). There is no
 * ESLint RuleTester in this repo, so these drive the real oxlint binary over
 * generated fixtures.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const REPO_ROOT = join(import.meta.dir, '../..')
const PLUGIN_PATH = join(import.meta.dir, 'universe-custom.js')
const OXLINT_BIN = join(REPO_ROOT, 'node_modules/.bin/oxlint')

interface Diagnostic {
  message: string
}

let fixtureRoot: string

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'prefer-use-is-mounted-'))
})

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true })
})

function lintFixture(source: string, fileName = 'Fixture.tsx'): Diagnostic[] {
  const dir = mkdtempSync(join(fixtureRoot, 'case-'))
  const filePath = join(dir, ...fileName.split('/'))
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, source)

  const configPath = join(dir, '.oxlintrc.json')
  writeFileSync(
    configPath,
    JSON.stringify({
      plugins: [],
      categories: { correctness: 'off' },
      jsPlugins: [PLUGIN_PATH],
      rules: { 'universe-custom/prefer-use-is-mounted': 'error' },
    }),
  )

  const result = Bun.spawnSync([OXLINT_BIN, '-c', configPath, '--format', 'json', filePath], {
    cwd: dir,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = result.stdout.toString()
  // 0 = clean, 1 = diagnostics found; anything else means oxlint itself failed
  // (e.g. plugin load error), which would let negative cases pass vacuously.
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(`oxlint exited with ${result.exitCode} (stderr: ${result.stderr.toString()})`)
  }
  let parsed: { diagnostics?: Diagnostic[] }
  try {
    parsed = JSON.parse(stdout) as { diagnostics?: Diagnostic[] }
  } catch (error) {
    throw new Error(`oxlint did not emit JSON (stderr: ${result.stderr.toString()})`, { cause: error })
  }
  return (parsed.diagnostics ?? []).filter((d) => /hand-roll a mount flag/.test(d.message))
}

describe('prefer-use-is-mounted', () => {
  test('fires on the block form', () => {
    const source = `
import { useEffect, useState } from 'react'
export function Gate() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted ? <div /> : null
}
`
    expect(lintFixture(source)).toHaveLength(1)
  })

  test('fires on the concise arrow form', () => {
    const source = `
import { useEffect, useState } from 'react'
export function Gate() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <div /> : null
}
`
    expect(lintFixture(source)).toHaveLength(1)
  })

  test('fires through the React namespace, on useLayoutEffect, and with the declaration far from the effect', () => {
    const source = `
import * as React from 'react'
export function Gate() {
  const [mounted, setMounted] = React.useState(false)
  const [term, setTerm] = React.useState('')
  const label = term.trim()
  React.useLayoutEffect(() => {
    setMounted(true)
  }, [])
  return mounted ? <div>{label}</div> : null
}
`
    expect(lintFixture(source)).toHaveLength(1)
  })

  test('reports each component separately in one file', () => {
    const source = `
import { useEffect, useState } from 'react'
export function One() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <div /> : null
}
export function Two() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <span /> : null
}
`
    expect(lintFixture(source)).toHaveLength(2)
  })

  test('stays silent when the setter is called with something other than a literal true', () => {
    const source = `
import { useEffect, useState } from 'react'
export function Gate({ ready }: { ready: boolean }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    setShown(ready)
  }, [])
  return shown ? <div /> : null
}
`
    expect(lintFixture(source)).toHaveLength(0)
  })

  test('stays silent on a non-empty dependency array', () => {
    const source = `
import { useEffect, useState } from 'react'
export function Gate({ loading }: { loading: boolean }) {
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!loading) {
      setSettled(true)
    }
  }, [loading])
  return settled ? <div /> : null
}
`
    expect(lintFixture(source)).toHaveLength(0)
  })

  test('stays silent when the flag is also set back to false anywhere in scope', () => {
    const source = `
import { useEffect, useState } from 'react'
export function Gate({ shouldShow }: { shouldShow: boolean }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    setArmed(true)
  }, [])
  const reset = () => setArmed(false)
  return armed ? <button onClick={reset} /> : null
}
`
    expect(lintFixture(source)).toHaveLength(0)
  })

  test('stays silent on useState(someExpression) rather than useState(false)', () => {
    const source = `
import { useEffect, useState } from 'react'
declare const isWebIOS: boolean
export function Gate() {
  const [searchInputMounted, setSearchInputMounted] = useState(!isWebIOS)
  useEffect(() => {
    setSearchInputMounted(true)
  }, [])
  return searchInputMounted ? <input /> : null
}
`
    expect(lintFixture(source)).toHaveLength(0)
  })

  // The direct-statement requirement is what separates the mount gate from
  // flags whose timing is owned by a scheduler; those must not be rewritten.
  test('stays silent when the setter is scheduled inside a callback rather than run directly', () => {
    const source = `
import { useEffect, useState } from 'react'
export function Gate() {
  const [painted, setPainted] = useState(false)
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(true), 50)
    return () => clearTimeout(timeout)
  }, [])
  useEffect(() => {
    requestAnimationFrame(() => {
      setPainted(true)
    })
  }, [])
  return painted && animated ? <div /> : null
}
`
    expect(lintFixture(source)).toHaveLength(0)
  })

  test('stays silent inside the useIsMounted module itself, which is the sanctioned implementation', () => {
    const source = `
import { useEffect, useState } from 'react'
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])
  return isMounted
}
`
    // Same source under a different path still reports, so the exclusion is
    // the path and not something about the shape.
    expect(lintFixture(source, 'utilities/src/react/useIsMounted.ts')).toHaveLength(0)
    expect(lintFixture(source, 'utilities/src/react/useSomethingElse.ts')).toHaveLength(1)
  })

  // A setter handed off as a value can be called with anything by whoever ends
  // up holding it, so the literal-`true` guard cannot vouch for it from here.
  test('stays silent when the setter escapes as a value instead of being called', () => {
    const passedToThen = `
import { useEffect, useState } from 'react'
declare const ready: Promise<boolean>
export function Gate() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  useEffect(() => {
    ready.then(setMounted)
  }, [])
  return mounted ? <div /> : null
}
`
    const passedToAnotherHook = `
import { useEffect, useState } from 'react'
declare function useOnFirstPaint(onPaint: (value: boolean) => void): void
export function Gate() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  useOnFirstPaint(setMounted)
  return mounted ? <div /> : null
}
`
    const storedInAVariable = `
import { useEffect, useState } from 'react'
export function Gate() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const reveal = setMounted
  return mounted ? <div /> : <button onClick={() => reveal(true)} />
}
`
    expect(lintFixture(passedToThen)).toHaveLength(0)
    expect(lintFixture(passedToAnotherHook)).toHaveLength(0)
    expect(lintFixture(storedInAVariable)).toHaveLength(0)
  })

  test('stays silent when the state is not a destructured [value, setter] pair', () => {
    const source = `
import { useEffect, useState } from 'react'
export function Gate() {
  const state = useState(false)
  useEffect(() => {
    state[1](true)
  }, [])
  return state[0] ? <div /> : null
}
`
    expect(lintFixture(source)).toHaveLength(0)
  })
})
