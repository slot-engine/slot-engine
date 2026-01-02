import fs from "fs"
import path from "path"
import { isMainThread } from "worker_threads"
import { ReelSet, ReelSetOptions } from "."
import { GameConfig } from "../game-config"
import { GameSymbol } from "../game-symbol"
import { createDirIfNotExists } from "../../utils"

/**
 * This class is responsible for generating reel sets for slot games based on specified configurations.
 *
 * **While it offers a high degree of customization, some configurations may lead to unsolvable scenarios.**
 *
 * If the reel generator is unable to fulfill niche constraints,\
 * you might need to adjust your configuration, or edit the generated reels manually.\
 * Setting a different seed may also help.
 */
export class GeneratedReelSet extends ReelSet {
  protected readonly symbolWeights: Map<string, number> = new Map()
  protected readonly rowsAmount: number
  protected limitSymbolsToReels?: Record<string, number[]>
  protected readonly spaceBetweenSameSymbols?: number | Record<string, number>
  protected readonly spaceBetweenSymbols?: Record<string, Record<string, number>>
  protected readonly preferStackedSymbols?: number
  protected readonly symbolStacks?: Record<
    string,
    {
      chance: number | Record<string, number>
      min?: number | Record<string, number>
      max?: number | Record<string, number>
    }
  >
  protected readonly symbolQuotas?: Record<string, number | Record<string, number>>
  private overrideExisting: boolean

  constructor(opts: GeneratedReelSetOptions) {
    super(opts)
    this.id = opts.id
    this.symbolWeights = new Map(Object.entries(opts.symbolWeights))
    this.rowsAmount = opts.rowsAmount || 250

    if (opts.limitSymbolsToReels) this.limitSymbolsToReels = opts.limitSymbolsToReels

    this.overrideExisting = opts.overrideExisting || false
    this.spaceBetweenSameSymbols = opts.spaceBetweenSameSymbols
    this.spaceBetweenSymbols = opts.spaceBetweenSymbols
    this.preferStackedSymbols = opts.preferStackedSymbols
    this.symbolStacks = opts.symbolStacks
    this.symbolQuotas = opts.symbolQuotas

    if (
      (typeof this.spaceBetweenSameSymbols == "number" &&
        (this.spaceBetweenSameSymbols < 1 || this.spaceBetweenSameSymbols > 8)) ||
      (typeof this.spaceBetweenSameSymbols == "object" &&
        Object.values(this.spaceBetweenSameSymbols).some((v) => v < 1 || v > 8))
    ) {
      throw new Error(
        `spaceBetweenSameSymbols must be between 1 and 8, got ${this.spaceBetweenSameSymbols}.`,
      )
    }

    if (
      Object.values(this.spaceBetweenSymbols || {}).some((o) =>
        Object.values(o).some((v) => v < 1 || v > 8),
      )
    ) {
      throw new Error(
        `spaceBetweenSymbols must be between 1 and 8, got ${this.spaceBetweenSymbols}.`,
      )
    }

    if (
      this.preferStackedSymbols &&
      (this.preferStackedSymbols < 0 || this.preferStackedSymbols > 100)
    ) {
      throw new Error(
        `preferStackedSymbols must be between 0 and 100, got ${this.preferStackedSymbols}.`,
      )
    }
  }

  private validateConfig(config: GameConfig) {
    this.symbolWeights.forEach((_, symbol) => {
      if (!config.symbols.has(symbol)) {
        throw new Error(
          `Symbol "${symbol}" of the reel generator ${this.id} for mode ${this.associatedGameModeName} is not defined in the game config`,
        )
      }
    })

    if (this.limitSymbolsToReels && Object.keys(this.limitSymbolsToReels).length == 0) {
      this.limitSymbolsToReels = undefined
    }
  }

  private isSymbolAllowedOnReel(symbolId: string, reelIdx: number) {
    if (!this.limitSymbolsToReels) return true
    const allowedReels = this.limitSymbolsToReels[symbolId]
    if (!allowedReels || allowedReels.length === 0) return true
    return allowedReels.includes(reelIdx)
  }

  private resolveStacking(symbolId: string, reelIdx: number) {
    const cfg = this.symbolStacks?.[symbolId]
    if (!cfg) return null

    const STACKING_MIN = 1
    const STACKING_MAX = 4

    const chance =
      typeof cfg.chance === "number" ? cfg.chance : (cfg.chance?.[reelIdx] ?? 0)
    if (chance <= 0) return null

    let min = typeof cfg.min === "number" ? cfg.min : (cfg.min?.[reelIdx] ?? STACKING_MIN)
    let max = typeof cfg.max === "number" ? cfg.max : (cfg.max?.[reelIdx] ?? STACKING_MAX)

    return { chance, min, max }
  }

