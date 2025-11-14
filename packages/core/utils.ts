import fs from "fs"
import { BoardService } from "./src/service/board"

export function createDirIfNotExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
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

/**
 * Creates a deep copy of an object or array.
 */
export function copy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Prints the board to the console in a readable format.
 */
export function printBoard(board: BoardService) {
  const fullBoard = board.getBoardReels().map((reel, ridx) => {
    return [...board.getPaddingTop()[ridx]!, ...reel, ...board.getPaddingBottom()[ridx]!]
  })

  const rows = Math.max(...fullBoard.map((reel) => reel.length))
  const cellWidth = 4 // inner width of symbol area

  const padSymbol = (sym: string) => {
    if (sym.length > cellWidth) sym = sym.slice(0, cellWidth)
    const left = Math.floor((cellWidth - sym.length) / 2)
    const right = cellWidth - sym.length - left
    return " ".repeat(left) + sym + " ".repeat(right)
  }

  const maxTop = Math.max(...board.getPaddingTop().map((p) => p?.length ?? 0))
  const maxBottom = Math.max(...board.getPaddingBottom().map((p) => p?.length ?? 0))
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
