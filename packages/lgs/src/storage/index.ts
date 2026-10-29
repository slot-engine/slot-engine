import type { Currency } from "../currencies"
import type { ForcedOutcome } from "../math"
import type { Amount } from "../money"

export interface Wallet {
  id: string
  currency: Currency
  amount: Amount
}

export const DEVICES = ["desktop", "mobile", "tablet"] as const

export type Device = (typeof DEVICES)[number]

export interface Session {
  id: string
  walletId: string
  gameId: string
  currency: Currency
  language: string
  device: Device
  social: boolean
  demo: boolean
  authenticated: boolean
  activeBetId: number | null
  /** Replaces the weighted draw of every play until cleared. */
  force: ForcedOutcome | null
  createdAt: number
}

export interface Bet {
  id: number
  sessionId: string
  walletId: string
  gameId: string
  mode: string
  amount: Amount
  cost: Amount // amount * mode
  payoutMultiplier: number
  payout: Amount // amount * payoutMultiplier
  bookId: number
  state: unknown[] // book events
  event: string | null
  active: boolean
  createdAt: number
  settledAt: number | null
}

export interface Repository<T extends { id: Id }, Id extends string | number> {
  get(id: Id): Promise<T | undefined>
  create(data: Omit<T, "id">): Promise<T>
  update(id: Id, patch: Partial<Omit<T, "id">>): Promise<T>
  delete(id: Id): Promise<void>
  find(predicate: (item: T) => boolean): Promise<T[]>
}

export abstract class AbstractStorage {
  abstract readonly wallets: Repository<Wallet, string>
  abstract readonly sessions: Repository<Session, string>
  abstract readonly bets: Repository<Bet, number>
}