  private tryPlaceStack(
    reel: Array<GameSymbol | null>,
    config: GameConfig,
    reelIdx: number,
    symbolId: string,
    startIndex: number,
    maxStack: number,
  ) {
    if (!this.isSymbolAllowedOnReel(symbolId, reelIdx)) return 0

    let canPlace = 0
    for (let j = 0; j < maxStack; j++) {
      const idx = (startIndex + j) % this.rowsAmount
      if (reel[idx] !== null) break
      canPlace++
    }
    if (canPlace === 0) return 0

    const symObj = config.symbols.get(symbolId)
    if (!symObj) {
      throw new Error(
        `Symbol with id "${symbolId}" not found in the game config symbols map.`,
      )
    }

    for (let j = 0; j < canPlace; j++) {
      const idx = (startIndex + j) % reel.length
      reel[idx] = symObj
    }
    return canPlace
  }

  /**
   * Checks if a symbol can be placed at the target index without violating spacing rules.
   */
  private violatesSpacing(
    reel: Array<GameSymbol | null>,
    symbolId: string,
    targetIndex: number,
  ) {
    const circDist = (a: number, b: number) => {
      const diff = Math.abs(a - b)
      return Math.min(diff, this.rowsAmount - diff)
    }

    const spacingType = this.spaceBetweenSameSymbols ?? undefined
    const sameSpacing =
      typeof spacingType === "number" ? spacingType : (spacingType?.[symbolId] ?? 0)

    for (let i = 0; i <= reel.length; i++) {
      const placed = reel[i]
      if (!placed) continue

      const dist = circDist(targetIndex, i)

      // Same symbol spacing
      if (sameSpacing >= 1 && placed.id === symbolId) {
        if (dist <= sameSpacing) return true
      }

      // Cross-symbol spacing
      if (this.spaceBetweenSymbols) {
        const forward = this.spaceBetweenSymbols[symbolId]?.[placed.id] ?? 0
        if (forward >= 1 && dist <= forward) return true

        const reverse = this.spaceBetweenSymbols[placed.id]?.[symbolId] ?? 0
        if (reverse >= 1 && dist <= reverse) return true
      }
    }

    return false
  }

