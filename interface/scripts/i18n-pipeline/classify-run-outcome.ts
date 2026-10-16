/**
 * Classify how a translation-pipeline run ended, for the Slack failure card.
 * TypeScript port of the workflow's "Classify the run outcome" bash block —
 * semantics unchanged:
 *
 * - GitHub exposes no expression for WHICH step ended the job, so it is read
 *   back off the run's own jobs API.
 * - LAST matching conclusion, not first: continue-on-error steps can fail
 *   harmlessly early, and naming one would point on-call at a step that did
 *   not stop the run. When the job was cancelled, `cancelled` outranks
 *   `failure` so an incidental early failure cannot mask the interrupted step.
 * - A cancel is paged only when it ran long enough to be the 180-minute
 *   timeout rather than a deliberate stop; an unknown duration pages (better
 *   a spurious page than a silent timeout).
 *
 * Best-effort throughout: an "unknown" field is fine, a missing alert is not,
 * so every read is guarded and the outputs always get written.
 */
import { annotate, gh, systemExec, writeStepOutputs, type Exec } from './lib.ts'

const ONCALL_MENTION = '<!subteam^S096XP6BGV7>'

export interface JobStep {
  name: string
  conclusion: string | null
}

export interface Classification {
  step: string
  emoji: string
  headline: string
  context: string
  duration: string
}

export function endingStep(steps: JobStep[], jobStatus: string): string {
  const primary = jobStatus === 'cancelled' ? 'cancelled' : 'failure'
  const secondary = jobStatus === 'cancelled' ? 'failure' : 'cancelled'
  const last = (conclusion: string): string | undefined =>
    steps.filter((s) => s.conclusion === conclusion).at(-1)?.name
  return last(primary) ?? last(secondary) ?? 'unknown'
}

export function classify(input: {
  jobStatus: string
  steps: JobStep[]
  startedAt: string | undefined
  now: Date
}): Classification {
  const step = endingStep(input.steps, input.jobStatus)

  let minutes: number | undefined
  if (input.startedAt !== undefined) {
    const started = Date.parse(input.startedAt)
    if (!Number.isNaN(started)) minutes = Math.floor((input.now.getTime() - started) / 60_000)
  }
  const duration = minutes === undefined ? 'unknown' : `${minutes} min`

  if (input.jobStatus === 'cancelled') {
    const page = minutes === undefined || minutes >= 60
    return {
      step,
      emoji: '⚪',
      headline: 'i18n Translations Pipeline Cancelled',
      context: page
        ? `🔔 cc ${ONCALL_MENTION}`
        : `🔕 Not paging on-call — cancelled after ${minutes} min, which reads as a deliberate stop rather than the 180-minute timeout.`,
      duration,
    }
  }
  return {
    step,
    emoji: '❌',
    headline: 'i18n Translations Pipeline Failed',
    context: `🔔 cc ${ONCALL_MENTION}`,
    duration,
  }
}

export function main(exec: Exec = systemExec): void {
  const jobStatus = process.env.JOB_STATUS ?? 'failure'
  let steps: JobStep[] = []
  let startedAt: string | undefined
  try {
    const raw = gh(exec, [
      'api',
      `repos/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}/attempts/${process.env.GITHUB_RUN_ATTEMPT}/jobs`,
    ])
    const parsed = JSON.parse(raw) as { jobs?: Array<{ started_at?: string; steps?: JobStep[] }> }
    steps = (parsed.jobs ?? []).flatMap((j) => j.steps ?? [])
    startedAt = (parsed.jobs ?? []).at(-1)?.started_at
  } catch (err) {
    annotate('warning', `Could not read the run's own steps: ${String(err)}`)
  }
  const result = classify({ jobStatus, steps, startedAt, now: new Date() })
  writeStepOutputs(result)
}

if (import.meta.main) main()
