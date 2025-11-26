import { GameSymbol } from "../game-symbol"
import { WinCombination, WinType, WinTypeOpts } from "."
import { Reels } from "../types"

export class ClusterWinType extends WinType {
  declare protected winCombinations: ClusterWinCombination[]
  declare getWins: () => {
    payout: number
    winCombinations: ClusterWinCombination[]
  }

  private _checked: Array<[number, number]> = []
  private _currentBoard: Reels = []

  constructor(opts: ClusterWinTypeOpts) {
    super(opts)
  }

  private validateConfig() {}

  /**
   * Calculates wins based on symbol cluster size and provided board state.\
   * Retrieve the results using `getWins()` after.
   */
  evaluateWins(board: Reels) {
    this.validateConfig()
    this._checked = []
    this._currentBoard = board

    const clusterWins: ClusterWinCombination[] = []
    let payout = 0

    const potentialClusters: SymbolList[] = []

    // Get normal symbol clusters
    for (const [ridx, reel] of board.entries()) {
      for (const [sidx, symbol] of reel.entries()) {
        if (this.isWild(symbol)) continue

        if (this.isChecked(ridx, sidx)) {
          continue
        }

        this._checked.push([ridx, sidx])

        const thisSymbol = { reel: ridx, row: sidx, symbol }
        const neighbors = this.getNeighbors(ridx, sidx)
        const matchingSymbols = this.evaluateCluster(symbol, neighbors)

        // Record clusters from 2 symbols and up
        if (matchingSymbols.size >= 1) {
          potentialClusters.push([thisSymbol, ...matchingSymbols.values()])
        }
      }
    }

    console.log(
      potentialClusters.map((c) =>
        c.map((s) => `${s.symbol.id}(${s.reel},${s.row})`).join(", "),
      ),
    )

    // Get wild only clusters

    this.payout = payout
    this.winCombinations = clusterWins

    return this
  }

  private getNeighbors(ridx: number, sidx: number) {
    const board = this._currentBoard
    const neighbors: SymbolList = []

    const potentialNeighbors: Array<[number, number]> = [
      [ridx - 1, sidx],
      [ridx + 1, sidx],
      [ridx, sidx - 1],
      [ridx, sidx + 1],
    ]

    potentialNeighbors.forEach(([nridx, nsidx]) => {
      if (board[nridx] && board[nridx][nsidx]) {
        neighbors.push({ reel: nridx, row: nsidx, symbol: board[nridx][nsidx] })
      }
    })

    return neighbors
  }

  private evaluateCluster(rootSymbol: GameSymbol, neighbors: SymbolList) {
    const matchingSymbols: SymbolMap = new Map()

    neighbors.forEach(({ reel, row, symbol }) => {
      if (this.isChecked(reel, row)) return

      if (this.isWild(symbol) || symbol.compare(rootSymbol)) {
        const key = `${reel}-${row}`
        matchingSymbols.set(key, { reel, row, symbol })

        if (symbol.compare(rootSymbol)) {
          this._checked.push([reel, row])
        }

        const neighbors = this.getNeighbors(reel, row)
        const nestedMatches = this.evaluateCluster(rootSymbol, neighbors)
        nestedMatches.forEach((nsym) => {
          const nkey = `${nsym.reel}-${nsym.row}`
          matchingSymbols.set(nkey, nsym)
        })
      }
    })

    return matchingSymbols
  }

  private isChecked(ridx: number, sidx: number) {
    return !!this._checked.find((c) => c[0] === ridx && c[1] === sidx)
  }
}

interface ClusterWinTypeOpts extends WinTypeOpts {}

export interface ClusterWinCombination extends WinCombination {}

type SymbolList = Array<{ reel: number; row: number; symbol: GameSymbol }>
type SymbolMap = Map<string, { reel: number; row: number; symbol: GameSymbol }>
