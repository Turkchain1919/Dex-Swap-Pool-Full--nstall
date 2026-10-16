import path from 'path'
// oxlint-disable-next-line no-restricted-imports -- GraphQL fixtures need direct Playwright imports
import { test as base } from '@playwright/test'
import {
  buildTokenProjectsFallbackResponse,
  fulfillWithFallback,
  isGraphqlResponseHealthy,
} from '~/playwright/fixtures/tokenDataFallbacks'

type GraphqlFixture = {
  graphql: {
    /**
     * Intercepts a GraphQL operation and responds with a mock response.
     *
     * @param {string} operationName - The name of the GraphQL operation to intercept.
     * @param {string} mockPath - The path to the mock response file.
     * @param {Record<string, unknown>} [variables] - Optional variables to match against the request.
     *
     * If no variables are provided, all operations with the specified operationName will match and return the mock response.
     * If variables are provided, the request will only match if all variables match (case insensitive).
     */
    // oxlint-disable-next-line max-params -- biome-parity: oxlint is stricter here
    intercept: (operationName: string, mockPath: string, variables?: Record<string, unknown>) => Promise<void>
    waitForResponse: (operationName: string) => Promise<void>
  }
}

type InterceptConfig = {
  mockPath: string
  variables?: Record<string, unknown>
}

const interceptConfigs = new Map<string, InterceptConfig>()

export const test = base.extend<GraphqlFixture>({
  // auto: the TokenProjects failure fallback below must guard every spec. The 08-14 nightly
  // (run 31840878610) collapsed TokenSelectorV2 "input - opens dual-pane" on a TokenProjects 429
  // even though the spec never references this fixture — non-auto fixtures are instantiated
  // lazily, so the route was never installed for it.
  graphql: [
    async ({ page }, use) => {
      interceptConfigs.clear()

      // oxlint-disable-next-line max-params
      const intercept = async (operationName: string, mockPath: string, variables?: Record<string, unknown>) => {
        interceptConfigs.set(operationName, { mockPath, variables })
      }

      const waitForResponse = async (operationName: string) => {
        try {
          await page.waitForResponse((response) => {
            if (!response.request().url().includes('graphql')) {
              return false
            }

            const postDataBuffer = response.request().postDataBuffer()
            if (!postDataBuffer) {
              return false
            }
            const postData = postDataBuffer.toString('utf-8')
            const data = JSON.parse(postData)
            return data.operationName === operationName
          })
        } catch (error) {
          console.warn('GraphQL waitForResponse error:', error)
        }
      }

      await page.route(/(?:interface|beta).(gateway|api).uniswap.org\/v1\/graphql/, async (route) => {
        const request = route.request()
        const postData = request.postData()
        if (!postData) {
          return route.continue()
        }

        try {
          const { operationName, variables } = JSON.parse(postData)
          const config = interceptConfigs.get(operationName)

          if (config?.variables) {
            const matches = Object.keys(config.variables).every(
              (key) => variables[key]?.toString().toLowerCase() === config.variables?.[key]?.toString().toLowerCase(),
            )
            if (matches) {
              return route.fulfill({ path: path.resolve(__dirname, config.mockPath) })
            }
          } else if (config) {
            return route.fulfill({ path: path.resolve(__dirname, config.mockPath) })
          }

          // The live gateway 429-throttles CI traffic; a failed TokenProjects collapses the
          // unsearched token selector into its error state, so it gets a failure-scoped fallback
          // instead of a bare pass-through. Live healthy responses pass through untouched.
          if (operationName === 'TokenProjects') {
            return fulfillWithFallback({
              route,
              buildFallback: () => buildTokenProjectsFallbackResponse(variables?.contracts ?? []),
              isHealthy: isGraphqlResponseHealthy,
            })
          }

          return route.continue()
        } catch (error) {
          console.warn('GraphQL intercept error:', error)
          return route.continue()
        }
      })

      await use({ intercept, waitForResponse })
    },
    { auto: true },
  ],
})
