import { GameSymbol } from "../game-symbol"
import { SymbolList, SymbolMap, WinCombination, WinType, WinTypeOpts } from "."
import { Reels } from "../types"

export class ClusterWinType extends WinType {
  declare protected winCombinations: ClusterWinCombination[]
  declare getWins: () => {
    payout: number
    winCombinations: ClusterWinCombination[]
  }

  private _checked: Set<number> = new Set()
  private _checkedWilds: Set<number> = new Set()
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
    this._checked.clear()
    this._currentBoard = board

    const clusterWins: ClusterWinCombination[] = []
    const potentialClusters: SymbolList[] = []
    const boardLength = board.length

    // Get normal symbol clusters
    for (let ridx = 0; ridx < boardLength; ridx++) {
      const reel = board[ridx]!
      const reelLength = reel.length

      for (let sidx = 0; sidx < reelLength; sidx++) {
        const symbol = reel[sidx]!
        this._checkedWilds.clear() // each cluster can check wilds anew

        if (this.isWild(symbol)) continue

        const posKey = ridx * 10000 + sidx
        if (this._checked.has(posKey)) {
          continue
        }

        const thisSymbol = { reel: ridx, row: sidx, symbol }
        this._checked.add(posKey)

        const neighbors = this.getNeighbors(ridx, sidx)
        const matchingSymbols = this.evaluateCluster(symbol, neighbors)

        // Record clusters from 2 symbols and up
        const matchingSize = matchingSymbols.size
        if (matchingSize >= 1) {
          const cluster: SymbolList = [thisSymbol]
          for (const sym of matchingSymbols.values()) {
            cluster.push(sym)
          }
          potentialClusters.push(cluster)
        }
      }
    }

    // Get wild only clusters
    for (let ridx = 0; ridx < boardLength; ridx++) {
      const reel = board[ridx]!
      const reelLength = reel.length

      for (let sidx = 0; sidx < reelLength; sidx++) {
        const symbol = reel[sidx]!
        this._checkedWilds.clear()

        if (!this.isWild(symbol)) continue

        const posKey = ridx * 10000 + sidx
        if (this._checked.has(posKey)) {
          continue
        }

        const thisSymbol = { reel: ridx, row: sidx, symbol }
        this._checked.add(posKey)

        const neighbors = this.getNeighbors(ridx, sidx)
        const matchingSymbols = this.evaluateCluster(symbol, neighbors)

        // Record clusters from 2 symbols and up
        const matchingSize = matchingSymbols.size
        if (matchingSize >= 1) {
          const cluster: SymbolList = [thisSymbol]
          for (const sym of matchingSymbols.values()) {
            cluster.push(sym)
          }
          potentialClusters.push(cluster)
        }
      }
    }

    const numClusters = potentialClusters.length
    for (let i = 0; i < numClusters; i++) {
      const cluster = potentialClusters[i]!
      const kind = cluster.length

      // Find first non-wild symbol as base
      let baseSymbol: GameSymbol | undefined
      for (let j = 0; j < kind; j++) {
        const sym = cluster[j]!.symbol
        if (!this.isWild(sym)) {
          baseSymbol = sym
          break
        }
      }
      if (!baseSymbol) baseSymbol = cluster[0]!.symbol

      const payout = this.getSymbolPayout(baseSymbol, kind)
      if (payout === 0) continue

      // Check if symbol has pays
      const pays = baseSymbol.pays
      if (!pays) continue

      let hasPays = false
      for (const _ in pays) {
        hasPays = true
        break
      }
      if (!hasPays) continue // don't add non-paying symbols to final clusters

      const symbols: ClusterWinCombination["symbols"] = []
      for (let j = 0; j < kind; j++) {
        const s = cluster[j]!
        symbols.push({
          symbol: s.symbol,
          isWild: this.isWild(s.symbol),
          reelIndex: s.reel,
          posIndex: s.row,
        })
      }

      clusterWins.push({
        payout,
        kind,
        baseSymbol,
        symbols,
      })

      this.ctx.services.data.recordSymbolOccurrence({
        kind,
        symbolId: baseSymbol.id,
        spinType: this.ctx.state.currentSpinType,
      })
    }

    let totalPayout = 0
    for (let i = 0; i < clusterWins.length; i++) {
      totalPayout += clusterWins[i]!.payout
    }

    this.payout = totalPayout
    this.winCombinations = clusterWins

    return this
  }

  private getNeighbors(ridx: number, sidx: number) {
    const board = this._currentBoard
    const neighbors: SymbolList = []

    // Check left neighbor
    if (ridx > 0) {
      const leftReel = board[ridx - 1]!
      const leftSymbol = leftReel[sidx]
      if (leftSymbol !== undefined) {
        neighbors.push({ reel: ridx - 1, row: sidx, symbol: leftSymbol })
      }
    }

    // Check right neighbor
    const rightReel = board[ridx + 1]
    if (rightReel !== undefined) {
      const rightSymbol = rightReel[sidx]
      if (rightSymbol !== undefined) {
        neighbors.push({ reel: ridx + 1, row: sidx, symbol: rightSymbol })
      }
    }

    // Check top neighbor
    const currentReel = board[ridx]!
    const topSymbol = currentReel[sidx - 1]
    if (topSymbol !== undefined) {
      neighbors.push({ reel: ridx, row: sidx - 1, symbol: topSymbol })
    }

    // Check bottom neighbor
    const bottomSymbol = currentReel[sidx + 1]
    if (bottomSymbol !== undefined) {
      neighbors.push({ reel: ridx, row: sidx + 1, symbol: bottomSymbol })
    }

    return neighbors
  }

  private evaluateCluster(rootSymbol: GameSymbol, neighbors: SymbolList) {
    const matchingSymbols: SymbolMap = new Map()
    const numNeighbors = neighbors.length

    for (let i = 0; i < numNeighbors; i++) {
      const neighbor = neighbors[i]!
      const { reel, row, symbol } = neighbor
      const posKey = reel * 10000 + row

      if (this._checked.has(posKey)) continue
      if (this._checkedWilds.has(posKey)) continue

      if (this.isWild(symbol) || symbol.compare(rootSymbol)) {
        const key = String(posKey)
        matchingSymbols.set(key, { reel, row, symbol })

        if (symbol.compare(rootSymbol)) {
          this._checked.add(posKey)
        }

        if (this.isWild(symbol)) {
          this._checkedWilds.add(posKey)
        }

        const nestedNeighbors = this.getNeighbors(reel, row)
        const nestedMatches = this.evaluateCluster(rootSymbol, nestedNeighbors)

        for (const [nkey, nsym] of nestedMatches.entries()) {
          matchingSymbols.set(nkey, nsym)
        }
      }
    }

    return matchingSymbols
  }
}

interface ClusterWinTypeOpts extends WinTypeOpts {}

export interface ClusterWinCombination extends WinCombination {}
