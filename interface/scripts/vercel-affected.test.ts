/**
 * Tests for the $VERCEL_AFFECTED_PROJECTS selection behind
 * scripts/vercel-affected.ts (INFRA-3305): the scoped workflow_dispatch lever
 * must emit exactly the named projects and fail CLOSED on unknown names.
 * Run with `bun test scripts/vercel-affected`.
 */
import { describe, expect, test } from 'bun:test'
import { type DeployableProject, selectRequestedProjects } from './vercel-affected'

const PROJECTS: DeployableProject[] = [
  { name: '@universe/workbench', vercelProject: 'workbench', projectId: 'prj_workbench' },
  { name: '@universe/sandbox', vercelProject: 'sandbox', projectId: 'prj_sandbox' },
  { name: '@universe/dev-portal', vercelProject: 'dev-portal', projectId: 'prj_devportal' },
]

describe('selectRequestedProjects', () => {
  // Empty means "input not set": main() must fall through to affected
  // detection (or VERCEL_AFFECTED_ALL), never emit an empty matrix.
  test.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace only', '  '],
    ['separators only', ' , ,'],
  ])('no selection for %s input', (_label, raw) => {
    expect(selectRequestedProjects(raw, PROJECTS)).toEqual({ kind: 'none' })
  })

  test.each([
    ['single name', 'workbench', ['workbench']],
    ['comma separated', 'workbench,sandbox', ['workbench', 'sandbox']],
    ['comma + space separated', 'workbench, dev-portal', ['workbench', 'dev-portal']],
    ['space separated', 'sandbox workbench', ['workbench', 'sandbox']],
  ])('selects exactly the named projects: %s', (_label, raw, expected) => {
    const selection = selectRequestedProjects(raw, PROJECTS)
    if (selection.kind !== 'selected') {
      throw new Error(`expected 'selected', got '${selection.kind}'`)
    }
    // Registry order, not input order — the matrix shape must not depend on
    // how the operator happened to type the list.
    expect(selection.selected.map((p) => p.vercelProject)).toEqual(expected)
  })

  test('unknown name fails closed', () => {
    expect(selectRequestedProjects('webench', PROJECTS)).toEqual({ kind: 'unknown', unknown: ['webench'] })
  })

  test('unknown name alongside valid ones still fails closed', () => {
    // A typo in a multi-project dispatch must not quietly deploy the valid
    // subset (or worse, fall through to everything).
    expect(selectRequestedProjects('workbench,webench', PROJECTS)).toEqual({ kind: 'unknown', unknown: ['webench'] })
  })

  test('names are case-sensitive and never fuzzy-matched', () => {
    expect(selectRequestedProjects('Workbench', PROJECTS)).toEqual({ kind: 'unknown', unknown: ['Workbench'] })
  })
})
