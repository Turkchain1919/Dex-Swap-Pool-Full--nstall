/** Decision cases for the failure-card classifier. Run with `bun test`. */
import { describe, expect, it } from 'bun:test'
import { classify, endingStep } from './classify-run-outcome.ts'

const NOW = new Date('2026-09-10T12:00:00Z')
const minutesAgo = (m: number): string => new Date(NOW.getTime() - m * 60_000).toISOString()

describe('endingStep', () => {
  it('names the LAST failure, not a harmless early continue-on-error one', () => {
    const steps = [
      { name: 'Resolve the author', conclusion: 'failure' },
      { name: 'Translate', conclusion: 'success' },
      { name: 'Commit translations', conclusion: 'failure' },
    ]
    expect(endingStep(steps, 'failure')).toBe('Commit translations')
  })

  it('cancelled outranks failure when the job was cancelled', () => {
    const steps = [
      { name: 'Report untranslated strings', conclusion: 'failure' },
      { name: 'Translate', conclusion: 'cancelled' },
    ]
    expect(endingStep(steps, 'cancelled')).toBe('Translate')
    expect(endingStep(steps, 'failure')).toBe('Report untranslated strings')
  })

  it('falls back to the secondary conclusion, then unknown', () => {
    expect(endingStep([{ name: 'X', conclusion: 'cancelled' }], 'failure')).toBe('X')
    expect(endingStep([], 'failure')).toBe('unknown')
  })
})

describe('classify', () => {
  it('a failure always pages', () => {
    const c = classify({ jobStatus: 'failure', steps: [], startedAt: minutesAgo(5), now: NOW })
    expect(c.emoji).toBe('❌')
    expect(c.context).toContain('🔔')
    expect(c.duration).toBe('5 min')
  })

  it('a short cancel reads as a deliberate stop and does not page', () => {
    const c = classify({ jobStatus: 'cancelled', steps: [], startedAt: minutesAgo(12), now: NOW })
    expect(c.emoji).toBe('⚪')
    expect(c.context).toContain('🔕')
  })

  it('a long cancel pages (probably the 180-minute timeout)', () => {
    const c = classify({ jobStatus: 'cancelled', steps: [], startedAt: minutesAgo(170), now: NOW })
    expect(c.context).toContain('🔔')
  })

  it('an unknown duration pages — better spurious than a silent timeout', () => {
    const c = classify({ jobStatus: 'cancelled', steps: [], startedAt: undefined, now: NOW })
    expect(c.context).toContain('🔔')
    expect(c.duration).toBe('unknown')
  })
})
