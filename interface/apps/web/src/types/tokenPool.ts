export type TokenPoolState = { status: 'loading' } | { status: 'error' } | { status: 'success'; poolCount: number }
