import { Server } from "socket.io"
import type { Server as HTTPServer } from "node:http"
import { ClientToServerEvents, ServerToClientEvents } from "../types"

export const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  path: "/ws",
  transports: ["websocket", "polling"],
})

export function startWsServer(httpServer: HTTPServer) {
  io.attach(httpServer)

  io.on("connection", (socket) => {
    socket.on("joinRoom", async (room, respond) => {})
  })
}
