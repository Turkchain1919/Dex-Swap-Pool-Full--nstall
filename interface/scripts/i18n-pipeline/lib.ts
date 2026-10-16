/**
 * Shared plumbing for the i18n pipeline scripts — the TypeScript that
 * replaced the workflow's bash blocks (see the conversion rationale in the
 * PR that introduced this directory). Dependency-free on purpose: these run
 * via `bun scripts/i18n-pipeline/<script>.ts` from the workflow's main-pinned
 * checkout, with no node_modules installed, exactly like
 * scripts/i18n-compose-pr-body.ts. Reviewed-main is the trust boundary — do
 * not move this logic into an installed package.
 */
import { appendFileSync } from 'node:fs'

/** Exit code for misuse (bad argv, missing env) — sysexits EX_USAGE. */
export const EX_USAGE = 64

/** Read a required env var or exit 64 with a message — the TS equivalent of
 *  the `set -u` the bash blocks ran under. Silent fallbacks here fail OPEN
 *  (a missing cap skips a size check; a missing prefix sweeps nothing). */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    console.error(`missing required env: ${name}`)
    process.exit(EX_USAGE)
  }
  return value
}

export function requireIntEnv(name: string): number {
  const raw = requireEnv(name)
  if (!/^\d+$/.test(raw)) {
    console.error(`env ${name} must be a whole number, got ${JSON.stringify(raw)}`)
    process.exit(EX_USAGE)
  }
  return Number.parseInt(raw, 10)
}

export interface ExecResult {
  exitCode: number
  stdout: string
  stderr: string
}

/** Run a command and capture output. Injectable so tests can drive `main()`
 *  with a scripted fake (see arm-auto-merge.test.ts) instead of real gh. */
export type Exec = (cmd: string[]) => ExecResult

export function systemExec(cmd: string[]): ExecResult {
  const proc = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'pipe' })
  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  }
}

/** `gh <args>`, throwing on failure with stderr in the message. */
export function gh(exec: Exec, args: string[]): string {
  const res = exec(['gh', ...args])
  if (res.exitCode !== 0) {
    throw new Error(`gh ${args.join(' ')} failed (${res.exitCode}): ${res.stderr.trim()}`)
  }
  return res.stdout
}

/** Append step outputs the way `echo "k=v" >> "$GITHUB_OUTPUT"` did.
 *  Values are single-line by contract; newlines are stripped defensively. */
export function writeStepOutputs(outputs: Record<string, string>): void {
  const path = process.env.GITHUB_OUTPUT
  if (!path) {
    // The bash `>> "$GITHUB_OUTPUT"` aborted under `set -u`; outside a
    // workflow (local runs) losing outputs is fine, but say so.
    console.error(`GITHUB_OUTPUT is unset — step outputs dropped: ${Object.keys(outputs).join(', ')}`)
    return
  }
  const lines = Object.entries(outputs)
    .map(([k, v]) => `${k}=${v.replaceAll('\r', '').replaceAll('\n', ' ')}`)
    .join('\n')
  appendFileSync(path, lines + '\n')
}

export function annotate(kind: 'error' | 'warning' | 'notice', message: string): void {
  // Workflow-command DATA decoding: the runner decodes %0A/%0D/%25, so a
  // message carrying the literal text `%0A::error::…` would render as a
  // second, forged annotation. Escape % first, then the newline classes —
  // some callers interpolate semi-trusted data (dispatch inputs, filenames
  // restored from the PR branch).
  const escaped = message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')
  console.log(`::${kind}::${escaped}`)
}
