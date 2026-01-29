import pino from "pino"

export const logger = pino({
  name: "hallunot",
  level: process.env.LOG_LEVEL ?? "info",
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})
