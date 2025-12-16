import { api } from ".."

api.get("/ping", (c) => {
  return c.json({ message: "pong" })
})
