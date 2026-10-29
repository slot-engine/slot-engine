import fs from "fs"
import os from "os"
import path from "path"
import { Hono } from "hono"
import { afterAll, describe, expect, it, vi } from "vitest"
import type { GameMath, Outcome } from "../math"
import { PublishedMath } from "../math/PublishedMath"
import type { Bet } from "../storage"
import { InMemoryStorage } from "../storage/InMemoryStorage"
import type { LgsCreateReplayResponse } from "."
import { EngineLgs, type EngineLgsOptions } from "./EngineLgs"

const START = 10_000_000_000
const BET = 1_000_000

interface Balance {
  balance: { amount: number; currency: string }
}

interface Round {
  betID: number
  amount: number
  payout: number
  payoutMultiplier: number
  active: boolean
  mode: string
  state: unknown[]
  event?: string
}

interface ErrorBody {
  error: string
  message: string
}

interface SessionCreated {
  sessionID: string
  walletId: string
  launchParams: Record<string, unknown>
  launchQuery: string
}

function outcome(payoutCents: number, bookId = 7): Outcome {
  return { bookId, payoutCents, events: [{ index: 1, type: "reveal", data: { bookId } }] }
}

function setup(opts: Partial<EngineLgsOptions> = {}) {
  const queue: Outcome[] = []
  const math: GameMath = {
    async pick() {
      const next = queue.shift()
      if (!next) throw new Error("no scripted outcome left")
      return next
    },
    async read(_, bookId) {
      return outcome(0, bookId)
    },
  }

  const lgs = new EngineLgs({
    storage: new InMemoryStorage(),
    random: () => 0.5,
    ...opts,
  })
  lgs.registerGame({
    id: "test",
    name: "Test",
    modes: {
      base: { name: "base", cost: 1, rtp: 0.96, isBonusBuy: false, isFeature: false },
      bonus: { name: "bonus", cost: 70, rtp: 0.96, isBonusBuy: true, isFeature: false },
    },
    math,
  })
  const app = lgs.router()

  async function request<T>(path: string, body: unknown, method = "POST") {
    const res = await app.request(path, {
      method,
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    })
    const text = await res.text()
    return {
      status: res.status,
      text,
      json: (text.startsWith("{") ? JSON.parse(text) : null) as T,
    }
  }

  async function createSession(input: Record<string, unknown> = {}) {
    const res = await request<SessionCreated>("/lgs/sessions", {
      gameId: "test",
      ...input,
    })
    expect(res.status).toBe(201)
    return res.json
  }

  async function authenticated(input: Record<string, unknown> = {}) {
    const created = await createSession(input)
    const res = await request("/wallet/authenticate", { sessionID: created.sessionID })
    expect(res.status).toBe(200)
    return created
  }

  const play = (sessionID: string, amount = BET, mode = "base") =>
    request<Balance & { round: Round } & ErrorBody>("/wallet/play", {
      sessionID,
      mode,
      amount,
    })
  const endRound = (sessionID: string) =>
    request<Balance & ErrorBody>("/wallet/end-round", { sessionID })
  const balance = (sessionID: string) =>
    request<Balance & ErrorBody>("/wallet/balance", { sessionID })
  const event = (sessionID: string, value: string) =>
    request<{ event: string } & ErrorBody>("/bet/event", { sessionID, event: value })

  return {
    lgs,
    app,
    queue,
    request,
    createSession,
    authenticated,
    play,
    endRound,
    balance,
    event,
  }
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lgs-published-"))
const lookupTable = path.join(dir, "lookUpTable_base_0.csv")
fs.writeFileSync(lookupTable, ["1,10,0", "2,10,250", "3,0,800", "4,10,100"].join("\n"))
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

function published() {
  const t = setup()
  t.lgs.registerGame({
    id: "published",
    name: "Published",
    modes: {
      base: { name: "base", cost: 1, rtp: 0.96, isBonusBuy: false, isFeature: false },
      bonus: { name: "bonus", cost: 70, rtp: 0.96, isBonusBuy: true, isFeature: false },
    },
    math: new PublishedMath({
      lookupTablePath: () => lookupTable,
      books: { read: async (_, bookId) => ({ events: [{ bookId }] }) },
      random: () => 0.5,
    }),
  })
  const setForce = (sessionID: string, force: unknown) =>
    t.request<{ force: unknown } & ErrorBody>(
      `/lgs/sessions/${sessionID}/force`,
      { force },
      "PUT",
    )
  return { ...t, setForce }
}

describe("EngineLgs round flow", () => {
  it("authenticates, plays a winning round, ends it and reports the balance", async () => {
    const t = setup()
    const { sessionID, walletId } = await t.createSession()

    const auth = await t.request<
      Balance & { config: Record<string, unknown>; round: unknown }
    >("/wallet/authenticate", { sessionID, language: "de" })
    expect(auth.status).toBe(200)
    expect(auth.json.balance).toEqual({ amount: START, currency: "USD" })
    expect(auth.json.round).toBeNull()
    expect(auth.json.config).toEqual({
      minBet: 100_000,
      maxBet: 1_000_000_000,
      stepBet: 10_000,
      defaultBetLevel: 1_000_000,
      betLevels: [
        100_000, 200_000, 400_000, 600_000, 800_000, 1_000_000, 2_000_000, 4_000_000,
        6_000_000, 8_000_000, 10_000_000, 20_000_000, 40_000_000, 60_000_000, 80_000_000,
        100_000_000, 200_000_000, 400_000_000, 600_000_000, 800_000_000, 1_000_000_000,
      ],
      gameModes: [
        { mode: "base", costMultiplier: 1, maxBet: 1_000_000_000 },
        { mode: "bonus", costMultiplier: 70, maxBet: 14_280_000 },
      ],
      user: { id: walletId },
      jurisdiction: {
        socialCasino: false,
        disabledFullscreen: false,
        disabledTurbo: false,
        disabledSuperTurbo: false,
        disabledAutoplay: false,
        disabledSlamstop: false,
        disabledSpacebar: false,
        disabledBuyFeature: false,
        displayNetPosition: false,
        displayRTP: false,
        displaySessionTimer: false,
        minimumRoundDuration: 0,
      },
    })

    t.queue.push(outcome(200))
    const played = await t.play(sessionID, BET, "bonus")
    expect(played.status).toBe(200)
    expect(played.json.balance.amount).toBe(START - 70_000_000)
    expect(played.json.round).toEqual({
      betID: 1,
      amount: BET,
      payout: 2_000_000,
      payoutMultiplier: 2,
      active: true,
      mode: "bonus",
      state: outcome(200).events,
    })

    const ended = await t.endRound(sessionID)
    expect(ended.status).toBe(200)
    expect(ended.json.balance.amount).toBe(START - 70_000_000 + 2_000_000)

    const after = await t.balance(sessionID)
    expect(after.json).toEqual({ balance: { amount: 9_932_000_000, currency: "USD" } })
  })

  it("closes a round without payout in play itself", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated()

    t.queue.push(outcome(0))
    const played = await t.play(sessionID)
    expect(played.status).toBe(200)
    expect(played.json.round.active).toBe(false)
    expect(played.json.round.payout).toBe(0)
    expect(played.json.balance.amount).toBe(START - BET)

    const ended = await t.endRound(sessionID)
    expect(ended.status).toBe(400)
    expect(ended.json.error).toBe("ERR_VAL")
  })

  it("pays fractional multipliers in exact amounts", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated()

    t.queue.push(outcome(15))
    const played = await t.play(sessionID, 110_000)
    expect(played.json.round.payoutMultiplier).toBe(0.15)
    expect(played.json.round.payout).toBe(16_500)
  })
})

