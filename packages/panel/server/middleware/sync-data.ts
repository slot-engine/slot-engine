import { createMiddleware } from "hono/factory"
import { Variables } from ".."
import {
  assignColorsToSymbols,
  getReelSets,
  loadOrCreatePanelGameConfig,
  savePanelGameConfig,
} from "../lib/utils"

// Middleware to sync reel set data from game with panel config file
export const syncData = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const games = c.get("config").games

  for (const game of games) {
    if (!game.getMetadata().isCustomRoot) continue
    const config = loadOrCreatePanelGameConfig(game)
    if (!config) continue

    const reelSets = await getReelSets(game)

    for (const rs of reelSets) {
      const existing = config.reelSets.find(
        (r) => r.name === rs.name && r.path === rs.path,
      )

      if (!existing) {
        config.reelSets.push({
          name: rs.name,
          path: rs.path,
          symbolColors: assignColorsToSymbols(game),
        })
      }
    }

    for (const rs of config.reelSets) {
      const exists = reelSets.find((r) => r.name === rs.name && r.path === rs.path)
      if (!exists) {
        config.reelSets = config.reelSets.filter(
          (r) => !(r.name === rs.name && r.path === rs.path),
        )
      }
    }

    savePanelGameConfig(game, config)
  }

  await next()
})
