/** Absent callback means enabled; `getDefault` is the platform's "enabled by default?" answer (web carves out e2e, native does not).
 * Web carves out e2e because session-gated hosts are blackholed in CI (net::ERR_NAME_NOT_RESOLVED); native has no such constraint. */
export function isSessionServiceEnabled(ctx: {
  getIsSessionServiceEnabled?: () => boolean
  getDefault: () => boolean
}): boolean {
  return ctx.getIsSessionServiceEnabled?.() ?? ctx.getDefault()
}
