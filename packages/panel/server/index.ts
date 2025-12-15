import fs from "fs/promises"
import chalk from "chalk"
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { type InferGameType } from "@slot-engine/core"
import { api } from "./api"

const DEFAULT_CONFIG: PanelConfig = {
  port: 7770,
  games: [],
}

export function createPanel(config: PanelConfig = DEFAULT_CONFIG): Panel {
  const app = new Hono()

  // Serve API
  app.route("/api", api)

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
      port: config.port,
    })

    console.log("\n")
    console.log(
      `⚡️ ${chalk.cyan("Slot Engine Panel")} is running on ${chalk.cyan(`http://localhost:${config.port}`)}`,
    )
  }

  return { run }
}

type SlotGame = InferGameType<any, any, any>

export interface PanelConfig {
  port?: number
  games?: SlotGame[]
}

export interface Panel {
  run: () => void
}