describe("EngineLgs errors", () => {
  it("rejects every endpoint until the session is authenticated", async () => {
    const t = setup()
    const { sessionID } = await t.createSession()
    t.queue.push(outcome(200))

    for (const res of [
      await t.play(sessionID),
      await t.balance(sessionID),
      await t.endRound(sessionID),
    ]) {
      expect(res.status).toBe(400)
      expect(res.json.error).toBe("ERR_VAL")
    }
  })

  it("rejects unknown sessions", async () => {
    const t = setup()
    for (const path of ["/wallet/authenticate", "/wallet/balance", "/wallet/end-round"]) {
      const res = await t.request<ErrorBody>(path, { sessionID: "nope" })
      expect(res.status).toBe(400)
      expect(res.json.error).toBe("ERR_VAL")
    }
  })

  it("rejects a play while a round is active", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated()
    t.queue.push(outcome(200), outcome(200))

    expect((await t.play(sessionID)).status).toBe(200)
    const second = await t.play(sessionID)
    expect(second.status).toBe(400)
    expect(second.json.error).toBe("ERR_VAL")
  })

  it.each([
    ["off the step grid", 1_000_001, "base"],
    ["below the minimum", 90_000, "base"],
    ["above the maximum", 1_000_010_000, "base"],
    ["above the mode max bet", 14_290_000, "bonus"],
    ["of an unknown mode", BET, "turbo"],
  ])("rejects a bet %s", async (_, amount, mode) => {
    const t = setup()
    const { sessionID } = await t.authenticated()
    t.queue.push(outcome(200))

    const res = await t.play(sessionID, amount, mode)
    expect(res.status).toBe(400)
    expect(res.json.error).toBe("ERR_VAL")
    expect((await t.balance(sessionID)).json.balance.amount).toBe(START)
  })

  it("answers ERR_IPB when the balance cannot cover the cost, and ERR_VAL first for a bad amount", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated({ balance: 50 })
    t.queue.push(outcome(200))

    const poor = await t.play(sessionID, BET, "bonus")
    expect(poor.status).toBe(400)
    expect(poor.json.error).toBe("ERR_IPB")

    const invalid = await t.play(sessionID, 1_000_001, "bonus")
    expect(invalid.json.error).toBe("ERR_VAL")
  })

  it("answers a plain Bad Request for invalid JSON and wrong field types", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated()

    const broken = await t.request("/wallet/play", "{not json")
    expect(broken.status).toBe(400)
    expect(broken.text).toBe("Bad Request")

    const wrongType = await t.request("/wallet/play", {
      sessionID,
      mode: "base",
      amount: "1000000",
    })
    expect(wrongType.status).toBe(400)
    expect(wrongType.text).toBe("Bad Request")

    const fractional = await t.request("/wallet/play", {
      sessionID,
      mode: "base",
      amount: 1.5,
    })
    expect(fractional.text).toBe("Bad Request")
  })

  it("answers ERR_GEN when the math cannot produce an outcome", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated()
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})

    const res = await t.play(sessionID)
    expect(logged).toHaveBeenCalledOnce()
    logged.mockRestore()
    expect(res.status).toBe(500)
    expect(res.json).toEqual({ error: "ERR_GEN", message: "general server error" })
    expect((await t.balance(sessionID)).json.balance.amount).toBe(START)
  })
})

