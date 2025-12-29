import fs from "fs"
import path from "path"
import { Context } from "hono"
import { Variables } from ".."
import type { SimulationSummary, SlotGame } from "@slot-engine/core/types"
import { PANEL_GAME_CONFIG_FILE } from "./constants"
import { PanelGameConfig } from "../types"
import chalk from "chalk"

export function getGameById(gameId: string, c: Context<{ Variables: Variables }>) {
  const games = c.get("config").games
  return games.find((g) => g.getConfig().id === gameId)
}

export function getGameInfo(game: SlotGame) {
  const conf = game.getConfig()
  const meta = game.getMetadata()

  return {
    id: conf.id,
    name: conf.name,
    path: meta.rootDir,
    maxWin: conf.maxWinX,
    isValid: meta.isCustomRoot,
    modes: Object.values(conf.gameModes).map((mode) => ({
      name: mode.name,
      cost: mode.cost,
      rtp: mode.rtp,
    })),
  }
}

export function loadOrCreatePanelGameConfig(game: SlotGame | undefined) {
  if (!game?.getMetadata().isCustomRoot) return

  const filePath = path.join(game.getMetadata().rootDir, PANEL_GAME_CONFIG_FILE)
  const exists = fs.existsSync(filePath)
  let isFileBroken = false

  if (exists) {
    const config = JSON.parse(
      fs.readFileSync(filePath, {
        encoding: "utf-8",
      }),
    ) as Partial<PanelGameConfig>

    const propsToCheck = [
      config.id,
      config.simulation,
      config.simulation?.concurrency,
      config.simulation?.maxPendingSims,
      config.simulation?.maxDiskBuffer,
      config.simulation?.simRunsAmount,
      config.forceStop,
    ]

    isFileBroken = propsToCheck.some((p) => p === undefined)

    if (!isFileBroken) {
      return config as PanelGameConfig
    }
  }

  // File does not exist or is broken, create a new one
  const defaultConfig: PanelGameConfig = {
    id: game.getConfig().id,
    simulation: {
      simRunsAmount: {},
      concurrency: 8,
      maxPendingSims: 25,
      maxDiskBuffer: 150,
    },
    forceStop: false,
  }

  fs.writeFileSync(filePath, JSON.stringify(defaultConfig, null, 2), "utf-8")

  if (isFileBroken) {
    console.warn(
      chalk.yellow(
        `Panel game config file for game "${game.getConfig().name}" was broken or outdated. It was reset to default values.`,
      ),
    )
  }

  if (!exists) {
    console.log(
      chalk.gray(
        `Created new panel game config file for game "${game.getConfig().name}".`,
      ),
    )
  }

  return defaultConfig
}

export function savePanelGameConfig(game: SlotGame, config: PanelGameConfig) {
  const filePath = path.join(game.getMetadata().rootDir, PANEL_GAME_CONFIG_FILE)
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8")
  return config
}

export function loadSummaryFile(game: SlotGame) {
  const meta = game.getMetadata()
  const filePath = path.join(meta.rootDir, meta.outputDir, "simulation_summary.json")
  if (!fs.existsSync(filePath)) return

  const data = JSON.parse(
    fs.readFileSync(filePath, {
      encoding: "utf-8",
    }),
  ) as SimulationSummary

  return data
}
