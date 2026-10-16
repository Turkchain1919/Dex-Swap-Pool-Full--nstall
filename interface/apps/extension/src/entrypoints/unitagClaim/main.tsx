// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../../../../../index.d.ts" />
// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../../../.wxt/wxt.d.ts" />

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { prefetchExtensionStatsigUserId } from 'src/app/core/StatsigProvider'
import UnitagClaimApp from 'src/app/core/UnitagClaimApp'
import { applyInitialThemeClass } from 'src/app/utils/applyInitialThemeClass'
import { initializeReduxStore } from 'src/store/store'
import { logger } from 'utilities/src/logger/logger'
// oxlint-disable-next-line typescript/no-explicit-any -- Global polyfill cleanup requires any type for runtime modification
;(globalThis as any).regeneratorRuntime = undefined

async function makeUnitagClaim(): Promise<void> {
  function initUnitagClaim(): void {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- DOM unitag claim root element guaranteed to exist in extension
    const container = document.getElementById('unitag-claim-root')!
    const root = createRoot(container)

    root.render(
      <StrictMode>
        <UnitagClaimApp />
      </StrictMode>,
    )
  }

  prefetchExtensionStatsigUserId()
  initializeReduxStore({ readOnly: true })

  try {
    // The root `.dark` class must be set before the first React commit — the theme hooks read it at render time
    await applyInitialThemeClass()
  } catch (error) {
    logger.error(error, {
      tags: { file: 'main.tsx', function: 'makeUnitagClaim' },
    })
  }

  initUnitagClaim()
}

void makeUnitagClaim()
