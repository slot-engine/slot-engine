import fs from "fs"
import fsAsync from "fs/promises"
import readline from "readline"
import path from "path"
import { Context } from "hono"
import { Variables } from ".."
import {
  parseLookupTable,
  parseLookupTableSegmented,
  type RecordItem,
  type SimulationSummary,
  type SlotGame,
  type WrittenBook,
} from "@slot-engine/core"
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
  const filePath = meta.paths.simulationSummary
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
  filter?: string | qs.ParsedQs | (string | qs.ParsedQs)[]
}) {
  const { game, mode, cursor, take, filter } = opts
  const offset = parseInt(cursor || "0", 10)
  const meta = game.getMetadata()

  const lutPath = meta.paths.lookupTable(mode)
  const lutSegmentedPath = meta.paths.lookupTableSegmented(mode)

  if (!fs.existsSync(lutPath)) return
  if (!fs.existsSync(lutSegmentedPath)) return

  const indexPath = meta.paths.lookupTableIndex(mode)
  const indexSegmentedPath = meta.paths.lookupTableSegmentedIndex(mode)

  const bookIds = await filterForceRecords({
    game,
    mode,
    filter: filter as Record<string, string> | undefined,
  })

  const { rows, nextCursor } = await readLutRows({
    path: lutPath,
    indexPath,
    offset,
    take,
    bookIds,
  })
  const segmented = await readLutRows({
    path: lutSegmentedPath,
    indexPath: indexSegmentedPath,
    offset,
    take,
    bookIds,
  })

  return {
    lut: parseLookupTable(rows.join("\n")),
    lutSegmented: parseLookupTableSegmented(segmented.rows.join("\n")),
    nextCursor,
  }
}

async function getByteOffsetFromIndex(indexPath: string, row: number) {
  if (!fs.existsSync(indexPath)) return

  const indexFile = await fsAsync.open(indexPath, "r")
  const buffer = Buffer.alloc(8)
  await indexFile.read(buffer, 0, 8, row * 8)
  await indexFile.close()

  return Number(buffer.readBigUInt64LE())
}

async function readLutRows(opts: {
  path: string
  indexPath: string
  offset: number
  take: number
  bookIds?: number[]
}) {
  const { path: filePath, indexPath, offset, take, bookIds } = opts

  const hasBookIds = opts.bookIds && opts.bookIds.length > 0

  const byteOffset = await getByteOffsetFromIndex(indexPath, offset)
  const stream = fs.createReadStream(filePath, { start: byteOffset })
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  })

  const rows = []
  let rowsScanned = 0
  let nextCursor: number | null = null

  for await (const line of rl) {
    if (hasBookIds) {
      rowsScanned++
      const id = line.split(",")[0]
      if (bookIds!.includes(Number(id))) {
        rows.push(line)
      }
      if (rows.length >= take) {
        nextCursor = offset + rowsScanned
        break
      }
    } else {
      // No filters
      rows.push(line)
      if (rows.length > take) {
        nextCursor = offset + rows.length - 1 // -1 because we pop the last result
        rows.pop()
        break
      }
    }
  }

  stream.destroy()

  return {
    rows,
    nextCursor,
  }
}

export async function getBook(opts: { game: SlotGame; mode: string; bookId: number }) {
  const { game, mode, bookId } = opts
  const meta = game.getMetadata()

  const bookPath = meta.paths.books(mode)
  if (!fs.existsSync(bookPath)) return

  const indexPath = meta.paths.booksIndex(mode)
  const byteOffset = await getByteOffsetFromIndex(indexPath, bookId - 1) // -1 because index is 0-based
  const stream = fs.createReadStream(bookPath, { start: byteOffset })
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  })

  let line: string | null = null

  for await (const l of rl) {
    line = l
    break
  }

  stream.destroy()

  if (!line) return undefined

  return JSON.parse(line) as WrittenBook
}

export function getForceKeys(opts: { game: SlotGame; mode: string }) {
  const { game, mode } = opts
  const forceKeysPath = game.getMetadata().paths.forceKeys(mode)
  if (!fs.existsSync(forceKeysPath)) return

  const data = JSON.parse(
    fs.readFileSync(forceKeysPath, {
      encoding: "utf-8",
    }),
  ) as Record<string, string[]>

  return data
}

async function filterForceRecords(opts: {
  game: SlotGame
  mode: string
  filter: Record<string, string> | undefined
}) {
  const { game, mode, filter } = opts

  if (!filter || Object.keys(filter).length === 0) return []
  
  const forceFile = game.getMetadata().paths.forceRecords(mode)
  if (!fs.existsSync(forceFile)) return []

  const stream = fs.createReadStream(forceFile)
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  })

  const bookIds = new Set<number>()

  // Every unique force value fits in one line, so we can just scan the file line by line.
  for await (const l of rl) {
    // Skip empty or invalid lines, e.g. first and last lines which contain only brackets for opening/closing the array
    if (l.trim() === "" || l.length < 5) continue

    try {
      const line = l.trim().replace(/,$/, "") // Remove trailing comma if present
      const record = JSON.parse(line) as RecordItem
      let matches = true

      for (const [key, value] of Object.entries(filter)) {
        if (!record.search.find((s) => s.name === key && s.value === value)) {
          matches = false
          break
        }
        record.bookIds.forEach((id) => bookIds.add(id))
      }
    } catch (error) {
      console.log("Error parsing force record line:", error)
      continue
    }
  }

  stream.destroy()

  return Array.from(bookIds)
}
