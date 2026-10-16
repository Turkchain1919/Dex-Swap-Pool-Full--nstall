/** No-ops on native — web bottom sheets (and their Escape handling) are web-only. */
export function useSheetEscapeToClose(_params: { isOpen: boolean; onClose?: () => void }): void {}

export function markRadixEscapePreventedBySheet(_event: KeyboardEvent): void {}
