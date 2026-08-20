import { describe, it, expect, beforeEach } from "vitest"
import { createTestContext } from "../game-context"
import { GameSymbol } from "../game-symbol"
import { GameMode } from "../game-mode"
import { ResultSet } from "."
import { SPIN_TYPE } from "../constants"
import { StaticReelSet } from "../reel-set/StaticReelSet"
import { Wallet } from "../wallet"

const X = new GameSymbol({
  id: "X",
})

const ctx = createTestContext({
  symbols: { X },
  gameModes: {
    base: new GameMode({
      name: "base",
      reelsAmount: 0,
      symbolsPerReel: [],
      cost: 1,
      reelSets: [
        new StaticReelSet({
          id: "test",
          reels: [["X"]],
        }),
      ],
      resultSets: [],
      rtp: 0.9,
      isBonusBuy: false,
    }),
  },
})

const resultSet1 = new ResultSet({
  criteria: "test",
  quota: 0.9,
  reelWeights: {
    [SPIN_TYPE.BASE_GAME]: { base: 1 },
    [SPIN_TYPE.FREE_SPINS]: { bonus: 1 },
  },
  multiplier: 3000,
})

const resultSet2 = new ResultSet({
  criteria: "test",
  quota: 0.9,
  reelWeights: {
    [SPIN_TYPE.BASE_GAME]: { base: 1 },
    [SPIN_TYPE.FREE_SPINS]: { bonus: 1 },
  },
  multiplier: [3000, 3001],
})

describe("ResultSet", () => {
  it("evaluates floating point wallet correctly", () => {
    ctx.services.wallet._setWallet(new Wallet())
    ctx.services.wallet._getWallet().addSpinWin(3000.0000005)
    ctx.services.wallet.confirmSpinWin()
    const result = resultSet1.meetsCriteria(ctx)
    expect(result).toBe(true)
  })

  it("evaluates inclusive multiplier correctly", () => {
    ctx.services.wallet._setWallet(new Wallet())
    
    ctx.services.wallet._getWallet().addSpinWin(3000)
    ctx.services.wallet.confirmSpinWin()
    const result = resultSet2.meetsCriteria(ctx)
    expect(result).toBe(true)

    ctx.services.wallet._getWallet().addSpinWin(5)
    ctx.services.wallet.confirmSpinWin()
    const result2 = resultSet2.meetsCriteria(ctx)
    expect(result2).toBe(false)
  })
})
