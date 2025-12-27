import { Server } from "socket.io"
import type { Server as HTTPServer } from "node:http"
import { type ClientToServerEvents, type ServerToClientEvents } from "../types"
import { PanelConfig } from "../../server"

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
  })
}
