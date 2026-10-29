import { serve } from "@hono/node-server"
import type { SlotGame } from "@slot-engine/core"
import chalk from "chalk"
import { Hono } from "hono"
import { cors } from "hono/cors"
import z from "zod"
import { CURRENCY_CODES, LANGUAGES, type Currency, type Language } from "../currencies"
import { LgsError } from "../errors"
import { fromSlotGame, type ForcedOutcome, type LgsGame, type LgsMode } from "../math"
import { toAmount, type Amount } from "../money"
import {
  DEVICES,
  type AbstractStorage,
  type Bet,
  type Device,
  type Session,
  type Wallet,
} from "../storage"

export { LgsError, type LgsErrorKind } from "../errors"

export interface LgsOptions {
  storage: AbstractStorage
  games?: SlotGame[]
  /** Standalone only. An LGS attached to the panel is served on the panel's port. */
  port?: number
  /** Default: all `LANGUAGES`. */
  languages?: Language[]
  /** Default: all `CURRENCIES`. */
  currencies?: Currency[]
  /** Default `"en"`, must be in `languages`. */
  defaultLanguage?: Language
  /** Default `"USD"`, must be in `currencies`. */
  defaultCurrency?: Currency
  /** In major units: 1 is one unit of the currency. */
  balance?: { starting?: number; options?: number[] }
  /** In major units: 1 is one unit of the currency. */
  bets?: {
    min?: number
    max?: number
    step?: number
    default?: number
    levels?: number[]
  }
  /** Default `Math.random`. */
  random?: () => number
}

export interface CreateSessionInput {
  gameId: string
  currency?: Currency
  language?: string
  /** Starting balance of a new wallet, in major units. */
  balance?: number
  /** Reuse an existing wallet and its balance. */
  walletId?: string
  device?: Device
  social?: boolean
  demo?: boolean
  /** Forced outcome of every play, default `null`. */
  force?: ForcedOutcome | null
}

export interface LaunchParams {
  sessionID: string
  rgs_url: string
  lang: string
  currency: Currency
  device: Device
  social: boolean
  demo: boolean
}

export interface BalanceConfig {
  starting: Amount
  options: Amount[]
}

export interface BetConfig {
  min: Amount
  max: Amount
  step: Amount
  default: Amount
  levels: Amount[]
}

/** `GET /lgs` */
export interface LgsInfoResponse {
  name: string
  languages: readonly Language[]
  currencies: readonly Currency[]
  defaultLanguage: Language
  defaultCurrency: Currency
  balance: BalanceConfig
  bets: BetConfig
  games: Array<{ id: string; name: string }>
}

/** `GET /lgs/games` */
export interface LgsGamesResponse {
  games: Array<{ id: string; name: string; modes: LgsMode[] }>
}

/** `POST /lgs/sessions` */
export interface LgsCreateSessionResponse {
  sessionID: string
  walletId: string
  launchParams: LaunchParams
  launchQuery: string
}

/** `GET /lgs/sessions/:id` */
export interface LgsSessionResponse {
  session: Session
  wallet: Wallet
  activeBet: Bet | null
  /** The newest bet of the session, settled or not. */
  lastBet: Bet | null
}

/** `PUT /lgs/sessions/:id/force` */
export interface LgsForceResponse {
  force: ForcedOutcome | null
}

/** Any management route that rejects a request. */
export interface LgsErrorResponse {
  error: "ERR_VAL"
  message: string
}

const DEFAULT_PORT = 7771
const MAX_EVENT_BYTES = 32

const DEFAULT_BALANCE = { starting: 10_000, options: [100, 1_000, 10_000, 100_000] }

const DEFAULT_BETS = {
  min: 0.1,
  max: 1000,
  step: 0.01,
  default: 1,
  levels: [
    0.1, 0.2, 0.4, 0.6, 0.8, 1, 2, 4, 6, 8, 10, 20, 40, 60, 80, 100, 200, 400, 600, 800,
    1000,
  ],
}

const forcedOutcomeSchema = z.union([
  z.strictObject({ bookId: z.number().int().nonnegative() }),
  z.strictObject({ payoutMultiplier: z.number().nonnegative() }),
]) satisfies z.ZodType<ForcedOutcome>

const forceBodySchema = z.object({ force: forcedOutcomeSchema.nullable() })

const UNKNOWN_SESSION: LgsErrorResponse = { error: "ERR_VAL", message: "unknown session" }

