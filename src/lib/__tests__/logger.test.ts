import { describe, it, expect } from "vitest"
import { logger } from "../logger"

describe("logger", () => {
  it("exports a pino logger instance", () => {
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe("function")
    expect(typeof logger.error).toBe("function")
    expect(typeof logger.warn).toBe("function")
    expect(typeof logger.debug).toBe("function")
  })

  it("can create child loggers", () => {
    const child = logger.child({ component: "test" })
    expect(child).toBeDefined()
    expect(typeof child.info).toBe("function")
  })
})