  generateReels(config: GameConfig) {
    this.validateConfig(config)

    const gameMode = config.gameModes[this.associatedGameModeName]

    if (!gameMode) {
      throw new Error(
        `Error generating reels for game mode "${this.associatedGameModeName}". It's not defined in the game config.`,
      )
    }

    const outputDir = config.rootDir.endsWith(config.outputDir)
      ? config.rootDir
      : path.join(config.rootDir, config.outputDir)

    const filePath = path.join(
      outputDir,
      `reels_${this.associatedGameModeName}-${this.id}.csv`,
    )

    const exists = fs.existsSync(filePath)

    if (exists && !this.overrideExisting) {
      this.reels = this.parseReelsetCSV(filePath, config)
      return this
    }

    if (!exists && this.symbolWeights.size === 0) {
      throw new Error(
        `Cannot generate reels for generator "${this.id}" of mode "${this.associatedGameModeName}" because the symbol weights are empty.`,
      )
    }

    const reelsAmount = gameMode.reelsAmount
    const weightsObj = Object.fromEntries(this.symbolWeights)

    // Generate initial reels with random symbols
    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      const reel: Array<GameSymbol | null> = new Array(this.rowsAmount).fill(null)

      const reelQuotas: Record<string, number> = {}
      const quotaCounts: Record<string, number> = {}
      let totalReelsQuota = 0

      // Get quotas for this reel, across all symbols
      for (const [sym, quotaConf] of Object.entries(this.symbolQuotas || {})) {
        const q = typeof quotaConf === "number" ? quotaConf : quotaConf[ridx]
        if (!q) continue
        reelQuotas[sym] = q
        totalReelsQuota += q
      }

      if (totalReelsQuota > 100) {
        throw new Error(
          `Total symbol quotas for reel ${ridx} exceed 100%. Adjust your configuration on reel set "${this.id}".`,
        )
      }

      if (totalReelsQuota > 0) {
        for (const [sym, quota] of Object.entries(reelQuotas)) {
          const quotaCount = Math.max(1, Math.floor((this.rowsAmount * quota) / 100))
          quotaCounts[sym] = quotaCount
        }
      }

      // Place required quotas first (use stacking over spacing, if configured)
      for (const [sym, targetCount] of Object.entries(quotaCounts)) {
        let remaining = targetCount
        let attempts = 0

        while (remaining > 0) {
          if (attempts++ > this.rowsAmount * 10) {
            throw new Error(
              `Failed to place ${targetCount} of symbol ${sym} on reel ${ridx} (likely spacing/stacking too strict).`,
            )
          }

          const pos = Math.round(this.rng.randomFloat(0, this.rowsAmount - 1))
          const stackCfg = this.resolveStacking(sym, ridx)
          let placed = 0

          // Try to place a symbol stack first, if configured
          if (stackCfg && Math.round(this.rng.randomFloat(1, 100)) <= stackCfg.chance) {
            const stackSize = Math.max(
              0,
              Math.round(this.rng.randomFloat(stackCfg.min, stackCfg.max)),
            )
            const toPlace = Math.min(stackSize, remaining)
            placed = this.tryPlaceStack(reel, config, ridx, sym, pos, toPlace)
          }

          // Not enough space, fall back to placing single symbols
          if (
            placed === 0 &&
            reel[pos] === null &&
            this.isSymbolAllowedOnReel(sym, ridx) &&
            !this.violatesSpacing(reel, sym, pos)
          ) {
            reel[pos] = config.symbols.get(sym)!
            placed = 1
          }

          remaining -= placed
        }
      }

      // Fill the rest of the reel randomly
      for (let r = 0; r < this.rowsAmount; r++) {
        if (reel[r] !== null) continue // already placed quota

        let chosenSymbolId = this.rng.weightedRandom(weightsObj)

        // If symbolStacks is NOT configured for the next choice, allow "preferStackedSymbols" fallback
        const nextHasStackCfg = !!this.resolveStacking(chosenSymbolId, ridx)
        if (!nextHasStackCfg && this.preferStackedSymbols && reel.length > 0) {
          const prevSymbol = r - 1 >= 0 ? reel[r - 1] : reel[reel.length - 1]
          if (
            prevSymbol &&
            Math.round(this.rng.randomFloat(1, 100)) <= this.preferStackedSymbols &&
            (!this.spaceBetweenSameSymbols ||
              !this.violatesSpacing(reel, prevSymbol.id, r))
          ) {
            chosenSymbolId = prevSymbol.id
          }
        }

        // If symbol has stack config, try to place a stack (ignore spacing)
        const stackCfg = this.resolveStacking(chosenSymbolId, ridx)
        if (stackCfg && this.isSymbolAllowedOnReel(chosenSymbolId, ridx)) {
          const roll = Math.round(this.rng.randomFloat(1, 100))
          if (roll <= stackCfg.chance) {
            const desiredSize = Math.max(
              1,
              Math.round(this.rng.randomFloat(stackCfg.min, stackCfg.max)),
            )
            const placed = this.tryPlaceStack(
              reel,
              config,
              ridx,
              chosenSymbolId,
              r,
              desiredSize,
            )
            if (placed > 0) {
              // advance loop to skip the cells we just filled on this side of the boundary
              // (wrapped cells at the start are already filled and will be skipped when encountered)
              r += placed - 1
              continue
            }
          }
        }

        let tries = 0
        const maxTries = 2500

        while (
          !this.isSymbolAllowedOnReel(chosenSymbolId, ridx) ||
          this.violatesSpacing(reel, chosenSymbolId, r)
        ) {
          if (++tries > maxTries) {
            throw new Error(
              [
                `Failed to place a symbol on reel ${ridx} at position ${r} after ${maxTries} attempts.\n`,
                "Try to change the seed or adjust your configuration.\n",
              ].join(" "),
            )
          }
          chosenSymbolId = this.rng.weightedRandom(weightsObj)

          const hasStackCfg = !!this.resolveStacking(chosenSymbolId, ridx)
          if (!hasStackCfg && this.preferStackedSymbols && reel.length > 0) {
            const prevSymbol = r - 1 >= 0 ? reel[r - 1] : reel[reel.length - 1]
            if (
              prevSymbol &&
              Math.round(this.rng.randomFloat(1, 100)) <= this.preferStackedSymbols &&
              (!this.spaceBetweenSameSymbols ||
                !this.violatesSpacing(reel, prevSymbol.id, r))
            ) {
              chosenSymbolId = prevSymbol.id
            }
          }
        }

        const symbol = config.symbols.get(chosenSymbolId)

        if (!symbol) {
          throw new Error(
            `Symbol with id "${chosenSymbolId}" not found in the game config symbols map.`,
          )
        }

        reel[r] = symbol
      }

      if (reel.some((s) => s === null)) {
        throw new Error(`Reel ${ridx} has unfilled positions after generation.`)
      }

      this.reels.push(reel as GameSymbol[])
    }

