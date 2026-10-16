import { fireEvent, render, screen } from '@testing-library/react'
import { type InAppNotification } from '@universe/api'
import { useDispatch } from 'react-redux'
import { BackupReminderModalRenderer } from 'src/notification-service/renderers/BackupReminderModalRenderer'
import type { MockedFunction } from 'vitest'
import { setBackupReminderLastSeenTs } from 'wallet/src/features/behaviorHistory/slice'

vi.mock('react-redux', () => ({
  useDispatch: vi.fn(),
}))

vi.mock('src/app/features/backupReminder/BackupReminderModal', () => ({
  BackupReminderModal: ({ onClose }: { onClose: () => void }): JSX.Element => (
    <button type="button" onClick={onClose}>
      Close reminder
    </button>
  ),
}))

const mockUseDispatch = useDispatch as MockedFunction<typeof useDispatch>

describe('BackupReminderModalRenderer', () => {
  const notification = { id: 'local:backup_reminder_modal' } as InAppNotification

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('records the cooldown when the reminder is shown', () => {
    const dispatch = vi.fn()
    mockUseDispatch.mockReturnValue(dispatch)

    render(<BackupReminderModalRenderer notification={notification} />)

    expect(dispatch).toHaveBeenCalledWith(setBackupReminderLastSeenTs(Date.now()))
  })

  it('reports the reminder as shown and dismissed', () => {
    mockUseDispatch.mockReturnValue(vi.fn())
    const onNotificationShown = vi.fn()
    const onNotificationClick = vi.fn()

    render(
      <BackupReminderModalRenderer
        notification={notification}
        onNotificationShown={onNotificationShown}
        onNotificationClick={onNotificationClick}
      />,
    )

    expect(onNotificationShown).toHaveBeenCalledWith(notification.id)

    fireEvent.click(screen.getByRole('button', { name: 'Close reminder' }))

    expect(onNotificationClick).toHaveBeenCalledWith(notification.id, { type: 'dismiss' })
  })
})
