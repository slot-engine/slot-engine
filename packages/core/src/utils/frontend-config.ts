import { writeJsonFile } from "../../utils"
import { GameConfig, GameMetadata } from "../game-config"

export function createFrontendConfig(config: GameConfig, meta: GameMetadata) {
  const path = meta.paths.frontendConfig

  const gameModes = Object.values(config.gameModes).map((gm) => ({
    name: gm.name,
    cost: gm.cost,
    rtp: gm.rtp,
  }))

  const reelSets = new Map<string, string[][]>()

  Object.values(config.gameModes).forEach((gm) => {
    gm.reelSets.forEach((reelSet) => {
      reelSet.associatedGameModeName = gm.name
      reelSet.generateReels(config)
      if (!reelSets.has(reelSet.id)) {
        reelSets.set(
          reelSet.id,
          reelSet.reels.map((reel) => reel.map((s) => s.id)),
        )
      }
    })
  })

  const frontendConfig = {
    name: config.name,
    maxWin: config.maxWinX,
    padSymbols: config.padSymbols,
    symbols: Array.from(config.symbols.values()).map((s) => ({
      id: s.id,
      pays: s.pays,
    })),
    gameModes,
    reelSets: Object.fromEntries(reelSets),
  }

  writeJsonFile(path, frontendConfig)
}
