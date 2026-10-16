import { ContentStyle, type InAppNotification, OnClickAction, parseNotificationExtra } from '@universe/api'
import { AccountType } from 'uniswap/src/features/accounts/types'
import { ONE_DAY_MS } from 'utilities/src/time/time'
import type { MockedFunction } from 'vitest'
import {
  BACKUP_REMINDER_NOTIFICATION_ID,
  createBackupReminderTrigger,
  isBackupReminderNotification,
} from 'wallet/src/features/behaviorHistory/backupReminderTrigger'
import { selectBackupReminderLastSeenTs } from 'wallet/src/features/behaviorHistory/selectors'
import { hasExternalBackup } from 'wallet/src/features/wallet/accounts/utils'
import { selectActiveAccount } from 'wallet/src/features/wallet/selectors'
import { type WalletState } from 'wallet/src/state/walletReducer'

vi.mock('wallet/src/features/behaviorHistory/selectors')
vi.mock('wallet/src/features/wallet/selectors')
vi.mock('wallet/src/features/wallet/accounts/utils')

const mockSelectBackupReminderLastSeenTs = selectBackupReminderLastSeenTs as MockedFunction<
  typeof selectBackupReminderLastSeenTs
>
const mockSelectActiveAccount = selectActiveAccount as MockedFunction<typeof selectActiveAccount>
const mockHasExternalBackup = hasExternalBackup as MockedFunction<typeof hasExternalBackup>

describe('backupReminderTrigger', () => {
  const mockGetState = vi.fn<() => WalletState>()
  const mockGetPortfolioValue = vi.fn<() => Promise<number>>()

  const mockSignerAccount = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    type: AccountType.SignerMnemonic as const,
    name: 'Test Account',
    timeImportedMs: Date.now(),
    pushNotificationsEnabled: false,
    derivationIndex: 0,
    mnemonicId: 'test-mnemonic-id',
  }

  const mockViewOnlyAccount = {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    type: AccountType.Readonly as const,
    name: 'View Only Account',
    timeImportedMs: Date.now(),
    pushNotificationsEnabled: false,
  }

  const createTrigger = (): ReturnType<typeof createBackupReminderTrigger> =>
    createBackupReminderTrigger({
      getState: mockGetState,
      getPortfolioValue: mockGetPortfolioValue,
    })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createBackupReminderTrigger', () => {
    it('returns a trigger with the correct local ID', () => {
      const trigger = createTrigger()

      expect(trigger.id).toBe(BACKUP_REMINDER_NOTIFICATION_ID)
      expect(trigger.id.startsWith('local:')).toBe(true)
    })

    describe('shouldShow', () => {
      it('returns true when all conditions are met', async () => {
        mockSelectActiveAccount.mockReturnValue(mockSignerAccount)
        mockHasExternalBackup.mockReturnValue(false)
        mockSelectBackupReminderLastSeenTs.mockReturnValue(Date.now() - 2 * ONE_DAY_MS) // 2 days ago
        mockGetPortfolioValue.mockResolvedValue(150) // $150

        await expect(createTrigger().shouldShow()).resolves.toBe(true)
      })

      it('returns false when no active account', async () => {
        mockSelectActiveAccount.mockReturnValue(null)

        await expect(createTrigger().shouldShow()).resolves.toBe(false)
        expect(mockGetPortfolioValue).not.toHaveBeenCalled()
      })

      it('returns false when account is view-only (not signer)', async () => {
        mockSelectActiveAccount.mockReturnValue(mockViewOnlyAccount)

        await expect(createTrigger().shouldShow()).resolves.toBe(false)
        expect(mockGetPortfolioValue).not.toHaveBeenCalled()
      })

      it('returns false when account has external backup', async () => {
        mockSelectActiveAccount.mockReturnValue(mockSignerAccount)
        mockHasExternalBackup.mockReturnValue(true)

        await expect(createTrigger().shouldShow()).resolves.toBe(false)
        expect(mockGetPortfolioValue).not.toHaveBeenCalled()
      })

      it('returns false when last seen is within 24 hours', async () => {
        mockSelectActiveAccount.mockReturnValue(mockSignerAccount)
        mockHasExternalBackup.mockReturnValue(false)
        mockSelectBackupReminderLastSeenTs.mockReturnValue(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago

        await expect(createTrigger().shouldShow()).resolves.toBe(false)
        expect(mockGetPortfolioValue).not.toHaveBeenCalled()
      })

      it('returns false when portfolio value is exactly $10 (threshold is strictly greater)', async () => {
        mockSelectActiveAccount.mockReturnValue(mockSignerAccount)
        mockHasExternalBackup.mockReturnValue(false)
        mockSelectBackupReminderLastSeenTs.mockReturnValue(undefined) // Never seen
        mockGetPortfolioValue.mockResolvedValue(10) // Exactly $10

        await expect(createTrigger().shouldShow()).resolves.toBe(false)
      })

      it('returns false when portfolio value is below $10', async () => {
        mockSelectActiveAccount.mockReturnValue(mockSignerAccount)
        mockHasExternalBackup.mockReturnValue(false)
        mockSelectBackupReminderLastSeenTs.mockReturnValue(undefined)
        mockGetPortfolioValue.mockResolvedValue(5) // $5

        await expect(createTrigger().shouldShow()).resolves.toBe(false)
      })

      it('returns true when never seen before and portfolio is above $10', async () => {
        mockSelectActiveAccount.mockReturnValue(mockSignerAccount)
        mockHasExternalBackup.mockReturnValue(false)
        mockSelectBackupReminderLastSeenTs.mockReturnValue(undefined) // Never seen
        mockGetPortfolioValue.mockResolvedValue(10.01) // Just above $10

        await expect(createTrigger().shouldShow()).resolves.toBe(true)
      })

      it('returns false when getPortfolioValue throws an error', async () => {
        mockSelectActiveAccount.mockReturnValue(mockSignerAccount)
        mockHasExternalBackup.mockReturnValue(false)
        mockSelectBackupReminderLastSeenTs.mockReturnValue(undefined)
        mockGetPortfolioValue.mockRejectedValue(new Error('Network error'))

        await expect(createTrigger().shouldShow()).resolves.toBe(false)
      })
    })

    describe('createNotification', () => {
      it('returns a MODAL notification with local metadata', () => {
        const notification = createTrigger().createNotification()

        expect(notification.id).toBe(BACKUP_REMINDER_NOTIFICATION_ID)
        expect(notification.content?.style).toBe(ContentStyle.MODAL)
        expect(notification.metadata?.owner).toBe('local')
        expect(notification.metadata?.business).toBe('backup_reminder')
      })

      it('marks the notification to persist until interaction and dismiss on close', () => {
        const notification = createTrigger().createNotification()

        expect(parseNotificationExtra(notification.content?.extra)).toEqual({ persistUntilInteraction: true })
        expect(notification.content?.onDismissClick?.onClick).toEqual([OnClickAction.DISMISS])
      })
    })
  })

  describe('isBackupReminderNotification', () => {
    it('returns true for the backup reminder notification', () => {
      const notification = { id: BACKUP_REMINDER_NOTIFICATION_ID } as InAppNotification

      expect(isBackupReminderNotification(notification)).toBe(true)
    })

    it('returns false for other local notifications', () => {
      const notification = { id: 'local:other_trigger' } as InAppNotification

      expect(isBackupReminderNotification(notification)).toBe(false)
    })
  })
})
