import { createMiddleware } from "hono/factory"
import { Variables } from ".."
import { loadOrCreatePanelGameConfig } from "../lib/utils"

// Middleware to sync reel set data from game with panel config file
export const syncData = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const games = c.get("config").games

  for (const game of games) {
    if (!game.getMetadata().isCustomRoot) continue
    const config = loadOrCreatePanelGameConfig(game)
  }

  await next()
})
