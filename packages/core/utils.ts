import fs from "fs"
import { Board } from "./src/Board"

export function weightedRandom<T extends Record<string, number>>(
  weights: T,
  rng: RandomNumberGenerator,
) {
  const totalWeight = Object.values(weights).reduce(
    (sum: number, weight) => sum + (weight as number),
    0,
  )
  const randomValue = rng.randomFloat(0, 1) * totalWeight

  let cumulativeWeight = 0
  for (const [key, weight] of Object.entries(weights)) {
    cumulativeWeight += weight as number
    if (randomValue < cumulativeWeight) {
      return key
    }
  }

  throw new Error("No item selected in weighted random selection.")
}

export function randomItem<T>(array: T[], rng: RandomNumberGenerator) {
  if (array.length === 0) {
    throw new Error("Cannot select a random item from an empty array.")
  }
  const randomIndex = Math.floor(rng.randomFloat(0, 1) * array.length)
  return array[randomIndex]!
}

export function createDirIfNotExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export function shuffle<T>(array: T[], rng: RandomNumberGenerator): T[] {
  const newArray = [...array]
  let currentIndex = newArray.length,
    randomIndex

  while (currentIndex != 0) {
    randomIndex = Math.floor(rng.randomFloat(0, 1) * currentIndex)
    currentIndex--
    ;[newArray[currentIndex] as any, newArray[randomIndex] as any] = [
      newArray[randomIndex],
      newArray[currentIndex],
    ]
  }

  return newArray
}

export function writeJsonFile(filePath: string, data: object | any[]) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), {
      encoding: "utf8",
    })
  } catch (error) {
    throw new Error(`Failed to write JSON file at ${filePath}: ${error}`)
  }
}

export function writeFile(filePath: string, data: string) {
  try {
    fs.writeFileSync(filePath, data, { encoding: "utf8" })
  } catch (error) {
    throw new Error(`Failed to write file at ${filePath}: ${error}`)
  }
}

export class RandomNumberGenerator {
  mIdum: number
  mIy: number
  mIv: Array<number>
  NTAB: number
  IA: number
  IM: number
  IQ: number
  IR: number
  NDIV: number
  AM: number
  RNMX: number

  protected _currentSeed: number = 0

  constructor() {
    this.mIdum = 0
    this.mIy = 0
    this.mIv = []

    this.NTAB = 32
    this.IA = 16807
    this.IM = 2147483647
    this.IQ = 127773
    this.IR = 2836
    this.NDIV = 1 + (this.IM - 1) / this.NTAB
    this.AM = 1.0 / this.IM
    this.RNMX = 1.0 - 1.2e-7
  }

  getCurrentSeed() {
    return this._currentSeed
  }

  protected setCurrentSeed(seed: number) {
    this._currentSeed = seed
  }

  setSeed(seed: number): void {
    this.mIdum = seed
    this.setCurrentSeed(seed)

    if (seed >= 0) {
      this.mIdum = -seed
    }

    this.mIy = 0
  }

  setSeedIfDifferent(seed: number) {
    if (this.getCurrentSeed() !== seed) {
      this.setSeed(seed)
    }
  }

  generateRandomNumber(): number {
    let k: number
    let j: number

    if (this.mIdum <= 0 || this.mIy === 0) {
      if (-this.mIdum < 1) {
        this.mIdum = 1
      } else {
        this.mIdum = -this.mIdum
      }

      for (j = this.NTAB + 7; j >= 0; j -= 1) {
        k = Math.floor(this.mIdum / this.IQ)
        this.mIdum = Math.floor(this.IA * (this.mIdum - k * this.IQ) - this.IR * k)

        if (this.mIdum < 0) {
          this.mIdum += this.IM
        }

        if (j < this.NTAB) {
          this.mIv[j] = this.mIdum
        }
      }

      ;[this.mIy as any] = this.mIv
    }

    k = Math.floor(this.mIdum / this.IQ)
    this.mIdum = Math.floor(this.IA * (this.mIdum - k * this.IQ) - this.IR * k)

    if (this.mIdum < 0) {
      this.mIdum += this.IM
    }

    j = Math.floor(this.mIy / this.NDIV)

    this.mIy = Math.floor(this.mIv[j] as any)
    this.mIv[j] = this.mIdum

    return this.mIy
  }

  randomFloat(low: number, high: number): number {
    let float: number = this.AM * this.generateRandomNumber()

    if (float > this.RNMX) {
      float = this.RNMX
    }

    return float * (high - low) + low
  }
}

/**
 * Creates a deep copy of an object or array.
 */
export function copy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Prints the board to the console in a readable format.
 */
export function printBoard({ board }: Board<any, any, any>) {
  const fullBoard = board.reels.map((reel, ridx) => {
    return [...board.paddingTop[ridx]!, ...reel, ...board.paddingBottom[ridx]!]
  })

  const rows = Math.max(...fullBoard.map((reel) => reel.length))
  const cellWidth = 4 // inner width of symbol area

  const padSymbol = (sym: string) => {
    if (sym.length > cellWidth) sym = sym.slice(0, cellWidth)
    const left = Math.floor((cellWidth - sym.length) / 2)
    const right = cellWidth - sym.length - left
    return " ".repeat(left) + sym + " ".repeat(right)
  }

  const maxTop = Math.max(...board.paddingTop.map((p) => p?.length ?? 0))
  const maxBottom = Math.max(...board.paddingBottom.map((p) => p?.length ?? 0))
  const boardStart = maxTop
  const boardEnd = rows - maxBottom - 1

  const makeSeparator = () => {
    return fullBoard.map(() => `═${"═".repeat(cellWidth)}═ `).join("")
  }

  for (let row = 0; row < rows; row++) {
    if (row === boardStart) {
      console.log(makeSeparator()) // top border of board
    }

    let top = ""
    let mid = ""
    let bot = ""
    for (let col = 0; col < fullBoard.length; col++) {
      const sym = fullBoard[col]![row]?.id ?? " "
      const padded = padSymbol(sym)
      top += `┌${"─".repeat(cellWidth)}┐ `
      mid += `│${padded}│ `
      bot += `└${"─".repeat(cellWidth)}┘ `
    }

    console.log(top)
    console.log(mid)
    console.log(bot)

    if (row === boardEnd) {
      console.log(makeSeparator()) // bottom border of board
    }
  }
}

export function weightedAverage(dist: Record<number, number>) {
  const keys = Object.keys(dist).map(Number)
  const values = Object.values(dist)

  const totalWeight = round(
    values.reduce((a, b) => a + b, 0),
    6,
  )
  const weightedSum = keys.reduce((sum, key, i) => sum + key * values[i]!, 0)

  return weightedSum / totalWeight
}

export class JSONL {
  public static stringify(array: object[]): string {
    return array.map((object) => JSON.stringify(object)).join("\n")
  }

  public static parse<T>(jsonl: string): Array<T> {
    return jsonl
      .split("\n")
      .filter((s) => s !== "")
      .map((str) => JSON.parse(str))
  }
}

export function round(value: number, decimals: number) {
  return Number(Math.round(Number(value + "e" + decimals)) + "e-" + decimals)
}
