import { useEffect } from "react"
import { createIo, registerEventListeners } from "../../../ws/client"

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
export const socket = createIo(`${protocol}//${window.location.host}`)

export const WebsocketProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    socket.connect()
    const unregisterEvents = registerEventListeners(socket)
    return unregisterEvents
  }, [])

  return children
}