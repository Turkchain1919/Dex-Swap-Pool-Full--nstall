// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../../../../../index.d.ts" />
// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../../../.wxt/wxt.d.ts" />

import React from 'react'
import { createRoot } from 'react-dom/client'
import OnboardingApp from 'src/app/core/OnboardingApp'
import { prefetchExtensionStatsigUserId } from 'src/app/core/StatsigProvider'
import { applyInitialThemeClass } from 'src/app/utils/applyInitialThemeClass'
import { ExtensionAppLocation, StoreSynchronization } from 'src/store/storeSynchronization'
import { logger } from 'utilities/src/logger/logger'
// oxlint-disable-next-line typescript/no-explicit-any -- Global polyfill cleanup requires any type for runtime modification
;(globalThis as any).regeneratorRuntime = undefined

async function makeOnboarding(): Promise<void> {
  function initOnboarding() {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- DOM onboarding root element guaranteed to exist in extension
    const container = document.getElementById('onboarding-root')!
    const root = createRoot(container)

    root.render(
      <React.StrictMode>
        <OnboardingApp />
      </React.StrictMode>,
    )
  }

  prefetchExtensionStatsigUserId()
  StoreSynchronization.init(ExtensionAppLocation.Tab)

  try {
    // The root `.dark` class must be set before the first React commit — the theme hooks read it at render time
    await applyInitialThemeClass()
  } catch (error) {
    logger.error(error, {
      tags: { file: 'main.tsx', function: 'makeOnboarding' },
    })
  }

  initOnboarding()
}

void makeOnboarding()
