import { Variables } from "../.."
import {
  APIGamesResponse,
  APIGameResponse,
  APIMessageResponse,
  APIGameInfoResponse,
  APIGamePostSimConfResponse,
  APIGameGetSimConfResponse,
} from "../../types"
import { Hono } from "hono"
import {
  getGameById,
  getGameInfo,
  loadOrCreatePanelGameConfig,
  savePanelGameConfig,
} from "../../lib/utils"
import { zValidator } from "@hono/zod-validator"
import z from "zod"

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

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const config = loadOrCreatePanelGameConfig(game)

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

    if (!game) {
      return c.json<APIMessageResponse>({ message: "Not found" }, 404)
    }

    const data = c.req.valid("json")
    const config = loadOrCreatePanelGameConfig(game)

    savePanelGameConfig(game, {
      ...config,
      simulation: data,
    })

    return c.json<APIGamePostSimConfResponse>(data)
  },
)

export default app