    // Write the CSV
    const csvRows: string[][] = Array.from({ length: this.rowsAmount }, () =>
      Array.from({ length: reelsAmount }, () => ""),
    )

    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      for (let r = 0; r < this.rowsAmount; r++) {
        csvRows[r]![ridx] = this.reels[ridx]![r]!.id
      }
    }

    const csvString = csvRows.map((row) => row.join(",")).join("\n")

    if (isMainThread) {
      createDirIfNotExists(outputDir)
      fs.writeFileSync(filePath, csvString)

      console.log(
        `Generated reelset ${this.id} for game mode ${this.associatedGameModeName}`,
      )
    }

    this.reels = this.parseReelsetCSV(filePath, config)

    return this
  }
}

interface GeneratedReelSetOptions extends ReelSetOptions {
  /**
   * The weights of the symbols in the reelset.\
   * This is a mapping of symbol IDs to their respective weights.
   */
  symbolWeights: Record<string, number>
  /**
   * The number of rows in the reelset.\
   * Default is 250, but can be adjusted as needed.
   */
  rowsAmount?: number
  /**
   * Prevent the same symbol from appearing directly above or below itself.\
   * This can be a single number for all symbols, or a mapping of symbol IDs to
   * their respective spacing values.
   *
   * Must be 1 or higher, if set.
   *
   * **This is overridden by `symbolStacks`**
   */
  spaceBetweenSameSymbols?: number | Record<string, number>
  /**
   * Prevents specific symbols from appearing within a certain distance of each other.
   *
   * Useful for preventing scatter and super scatter symbols from appearing too close to each other.
   *
   * **This is overridden by `symbolStacks`**
   */
  spaceBetweenSymbols?: Record<string, Record<string, number>>
  /**
   * A percentage value 0-100 that indicates the likelihood of a symbol being stacked.\
   * A value of 0 means no stacked symbols, while 100 means all symbols are stacked.
   *
   * This is only a preference. Symbols may still not be stacked if\
   * other restrictions (like `spaceBetweenSameSymbols`) prevent it.
   *
   * **This is overridden by `symbolStacks`**
   */
  preferStackedSymbols?: number
  /**
   * A mapping of symbols to their respective advanced stacking configuration.
   *
   * @example
   * ```ts
   * symbolStacks: {
   *   "W": {
   *     chance: { "1": 20, "2": 20, "3": 20, "4": 20 }, // 20% chance to be stacked on reels 2-5
   *     min: 2, // At least 2 wilds in a stack
   *     max: 4, // At most 4 wilds in a stack
   *   }
   * }
   * ```
   */
  symbolStacks?: Record<
    string,
    {
      chance: number | Record<string, number>
      min?: number | Record<string, number>
      max?: number | Record<string, number>
    }
  >
  /**
   * Configures symbols to be limited to specific reels.\
   * For example, you could configure Scatters to appear only on reels 1, 3 and 5.
   *
   * @example
   * ```ts
   * limitSymbolsToReels: {
   *   "S": [0, 2, 4], // Remember that reels are 0-indexed.
   * }
   * ```
   */
  limitSymbolsToReels?: Record<string, number[]>
  /**
   * Defines optional quotas for symbols on the reels.\
   * The quota (1-100%) defines how often a symbol should appear in the reelset, or in a specific reel.
   *
   * This is particularly useful for controlling the frequency of special symbols like scatters or wilds.
   *
   * Reels not provided for a symbol will use the weights from `symbolWeights`.
   *
   * _Any_ small quota will ensure that the symbol appears at least once on the reel.
   *
   * @example
   * ```ts
   * symbolQuotas: {
   *   "S": 3, // 3% of symbols on each reel will be scatters
   *   "W": { "1": 10, "2": 5, "3": 3, "4": 1 }, // Wilds will appear with different quotas on selected reels
   * }
   * ```
   */
  symbolQuotas?: Record<string, number | Record<string, number>>
  /**
   * If true, existing reels CSV files will be overwritten.
   */
  overrideExisting?: boolean
  /**
   * Optional seed for the RNG to ensure reproducible results.
   *
   * Default seed is `0`.
   *
   * Note: Seeds 0 and 1 produce the same results.
   */
  seed?: number
}

export type Reels = GameSymbol[][]
