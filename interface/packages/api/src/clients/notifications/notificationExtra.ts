/**
 * Client-defined metadata carried in a notification's `content.extra` JSON string.
 */
export interface NotificationExtra {
  persistUntilInteraction?: boolean
}

export function serializeNotificationExtra(extra: NotificationExtra): string {
  return JSON.stringify(extra)
}

export function parseNotificationExtra(extra: string | undefined): NotificationExtra | undefined {
  if (!extra) {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(extra)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return undefined
    }

    const persistUntilInteraction = Reflect.get(parsed, 'persistUntilInteraction')
    if (persistUntilInteraction === undefined) {
      return {}
    }

    return typeof persistUntilInteraction === 'boolean' ? { persistUntilInteraction } : undefined
  } catch {
    return undefined
  }
}
