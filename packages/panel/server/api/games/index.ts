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
} from "../../types"
import { Hono } from "hono"
import {
  exploreLookupTable,
  getBook,
  getForceKeys,
  getGameById,
  getGameInfo,
  loadOrCreatePanelGameConfig,
  loadSummaryFile,
  savePanelGameConfig,
} from "../../lib/utils"
import { zValidator } from "@hono/zod-validator"
import z from "zod"
import chalk from "chalk"
import qs from "qs"
import { count } from "console"

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
  await game.runTasks({
    _internal_ignore_args: true,
    doSimulation: true,
    simulationOpts: {
      panelPort: c.get("config").port,
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
          count: z.number().int().min(1),
          startingBalance: z.number().int().min(1),
        }),
        balanceMode: z.enum(["shared", "fresh"]),
        betGroups: z
          .object({
            id: z.string(),
            mode: z.string(),
            betAmount: z.number().min(0.1),
            spins: z.number().int().min(1),
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

export default app