const createSessionSchema = z.object({
  gameId: z.string(),
  currency: z.enum(CURRENCY_CODES).optional(),
  language: z.string().optional(),
  balance: z.number().optional(),
  walletId: z.string().optional(),
  device: z.enum(DEVICES).optional(),
  social: z.boolean().optional(),
  demo: z.boolean().optional(),
  force: forcedOutcomeSchema.nullable().optional(),
}) satisfies z.ZodType<CreateSessionInput>

/**
 * A local gaming server: sessions, wallets and bets on top of a storage, with outcomes
 * drawn from each game's published math. Implementations add the HTTP endpoints of
 * the RGS they mimic.
 */
export abstract class AbstractLgs {
  abstract readonly name: string
  protected abstract readonly routePrefixes: string[]

  readonly port: number | undefined
  readonly languages: readonly Language[]
  readonly currencies: readonly Currency[]
  readonly defaultLanguage: Language
  readonly defaultCurrency: Currency
  readonly balance: BalanceConfig
  readonly bets: BetConfig

  protected readonly storage: AbstractStorage
  protected readonly random: () => number
  private readonly games = new Map<string, LgsGame>()
  private readonly locks = new Map<string, Promise<unknown>>()

  constructor(opts: LgsOptions) {
    this.storage = opts.storage
    this.port = opts.port
    this.random = opts.random ?? Math.random
    this.languages = opts.languages ?? LANGUAGES
    this.currencies = opts.currencies ?? CURRENCY_CODES
    this.defaultLanguage = opts.defaultLanguage ?? "en"
    this.defaultCurrency = opts.defaultCurrency ?? "USD"
    this.balance = {
      starting: toAmount(opts.balance?.starting ?? DEFAULT_BALANCE.starting),
      options: (opts.balance?.options ?? DEFAULT_BALANCE.options).map(toAmount),
    }
    this.bets = {
      min: toAmount(opts.bets?.min ?? DEFAULT_BETS.min),
      max: toAmount(opts.bets?.max ?? DEFAULT_BETS.max),
      step: toAmount(opts.bets?.step ?? DEFAULT_BETS.step),
      default: toAmount(opts.bets?.default ?? DEFAULT_BETS.default),
      levels: (opts.bets?.levels ?? DEFAULT_BETS.levels).map(toAmount),
    }
    this.assertValidConfig()
    this.registerGames(opts.games ?? [])
  }

  registerGames(games: SlotGame[]): void {
    for (const game of games) this.registerGame(fromSlotGame(game, this.random))
  }

  registerGame(game: LgsGame): void {
    this.games.set(game.id, game)
  }

  getGame(id: string): LgsGame {
    const game = this.games.get(id)
    if (!game) throw new LgsError("unknown-game", `Game "${id}" is not registered`)
    return game
  }

  listGames(): LgsGame[] {
    return [...this.games.values()]
  }

  async createSession(
    input: CreateSessionInput,
  ): Promise<{ session: Session; wallet: Wallet }> {
    const game = this.getGame(input.gameId)
    const language = input.language ?? this.defaultLanguage
    if (!isOneOf(this.languages, language)) {
      throw new LgsError("invalid-session-input", `Language "${language}" is not enabled`)
    }
    const force = parseForce(input.force ?? null)

    const wallet = input.walletId
      ? await this.reuseWallet(input.walletId, input)
      : await this.createWallet(input)

    const session = await this.storage.sessions.create({
      walletId: wallet.id,
      gameId: game.id,
      currency: wallet.currency,
      language,
      device: input.device ?? "desktop",
      social: input.social ?? false,
      demo: input.demo ?? false,
      authenticated: false,
      activeBetId: null,
      force,
      createdAt: Date.now(),
    })
    return { session, wallet }
  }

  authenticate(
    sessionId: string,
    language?: string,
  ): Promise<{ session: Session; wallet: Wallet; activeBet: Bet | null }> {
    return this.withSessionLock(sessionId, async () => {
      const current = await this.requireSession(sessionId)
      const session = await this.storage.sessions.update(sessionId, {
        authenticated: true,
        language: language || current.language,
      })
      const wallet = await this.requireWallet(session.walletId)
      return { session, wallet, activeBet: await this.findActiveBet(session) }
    })
  }

