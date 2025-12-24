import { SlotGame } from "@slot-engine/core"
import { Variables } from "../.."
import {
  APIGamesResponse,
  APIGameResponse,
  APIMessageResponse,
  APIGameInfoResponse,
} from "../../types"
import { Context, Hono } from "hono"

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

  const data = getGameInfo(game)

  return c.json<APIGameGetSimConfResponse>(data)
})

app.post("/:id/sim-conf", (c) => {
  const gameId = c.req.param("id")
  const game = getGameById(gameId, c)

  if (!game) {
    return c.json<APIMessageResponse>({ message: "Not found" }, 404)
  }

  const data = getGameInfo(game)

  return c.json<APIGamePostSimConfResponse>(data)
})

export default app

function getGameById(gameId: string, c: Context<{ Variables: Variables }>) {
  const games = c.get("config").games
  return games.find((g) => g.getConfig().id === gameId)
}

function getGameInfo(game: SlotGame) {
  const conf = game.getConfig()
  const meta = game.getMetadata()

  return {
    id: conf.id,
    name: conf.name,
    path: meta.rootDir,
    maxWin: conf.maxWinX,
    modes: Object.values(conf.gameModes).map((mode) => ({
      name: mode.name,
      cost: mode.cost,
      rtp: mode.rtp,
    })),
  }
}
