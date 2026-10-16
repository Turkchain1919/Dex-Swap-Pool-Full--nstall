import { PlatformSplitStubError } from 'utilities/src/errors'

export function initializeDatadog(_opts: { appName: string; buildType?: string }): Promise<void> {
  throw new PlatformSplitStubError('initializeDatadog')
}