  /** Sets the forced outcome of the session's following plays; `null` clears it. */
  async setForce(sessionId: string, force: ForcedOutcome | null): Promise<Session> {
    const valid = parseForce(force)
    return this.withSessionLock(sessionId, () =>
      this.storage.sessions.update(sessionId, { force: valid }),
    )
  }

  getBalance(sessionId: string): Promise<Wallet> {
    return this.withSessionLock(sessionId, async () => {
      const { wallet } = await this.requireAuthenticated(sessionId)
      return wallet
    })
  }

  placeBet(
    sessionId: string,
    modeName: string,
    amount: Amount,
  ): Promise<{ wallet: Wallet; bet: Bet }> {
    return this.withSessionLock(sessionId, async () => {
      const { session, wallet } = await this.requireAuthenticated(sessionId)
      const game = this.getGame(session.gameId)
      const mode = game.modes[modeName]
      if (!mode) throw new LgsError("unknown-mode", `Mode "${modeName}" does not exist`)
      if (session.activeBetId !== null) {
        throw new LgsError("round-active", `Round ${session.activeBetId} is still active`)
      }
      this.validateBetAmount(amount, mode)

      const cost = Math.round(amount * mode.cost)
      if (cost > wallet.amount) {
        throw new LgsError(
          "insufficient-balance",
          `Bet costs ${cost}, balance is ${wallet.amount}`,
        )
      }

      const outcome = await game.math.pick(mode.name, session.force ?? undefined)
      const payout = Math.round((amount * outcome.payoutCents) / 100)
      const active = payout > 0
      const now = Date.now()

      const debited = await this.storage.wallets.update(wallet.id, {
        amount: wallet.amount - cost,
      })
      const bet = await this.storage.bets.create({
        sessionId,
        walletId: wallet.id,
        gameId: game.id,
        mode: mode.name,
        amount,
        cost,
        payoutMultiplier: outcome.payoutCents / 100,
        payout,
        bookId: outcome.bookId,
        state: outcome.events,
        event: null,
        active,
        createdAt: now,
        settledAt: active ? null : now,
      })
      if (active) await this.storage.sessions.update(sessionId, { activeBetId: bet.id })
      return { wallet: debited, bet }
    })
  }

  settleRound(sessionId: string): Promise<{ wallet: Wallet; bet: Bet }> {
    return this.withSessionLock(sessionId, async () => {
      const { session, wallet } = await this.requireAuthenticated(sessionId)
      const active = await this.requireActiveBet(session)

      const credited = await this.storage.wallets.update(wallet.id, {
        amount: wallet.amount + active.payout,
      })
      const bet = await this.storage.bets.update(active.id, {
        active: false,
        settledAt: Date.now(),
      })
      await this.storage.sessions.update(sessionId, { activeBetId: null })
      return { wallet: credited, bet }
    })
  }

  recordEvent(sessionId: string, event: string): Promise<string> {
    return this.withSessionLock(sessionId, async () => {
      const { session } = await this.requireAuthenticated(sessionId)
      const bet = await this.requireActiveBet(session)
      const bytes = Buffer.byteLength(event, "utf-8")
      if (bytes === 0 || bytes > MAX_EVENT_BYTES) {
        throw new LgsError(
          "invalid-event",
          `Event must be 1 to ${MAX_EVENT_BYTES} bytes, got ${bytes}`,
        )
      }
      await this.storage.bets.update(bet.id, { event })
      return event
    })
  }

  /** Engine's bet rules: within min/max, on the step grid, and within the mode's max bet. */
  validateBetAmount(amount: Amount, mode: LgsMode): void {
    const { min, max, step } = this.bets
    const modeMax = this.modeMaxBet(mode)
    const rules: Array<[ok: boolean, message: string]> = [
      [amount >= min, `Bet ${amount} is below the minimum ${min}`],
      [amount <= max, `Bet ${amount} is above the maximum ${max}`],
      [amount % step === 0, `Bet ${amount} is not a multiple of ${step}`],
      [
        amount <= modeMax,
        `Bet ${amount} is above the maximum ${modeMax} of mode "${mode.name}"`,
      ],
    ]
    const broken = rules.find(([ok]) => !ok)
    if (broken) throw new LgsError("invalid-bet", broken[1])
  }

  /** The largest base bet on the step grid whose cost stays within the maximum bet. */
  modeMaxBet(mode: LgsMode): Amount {
    const { max, step } = this.bets
    const affordable = Math.floor(max / mode.cost)
    return Math.min(max, affordable - (affordable % step))
  }

