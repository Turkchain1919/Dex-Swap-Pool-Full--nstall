export enum AuthActionType {
  Lock = 'lock',
}

export interface LockParams {
  type: AuthActionType.Lock
}
