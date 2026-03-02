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
    const reelsLength = reels.length
    const lineNumbers = Object.keys(this.lines)
    const numLines = lineNumbers.length

    for (let lidx = 0; lidx < numLines; lidx++) {
      const lineNumStr = lineNumbers[lidx]!
      const lineNum = Number(lineNumStr)
      const line = this.lines[lineNum]!

      let baseSymbol: GameSymbol | undefined
      const potentialWinLine: SymbolList = []
      const potentialWildLine: SymbolList = []
      let isInterrupted = false

      for (let ridx = 0; ridx < reelsLength; ridx++) {
        const reel = reels[ridx]!
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
        } else {
          isInterrupted = true
          break
        }
      }

      // Get minimum required symbols for a win
      const pays = baseSymbol!.pays || {}
      let minSymLine = Infinity
      for (const key in pays) {
        const num = parseInt(key, 10)
        if (num < minSymLine) minSymLine = num
      }

      if (potentialWinLine.length < minSymLine) continue

      const linePayout = this.getLinePayout(potentialWinLine)
      const wildLinePayout = this.getLinePayout(potentialWildLine)

      let finalLine: LineWinCombination

      // Choose the highest paying line
      if (wildLinePayout > linePayout) {
        baseSymbol = potentialWildLine[0]?.symbol

        const wildSymbols: LineWinCombination["symbols"] = []
        const wildLineLength = potentialWildLine.length
        for (let i = 0; i < wildLineLength; i++) {
          const s = potentialWildLine[i]!
          wildSymbols.push({
            symbol: s.symbol,
            isWild: this.isWild(s.symbol),
            reelIndex: s.reel,
            posIndex: s.row,
          })
        }

        finalLine = {
          kind: wildLineLength,
          baseSymbol: baseSymbol!,
          symbols: wildSymbols,
          lineNumber: lineNum,
          payout: wildLinePayout,
        }
      } else {
        const symbols: LineWinCombination["symbols"] = []
        const lineLength = potentialWinLine.length
        for (let i = 0; i < lineLength; i++) {
          const s = potentialWinLine[i]!
          symbols.push({
            symbol: s.symbol,
            isWild: this.isWild(s.symbol),
            reelIndex: s.reel,
            posIndex: s.row,
          })
        }

        finalLine = {
          kind: lineLength,
          baseSymbol: baseSymbol!,
          symbols,
          lineNumber: lineNum,
          payout: linePayout,
        }
      }

      lineWins.push(finalLine)

      this.ctx.services.data.recordSymbolOccurrence({
        kind: finalLine.kind,
        symbolId: finalLine.baseSymbol.id,
        spinType: this.ctx.state.currentSpinType,
      })
    }

    let totalPayout = 0
    for (let i = 0; i < lineWins.length; i++) {
      totalPayout += lineWins[i]!.payout
    }

    this.payout = totalPayout
    this.winCombinations = lineWins

    return this
  }

  private getLinePayout(line: SymbolList) {
    const lineLength = line.length
    if (lineLength === 0) return 0

    let baseSymbol: GameSymbol | undefined
    for (let i = 0; i < lineLength; i++) {
      const s = line[i]!
      if (!this.isWild(s.symbol)) {
        baseSymbol = s.symbol
        break
      }
    }
    if (!baseSymbol) baseSymbol = line[0]!.symbol

    return this.getSymbolPayout(baseSymbol, lineLength)
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
