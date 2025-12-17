import { Variables } from "../.."
import { createFactory } from "hono/factory"
import { APIGamesResponse } from "../../types"
import path from "path"

const factory = createFactory<{ Variables: Variables }>()

export const gamesHandler = factory.createHandlers((c) => {
  const games = c.get("config").games

  const data = games.map((game) => {
    const conf = game.getConfig()
    const meta = game.getMetadata()

    return {
      id: conf.id,
      name: conf.name,
      modes: Object.keys(conf.gameModes).length,
      isValid: meta.isCustomRoot,
      path: meta.rootDir
    }
  })

  return c.json<APIGamesResponse>({ games: data })
})
