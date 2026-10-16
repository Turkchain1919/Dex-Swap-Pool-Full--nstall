import { MonitorDefinition } from '../../types'
import {
  LIQUIDITY_FE_ADDITIONAL_SLACK_CHANNELS,
  LIQUIDITY_FE_RUNBOOK,
  LIQUIDITY_VIEW_FILTER,
  TEAM,
  UNIVERSE_REPO_URL,
} from './constants'

/**
 * Frontend error monitors for liquidity pages (service:web-prod).
 *
 * Monitors JS errors on /positions, /pool, /pools, /add, /remove views
 * using Datadog RUM data filtered by @view.url_path.
 */
export const liquidityFeErrorTrackingMonitors: MonitorDefinition[] = [
  {
    id: 'liquidity_fe_web_error_count_spike',
    name: '[Web] Elevated JS errors on Liquidity pages',
    type: 'rum alert',
    query: 'formula("query1").last("1h") > 25',
    alertBody:
      'An unusually large number of distinct user sessions are hitting JS errors on Liquidity pages (positions, pool, add, remove). Check [Error Tracking](/error-tracking?query=service%3Aweb-prod&teams=liquidity) for new issues.',
    recoveryBody: 'The number of sessions hitting JS errors on Liquidity pages has recovered below threshold.',
    team: TEAM,
    priority: 3,
    // Counts distinct affected sessions, not raw error events. Error volume is
    // dominated by a few sessions in retry/abort loops, so a raw count measures
    // loop length rather than user impact: over 30d the largest hour by event
    // count was 4,594 errors from 33 sessions, and another was 1,598 from 3.
    // Cardinality makes one looping session worth exactly one.
    //
    // Thresholds are per path group and derived on /positions, the widest, from
    // the exact query1 below including its extension-noise exclusions — a
    // full-window sweep, not a sample, of the 30d to 2026-09-08T20:00Z: 717
    // hourly buckets carried traffic (RUM retention clamps the window slightly
    // short of 720) and none of those was empty. p50 8, p75 12, p90 15, p95
    // 18, p98 21, p99 24, max 29 affected sessions/hr. Critical 25 sits just
    // above that p99 and warning 22 just above p98, the same mapping the
    // pre-exclusion thresholds used. Over those 30d critical would have fired
    // in 4 hours, 3 of them in the last 7 days, and warning in 9 hours, 7 in
    // the last 7 — so the monitor is demonstrably reachable on the real
    // distribution. No other path group exceeds 18 sessions/hr, so one shared
    // pair of thresholds does not make the narrower groups fire.
    //
    // A filter change and a threshold change are one change: narrowing query1
    // without re-deriving these numbers leaves a monitor that cannot fire. The
    // literal in `query` above and `thresholds.critical` are passed to Datadog
    // independently by factory.ts, so they must be edited in lockstep or the
    // monitor alerts at a value this definition does not claim.
    //
    // Recovery deliberately breaks this file's half-the-trigger convention:
    // half of 22/25 is ~11/~13, which lands around p70-p75, so a tripped state
    // would take hours to clear. 17 is between p90 (15) and p95 (18), with
    // 94.7% of hours at or below it, so it clears promptly. Both recoveries
    // are 17; don't "correct" them back to halves.
    //
    // onMissingData is set explicitly, and deliberately to the silent default:
    // this monitor is grouped by path and most of its groups are legitimately
    // empty in a given hour (/positions/v3/arbitrum/? saw error traffic in 235
    // of those 717 hours), so show_no_data would report ordinary quiet as No
    // Data. Whether RUM is reporting at all is a service-level question and
    // wants its own volume monitor.
    //
    // Traffic is growing. Same unit and path group as the derivation above,
    // but measured on the wider pre-exclusion population (only
    // -@error.source:report applied — no -@error.handling:handled and none of
    // the message clauses below): p50 32 over 2026-07-27 to 08-26 and 47 over
    // the 30d to 09-08. Those sit far above the 8 derived above because they
    // count a different population, not a different metric — over the 30d to
    // 09-08 the /positions p50 runs 79 unfiltered, 47 report-excluded, 14 on
    // main's current query1, 8 on this one. So any absolute session count in
    // this block goes stale and will need re-deriving.
    thresholds: {
      critical: 25,
      warning: 22,
      criticalRecovery: 17,
      warningRecovery: 17,
    },
    slackAlertTransitionsOnly: true,
    logQuery: 'service:web-prod',
    runbookUrl: LIQUIDITY_FE_RUNBOOK,
    readmeUrl: `${UNIVERSE_REPO_URL}/tree/main/apps/web`,
    dashboards: [],
    additionalSlackChannels: LIQUIDITY_FE_ADDITIONAL_SLACK_CHANNELS,
    enablePaging: false,
    includeIncidentWebhook: false,
    prodOnly: true,
    newGroupDelay: 60,
    onMissingData: 'default',
    variables: {
      eventQueries: [
        {
          name: 'query1',
          dataSource: 'rum',
          indexes: ['*'],
          search: {
            // -@error.source:report excludes browser Report-API events (CSP
            // violations etc.), which alone exceed the critical threshold —
            // still true under the session unit, and by a wider margin than
            // when this was written: over the same 30d window, report-only
            // traffic on /positions runs p50 55, p99 151, max 182 sessions/hr,
            // so its median hour alone is more than double a critical of 25.
            //
            // -@error.handling:handled drops errors this app reports itself
            // through logger.error(), which the RUM SDK marks handled. Negated
            // rather than written as @error.handling:unhandled so that errors
            // carrying no handling attribute at all are still counted.
            //
            // The last three clauses drop wallet-extension noise, 38% of the
            // sessions that survive the exclusions above (30d: 17,373 ->
            // 10,807). Each names one message fingerprint. None matches on
            // @error.stack, and that is the point: @error.stack matches
            // anywhere in the stack rather than at the throwing frame, so
            // -@error.stack:*/inpage.js* — the clause these replace — also
            // dropped first-party bugs whose stack merely passed through the
            // injected provider (our code -> window.ethereum.request() -> the
            // extension's inpage.js). Over 30d that silently removed 126
            // sessions of 'privy:connections', 23 of 'solana_bnAddress' and 12
            // of 'eip155_bnAddress' localStorage-quota errors — keys written
            // by the Privy SDK we ship — plus 5 of an invalid-address throw
            // from viem, our own dependency. That is the same class this file
            // declines to filter by *quota* or *Storage* message just below,
            // so a stack match contradicted its own rationale, and it would
            // have gone on swallowing whatever future first-party failure
            // happened to cross a provider call. A message phrase cannot.
            //
            // "func sseError not found" (3,527 sessions / 34,643 events, 30d)
            // and "Failed to connect to MetaMask" (729 / 3,604) are the two
            // third-party fingerprints the stack clause existed for — provider
            // injection failing in extension code we do not ship and cannot
            // fix. Both live almost entirely inside that stack population:
            // every sseError session and all but 3 MetaMask sessions carry an
            // inpage.js frame. Together they keep 4,256 of the 4,524 sessions
            // the stack clause removed; the ~34 sessions of assorted remaining
            // extension noise are left counted rather than chased with more
            // clauses.
            //
            // "not found rainbowkit" is not ours either: rainbowkit is not a
            // dependency of this monorepo and the string appears nowhere in
            // our source. All 6,096 matching events (3,402 sessions, 30d) come
            // from the Rabby Wallet iOS in-app browser — @session.useragent
            // matches *Rabby* on every one, and the inverse filter returns
            // zero. Each is an unhandled promise rejection sharing a single
            // fingerprint, stack "Error: not found rainbowkit at Promise @
            // [native code]" with no frame from our bundle, unchanged since
            // first seen 2025-06-16. It has zero overlap with the other two,
            // so all three clauses are load-bearing. Matched as an exact
            // phrase rather than *rainbowkit*: the wildcard covers no
            // additional events and would swallow a future real failure that
            // happens to name the library.
            //
            // Deliberately NOT excluded, though they are the same shape of
            // noise: /injected.js, which is also the filename our own extension
            // ships (apps/extension/src/entrypoints/injected.content.ts), and
            // /injectScriptAdjust.js, which we serve from our own origin. Both
            // would hide first-party failures. Nor any *quota* or *Storage*
            // message clause: most of that traffic is wallet SDKs, but it also
            // carries our own cache keys (cachedAsyncTokens, poolCache) hitting
            // the localStorage budget, which is a real bug we want reported.
            query: `@type:error env:(production OR prod) service:web-prod ${LIQUIDITY_VIEW_FILTER} -@error.source:report -@error.handling:handled -@error.message:"func sseError not found" -@error.message:"Failed to connect to MetaMask" -@error.message:"not found rainbowkit"`,
          },
          computes: [{ aggregation: 'cardinality', metric: '@session.id' }],
          groupBies: [
            {
              facet: '@view.url_path_group',
              limit: 10,
              sort: { aggregation: 'cardinality', metric: '@session.id', order: 'desc' },
            },
          ],
        },
      ],
    },
  },
  {
    id: 'liquidity_fe_web_error_session_impact',
    name: '[Web] Liquidity page errors impacting user sessions',
    type: 'rum alert',
    query: 'formula("cutoff_min(query1, 10) / query2").last("1h") > 0.05',
    alertBody:
      'More than 5% of sessions visiting Liquidity pages are encountering JS errors (minimum 10 affected sessions). Check [Error Tracking](/error-tracking?query=service%3Aweb-prod&teams=liquidity) for details.',
    recoveryBody: 'Session error impact on Liquidity pages has recovered below threshold.',
    team: TEAM,
    priority: 2,
    thresholds: {
      critical: 0.05,
      warning: 0.02,
      criticalRecovery: 0.02,
      warningRecovery: 0.01,
    },
    logQuery: 'service:web-prod',
    runbookUrl: LIQUIDITY_FE_RUNBOOK,
    readmeUrl: `${UNIVERSE_REPO_URL}/tree/main/apps/web`,
    dashboards: [],
    additionalSlackChannels: LIQUIDITY_FE_ADDITIONAL_SLACK_CHANNELS,
    enablePaging: true,
    includeIncidentWebhook: true,
    prodOnly: true,
    variables: {
      eventQueries: [
        {
          name: 'query1',
          dataSource: 'rum',
          indexes: ['*'],
          search: {
            query: `@type:error env:(production OR prod) service:web-prod ${LIQUIDITY_VIEW_FILTER}`,
          },
          computes: [{ aggregation: 'cardinality', metric: '@session.id' }],
        },
        {
          name: 'query2',
          dataSource: 'rum',
          indexes: ['*'],
          search: {
            query: `@type:view env:(production OR prod) service:web-prod ${LIQUIDITY_VIEW_FILTER}`,
          },
          computes: [{ aggregation: 'cardinality', metric: '@session.id' }],
        },
      ],
    },
  },
]
