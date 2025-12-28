import { Server } from "socket.io"
import type { Server as HTTPServer } from "node:http"
import { type ClientToServerEvents, type ServerToClientEvents } from "../types"
import { PanelConfig } from "../../server"
import { loadOrCreatePanelGameConfig } from "../../server/lib/utils"

export const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  path: "/ws",
  transports: ["websocket", "polling"],
})

export function startWsServer(httpServer: HTTPServer, panelConfig: PanelConfig) {
  io.attach(httpServer)

  const games = panelConfig.games

  io.on("connection", (socket) => {
    socket.on("simulationProgress", (data) => {
      io.emit("simulationProgress", data)
    })

    socket.on("simulationSummary", (data) => {
      io.emit("simulationSummary", data)
    })

    socket.on("simulationShouldStop", (gameId, response) => {
      const game = games.find((g) => g.getConfig().id === gameId)
      if (!game) {
        response(false)
        return
      }

      const config = loadOrCreatePanelGameConfig(game)
      response(!!config?.forceStop)
    })
  })
}
