import { describe, expect, it } from "vitest"
import type { Bet } from "."
import { InMemoryStorage } from "./InMemoryStorage"

function bet(sessionId: string): Omit<Bet, "id"> {
  return {
    sessionId,
    walletId: "w",
    gameId: "g",
    mode: "base",
    amount: 1_000_000,
    cost: 1_000_000,
    payoutMultiplier: 0,
    payout: 0,
    bookId: 1,
    state: [],
    event: null,
    active: false,
    createdAt: 0,
    settledAt: 0,
  }
}

describe("InMemoryStorage", () => {
  it("creates, reads, updates, finds and deletes records", async () => {
    const { wallets } = new InMemoryStorage()
    const created = await wallets.create({ currency: "USD", amount: 5 })
    expect(created.id).toMatch(/^[\w-]{32}$/)
    expect(await wallets.get(created.id)).toEqual(created)

    const updated = await wallets.update(created.id, { amount: 7 })
    expect(updated).toEqual({ id: created.id, currency: "USD", amount: 7 })
    expect(created.amount).toBe(5)
    expect(await wallets.get(created.id)).toEqual(updated)

    await wallets.create({ currency: "EUR", amount: 1 })
    expect(await wallets.find((w) => w.currency === "USD")).toEqual([updated])

    await wallets.delete(created.id)
    expect(await wallets.get(created.id)).toBeUndefined()
  })

  it("throws when updating a missing record", async () => {
    const { sessions } = new InMemoryStorage()
    await expect(sessions.update("missing", { authenticated: true })).rejects.toThrow()
  })

  it("numbers bets sequentially from 1", async () => {
    const { bets } = new InMemoryStorage()
    const ids = [
      (await bets.create(bet("a"))).id,
      (await bets.create(bet("b"))).id,
      (await bets.create(bet("c"))).id,
    ]
    expect(ids).toEqual([1, 2, 3])
  })
})