  launchParams(session: Session, rgsUrl: string): LaunchParams {
    return {
      sessionID: session.id,
      rgs_url: rgsUrl,
      lang: session.language,
      currency: session.currency,
      device: session.device,
      social: session.social,
      demo: session.demo,
    }
  }

  protected abstract rgsRouter(): Hono

  managementRouter(): Hono {
    const app = new Hono()

    app.get("/lgs", (c) =>
      c.json<LgsInfoResponse>({
        name: this.name,
        languages: this.languages,
        currencies: this.currencies,
        defaultLanguage: this.defaultLanguage,
        defaultCurrency: this.defaultCurrency,
        balance: this.balance,
        bets: this.bets,
        games: this.listGames().map(({ id, name }) => ({ id, name })),
      }),
    )

    app.get("/lgs/games", (c) =>
      c.json<LgsGamesResponse>({
        games: this.listGames().map(({ id, name, modes }) => ({
          id,
          name,
          modes: Object.values(modes),
        })),
      }),
    )

    app.post("/lgs/sessions", async (c) => {
      const input = createSessionSchema.safeParse(
        await c.req.json().catch(() => undefined),
      )
      if (!input.success) {
        return c.json<LgsErrorResponse>(
          { error: "ERR_VAL", message: z.prettifyError(input.error) },
          400,
        )
      }

      try {
        const { session, wallet } = await this.createSession(input.data)
        const rgsUrl = c.req.header("host") ?? new URL(c.req.url).host
        const launchParams = this.launchParams(session, rgsUrl)
        return c.json<LgsCreateSessionResponse>(
          {
            sessionID: session.id,
            walletId: wallet.id,
            launchParams,
            launchQuery: toQuery(launchParams),
          },
          201,
        )
      } catch (error) {
        if (!(error instanceof LgsError)) throw error
        return c.json<LgsErrorResponse>({ error: "ERR_VAL", message: error.message }, 400)
      }
    })

    app.get("/lgs/sessions/:id", async (c) => {
      const session = await this.storage.sessions.get(c.req.param("id"))
      if (!session) return c.json(UNKNOWN_SESSION, 404)
      return c.json<LgsSessionResponse>({
        session,
        wallet: await this.requireWallet(session.walletId),
        activeBet: await this.findActiveBet(session),
        lastBet: await this.findLastBet(session),
      })
    })

    app.put("/lgs/sessions/:id/force", async (c) => {
      const body = forceBodySchema.safeParse(await c.req.json().catch(() => undefined))
      if (!body.success) {
        return c.json<LgsErrorResponse>(
          { error: "ERR_VAL", message: z.prettifyError(body.error) },
          400,
        )
      }

      try {
        const { force } = await this.setForce(c.req.param("id"), body.data.force)
        return c.json<LgsForceResponse>({ force })
      } catch (error) {
        if (error instanceof LgsError && error.kind === "unknown-session") {
          return c.json(UNKNOWN_SESSION, 404)
        }
        throw error
      }
    })

    return app
  }

  router(): Hono {
    const app = new Hono()
    // Scoped to LGS paths: under the panel this router is merged into the panel app.
    for (const path of ["/lgs/*", ...this.routePrefixes]) app.use(path, cors())
    app.route("/", this.managementRouter())
    app.route("/", this.rgsRouter())
    return app
  }