describe("EngineLgs events", () => {
  it("stores an event on the active round and returns it on authenticate", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated()
    t.queue.push(outcome(500))
    await t.play(sessionID)

    const stored = await t.event(sessionID, "freespin-3")
    expect(stored.status).toBe(200)
    expect(stored.json).toEqual({ event: "freespin-3" })

    const resumed = await t.request<{ round: Round }>("/wallet/authenticate", {
      sessionID,
    })
    expect(resumed.json.round).toMatchObject({
      betID: 1,
      active: true,
      event: "freespin-3",
    })
  })

  it("limits events to 32 bytes", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated()
    t.queue.push(outcome(500))
    await t.play(sessionID)

    expect((await t.event(sessionID, "x".repeat(32))).status).toBe(200)
    expect((await t.event(sessionID, "é".repeat(16))).status).toBe(200)

    for (const value of ["x".repeat(33), "é".repeat(17), ""]) {
      const res = await t.event(sessionID, value)
      expect(res.status).toBe(400)
      expect(res.json.error).toBe("ERR_VAL")
    }
  })

  it("rejects an event without an active round", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated()

    const res = await t.event(sessionID, "intro")
    expect(res.status).toBe(400)
    expect(res.json.error).toBe("ERR_VAL")
  })
})

describe("EngineLgs concurrency", () => {
  it("lets exactly one of two simultaneous plays through", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated()
    t.queue.push(outcome(200), outcome(200))

    const results = await Promise.all([t.play(sessionID), t.play(sessionID)])
    expect(results.map((r) => r.status).sort()).toEqual([200, 400])
    expect(results.find((r) => r.status === 400)?.json.error).toBe("ERR_VAL")
    expect((await t.balance(sessionID)).json.balance.amount).toBe(START - BET)
  })

  it("serializes sessions that share a wallet", async () => {
    const t = setup()
    const first = await t.authenticated()
    const second = await t.authenticated({ walletId: first.walletId })
    t.queue.push(outcome(0), outcome(0))

    const results = await Promise.all([t.play(first.sessionID), t.play(second.sessionID)])
    expect(results.map((r) => r.status)).toEqual([200, 200])
    expect((await t.balance(first.sessionID)).json.balance.amount).toBe(START - 2 * BET)
  })
})

