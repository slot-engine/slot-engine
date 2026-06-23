/**
 * A copy-on-write Map used for cloned symbol properties.
 *
 * Cloned symbols share the source symbol's entries until the first mutation,
 * which avoids copying entries for the vast majority of symbols that are
 * drawn onto a board but never modified.
 */
export class CowPropertiesMap extends Map<string, any> {
  private _source: Map<string, any> | null

  constructor(source?: Map<string, any>) {
    super()
    this._source = source && source.size > 0 ? source : null
  }

  private _materialize() {
    const source = this._source
    if (!source) return
    this._source = null
    for (const [key, value] of source) {
      super.set(key, value)
    }
  }

  get size(): number {
    return this._source ? this._source.size : super.size
  }

  get(key: string) {
    return this._source ? this._source.get(key) : super.get(key)
  }

  has(key: string) {
    return this._source ? this._source.has(key) : super.has(key)
  }

  set(key: string, value: any) {
    this._materialize()
    return super.set(key, value)
  }

  delete(key: string) {
    this._materialize()
    return super.delete(key)
  }

  clear() {
    this._source = null
    super.clear()
  }

  forEach(
    callbackfn: (value: any, key: string, map: Map<string, any>) => void,
    thisArg?: any,
  ) {
    if (this._source) {
      this._source.forEach((value, key) => callbackfn.call(thisArg, value, key, this))
      return
    }
    super.forEach(callbackfn, thisArg)
  }

  entries() {
    return this._source ? this._source.entries() : super.entries()
  }

  keys() {
    return this._source ? this._source.keys() : super.keys()
  }

  values() {
    return this._source ? this._source.values() : super.values()
  }

  [Symbol.iterator]() {
    return this._source ? this._source[Symbol.iterator]() : super[Symbol.iterator]()
  }
}

export class GameSymbol {
  readonly id: string
  readonly pays?: Record<number, number>
  readonly properties: Map<string, any>

  constructor(opts: GameSymbolOpts) {
    this.id = opts.id
    this.pays = opts.pays
    this.properties = new Map<string, any>()

    for (const prop in opts.properties) {
      this.properties.set(prop, opts.properties[prop])
    }

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
      for (const prop in symbolOrProperties) {
        if (
          !this.properties.has(prop) ||
          this.properties.get(prop) !== symbolOrProperties[prop]
        ) {
          return false
        }
      }
      return true
    }
  }

  /**
   * Creates a clone of this GameSymbol.
   */
  clone(): GameSymbol {
    const cloned = Object.create(GameSymbol.prototype)
    cloned.id = this.id
    cloned.pays = this.pays
    cloned.properties = new CowPropertiesMap(this.properties)
    return cloned
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
