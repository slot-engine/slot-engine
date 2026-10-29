import { Variables } from "../.."
import { createFactory } from "hono/factory"
import { APIStatusResponse } from "../../types"

const factory = createFactory<{ Variables: Variables }>()

export const statusHandler = factory.createHandlers((c) => {
  const { lgs } = c.get("config")
  return c.json<APIStatusResponse>({
    ok: true,
    lgs: lgs ? { name: lgs.name } : null,
  })
})
