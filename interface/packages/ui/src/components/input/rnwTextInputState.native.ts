/**
 * Native no-op: React Native's own TextInput manages the TextInputState singleton itself. Only
 * the web leg (./rnwTextInputState.web.ts) needs to point it at the rebuilt Input's host node.
 */
export function registerFocusedInput(_node: unknown): void {}

export function unregisterFocusedInput(): void {}
