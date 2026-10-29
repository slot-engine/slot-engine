import fs from "fs"
import os from "os"
import path from "path"
import zlib from "zlib"
import { afterAll, afterEach, describe, expect, it, vi } from "vitest"
import type { WrittenBook } from "."
import type { SlotGame } from "../slot-game"
import { createPermanentFilePaths } from "../utils/file-paths"
import { BookReader } from "./reader"

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "core-books-"))
const paths = createPermanentFilePaths(dir)
const game = { getMetadata: () => ({ paths }) } as unknown as SlotGame

const mode = "base"
const bookIds = [7, 8]

fs.mkdirSync(path.join(dir, "books_chunks"))
fs.writeFileSync(
  paths.booksIndexMeta(mode),
  JSON.stringify([{ worker: 0, chunks: 1, simStart: 7, simEnd: 8 }]),
)
fs.writeFileSync(paths.booksIndex(mode, 0), bookIds.map((id) => `${id},0,0\n`).join(""))

function writeChunk(payoutMultiplier: number, mtimeSeconds: number) {
  const books: WrittenBook[] = bookIds.map((id) => ({ id, payoutMultiplier, events: [] }))
  const chunkPath = paths.booksChunk(mode, 0, 0)
  fs.writeFileSync(
    chunkPath,
    zlib.zstdCompressSync(books.map((book) => JSON.stringify(book) + "\n").join("")),
  )
  fs.utimesSync(chunkPath, mtimeSeconds, mtimeSeconds)
}

afterEach(() => vi.restoreAllMocks())
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

describe("BookReader chunk cache", () => {
  it("reloads a cached chunk when the file changes", async () => {
    const reader = new BookReader(game, { maxCachedChunks: 4 })
    writeChunk(150, 1_000_000)
    expect(await reader.read(mode, 7)).toMatchObject({ id: 7, payoutMultiplier: 150 })

    writeChunk(2500, 1_000_010)
    expect(await reader.read(mode, 7)).toMatchObject({ id: 7, payoutMultiplier: 2500 })
  })

  it("serves an unchanged chunk from the cache", async () => {
    const reader = new BookReader(game, { maxCachedChunks: 4 })
    writeChunk(150, 1_000_000)
    const decompress = vi.spyOn(zlib, "zstdDecompressSync")

    expect(await reader.read(mode, 7)).toMatchObject({ id: 7, payoutMultiplier: 150 })
    expect(await reader.read(mode, 8)).toMatchObject({ id: 8, payoutMultiplier: 150 })
    expect(decompress).toHaveBeenCalledTimes(1)
  })
})
