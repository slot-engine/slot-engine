import { describe, expect, it } from "vitest"
import { Book } from "../book"
import { assertBookInvariants } from "../book/invariants"

describe("assertBookInvariants", () => {
  it("accepts 0-based sequential events with matching finalWin cents", () => {
    const book = new Book({ id: 1, criteria: "basegame" })
    book.payout = 250
    book.addEvent({ type: "reveal", data: {} })
    book.addEvent({ type: "finalWin", data: { amount: 250 } })
    expect(() => assertBookInvariants(book)).not.toThrow()
  })

  it("rejects 1-based indices", () => {
    const book = new Book({ id: 1, criteria: "basegame" })
    book.events.push({ index: 1, type: "finalWin", data: { amount: 0 } })
    expect(() => assertBookInvariants(book)).toThrow(/0\.\.N-1/)
  })

  it("rejects missing terminal event", () => {
    const book = new Book({ id: 2, criteria: "basegame" })
    book.addEvent({ type: "reveal", data: {} })
    expect(() => assertBookInvariants(book)).not.toThrow()
  })
})
