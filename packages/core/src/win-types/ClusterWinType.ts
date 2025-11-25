import { GameSymbol } from "../game-symbol"
import { WinCombination, WinType, WinTypeOpts } from "."
import { Reels } from "../types"

export class ClusterWinType extends WinType {
  declare protected winCombinations: ClusterWinCombination[]
  declare getWins: () => {
    payout: number
    winCombinations: ClusterWinCombination[]
  }

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

    const clusterWins: ClusterWinCombination[] = []
    let payout = 0

    const reels = board

    const rows = reels[0]?.length || 0
    const cols = reels.length
    const usedWilds = new Set<string>()

    // Map of symbol ID to list of positions
    const symbolLocations = new Map<string, { c: number; r: number }[]>()
    const wildLocations: { c: number; r: number }[] = []

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const sym = reels[c]?.[r]
        if (!sym) continue

        if (this.isWild(sym)) {
          wildLocations.push({ c, r })
        } else {
          if (!symbolLocations.has(sym.id)) {
            symbolLocations.set(sym.id, [])
          }
          symbolLocations.get(sym.id)!.push({ c, r })
        }
      }
    }

    // 1. Evaluate Non-Wild Clusters
    for (const [symbolId, locations] of symbolLocations.entries()) {
      const visited = new Set<string>()

      for (const loc of locations) {
        const key = `${loc.c},${loc.r}`
        if (visited.has(key)) continue

        const sym = reels[loc.c]![loc.r]!

        // Start flood fill
        const cluster: { c: number; r: number; sym: GameSymbol; isWild: boolean }[] = []
        const queue = [loc]
        visited.add(key)
        cluster.push({ ...loc, sym, isWild: false })

        while (queue.length > 0) {
          const curr = queue.shift()!
          const neighbors = [
            { c: curr.c + 1, r: curr.r },
            { c: curr.c - 1, r: curr.r },
            { c: curr.c, r: curr.r + 1 },
            { c: curr.c, r: curr.r - 1 },
          ]

          for (const n of neighbors) {
            if (n.c < 0 || n.c >= cols || n.r < 0 || n.r >= rows) continue
            const nKey = `${n.c},${n.r}`
            if (visited.has(nKey)) continue

            const nSym = reels[n.c]![n.r]!
            const nIsWild = this.isWild(nSym)

            if (nSym.id === symbolId || nIsWild) {
              visited.add(nKey)
              queue.push(n)
              cluster.push({ c: n.c, r: n.r, sym: nSym, isWild: nIsWild })
            }
          }
        }

        const size = cluster.length
        const representativeSymbol = sym

        if (representativeSymbol.pays && representativeSymbol.pays[size]) {
          const winAmount = representativeSymbol.pays[size]!
          payout += winAmount

          cluster.forEach((p) => {
            if (p.isWild) usedWilds.add(`${p.c},${p.r}`)
          })

          clusterWins.push({
            baseSymbol: representativeSymbol,
            payout: winAmount,
            kind: size,
            symbols: cluster.map((p) => ({
              symbol: p.sym,
              isWild: p.isWild,
              reelIndex: p.c,
              posIndex: p.r,
              substitutedFor: p.isWild ? representativeSymbol : undefined,
            })),
          })

          this.ctx.services.data.recordSymbolOccurrence({
            kind: size,
            symbolId: representativeSymbol.id,
            spinType: this.ctx.state.currentSpinType,
          })
        }
      }
    }

    // 2. Evaluate Pure Wild Clusters
    const wildVisited = new Set<string>()
    for (const loc of wildLocations) {
      const key = `${loc.c},${loc.r}`
      if (wildVisited.has(key)) continue

      const sym = reels[loc.c]![loc.r]!

      const cluster: { c: number; r: number; sym: GameSymbol }[] = []
      const queue = [loc]
      wildVisited.add(key)
      cluster.push({ ...loc, sym })

      while (queue.length > 0) {
        const curr = queue.shift()!
        const neighbors = [
          { c: curr.c + 1, r: curr.r },
          { c: curr.c - 1, r: curr.r },
          { c: curr.c, r: curr.r + 1 },
          { c: curr.c, r: curr.r - 1 },
        ]

        for (const n of neighbors) {
          if (n.c < 0 || n.c >= cols || n.r < 0 || n.r >= rows) continue
          const nKey = `${n.c},${n.r}`
          if (wildVisited.has(nKey)) continue

          const nSym = reels[n.c]![n.r]!
          if (this.isWild(nSym)) {
            wildVisited.add(nKey)
            queue.push(n)
            cluster.push({ c: n.c, r: n.r, sym: nSym })
          }
        }
      }

      const isUsed = cluster.some((p) => usedWilds.has(`${p.c},${p.r}`))

      if (!isUsed) {
        const size = cluster.length
        const representativeSymbol = cluster[0]!.sym

        if (representativeSymbol.pays && representativeSymbol.pays[size]) {
          const winAmount = representativeSymbol.pays[size]!
          payout += winAmount

          clusterWins.push({
            baseSymbol: representativeSymbol,
            payout: winAmount,
            kind: size,
            symbols: cluster.map((p) => ({
              symbol: p.sym,
              isWild: true,
              reelIndex: p.c,
              posIndex: p.r,
            })),
          })

          this.ctx.services.data.recordSymbolOccurrence({
            kind: size,
            symbolId: representativeSymbol.id,
            spinType: this.ctx.state.currentSpinType,
          })
        }
      }
    }

    this.payout = payout
    this.winCombinations = clusterWins

    return this
  }
}

interface ClusterWinTypeOpts extends WinTypeOpts {}

export interface ClusterWinCombination extends WinCombination {}
