import { Hono, type Context } from "hono"
import z from "zod"
import { LgsError, type LgsErrorKind } from "../errors"
import type { LgsGame } from "../math"
import type { Bet, Session, Wallet } from "../storage"
import { AbstractLgs, type LgsOptions } from "."

export interface JurisdictionFlags {
  socialCasino: boolean
  disabledFullscreen: boolean
  disabledTurbo: boolean
  disabledSuperTurbo: boolean
  disabledAutoplay: boolean
  disabledSlamstop: boolean
  disabledSpacebar: boolean
  disabledBuyFeature: boolean
  displayNetPosition: boolean
  displayRTP: boolean
  displaySessionTimer: boolean
  minimumRoundDuration: number
}

export interface EngineLgsOptions extends LgsOptions {
  jurisdiction?: Partial<JurisdictionFlags>
}

const DEFAULT_JURISDICTION: JurisdictionFlags = {
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
}

interface EngineError {
  status: 400 | 500
  code: "ERR_VAL" | "ERR_IPB" | "ERR_GEN"
  message: string
}

const RUN_SIMULATION = "run the simulation for this game first"

const ENGINE_ERRORS: Record<LgsErrorKind, EngineError> = {
  "unknown-session": { status: 400, code: "ERR_VAL", message: "unknown session" },
  unauthenticated: { status: 400, code: "ERR_VAL", message: "session not authenticated" },
  "unknown-game": {
    status: 500,
    code: "ERR_GEN",
    message: `game not loaded, ${RUN_SIMULATION}`,
  },
  "unknown-mode": { status: 400, code: "ERR_VAL", message: "unknown mode" },
  "unknown-book": { status: 400, code: "ERR_VAL", message: "unknown forced book" },
  "invalid-session-input": { status: 400, code: "ERR_VAL", message: "invalid session" },
  "invalid-bet": { status: 400, code: "ERR_VAL", message: "invalid amount" },
  "round-active": { status: 400, code: "ERR_VAL", message: "a round is already active" },
  "no-active-round": { status: 400, code: "ERR_VAL", message: "no active round" },
  "insufficient-balance": {
    status: 400,
    code: "ERR_IPB",
    message: "insufficient balance",
  },
  "invalid-event": { status: 400, code: "ERR_VAL", message: "invalid event" },
  "missing-math": {
    status: 500,
    code: "ERR_GEN",
    message: `no lookup table, ${RUN_SIMULATION}`,
  },
  "missing-book": {
    status: 500,
    code: "ERR_GEN",
    message: `book not found, ${RUN_SIMULATION}`,
  },
}

const REPLAY_NOT_FOUND = new Set<LgsErrorKind>([
  "unknown-game",
  "unknown-mode",
  "unknown-book",
])

const sessionBody = z.object({ sessionID: z.string() })
const authenticateBody = sessionBody.extend({ language: z.string().optional() })
const playBody = sessionBody.extend({ mode: z.string(), amount: z.number().int() })
const eventBody = sessionBody.extend({ event: z.string() })

/**
 * Mimics the Engine RGS (https://studio.engine.io/docs/rgs).
 */
export class EngineLgs extends AbstractLgs {
  readonly name = "Engine"
  protected readonly routePrefixes = ["/wallet/*", "/bet/*"]
  readonly jurisdiction: JurisdictionFlags

  constructor(opts: EngineLgsOptions) {
    super(opts)
    this.jurisdiction = { ...DEFAULT_JURISDICTION, ...opts.jurisdiction }
  }

  protected rgsRouter(): Hono {
    const app = new Hono()

    app.post(
      "/wallet/authenticate",
      engineRoute(authenticateBody, async ({ sessionID, language }) => {
        const { session, wallet, activeBet } = await this.authenticate(
          sessionID,
          language,
        )
        return {
          balance: balance(wallet),
          config: this.authenticateConfig(this.getGame(session.gameId), wallet, session),
          round: activeBet ? round(activeBet) : null,
        }
      }),
    )

    app.post(
      "/wallet/balance",
      engineRoute(sessionBody, async ({ sessionID }) => ({
        balance: balance(await this.getBalance(sessionID)),
      })),
    )

    app.post(
      "/wallet/play",
      engineRoute(playBody, async ({ sessionID, mode, amount }) => {
        const { wallet, bet } = await this.placeBet(sessionID, mode, amount)
        return { balance: balance(wallet), round: round(bet) }
      }),
    )

    app.post(
      "/wallet/end-round",
      engineRoute(sessionBody, async ({ sessionID }) => {
        const { wallet } = await this.settleRound(sessionID)
        return { balance: balance(wallet) }
      }),
    )

    app.post(
      "/bet/event",
      engineRoute(eventBody, async ({ sessionID, event }) => ({
        event: await this.recordEvent(sessionID, event),
      })),
    )

    app.get("/bet/replay/:game/:version/:mode/:event", async (c) => {
      const { game, mode, event } = c.req.param()
      const bookId = Number(event)
      if (!/^\d+$/.test(event) || !Number.isSafeInteger(bookId)) return c.body(null, 404)

      try {
        return c.json(await this.replay(game, mode, bookId))
      } catch (error) {
        if (error instanceof LgsError && REPLAY_NOT_FOUND.has(error.kind)) {
          return c.body(null, 404)
        }
        return engineError(c, error)
      }
    })

    return app
  }

  protected authenticateConfig(game: LgsGame, wallet: Wallet, session: Session) {
    return {
      minBet: this.bets.min,
      maxBet: this.bets.max,
      stepBet: this.bets.step,
      defaultBetLevel: this.bets.default,
      betLevels: this.bets.levels,
      gameModes: Object.values(game.modes).map((mode) => ({
        mode: mode.name,
        costMultiplier: mode.cost,
        maxBet: this.modeMaxBet(mode),
      })),
      user: { id: wallet.id },
      jurisdiction: {
        ...this.jurisdiction,
        socialCasino: this.jurisdiction.socialCasino || session.social,
      },
    }
  }
}

function balance(wallet: Wallet) {
  return { amount: wallet.amount, currency: wallet.currency }
}

function round(bet: Bet) {
  return {
    betID: bet.id,
    amount: bet.amount,
    payout: bet.payout,
    payoutMultiplier: bet.payoutMultiplier,
    active: bet.active,
    mode: bet.mode,
    state: bet.state,
    ...(bet.event ? { event: bet.event } : {}),
  }
}

function engineRoute<T>(schema: z.ZodType<T>, run: (body: T) => Promise<object>) {
  return async (c: Context) => {
    const body = schema.safeParse(await c.req.json().catch(() => undefined))
    if (!body.success) return c.text("Bad Request", 400)

    try {
      return c.json(await run(body.data))
    } catch (error) {
      return engineError(c, error)
    }
  }
}

function engineError(c: Context, error: unknown) {
  if (error instanceof LgsError) {
    const { status, code, message } = ENGINE_ERRORS[error.kind]
    return c.json({ error: code, message: `${message}: ${error.message}` }, status)
  }
  console.error(error)
  return c.json({ error: "ERR_GEN", message: "general server error" }, 500)
}
