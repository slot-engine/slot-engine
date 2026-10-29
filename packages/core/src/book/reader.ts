import fs from "fs"
import fsAsync from "fs/promises"
import readline from "readline"
import zlib from "zlib"
import type { WrittenBook } from "."
import type { SlotGame } from "../slot-game"
import type { PermanentFilePaths } from "../utils/file-paths"

interface BooksIndexMeta {
  worker: number
  chunks: number
  simStart: number
  simEnd: number
}

interface ChunkLocation {
  worker: number
  chunk: number
}

type ChunkBooks = Map<number, WrittenBook>

export class BookReader {
  private readonly paths: PermanentFilePaths
  private readonly maxCachedChunks: number
  private readonly chunks = new Map<string, ChunkBooks>()

  constructor(game: SlotGame, opts: { maxCachedChunks?: number } = {}) {
    this.paths = game.getMetadata().paths
    this.maxCachedChunks = opts.maxCachedChunks ?? 0
  }

  async read(mode: string, bookId: number): Promise<WrittenBook | undefined> {
    const location = await this.locate(mode, bookId)
    if (!location) return
    const books = await this.loadChunk(mode, location)
    return books?.get(bookId)
  }

  private async locate(mode: string, bookId: number): Promise<ChunkLocation | undefined> {
    const metaPath = this.paths.booksIndexMeta(mode)
    if (!fs.existsSync(metaPath)) return

    const metas = JSON.parse(
      await fsAsync.readFile(metaPath, "utf-8"),
    ) as BooksIndexMeta[]
    const meta = metas.find((m) => bookId >= m.simStart && bookId <= m.simEnd)
    if (!meta) return

    const indexPath = this.paths.booksIndex(mode, meta.worker)
    if (!fs.existsSync(indexPath)) return

    const chunk = await findChunk(indexPath, bookId)
    if (chunk === undefined) return
    return { worker: meta.worker, chunk }
  }

  private async loadChunk(mode: string, { worker, chunk }: ChunkLocation) {
    const key = `${mode}/${worker}/${chunk}`
    const cached = this.chunks.get(key)
    if (cached) return cached

    const chunkPath = this.paths.booksChunk(mode, worker, chunk)
    if (!fs.existsSync(chunkPath)) return

    const books = parseChunk(zlib.zstdDecompressSync(await fsAsync.readFile(chunkPath)))
    this.remember(key, books)
    return books
  }

  private remember(key: string, books: ChunkBooks) {
    if (this.maxCachedChunks <= 0) return
    this.chunks.set(key, books)
    for (const oldest of this.chunks.keys()) {
      if (this.chunks.size <= this.maxCachedChunks) break
      this.chunks.delete(oldest)
    }
  }
}

async function findChunk(indexPath: string, bookId: number) {
  const stream = fs.createReadStream(indexPath)
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity })

  try {
    for await (const line of lines) {
      const [id, , chunk] = line.trim().split(",")
      if (Number(id) === bookId) return Number(chunk)
    }
  } finally {
    stream.destroy()
  }
}

function parseChunk(data: Buffer): ChunkBooks {
  const books: ChunkBooks = new Map()
  for (const line of data.toString("utf-8").split("\n")) {
    if (!line.trim()) continue
    const book = JSON.parse(line) as WrittenBook
    books.set(book.id, book)
  }
  return books
}
