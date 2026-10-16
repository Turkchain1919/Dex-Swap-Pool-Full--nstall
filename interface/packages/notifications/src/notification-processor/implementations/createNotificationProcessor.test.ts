import { ContentStyle, type InAppNotification } from '@universe/api'
import { createNotificationProcessor } from '@universe/notifications/src/notification-processor/implementations/createNotificationProcessor'
import type { NotificationProcessorResult } from '@universe/notifications/src/notification-processor/NotificationProcessor'
import { describe, expect, it, vi } from 'vitest'

describe('createNotificationProcessor', () => {
  const createMockNotification = (id: string, style: ContentStyle = ContentStyle.MODAL): InAppNotification => ({
    id,
    content: {
      version: 0,
      title: `${id}-title`,
      subtitle: '',
      style,
      buttons: [],
    },
  })

  const emptyResult = (): NotificationProcessorResult => ({ primary: [], chained: new Map() })

  it('creates a notification processor with process method', () => {
    const mockProcess = vi.fn()
    const processor = createNotificationProcessor({
      process: mockProcess,
    })

    expect(processor).toBeDefined()
    expect(typeof processor.process).toBe('function')
  })

  it('delegates process call to injected process function', async () => {
    const mockNotifications = [createMockNotification('test-notif-1-id')]
    const mockResult: NotificationProcessorResult = {
      primary: [createMockNotification('result-notif-id')],
      chained: new Map(),
    }

    const mockProcess = vi.fn().mockResolvedValue(mockResult)
    const processor = createNotificationProcessor({
      process: mockProcess,
    })

    const result = await processor.process(mockNotifications)

    expect(mockProcess).toHaveBeenCalledWith(mockNotifications)
    expect(result).toBe(mockResult)
  })

  it('preserves the exact arguments passed to process method', async () => {
    const notifications = [
      createMockNotification('notif-1-id'),
      createMockNotification('notif-2-id', ContentStyle.LOWER_LEFT_BANNER),
    ]

    let capturedNotifications: InAppNotification[] | undefined

    const mockProcess = vi.fn(async (notifs: InAppNotification[]): Promise<NotificationProcessorResult> => {
      capturedNotifications = notifs
      return emptyResult()
    })

    const processor = createNotificationProcessor({
      process: mockProcess,
    })

    await processor.process(notifications)

    expect(capturedNotifications).toBe(notifications)
  })

  it('returns an empty result when injected process returns an empty result', async () => {
    const mockProcess = vi.fn().mockResolvedValue(emptyResult())
    const processor = createNotificationProcessor({
      process: mockProcess,
    })

    const result = await processor.process([])

    expect(result.primary).toEqual([])
    expect(result.chained.size).toBe(0)
  })

  it('handles multiple calls with different arguments', async () => {
    const mockProcess = vi.fn(
      async (notifications: InAppNotification[]): Promise<NotificationProcessorResult> => ({
        primary: notifications,
        chained: new Map(),
      }),
    )
    const processor = createNotificationProcessor({
      process: mockProcess,
    })

    const notifs1 = [createMockNotification('notif-1-id')]
    const notifs2 = [createMockNotification('notif-2-id', ContentStyle.LOWER_LEFT_BANNER)]

    const result1 = await processor.process(notifs1)
    const result2 = await processor.process(notifs2)

    expect(mockProcess).toHaveBeenCalledTimes(2)
    expect(result1.primary).toEqual(notifs1)
    expect(result2.primary).toEqual(notifs2)
  })
})
