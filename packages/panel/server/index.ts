import fs from "fs/promises"
import chalk from "chalk"
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import {
  AnyGameModes,
  AnySymbols,
  AnyUserData,
  type InferGameType,
} from "@slot-engine/core"
import { gamesHandler } from "./api/games"
import { statusHandler } from "./api/status"

const DEFAULT_CONFIG: PanelConfig = {
  port: 7770,
  games: [],
}

export type Variables = {
  config: PanelConfig
}

export const app = new Hono<{ Variables: Variables }>()

export function createPanel(opts?: PanelOptions): Panel {
  const panelConfig = { ...DEFAULT_CONFIG, ...opts }

  // Add config to context
  app.use("*", async (c, next) => {
    c.set("config", panelConfig)
    await next()
  })

  // API routes
  app.get("/api/status", ...statusHandler)
  app.get("/api/games", ...gamesHandler)

  // Serve frontend assets
  app.use(
    "/assets/*",
    serveStatic({
      root: "./dist-client/assets/",
    }),
  )

  // Serve frontend routes
  app.use(
    "/*",
    serveStatic({
      root: "./dist-client",
    }),
  )

  app.get("*", async (c) => {
    const html = await fs.readFile("./dist-client/index.html", "utf8")
    return c.html(html)
  })

  const run = () => {
    serve({
      fetch: app.fetch,
      port: panelConfig.port,
    })

    console.log("\n")
    console.log(
      `⚡️ ${chalk.cyan("Slot Engine Panel")} is running on ${chalk.cyan(`http://localhost:${panelConfig.port}`)}`,
    )
  }

  return { run }
}

interface PanelOptions {
  port?: number
  games?: Array<InferGameType<any, any, any>>
}

interface PanelConfig {
  port: number
  games: Array<InferGameType<AnyGameModes, AnySymbols, AnyUserData>>
}

export interface Panel {
  run: () => void
}
