import { Variables } from "../.."
import {
  APIGamesResponse,
  APIGameResponse,
  APIMessageResponse,
  APIGameInfoResponse,
  APIGamePostSimConfResponse,
  APIGameGetSimConfResponse,
  APIGameSimSummaryResponse,
  APIGameExploreResponse,
  APIGameExploreBookResponse,
  APIGameForceKeysResponse,
  APIGameGetBetSimConfResponse,
  APIGamePostBetSimConfResponse,
  APIGamePostBetSimRunResponse,
  APIGameStatsSummaryResponse,
  APIGameStatsPayoutsResponse,
  APIGameReelSetsResponse,
  APIGameGetReelSetResponse,
} from "../../types"
import { Hono } from "hono"
import {
  assignColorsToSymbols,
  exploreLookupTable,
  getBook,
  getForceKeys,
  getGameById,
  getGameInfo,
  getReelSets,
  loadOrCreatePanelGameConfig,
  loadStatsPayoutsFile,
  loadStatsSummaryFile,
  loadSummaryFile,
  savePanelGameConfig,
  writeReelSet,
} from "../../lib/utils"
import { zValidator } from "@hono/zod-validator"
import fs from "fs"
import { glob } from "fs/promises"
import z from "zod"
import chalk from "chalk"
import qs from "qs"
import { betSimulation } from "../../lib/bet-simulation"
import { SYMBOL_COLORS } from "../../lib/constants"
import { color } from "@uiw/react-color"

const app = new Hono<{ Variables: Variables }>()

app.get("/", (c) => {
  const games = c.get("config").games

  const data = games.map((game) => {
    const conf = game.getConfig()
    const meta = game.getMetadata()

    return {
      id: conf.id,
      name: conf.name,
      modes: Object.keys(conf.gameModes).length,
      isValid: meta.isCustomRoot,
      path: meta.rootDir,
    }
  })

  return c.json<APIGamesResponse>({ games: data })
})

app.get("/:id", (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const conf = game.getConfig()
  const meta = game.getMetadata()

  if (!meta.isCustomRoot) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const data = {
    id: conf.id,
    name: conf.name,
    path: meta.rootDir,
  }

  return c.json<APIGameResponse>(data)
})

app.get("/:id/info", (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const data = getGameInfo(game)

  return c.json<APIGameInfoResponse>(data)
})

app.get("/:id/sim-conf", (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)
  const config = loadOrCreatePanelGameConfig(game)

  if (!game || !config) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  return c.json<APIGameGetSimConfResponse>(config.simulation)
})

app.post(
  "/:id/sim-conf",
  zValidator(
    "json",
    z.object({
      concurrency: z.number().min(1).max(100),
      simRunsAmount: z.record(z.string(), z.number().int()),
      maxPendingSims: z.number().int(),
      maxDiskBuffer: z.number().int(),
      makeUncompressedBooks: z.boolean().optional(),
    }),
  ),
  (c) => {
    const gameId = c.req.param("id")
    const game = getGameById(gameId, c)
    const config = loadOrCreatePanelGameConfig(game)

    if (!game || !config) {
      return c.json<APIMessageResponse>({ message: "Not found" }, 404)
    }

    const data = c.req.valid("json")

    savePanelGameConfig(game, {
      ...config,
      simulation: data,
    })

    return c.json<APIGamePostSimConfResponse>(data)
  },
)

app.post("/:id/sim-run", async (c) => {
  const gameId = c.req.param("id")
  const origGame = getGameById(gameId, c)
  const config = loadOrCreatePanelGameConfig(origGame)

  if (!origGame || !config) {
    console.warn(chalk.yellow(`Game with ID ${gameId} not found for simulation start`))
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  savePanelGameConfig(origGame, {
    ...config,
    forceStop: false,
  })

  // Clone game to avoid mutating the original
  const game = origGame.clone()

  game.configureSimulation(config.simulation)
  game.configureOptimization({
    gameModes: {},
  })
  await game.runTasks({
    _internal_ignore_args: true,
    doSimulation: true,
    simulationOpts: {
      panelPort: c.get("config").port,
    },
    doAnalysis: true,
    analysisOpts: {
      gameModes: Object.keys(config.simulation.simRunsAmount),
    },
  })

  return c.json<APIMessageResponse>({ message: "Done" })
})

app.post("/:id/sim-stop", (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)
  const config = loadOrCreatePanelGameConfig(game)

  if (!game || !config) {
    console.warn(chalk.yellow(`Game with ID ${gameId} not found for simulation stop`))
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  savePanelGameConfig(game, {
    ...config,
    forceStop: true,
  })

  return c.json<APIMessageResponse>({ message: "Done" })
})

app.get("/:id/sim-summary", (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const summary = loadSummaryFile(game)

  if (!summary) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  return c.json<APIGameSimSummaryResponse>({ summary })
})

app.get("/:id/force-keys/:mode", (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const mode = c.req.param("mode")
  const forceKeys = getForceKeys({ game, mode })

  if (!forceKeys) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  return c.json<APIGameForceKeysResponse>({ forceKeys })
})

app.get("/:id/explore/:mode", async (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const url = new URL(c.req.url)
  const filter = qs.parse(url.search, { ignoreQueryPrefix: true }).filter

  const mode = c.req.param("mode")
  const cursor = c.req.query("cursor") || undefined
  const take = 100

  const lut = await exploreLookupTable({
    game,
    mode,
    cursor,
    take,
    filter,
  })

  if (!lut) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  return c.json<APIGameExploreResponse>(lut)
})

app.get("/:id/explore/:mode/:bookId", async (c) => {
  const gameId = c.req.param("id")
  const bookId = parseInt(c.req.param("bookId"), 10)
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const mode = c.req.param("mode")

  const book = await getBook({ game, mode, bookId })

  if (!book) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  return c.json<APIGameExploreBookResponse>({ book })
})

app.get("/:id/bet-sim-conf", (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)
  const config = loadOrCreatePanelGameConfig(game)

  if (!game || !config) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  return c.json<APIGameGetBetSimConfResponse>({ configs: config.betSimulations })
})

