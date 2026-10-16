import 'src/entrypoints/tailwindDevTest.content/style.css'
import { createRoot, Root } from 'react-dom/client'
import TailwindDevTest from 'src/app/components/tailwindDevTest/TailwindDevTest'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { defineContentScript } from 'wxt/utils/define-content-script'

/**
 * Dev-only content script proving Tailwind stylesheet delivery into the
 * isolated-world context. Mounts a mycelium Flex inside
 * a shadow root; the stylesheet import above is compiled by @tailwindcss/vite
 * and injected into the shadow root by `cssInjectionMode: 'ui'`.
 *
 * Excluded from production builds by the `entrypoints:found` hook in wxt.config.ts.
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi<Root>(ctx, {
      name: 'uniswap-tailwind-dev-test',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const root = createRoot(container)
        root.render(<TailwindDevTest context="content-script" />)
        return root
      },
      onRemove: (root) => {
        root?.unmount()
      },
    })
    ui.mount()
  },
})
