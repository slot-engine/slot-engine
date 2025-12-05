import { GameSymbol } from "../game-symbol"
import { SymbolList, SymbolMap, WinCombination, WinType, WinTypeOpts } from "."
import { Reels } from "../types"

export class ClusterWinType extends WinType {
  declare protected winCombinations: ClusterWinCombination[]
  declare getWins: () => {
    payout: number
    winCombinations: ClusterWinCombination[]
  }

  private _checked: SymbolList = []
  private _checkedWilds: SymbolList = []
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
    const potentialClusters: SymbolList[] = []

    // Get normal symbol clusters
    for (const [ridx, reel] of board.entries()) {
      for (const [sidx, symbol] of reel.entries()) {
        this._checkedWilds = [] // each cluster can check wilds anew

        if (this.isWild(symbol)) continue

        if (this.isChecked(ridx, sidx)) {
          continue
        }

        const thisSymbol = { reel: ridx, row: sidx, symbol }
        this._checked.push(thisSymbol)

        const neighbors = this.getNeighbors(ridx, sidx)
        const matchingSymbols = this.evaluateCluster(symbol, neighbors)

        // Record clusters from 2 symbols and up
        if (matchingSymbols.size >= 1) {
          potentialClusters.push([thisSymbol, ...matchingSymbols.values()])
        }
      }
    }

    // Get wild only clusters
    for (const [ridx, reel] of board.entries()) {
      for (const [sidx, symbol] of reel.entries()) {
        this._checkedWilds = []

        if (!this.isWild(symbol)) continue

        if (this.isChecked(ridx, sidx)) {
          continue
        }

        const thisSymbol = { reel: ridx, row: sidx, symbol }
        this._checked.push(thisSymbol)

        const neighbors = this.getNeighbors(ridx, sidx)
        const matchingSymbols = this.evaluateCluster(symbol, neighbors)

        // Record clusters from 2 symbols and up
        if (matchingSymbols.size >= 1) {
          potentialClusters.push([thisSymbol, ...matchingSymbols.values()])
        }
      }
    }

    for (const cluster of potentialClusters) {
      const kind = cluster.length
      let baseSymbol = cluster.find((s) => !this.isWild(s.symbol))?.symbol
      if (!baseSymbol) baseSymbol = cluster[0]!.symbol

      const payout = this.getSymbolPayout(baseSymbol, kind)
      if (payout === 0) continue

      if (!baseSymbol.pays || Object.keys(baseSymbol.pays).length === 0) {
        continue // don't add non-paying symbols to final clusters
      }

      clusterWins.push({
        payout,
        kind,
        baseSymbol,
        symbols: cluster.map((s) => ({
          symbol: s.symbol,
          isWild: this.isWild(s.symbol),
          reelIndex: s.reel,
          posIndex: s.row,
        })),
      })
    }

    for (const win of clusterWins) {
      this.ctx.services.data.recordSymbolOccurrence({
        kind: win.kind,
        symbolId: win.baseSymbol.id,
        spinType: this.ctx.state.currentSpinType,
      })
    }

    this.payout = clusterWins.reduce((sum, c) => sum + c.payout, 0)
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

    neighbors.forEach((neighbor) => {
      const { reel, row, symbol } = neighbor

      if (this.isChecked(reel, row)) return
      if (this.isCheckedWild(reel, row)) return

      if (this.isWild(symbol) || symbol.compare(rootSymbol)) {
        const key = `${reel}-${row}`
        matchingSymbols.set(key, { reel, row, symbol })

        if (symbol.compare(rootSymbol)) {
          this._checked.push(neighbor)
        }

        if (this.isWild(symbol)) {
          this._checkedWilds.push(neighbor)
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
    return !!this._checked.find((c) => c.reel === ridx && c.row === sidx)
  }

  private isCheckedWild(ridx: number, sidx: number) {
    return !!this._checkedWilds.find((c) => c.reel === ridx && c.row === sidx)
  }
}

interface ClusterWinTypeOpts extends WinTypeOpts {}

export interface ClusterWinCombination extends WinCombination {}
