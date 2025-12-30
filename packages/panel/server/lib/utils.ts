import fs from "fs"
import fsAsync from "fs/promises"
import readline from "readline"
import path from "path"
import { Context } from "hono"
import { Variables } from ".."
import { parseLookupTable, type SimulationSummary, type SlotGame } from "@slot-engine/core"
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

export async function exploreLookupTable(opts: {
  game: SlotGame
  mode: string
  cursor?: string
  take: number
}) {
  const { game, mode, cursor, take } = opts

  const meta = game.getMetadata()
  const filePath = path.join(
    meta.rootDir,
    meta.outputDir,
    "publish_files",
    `lookUpTable_${mode}_0.csv`,
  )
  if (!fs.existsSync(filePath)) return

  const indexPath = path.join(meta.rootDir, meta.outputDir, `lookUpTable_${mode}.index`)
  const offset = parseInt(cursor || "0", 10)

  const { rows, nextCursor } = await readLutRows(filePath, indexPath, offset, take)

  return {
    lut: parseLookupTable(rows.join("\n")),
    nextCursor,
  }
}

async function lutOffsetForRow(indexPath: string, row: number) {
  if (!fs.existsSync(indexPath)) return

  const indexFile = await fsAsync.open(indexPath, "r")
  const buffer = Buffer.alloc(8)
  await indexFile.read(buffer, 0, 8, row * 8)
  await indexFile.close()

  return Number(buffer.readBigUInt64LE())
}

async function readLutRows(
  filePath: string,
  indexPath: string,
  offset: number,
  take: number,
) {
  const byteOffset = await lutOffsetForRow(indexPath, offset)
  const stream = fs.createReadStream(filePath, { start: byteOffset })
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  })

  const rows = []
  let nextCursor: number | null = null

  for await (const line of rl) {
    rows.push(line)
    if (rows.length > take) {
      nextCursor = offset + rows.length
      rows.pop()
      break
    }
  }

  stream.destroy()

  return {
    rows,
    nextCursor,
  }
}