  async start(): Promise<{ port: number; close(): Promise<void> }> {
    const app = this.router()
    const { server, port } = await new Promise<{
      server: ReturnType<typeof serve>
      port: number
    }>((resolve, reject) => {
      const server = serve(
        { fetch: app.fetch, port: this.port ?? DEFAULT_PORT },
        (info) => resolve({ server, port: info.port }),
      )
      server.once("error", reject)
    })

    console.log(
      `⚡️ ${chalk.cyan("Slot Engine LGS")} (${this.name}) is running on ${chalk.cyan(`http://localhost:${port}`)}`,
    )
    console.log(`:: ${this.games.size} games loaded`)

    return {
      port,
      close: () =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        ),
    }
  }

  /**
   * Runs `fn` after every earlier operation on the session's wallet has finished, so two
   * concurrent plays cannot both pass the "no active round" check, and sessions sharing a
   * wallet cannot overwrite each other's balance.
   */
  protected async withSessionLock<T>(
    sessionId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const { walletId } = await this.requireSession(sessionId)
    const previous = this.locks.get(walletId) ?? Promise.resolve()
    const result = previous.then(fn)
    const tail = result.catch(() => undefined)
    this.locks.set(walletId, tail)
    try {
      return await result
    } finally {
      if (this.locks.get(walletId) === tail) this.locks.delete(walletId)
    }
  }

  private async requireSession(sessionId: string) {
    const session = await this.storage.sessions.get(sessionId)
    if (!session)
      throw new LgsError("unknown-session", `Session "${sessionId}" does not exist`)
    return session
  }

  private async requireWallet(walletId: string) {
    const wallet = await this.storage.wallets.get(walletId)
    if (!wallet)
      throw new Error(`Wallet "${walletId}" of a stored session does not exist`)
    return wallet
  }

  private async requireAuthenticated(sessionId: string) {
    const session = await this.requireSession(sessionId)
    if (!session.authenticated) {
      throw new LgsError("unauthenticated", `Session "${sessionId}" is not authenticated`)
    }
    return { session, wallet: await this.requireWallet(session.walletId) }
  }

  private async findActiveBet(session: Session) {
    if (session.activeBetId === null) return null
    const bet = await this.storage.bets.get(session.activeBetId)
    return bet?.active ? bet : null
  }

  private async findLastBet(session: Session) {
    const bets = await this.storage.bets.find((bet) => bet.sessionId === session.id)
    return bets.reduce<Bet | null>((last, bet) => (last && last.id > bet.id ? last : bet), null)
  }

  private async requireActiveBet(session: Session) {
    const bet = await this.findActiveBet(session)
    if (!bet) throw new LgsError("no-active-round", "There is no active round")
    return bet
  }

  private async createWallet({
    currency = this.defaultCurrency,
    balance,
  }: CreateSessionInput) {
    if (!this.currencies.includes(currency)) {
      throw new LgsError("invalid-session-input", `Currency "${currency}" is not enabled`)
    }
    const amount = balance === undefined ? this.balance.starting : toAmount(balance)
    if (amount < 0) {
      throw new LgsError("invalid-session-input", "Balance must not be negative")
    }
    return this.storage.wallets.create({ currency, amount })
  }

  private async reuseWallet(walletId: string, { currency, balance }: CreateSessionInput) {
    const wallet = await this.storage.wallets.get(walletId)
    if (!wallet) {
      throw new LgsError("invalid-session-input", `Wallet "${walletId}" does not exist`)
    }
    if (currency !== undefined && currency !== wallet.currency) {
      throw new LgsError(
        "invalid-session-input",
        `Wallet "${walletId}" holds ${wallet.currency}, not ${currency}`,
      )
    }
    if (balance !== undefined) {
      throw new LgsError("invalid-session-input", "balance applies to new wallets only")
    }
    return wallet
  }

  private assertValidConfig() {
    const { bets, balance } = this
    const valid = (amount: Amount) =>
      amount >= bets.min && amount <= bets.max && amount % bets.step === 0
    const rules: Array<[ok: boolean, message: string]> = [
      [
        this.languages.includes(this.defaultLanguage),
        "defaultLanguage is not in languages",
      ],
      [
        this.currencies.includes(this.defaultCurrency),
        "defaultCurrency is not in currencies",
      ],
      [bets.step > 0, "bets.step must be positive"],
      [bets.min <= bets.max, "bets.min must not exceed bets.max"],
      [valid(bets.default), "bets.default must be within min/max and on the step grid"],
      [
        bets.levels.every(valid),
        "bets.levels must be within min/max and on the step grid",
      ],
      [
        [balance.starting, ...balance.options].every((amount) => amount >= 0),
        "balance amounts must not be negative",
      ],
    ]
    const broken = rules.filter(([ok]) => !ok).map(([, message]) => message)
    if (broken.length > 0) throw new Error(`Invalid LGS options: ${broken.join("; ")}`)
  }
}

function parseForce(force: ForcedOutcome | null) {
  const parsed = forcedOutcomeSchema.nullable().safeParse(force)
  if (!parsed.success) {
    throw new LgsError(
      "invalid-session-input",
      `Invalid force: ${z.prettifyError(parsed.error)}`,
    )
  }
  return parsed.data
}

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value)
}

function toQuery(params: LaunchParams) {
  const entries = Object.entries(params).map(([key, value]) => [key, String(value)])
  return new URLSearchParams(entries).toString()
}
