import fs from "fs"
import fsAsync from "fs/promises"
import os from "os"
import path from "path"
import { afterAll, afterEach, describe, expect, it, vi } from "vitest"
import { LgsError } from "../errors"
import { PublishedMath, type BookSource } from "./PublishedMath"

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lgs-math-"))
fs.writeFileSync(
  path.join(dir, "lookUpTable_base_0.csv"),
  ["1,0,0", "2,10,0", "3,0,500", "4,30,150", "5,60,1000"].join("\n"),
)
fs.writeFileSync(path.join(dir, "lookUpTable_empty_0.csv"), "1,0,0\n")

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

const books: BookSource = {
  async read(mode, bookId) {
    return bookId === 4 && mode === "lost" ? undefined : { events: [{ mode, bookId }] }
  },
}

function math(random: () => number) {
  return new PublishedMath({
    lookupTablePath: (mode) =>
      path.join(dir, `lookUpTable_${mode === "lost" ? "base" : mode}_0.csv`),
    books,
    random,
  })
}

describe("PublishedMath", () => {
  it.each([
    [0, 2, 0],
    [0.0999, 2, 0],
    [0.1, 4, 150],
    [0.3999, 4, 150],
    [0.4, 5, 1000],
    [0.9999, 5, 1000],
  ])(
    "draws row by weight (random %f -> book %i)",
    async (random, bookId, payoutCents) => {
      const outcome = await math(() => random).pick("base")
      expect(outcome).toEqual({ bookId, payoutCents, events: [{ mode: "base", bookId }] })
    },
  )

  it("never picks zero-weight rows", async () => {
    let i = 0
    const sweep = math(() => i / 1000)
    const picked = new Set<number>()
    for (; i < 1000; i++) picked.add((await sweep.pick("base")).bookId)
    expect([...picked].sort()).toEqual([2, 4, 5])
  })

  it("throws missing-math without a lookup table or weighted rows", async () => {
    for (const mode of ["absent", "empty"]) {
      const error = await math(() => 0.5)
        .pick(mode)
        .catch((e: unknown) => e)
      expect(error).toBeInstanceOf(LgsError)
      expect((error as LgsError).kind).toBe("missing-math")
    }
  })

  it("throws missing-book when the drawn book cannot be read", async () => {
    const error = await math(() => 0.2)
      .pick("lost")
      .catch((e: unknown) => e)
    expect((error as LgsError).kind).toBe("missing-book")
  })
})

describe("PublishedMath.read", () => {
  it("returns the outcome of a book, zero weight or not", async () => {
    expect(await math(() => 0).read("base", 3)).toEqual({
      bookId: 3,
      payoutCents: 500,
      events: [{ mode: "base", bookId: 3 }],
    })
  })

  it("returns undefined for a book outside the lookup table", async () => {
    expect(await math(() => 0).read("base", 99)).toBeUndefined()
  })

  it("throws missing-book when a book of the lookup table cannot be read", async () => {
    await expect(math(() => 0).read("lost", 4)).rejects.toMatchObject({
      kind: "missing-book",
      message: 'Book 4 of mode "lost" not found',
    })
  })
})

describe("PublishedMath after a new simulation", () => {
  function writeTable(mode: string, row: string, mtimeSeconds: number) {
    const filePath = path.join(dir, `lookUpTable_${mode}_0.csv`)
    fs.writeFileSync(filePath, row + "\n")
    fs.utimesSync(filePath, mtimeSeconds, mtimeSeconds)
    return filePath
  }

  function readsOf(filePath: string) {
    const readFile = vi.spyOn(fsAsync, "readFile")
    return () => readFile.mock.calls.filter(([read]) => read === filePath).length
  }

  afterEach(() => vi.restoreAllMocks())

  it("reloads the lookup table when the file changes", async () => {
    writeTable("resim", "1,10,100", 1_000_000)
    const resim = math(() => 0)
    expect(await resim.pick("resim")).toMatchObject({ bookId: 1, payoutCents: 100 })

    writeTable("resim", "7,10,250", 1_000_010)
    expect(await resim.pick("resim")).toMatchObject({ bookId: 7, payoutCents: 250 })
  })

  it("keeps the lookup table when a rewrite leaves size and mtime unchanged", async () => {
    const filePath = writeTable("same", "1,10,100", 1_000_000)
    const reads = readsOf(filePath)
    const same = math(() => 0)
    await same.pick("same")

    writeTable("same", "1,10,100", 1_000_000)
    expect(await same.pick("same")).toMatchObject({ bookId: 1, payoutCents: 100 })
    expect(reads()).toBe(1)
  })

  it("loads a changed lookup table once for concurrent plays", async () => {
    writeTable("burst", "1,10,100", 1_000_000)
    const burst = math(() => 0)
    await burst.pick("burst")

    const reads = readsOf(writeTable("burst", "7,10,250", 1_000_010))
    const outcomes = await Promise.all(
      Array.from({ length: 5 }, () => burst.pick("burst")),
    )
    expect(outcomes.map(({ bookId }) => bookId)).toEqual([7, 7, 7, 7, 7])
    expect(reads()).toBe(1)
  })
})

describe("PublishedMath forced outcomes", () => {
  it("returns a forced book with its events and payout, zero weight or not", async () => {
    const forced = math(() => 0)
    expect(await forced.pick("base", { bookId: 3 })).toEqual({
      bookId: 3,
      payoutCents: 500,
      events: [{ mode: "base", bookId: 3 }],
    })
    expect(await forced.pick("base", { bookId: 1 })).toMatchObject({ payoutCents: 0 })
  })

  it("throws unknown-book for a forced book outside the lookup table", async () => {
    const error = await math(() => 0)
      .pick("base", { bookId: 99 })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(LgsError)
    expect((error as LgsError).kind).toBe("unknown-book")
    expect((error as LgsError).message).toBe(
      'Book 99 is not in the lookup table of mode "base"',
    )
  })

  it.each([
    [0, 0],
    [1.5, 150],
    [2.345, 150],
    [3.25, 150],
    [3.26, 500],
    [7.5, 500],
    [7.51, 1000],
    [5000, 1000],
  ])(
    "forces the payout closest to %fx (-> %i cents, lower on a tie)",
    async (x, cents) => {
      const outcome = await math(() => 0).pick("base", { payoutMultiplier: x })
      expect(outcome.payoutCents).toBe(cents)
    },
  )

  it("picks uniformly among the books sharing the closest payout", async () => {
    expect((await math(() => 0).pick("base", { payoutMultiplier: 0.4 })).bookId).toBe(1)
    expect((await math(() => 0.6).pick("base", { payoutMultiplier: 0.4 })).bookId).toBe(2)
  })
})