app.post(
  "/:id/bet-sim-conf",
  zValidator(
    "json",
    z
      .object({
        id: z.string(),
        players: z.object({
          count: z.number().int().min(1).max(2000),
          startingBalance: z.number().int().min(1).max(20_000),
        }),
        betGroups: z
          .object({
            id: z.string(),
            mode: z.string(),
            betAmount: z.number().min(0.1).multipleOf(0.1).max(1000),
            spins: z.number().int().min(1).max(5000),
          })
          .array(),
      })
      .array(),
  ),
  (c) => {
    const gameId = c.req.param("id")
    const game = getGameById(gameId, c)
    const config = loadOrCreatePanelGameConfig(game)

    if (!game || !config) {
      return c.json<APIMessageResponse>({ message: "Not found" }, 404)
    }

    const data = c.req.valid("json")

    savePanelGameConfig(game, {
      ...config,
      betSimulations: data,
    })

    return c.json<APIGamePostBetSimConfResponse>({ configs: data })
  },
)

app.post("/:id/bet-sim-run", async (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)
  const config = loadOrCreatePanelGameConfig(game)

  if (!game || !config) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const configId = c.req.query("configId")
  const simConfig = config.betSimulations.find((conf) => conf.id === configId)

  if (!simConfig) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const results = await betSimulation(game, simConfig)

  return c.json<APIGamePostBetSimRunResponse>({ results })
})

app.get("/:id/stats-payouts", (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const statistics = loadStatsPayoutsFile(game)

  if (!statistics) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  return c.json<APIGameStatsPayoutsResponse>({ statistics })
})

app.get("/:id/stats-summary", (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const statistics = loadStatsSummaryFile(game)

  if (!statistics) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  return c.json<APIGameStatsSummaryResponse>({ statistics })
})

app.get("/:id/reel-sets", async (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const reelSets = await getReelSets(game)

  return c.json<APIGameReelSetsResponse>({ reelSets })
})

app.get("/:id/reel-sets/:rs", async (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const buildPath = game.getMetadata().rootDir
  const reelSetFile = c.req.param("rs")
  const reelSetPaths: string[] = []
  for await (const p of glob(`${buildPath}/**/${reelSetFile}`)) {
    reelSetPaths.push(p)
  }

  if (reelSetPaths.length === 0) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  if (reelSetPaths.length > 1) {
    return c.json<APIMessageResponse>(
      { message: `Multiple reels with name ${reelSetFile} found!` },
      500,
    )
  }

  const content = fs.readFileSync(reelSetPaths[0]!, "utf-8")
  const rows = content.split("\n").filter((line) => line.trim() !== "")
  const reels: Array<Array<{ id: string; symbol: string }>> = []

  rows.forEach((row) => {
    const symsInRow = row.split(",")
    symsInRow.forEach((symbol, ridx) => {
      if (!symbol.trim()) return
      if (!reels[ridx]) {
        reels[ridx] = []
      }
      reels[ridx]!.push({
        symbol,
        id: crypto.randomUUID().slice(0, 5), // client needs stable id
      })
    })
  })

  const config = loadOrCreatePanelGameConfig(game)
  let colors: Record<string, string> = {}
  if (config) {
    const reelSetConfig = config.reelSets.find(
      (rs) => rs.name === reelSetFile && rs.path === reelSetPaths[0],
    )
    if (reelSetConfig) {
      colors = reelSetConfig.symbolColors
    } else {
      colors = assignColorsToSymbols(game)
    }
  }

  const reelSet = {
    path: reelSetPaths[0]!,
    name: reelSetFile,
    reels,
    colors,
  }

  const options = {
    symbols: Array.from(game.getConfig().symbols.keys()),
  }

  return c.json<APIGameGetReelSetResponse>({ reelSet, options })
})

app.post(
  "/:id/reel-sets/:rs",
  zValidator(
    "json",
    z.object({
      reels: z.array(z.string().array()),
      colors: z.record(z.string(), z.string()),
    }),
  ),
  async (c) => {
    const gameId = c.req.param("id")
    const game = getGameById(gameId, c)
    const config = loadOrCreatePanelGameConfig(game)

    if (!game || !config) {
      return c.json<APIMessageResponse>({ message: "Game Not found" }, 404)
    }

    const reelSetFile = c.req.param("rs")
    const reelSets = await getReelSets(game)
    const rs = reelSets.find((r) => r.name === reelSetFile)

    if (!rs) {
      return c.json<APIMessageResponse>({ message: "Reelset Not found" }, 404)
    }

    const data = c.req.valid("json")

    const newReelsets = config.reelSets.map((r) => {
      if (r.name === reelSetFile && r.path === rs.path) {
        return {
          ...r,
          symbolColors: data.colors,
        }
      }
      return r
    })

    writeReelSet(rs.path, data.reels)

    savePanelGameConfig(game, {
      ...config,
      reelSets: newReelsets,
    })

    return c.json<APIMessageResponse>({ message: "ok" })
  },
)

export default app
