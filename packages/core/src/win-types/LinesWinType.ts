import { GameSymbol } from "../game-symbol"
import { SymbolList, WinCombination, WinType, WinTypeOpts } from "."
import { Reels } from "../types"
import assert from "assert"

export class LinesWinType extends WinType {
  protected lines: Record<number, number[]>
  declare protected winCombinations: LineWinCombination[]
  declare getWins: () => {
    payout: number
    winCombinations: LineWinCombination[]
  }

  constructor(opts: LinesWinTypeOpts) {
    super(opts)
    this.lines = opts.lines

    if (Object.keys(this.lines).length === 0) {
      throw new Error("LinesWinType must have at least one line defined.")
    }
  }

  private validateConfig() {
    const reelsAmount = this.ctx.services.game.getCurrentGameMode().reelsAmount
    const symsPerReel = this.ctx.services.game.getCurrentGameMode().symbolsPerReel

    for (const [lineNum, positions] of Object.entries(this.lines)) {
      if (positions.length !== reelsAmount) {
        throw new Error(
          `Line ${lineNum} has ${positions.length} positions, but the current game mode has ${reelsAmount} reels.`,
        )
      }
      for (let i = 0; i < positions.length; i++) {
        if (positions[i]! < 0 || positions[i]! >= symsPerReel[i]!) {
          throw new Error(
            `Line ${lineNum} has an invalid position ${positions[i]} on reel ${i}. Valid range is 0 to ${
              symsPerReel[i]! - 1
            }.`,
          )
        }
      }
    }

    const firstLine = Math.min(...Object.keys(this.lines).map(Number))
    if (firstLine !== 1) {
      throw new Error(
        `Lines must start from 1. Found line ${firstLine} as the first line.`,
      )
    }
  }

  /**
   * Calculates wins based on the defined paylines and provided board state.\
   * Retrieve the results using `getWins()` after.
   */
  evaluateWins(board: Reels) {
    this.validateConfig()

    const lineWins: LineWinCombination[] = []

    const reels = board

    for (const [lineNumStr, line] of Object.entries(this.lines)) {
      const lineNum = Number(lineNumStr)
      let baseSymbol: GameSymbol | undefined
      const potentialWinLine: SymbolList = []
      const potentialWildLine: SymbolList = []

      for (const [ridx, reel] of reels.entries()) {
        const sidx = line[ridx]!
        const thisSymbol = reel[sidx]

        if (!baseSymbol) {
          baseSymbol = thisSymbol
        }

        assert(baseSymbol, `No symbol found at line ${lineNum}, reel ${ridx}`)
        assert(thisSymbol, `No symbol found at line ${lineNum}, reel ${ridx}`)

        if (potentialWinLine.length == 0) {
          if (this.isWild(thisSymbol)) {
            potentialWildLine.push({ reel: ridx, row: sidx, symbol: thisSymbol })
          }
          potentialWinLine.push({ reel: ridx, row: sidx, symbol: thisSymbol })
          continue
        }

        if (this.isWild(baseSymbol)) {
          if (this.isWild(thisSymbol)) {
            potentialWildLine.push({ reel: ridx, row: sidx, symbol: thisSymbol })
          } else {
            baseSymbol = thisSymbol
          }
          potentialWinLine.push({ reel: ridx, row: sidx, symbol: thisSymbol })
          continue
        }

        if (baseSymbol.compare(thisSymbol) || this.isWild(thisSymbol)) {
          potentialWinLine.push({ reel: ridx, row: sidx, symbol: thisSymbol })
        }
      }

      const minSymLine = Math.min(
        ...Object.keys(baseSymbol!.pays || {}).map((k) => parseInt(k, 10)),
      )

      if (potentialWinLine.length < minSymLine) continue

      const linePayout = this.getLinePayout(potentialWinLine)
      const wildLinePayout = this.getLinePayout(potentialWildLine)

      let finalLine: LineWinCombination = {
        kind: potentialWinLine.length,
        baseSymbol: baseSymbol!,
        symbols: potentialWinLine.map((s) => ({
          symbol: s.symbol,
          isWild: this.isWild(s.symbol),
          reelIndex: s.reel,
          posIndex: s.row,
        })),
        lineNumber: lineNum,
        payout: linePayout,
      }

      if (wildLinePayout > linePayout) {
        baseSymbol = potentialWildLine[0]?.symbol

        finalLine = {
          kind: potentialWildLine.length,
          baseSymbol: baseSymbol!,
          symbols: potentialWildLine.map((s) => ({
            symbol: s.symbol,
            isWild: this.isWild(s.symbol),
            reelIndex: s.reel,
            posIndex: s.row,
          })),
          lineNumber: lineNum,
          payout: wildLinePayout,
        }
      }

      lineWins.push(finalLine)
    }

    for (const win of lineWins) {
      this.ctx.services.data.recordSymbolOccurrence({
        kind: win.kind,
        symbolId: win.baseSymbol.id,
        spinType: this.ctx.state.currentSpinType,
      })
    }

    this.payout = lineWins.reduce((sum, l) => sum + l.payout, 0)
    this.winCombinations = lineWins

    return this
  }

  private getLinePayout(line: SymbolList) {
    if (line.length === 0) return 0

    let baseSymbol = line.find((s) => !this.isWild(s.symbol))?.symbol
    if (!baseSymbol) baseSymbol = line[0]!.symbol

    const kind = line.length
    const payout = this.getSymbolPayout(baseSymbol, kind)

    return payout
  }
}

interface LinesWinTypeOpts extends WinTypeOpts {
  /**
   * Defines the paylines for the slot game.
   *
   * @example
   * ```ts
   * lines: {
   *   1: [0, 0, 0, 0, 0],
   *   2: [1, 1, 1, 1, 1],
   *   3: [2, 2, 2, 2, 2],
   * }
   * ```
   */
  lines: Record<number, number[]>
}

export interface LineWinCombination extends WinCombination {
  lineNumber: number
}
