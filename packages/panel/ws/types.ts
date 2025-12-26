export interface ServerToClientEvents {}

export interface ClientToServerEvents {
  joinRoom: (room: string, response: (message: string) => void) => void
}
