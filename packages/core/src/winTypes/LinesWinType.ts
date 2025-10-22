import { GameSymbol } from "../GameSymbol"
import { SimulationContext } from "../Simulation"
import { WinCombination, WinType, WinTypeOpts } from "../WinType"

export class LinesWinType extends WinType {
  protected lines: Record<number, number[]>
  declare protected winCombinations: LineWinCombination[]
  declare context: (ctx: SimulationContext<any, any, any>) => LinesWinType
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
    const reelsAmount = this.ctx.getCurrentGameMode().reelsAmount
    const symsPerReel = this.ctx.getCurrentGameMode().symbolsPerReel

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

  private isWild(symbol: GameSymbol) {
    return !!this.wildSymbol && symbol.compare(this.wildSymbol)
  }

  evaluateWins() {
    this.ensureContext()
    this.validateConfig()

    const lineWins: LineWinCombination[] = []
    let payout = 0

    const reels = this.ctx.board.reels
    const reelsAmount = this.ctx.getCurrentGameMode().reelsAmount

    for (const [lineNumStr, lineDef] of Object.entries(this.lines)) {
      const lineNum = Number(lineNumStr)

      let baseSymbol: GameSymbol | null = null
      let leadingWilds = 0
      const chain: GameSymbol[] = []
      const details: LineWinCombination["symbols"] = []

      for (let ridx = 0; ridx < reelsAmount; ridx++) {
        const rowIdx = lineDef[ridx]!
        const sym = reels[ridx]![rowIdx]
        if (!sym) throw new Error("Encountered an invalid symbol while evaluating wins.")

        const wild = this.isWild(sym)

        if (ridx === 0) {
          chain.push(sym)
          details.push({ reelIndex: ridx, posIndex: rowIdx, symbol: sym, isWild: wild })
          if (wild) leadingWilds++
          else baseSymbol = sym
          continue
        }

        if (wild) {
          chain.push(sym)
          details.push({
            reelIndex: ridx,
            posIndex: rowIdx,
            symbol: sym,
            isWild: true,
            substitutedFor: baseSymbol || undefined,
          })
          continue
        }

        if (!baseSymbol) {
          baseSymbol = sym
          chain.push(sym)
          details.push({ reelIndex: ridx, posIndex: rowIdx, symbol: sym, isWild: false })
          continue
        }

        if (sym.id === baseSymbol.id) {
          chain.push(sym)
          details.push({ reelIndex: ridx, posIndex: rowIdx, symbol: sym, isWild: false })
          continue
        }

        break
      }

      if (chain.length === 0) continue

      const allWild = chain.every((s) => this.isWild(s))
      const wildRepresentative =
        this.wildSymbol instanceof GameSymbol ? this.wildSymbol : null

      const len = chain.length
      let bestPayout = 0
      let bestType: LineWinCombination["winType"] | null = null
      let payingSymbol: GameSymbol | null = null

      if (baseSymbol?.pays && baseSymbol.pays[len]) {
        bestPayout = baseSymbol.pays[len]!
        bestType = "substituted"
        payingSymbol = baseSymbol
      }

      if (allWild && wildRepresentative?.pays && wildRepresentative.pays[len]) {
        const wildPay = wildRepresentative.pays[len]!
        if (wildPay > bestPayout) {
          bestPayout = wildPay
          bestType = "pure-wild"
          payingSymbol = wildRepresentative
        }
      }

      if (!bestPayout || !bestType || !payingSymbol) continue

      const minLen = payingSymbol.pays
        ? Math.min(...Object.keys(payingSymbol.pays).map(Number))
        : Infinity

      if (len < minLen) continue

      const wildCount = details.filter((d) => d.isWild).length
      const nonWildCount = len - wildCount

      lineWins.push({
        lineNumber: lineNum,
        kind: len,
        payout: bestPayout,
        symbol: payingSymbol,
        winType: bestType,
        substitutedBaseSymbol: bestType === "pure-wild" ? null : baseSymbol,
        symbols: details,
        stats: { wildCount, nonWildCount, leadingWilds },
      })
      payout += bestPayout
    }

    for (const win of lineWins) {
      this.ctx.recordSymbolOccurrence({
        kind: win.kind,
        symbolId: win.symbol.id,
        spinType: this.ctx.state.currentSpinType,
      })
    }

    this.payout = payout
    this.winCombinations = lineWins

    return this
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
  symbol: GameSymbol
  winType: "pure-wild" | "substituted"
  substitutedBaseSymbol: GameSymbol | null
  stats: {
    wildCount: number
    nonWildCount: number
    leadingWilds: number
  }
}
