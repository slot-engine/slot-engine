export class GameSymbol {
  id: string
  pays?: Record<number, number>
  properties: Map<string, any>

  constructor(opts: GameSymbolOpts) {
    this.id = opts.id
    this.pays = opts.pays
    this.properties = new Map<string, any>(Object.entries(opts.properties || {}))

    if (this.pays && Object.keys(this.pays).length === 0) {
      throw new Error(`GameSymbol "${this.id}" must have pays defined.`)
    }
  }

  /**
   * Compares this symbol to another symbol or a set of properties.
   */
  compare(symbolOrProperties?: GameSymbol | Record<string, any>) {
    if (!symbolOrProperties) {
      console.warn("No symbol or properties provided for comparison.")
      return false
    }
    if (symbolOrProperties instanceof GameSymbol) {
      return this.id === symbolOrProperties.id
    } else {
      for (const [key, value] of Object.entries(symbolOrProperties)) {
        if (!this.properties.has(key) || this.properties.get(key) !== value) {
          return false
        }
      }
      return true
    }
  }
}

export interface GameSymbolOpts {
  /**
   * Unique identifier for the symbol, e.g. "W", "H1", "L5", etc.
   */
  id: string
  /**
   * Paytable for the symbol, where the key is the number of symbols and the value is the payout multiplier.
   */
  pays?: Record<number, number>
  /**
   * Additional properties for the symbol, e.g. `multiplier` or `isWild`.
   *
   * Properties can help identify special symbols.
   * 
   * @example
   * If your game has a "normal" scatter and a "super" scatter, you can define them like this:
   * 
   * ```ts
   * properties: {
   *   isScatter: true,
   * }
   * ```
   */
  properties?: Record<string, any>
}
