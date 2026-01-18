import fs from "fs"
import zlib from "zlib"
import fsAsync, { glob } from "fs/promises"
import readline from "readline"
import path from "path"
import { Context } from "hono"
import { Variables } from ".."
import {
  parseLookupTable,
  parseLookupTableSegmented,
  Statistics,
  type PayoutStatistics,
  type RecordItem,
  type SimulationSummary,
  type SlotGame,
  type WrittenBook,
} from "@slot-engine/core"
import { PANEL_GAME_CONFIG_FILE, SYMBOL_COLORS } from "./constants"
import { PanelGameConfig } from "../types"
import chalk from "chalk"

export function round(value: number, decimals: number) {
  return Number(Math.round(Number(value + "e" + decimals)) + "e-" + decimals)
}

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
      config.betSimulations,
      config.reelSets,
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
    betSimulations: [],
    reelSets: [],
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

export function loadStatsSummaryFile(game: SlotGame) {
  const meta = game.getMetadata()
  const filePath = meta.paths.statsSummary
  if (!fs.existsSync(filePath)) return

  const data = JSON.parse(
    fs.readFileSync(filePath, {
      encoding: "utf-8",
    }),
  ) as Statistics[]

  return data
}

export function loadStatsPayoutsFile(game: SlotGame) {
  const meta = game.getMetadata()
  const filePath = meta.paths.statsPayouts
  if (!fs.existsSync(filePath)) return

  const data = JSON.parse(
    fs.readFileSync(filePath, {
      encoding: "utf-8",
    }),
  ) as PayoutStatistics[]

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

  const lutPath = meta.paths.lookupTablePublish(mode)
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

export async function readLutRows(opts: {
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

  /**
   * 1) Get meta object to find which worker made that book
   * 2) Load index file by worker number and find chunk number for that book
   * 3) Load chunk file and find the book
   */

  const bookIndexMetaPath = meta.paths.booksIndexMeta(mode)
  if (!fs.existsSync(bookIndexMetaPath)) return

  const booksMeta = JSON.parse(
    fs.readFileSync(bookIndexMetaPath, {
      encoding: "utf-8",
    }),
  ) as Array<{ worker: number; chunks: number; simStart: number; simEnd: number }>

  const metaObj = booksMeta.find((m) => bookId >= m.simStart && bookId <= m.simEnd)
  if (!metaObj) return

  const bookIndexPath = meta.paths.booksIndex(mode, metaObj.worker)
  if (!fs.existsSync(bookIndexPath)) return

  const stream = fs.createReadStream(bookIndexPath)
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  })

  let chunk = 0

  for await (const l of rl) {
    const line = l.trim()
    if (!line) continue

    const [id, workerStr, chunkStr] = line.split(",")
    if (parseInt(id!, 10) !== bookId) continue
    chunk = parseInt(chunkStr!, 10)
    break
  }

  stream.destroy()

  const bookChunkPath = meta.paths.booksChunk(mode, metaObj.worker, chunk)
  if (!fs.existsSync(bookChunkPath)) return

  const compressedData = fs.readFileSync(bookChunkPath)
  const decompressedData = zlib.zstdDecompressSync(compressedData)
  const bookLines = decompressedData.toString("utf-8").split("\n")

  let book: WrittenBook | undefined

  for (const l of bookLines) {
    const line = l.trim()
    if (!line) continue

    const record = JSON.parse(line) as WrittenBook
    if (record.id === bookId) {
      book = record
      break
    }
  }

  if (!book) return

  return book
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

export async function getReelSets(game: SlotGame) {
  const buildPath = game.getMetadata().rootDir
  const reelSetPaths: string[] = []
  for await (const p of glob(`${buildPath}/**/reels_*.csv`)) {
    reelSetPaths.push(p)
  }

  const reelSets = reelSetPaths.map((p) => {
    const filename = path.basename(p)
    return {
      path: p,
      name: filename,
    }
  })

  return reelSets
}

export function assignColorsToSymbols(game: SlotGame) {
  const symbols = game.getConfig().symbols
  const symbolColors: Record<string, string> = {}
  const colors = Object.values(SYMBOL_COLORS)
  let colorIndex = 0

  for (const symbol of symbols.values()) {
    symbolColors[symbol.id] = colors[colorIndex]!
    colorIndex++
    if (colorIndex >= colors.length) {
      colorIndex = 0
    }
  }

  return symbolColors
}
