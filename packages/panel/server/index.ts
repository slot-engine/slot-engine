import fs from "fs/promises"
import chalk from "chalk"
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { SlotGame } from "@slot-engine/core/types"
import gamesHandler from "./api/games"
import { statusHandler } from "./api/status"
import { syncData } from "./middleware/sync-data"
import { startWsServer } from "../ws/server"
import { Server } from "node:http"
import path from "path"
import type { LgsAdapter } from "./types"

const DEFAULT_CONFIG: PanelConfig = {
  port: 7770,
  games: [],
}

export type Variables = {
  config: PanelConfig
}

const packageRoot = path.resolve(__dirname, "..")
const distClientPath = path.join(packageRoot, "dist-client")

export const app = new Hono<{ Variables: Variables }>()

export function createPanel(opts?: PanelOptions): Panel {
  const panelConfig = { ...DEFAULT_CONFIG, ...opts }

  // Add config to context
  app.use("*", async (c, next) => {
    c.set("config", panelConfig)
    await next()
  })

  // API routes
  app.use("/api/*", syncData)
  app.get("/api/status", ...statusHandler)
  app.route("/api/games", gamesHandler)

  if (panelConfig.lgs) {
    if (panelConfig.lgs.port !== undefined) {
      throw new Error(
        "An LGS attached to the panel is served on the panel's port; remove the LGS port option.",
      )
    }
    panelConfig.lgs.registerGames(panelConfig.games)
    app.route("/", panelConfig.lgs.router())
  }

  // Serve frontend assets
  app.use(
    "/assets/*",
    serveStatic({
      root: path.join(distClientPath, "assets/"),
    }),
  )

  // Serve frontend routes
  app.use(
    "/*",
    serveStatic({
      root: distClientPath,
    }),
  )

  app.get("*", async (c) => {
    const html = await fs.readFile(path.join(distClientPath, "index.html"), "utf8")
    return c.html(html)
  })

  const start = () => {
    const server = serve({
      fetch: app.fetch,
      port: panelConfig.port,
    })

    startWsServer(server as Server, panelConfig)

    console.log("\n")
    console.log(
      `⚡️ ${chalk.cyan("Slot Engine Panel")} is running on ${chalk.cyan(`http://localhost:${panelConfig.port}`)}`,
    )
    console.log(`:: ${panelConfig.games.length} games loaded`)
    if (panelConfig.lgs) {
      console.log(
        `:: LGS ${chalk.cyan(`"${panelConfig.lgs.name}"`)} attached, rgs_url=${chalk.cyan(`localhost:${panelConfig.port}`)}`,
      )
    }
  }

  return { start }
}

interface PanelOptions {
  games?: Array<SlotGame<any, any, any>>
  /** A local gaming server served on the panel port, e.g. `EngineLgs` from `@slot-engine/lgs`. */
  lgs?: LgsAdapter
}

export interface PanelConfig {
  port: number
  games: Array<SlotGame<any, any, any>>
  lgs?: LgsAdapter
}

export interface Panel {
  start: () => void
}
