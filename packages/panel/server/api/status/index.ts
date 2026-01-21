import { Variables } from "../.."
import { createFactory } from "hono/factory"
import { APIStatusResponse } from "../../types"

const factory = createFactory<{ Variables: Variables }>()

export const statusHandler = factory.createHandlers((c) => {
  return c.json<APIStatusResponse>({
    ok: true,
  })
})
