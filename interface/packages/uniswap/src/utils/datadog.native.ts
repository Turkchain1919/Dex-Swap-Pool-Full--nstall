import { NotImplementedError } from 'utilities/src/errors'

export function initializeDatadog(_opts: { appName: string; buildType?: string }): void {
  throw new NotImplementedError('initializeDatadog')
}