describe("LGS management routes", () => {
  it("creates a session whose launch parameters point at the requested host", async () => {
    const t = setup()
    const res = await t.app.request("http://localhost:7770/lgs/sessions", {
      method: "POST",
      body: JSON.stringify({
        gameId: "test",
        currency: "EUR",
        language: "de",
        device: "mobile",
      }),
    })
    expect(res.status).toBe(201)
    const created = (await res.json()) as SessionCreated

    expect(created.launchParams).toEqual({
      sessionID: created.sessionID,
      rgs_url: "localhost:7770",
      lang: "de",
      currency: "EUR",
      device: "mobile",
      social: false,
      demo: false,
    })
    expect(Object.fromEntries(new URLSearchParams(created.launchQuery))).toEqual({
      sessionID: created.sessionID,
      rgs_url: "localhost:7770",
      lang: "de",
      currency: "EUR",
      device: "mobile",
      social: "false",
      demo: "false",
    })
  })

  it("rejects unknown games and currencies outside the allowed list", async () => {
    const t = setup({ currencies: ["USD", "EUR"] })
    const cases = [
      { gameId: "nope" },
      { gameId: "test", currency: "JPY" },
      { gameId: "test", currency: "XXX" },
    ]
    for (const body of cases) {
      const res = await t.request<ErrorBody>("/lgs/sessions", body)
      expect(res.status).toBe(400)
      expect(res.json.error).toBe("ERR_VAL")
    }
  })

  it("keeps the balance when a session reuses a wallet", async () => {
    const t = setup()
    const first = await t.authenticated()
    t.queue.push(outcome(0))
    await t.play(first.sessionID)

    const second = await t.authenticated({ walletId: first.walletId })
    expect(second.walletId).toBe(first.walletId)
    expect((await t.balance(second.sessionID)).json.balance.amount).toBe(START - BET)

    const conflicting = await t.request<ErrorBody>("/lgs/sessions", {
      gameId: "test",
      walletId: first.walletId,
      currency: "EUR",
    })
    expect(conflicting.status).toBe(400)
  })

  it("describes the LGS, its games and a session", async () => {
    const t = setup()
    const { sessionID } = await t.authenticated()

    const info = await t.request<Record<string, unknown>>("/lgs", undefined, "GET")
    expect(info.json).toMatchObject({
      name: "Engine",
      defaultLanguage: "en",
      defaultCurrency: "USD",
      balance: {
        starting: START,
        options: [100_000_000, 1_000_000_000, START, 100_000_000_000],
      },
      games: [{ id: "test", name: "Test" }],
    })

    const games = await t.request<{ games: Array<{ modes: unknown[] }> }>(
      "/lgs/games",
      undefined,
      "GET",
    )
    expect(games.json.games[0]?.modes).toHaveLength(2)

    const session = await t.request<Record<string, unknown>>(
      `/lgs/sessions/${sessionID}`,
      undefined,
      "GET",
    )
    expect(session.status).toBe(200)
    expect(session.json).toMatchObject({
      session: { id: sessionID, authenticated: true, force: null },
      activeBet: null,
      lastBet: null,
    })

    const missing = await t.request<ErrorBody>("/lgs/sessions/nope", undefined, "GET")
    expect(missing.status).toBe(404)
  })
})

