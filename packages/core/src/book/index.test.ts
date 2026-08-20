import { describe, expect, it } from "vitest"
import { Book } from "./index"

describe("Book.addEvent", () => {
  it("assigns 0-based sequential event indices", () => {
    const book = new Book({ id: 1, criteria: "basegame" })
    book.addEvent({ type: "reveal", data: {} })
    book.addEvent({ type: "winInfo", data: { totalWin: 1 } })
    book.addEvent({ type: "finalWin", data: { amount: 100 } })
    expect(book.events.map((e) => e.index)).toEqual([0, 1, 2])
  })
})
