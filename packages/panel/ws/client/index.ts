import { io, Socket } from "socket.io-client"
import { type ClientToServerEvents, type ServerToClientEvents } from "../types"

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export const createIo = (url: string): TypedSocket => {
  return io(url, {
    path: "/ws",
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })
}

export const registerEventListeners = (socket: TypedSocket) => {
  socket.on("connect", () => console.log("Connected to Panel WebSocket server"))

  return () => {
    socket.off("connect")
    socket.close()
  }
}
