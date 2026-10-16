// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../../../../../index.d.ts" />
// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../../../.wxt/wxt.d.ts" />

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PopupApp from 'src/app/core/PopupApp'
import { prefetchExtensionStatsigUserId } from 'src/app/core/StatsigProvider'
import { applyInitialThemeClass } from 'src/app/utils/applyInitialThemeClass'
import { initializeReduxStore } from 'src/store/store'
import { logger } from 'utilities/src/logger/logger'
// oxlint-disable-next-line typescript/no-explicit-any -- Global polyfill cleanup requires any type for runtime modification
;(globalThis as any).regeneratorRuntime = undefined

async function makeFallbackPopup(): Promise<void> {
  function initFallbackPopup() {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- popup root element guaranteed to exist in extension
    const container = document.getElementById('fallback-popup-root')!
    const root = createRoot(container)

    root.render(
      <StrictMode>
        <PopupApp />
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
      tags: { file: 'main.tsx', function: 'makeFallbackPopup' },
    })
  }

  initFallbackPopup()
}

void makeFallbackPopup()
