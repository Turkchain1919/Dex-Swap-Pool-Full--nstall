declare global {
  namespace NodeJS {
    // All process.env values used by this package should be listed here
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test'
      ENVIRONMENT?: string
      BUILD_ENV?: string
      IS_E2E_TEST?: string
      VITEST_WORKER_ID?: string
      JEST_WORKER_ID?: string
    }
  }
}

export {}
