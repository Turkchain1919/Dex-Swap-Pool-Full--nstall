import {
  parseNotificationExtra,
  serializeNotificationExtra,
} from '@universe/api/src/clients/notifications/notificationExtra'
import { describe, expect, it } from 'vitest'

describe('notification extra serialization', () => {
  it('round-trips the persist-until-interaction flag', () => {
    const serialized = serializeNotificationExtra({ persistUntilInteraction: true })

    expect(serialized).toBe('{"persistUntilInteraction":true}')
    expect(parseNotificationExtra(serialized)).toEqual({ persistUntilInteraction: true })
  })

  it.each([undefined, '', 'not-json', 'true', '[]', '{"persistUntilInteraction":"true"}'])(
    'ignores invalid notification extra: %s',
    (extra) => {
      expect(parseNotificationExtra(extra)).toBeUndefined()
    },
  )
})