describe("LGS forced outcomes", () => {
  it("plays the forced book until the force is cleared", async () => {
    const t = published()
    const { sessionID } = await t.authenticated({ gameId: "published" })

    const forced = await t.setForce(sessionID, { bookId: 3 })
    expect(forced.status).toBe(200)
    expect(forced.json).toEqual({ force: { bookId: 3 } })

    for (let i = 0; i < 2; i++) {
      const played = await t.play(sessionID)
      expect(played.json.round).toMatchObject({
        payoutMultiplier: 8,
        payout: 8 * BET,
        state: [{ bookId: 3 }],
      })
      await t.endRound(sessionID)
    }

    expect((await t.setForce(sessionID, null)).json).toEqual({ force: null })
    const drawn = await t.play(sessionID)
    expect(drawn.json.round).toMatchObject({
      payoutMultiplier: 2.5,
      state: [{ bookId: 2 }],
    })
  })

  it("plays the book with the closest payout, the lower one on a tie", async () => {
    const t = published()
    const { sessionID } = await t.authenticated({
      gameId: "published",
      force: { payoutMultiplier: 1.2 },
    })
    expect((await t.play(sessionID)).json.round).toMatchObject({
      payoutMultiplier: 1,
      state: [{ bookId: 4 }],
    })
    await t.endRound(sessionID)

    await t.setForce(sessionID, { payoutMultiplier: 1.75 })
    expect((await t.play(sessionID)).json.round.payoutMultiplier).toBe(1)
  })

  it("answers ERR_VAL for a forced book outside the lookup table", async () => {
    const t = published()
    const { sessionID } = await t.authenticated({ gameId: "published" })
    await t.setForce(sessionID, { bookId: 99 })

    const res = await t.play(sessionID)
    expect(res.status).toBe(400)
    expect(res.json.error).toBe("ERR_VAL")
    expect(res.json.message).toContain(
      'Book 99 is not in the lookup table of mode "base"',
    )
    expect((await t.balance(sessionID)).json.balance.amount).toBe(START)
  })

  it("rejects an invalid force and an unknown session", async () => {
    const t = published()
    const { sessionID } = await t.createSession()

    for (const force of [
      { bookId: -1 },
      { bookId: 1.5 },
      { payoutMultiplier: -0.5 },
      { bookId: 1, payoutMultiplier: 2 },
      { book: 1 },
      "1",
      undefined,
    ]) {
      const res = await t.setForce(sessionID, force)
      expect(res.status, JSON.stringify(force)).toBe(400)
      expect(res.json.error).toBe("ERR_VAL")
    }
    const broken = await t.request<ErrorBody>(
      `/lgs/sessions/${sessionID}/force`,
      "{",
      "PUT",
    )
    expect(broken.status).toBe(400)

    const created = await t.request<ErrorBody>("/lgs/sessions", {
      gameId: "test",
      force: { bookId: -1 },
    })
    expect(created.status).toBe(400)

    const unknown = await t.setForce("nope", { bookId: 1 })
    expect(unknown.status).toBe(404)
    expect(unknown.json).toEqual({ error: "ERR_VAL", message: "unknown session" })

    await expect(t.lgs.setForce(sessionID, { bookId: NaN })).rejects.toMatchObject({
      kind: "invalid-session-input",
    })
  })

  it("returns the newest bet of the session as lastBet", async () => {
    const t = setup()
    const first = await t.authenticated()
    const other = await t.authenticated()
    t.queue.push(outcome(0, 11), outcome(300, 12), outcome(0, 13))

    await t.play(first.sessionID)
    await t.play(first.sessionID)
    await t.play(other.sessionID)

    const res = await t.request<{ activeBet: Bet | null; lastBet: Bet | null }>(
      `/lgs/sessions/${first.sessionID}`,
      undefined,
      "GET",
    )
    expect(res.json.lastBet).toMatchObject({ id: 2, bookId: 12, active: true })
    expect(res.json.activeBet?.id).toBe(2)
  })
})

describe("EngineLgs bet replay", () => {
  it("answers the book's payout, the mode's cost and the book's events", async () => {
    const t = published()
    for (const version of [1, 7]) {
      const path = `/bet/replay/published/${version}/bonus/3`
      const res = await t.request(path, undefined, "GET")
      expect(res.status, path).toBe(200)
      expect(res.json).toEqual({
        payoutMultiplier: 8,
        costMultiplier: 70,
        state: [{ bookId: 3 }],
      })
    }
  })

  it.each([
    ["an unknown game", "/bet/replay/nope/1/base/2"],
    ["an unknown mode", "/bet/replay/published/1/turbo/2"],
    ["a mode named after an Object property", "/bet/replay/published/1/constructor/2"],
    ["an unknown event", "/bet/replay/published/1/base/99"],
  ])("answers an empty 404 for %s", async (_, path) => {
    const t = published()
    const res = await t.request(path, undefined, "GET")
    expect(res.status).toBe(404)
    expect(res.text).toBe("")
  })

  it.each(["abc", "-1", "1.5", "2e0", "9007199254740993"])(
    "answers an empty 404 for the event %s, though the scripted math has every book",
    async (event) => {
      const path = `/bet/replay/test/1/base/${event}`
      const res = await setup().request(path, undefined, "GET")
      expect(res.status).toBe(404)
      expect(res.text).toBe("")
    },
  )

  it("answers ERR_GEN when the mode has no lookup table", async () => {
    const t = setup()
    t.lgs.registerGame({
      id: "unsimulated",
      name: "Unsimulated",
      modes: {
        base: { name: "base", cost: 1, rtp: 0.96, isBonusBuy: false, isFeature: false },
      },
      math: new PublishedMath({
        lookupTablePath: () => path.join(dir, "absent.csv"),
        books: { read: async () => undefined },
        random: () => 0.5,
      }),
    })

    const res = await t.request<ErrorBody>(
      "/bet/replay/unsimulated/1/base/1",
      undefined,
      "GET",
    )
    expect(res.status).toBe(500)
    expect(res.json.error).toBe("ERR_GEN")
  })
})

