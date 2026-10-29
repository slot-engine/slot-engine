import { BookReader, type SlotGame } from "@slot-engine/core"
import { PublishedMath } from "./PublishedMath"

export interface Outcome {
  bookId: number
  payoutCents: number
  events: unknown[]
}

export type ForcedOutcome = { bookId: number } | { payoutMultiplier: number }

export interface GameMath {
  /** Without `force`: a weighted draw. With `force`: that book, or a book with the closest payout. */
  pick(mode: string, force?: ForcedOutcome): Promise<Outcome>
}

export interface LgsMode {
  name: string
  cost: number
  rtp: number
  isBonusBuy: boolean
  isFeature: boolean
}

export interface LgsGame {
  id: string
  name: string
  modes: Record<string, LgsMode>
  math: GameMath
}

export function fromSlotGame(game: SlotGame, random: () => number): LgsGame {
  const { id, name, gameModes } = game.getConfig()

  const modes: Record<string, LgsMode> = {}
  for (const mode of Object.values(gameModes)) {
    const { name, cost, rtp, isBonusBuy, isFeature } = mode
    modes[name] = { name, cost, rtp, isBonusBuy, isFeature }
  }

  return {
    id,
    name,
    modes,
    math: new PublishedMath({
      lookupTablePath: game.getMetadata().paths.lookupTablePublish,
      books: new BookReader(game, { maxCachedChunks: 4 }),
      random,
    }),
  }
}