describe("LGS replays", () => {
  it("creates replay launch parameters that point at the requested host", async () => {
    const t = published()
    const res = await t.app.request("http://localhost:7770/lgs/replays", {
      method: "POST",
      body: JSON.stringify({
        gameId: "published",
        mode: "bonus",
        event: 3,
        currency: "EUR",
        amount: 2.5,
        language: "de",
        device: "mobile",
        social: true,
      }),
    })
    expect(res.status).toBe(200)
    const created = (await res.json()) as LgsCreateReplayResponse

    expect(created.launchParams).toEqual({
      replay: true,
      game: "published",
      version: 1,
      mode: "bonus",
      event: 3,
      rgs_url: "localhost:7770",
      currency: "EUR",
      amount: 2_500_000,
      lang: "de",
      device: "mobile",
      social: true,
      demo: false,
    })
    expect([...new URLSearchParams(created.launchQuery)]).toEqual([
      ["replay", "true"],
      ["game", "published"],
      ["version", "1"],
      ["mode", "bonus"],
      ["event", "3"],
      ["rgs_url", "localhost:7770"],
      ["currency", "EUR"],
      ["amount", "2500000"],
      ["lang", "de"],
      ["device", "mobile"],
      ["social", "true"],
      ["demo", "false"],
    ])
  })

  it("defaults to the default bet and the LGS defaults", async () => {
    const t = published()
    const res = await t.request<LgsCreateReplayResponse>("/lgs/replays", {
      gameId: "published",
      mode: "base",
      event: 2,
    })
    expect(res.status).toBe(200)
    expect(res.json.launchParams).toMatchObject({
      amount: 1_000_000,
      currency: "USD",
      lang: "en",
      device: "desktop",
      social: false,
      demo: false,
    })
  })

  it.each<[string, Record<string, unknown>, string]>([
    [
      "an unknown book",
      { mode: "bonus", event: 99 },
      'Book 99 is not in the lookup table of mode "bonus"',
    ],
    [
      "an amount off the step grid",
      { amount: 1.005 },
      "Bet 1005000 is not a multiple of 10000",
    ],
    ["an unknown mode", { mode: "turbo" }, 'Mode "turbo" does not exist'],
    ["a negative event", { event: -1 }, "event"],
  ])("rejects %s", async (_, body, message) => {
    const t = published()
    const res = await t.request<ErrorBody>("/lgs/replays", {
      gameId: "published",
      mode: "base",
      event: 2,
      ...body,
    })
    expect(res.status).toBe(400)
    expect(res.json.error).toBe("ERR_VAL")
    expect(res.json.message).toContain(message)
  })
})

describe("LGS options", () => {
  it.each<[string, Partial<EngineLgsOptions>]>([
    ["a default language outside languages", { languages: ["de"] }],
    ["a default currency outside currencies", { currencies: ["EUR"] }],
    ["a bet level off the step grid", { bets: { levels: [0.105] } }],
    ["a bet level above the maximum", { bets: { levels: [2000] } }],
  ])("rejects %s", (_, opts) => {
    expect(() => setup(opts)).toThrow(/Invalid LGS options/)
  })
})

describe("LGS CORS", () => {
  const preflight = {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST" },
  }

  it("allows cross-origin calls to the RGS and management routes", async () => {
    const { app } = setup()
    for (const path of [
      "/wallet/play",
      "/bet/event",
      "/bet/replay/test/1/base/1",
      "/lgs/sessions",
      "/lgs",
    ]) {
      const res = await app.request(path, preflight)
      expect(res.headers.get("access-control-allow-origin"), path).toBe("*")
    }
  })

  it("does not leak onto routes of a parent app", async () => {
    const { lgs } = setup()
    const panel = new Hono()
    panel.route("/", lgs.router())
    panel.all("/api/*", (c) => c.text("panel"))

    const res = await panel.request("/api/anything", preflight)
    expect(res.headers.get("access-control-allow-origin")).toBeNull()
    expect(
      (await panel.request("/wallet/play", preflight)).headers.get(
        "access-control-allow-origin",
      ),
    ).toBe("*")
  })
})
