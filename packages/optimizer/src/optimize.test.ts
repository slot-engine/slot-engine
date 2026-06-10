import fs from "fs"
import os from "os"
import path from "path"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { optimize } from "./optimize"

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "slot-engine-optimizer-"))
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

interface Book {
  id: number
  criteria: string
  payoutX: number // payout multiplier
}

function writeFixture(books: Book[]) {
  const lutPath = path.join(dir, "lookUpTable_base.csv")
  const segPath = path.join(dir, "lookUpTableSegmented_base.csv")
  fs.writeFileSync(
    lutPath,
    books.map((b) => `${b.id},1,${Math.round(b.payoutX * 100)}\n`).join(""),
  )
  fs.writeFileSync(
    segPath,
    books.map((b) => `${b.id},${b.criteria},${b.payoutX},0\n`).join(""),
  )
  return { lutPath, segPath, outPath: path.join(dir, "out", "lookUpTable_base_0.csv") }
}

function makeBooks(): Book[] {
  const books: Book[] = []
  let id = 1

  // Losing books
  for (let i = 0; i < 50; i++) books.push({ id: id++, criteria: "0", payoutX: 0 })
  // Base game wins between 0.5x and 50x
  for (let i = 0; i < 100; i++) {
    books.push({ id: id++, criteria: "basegame", payoutX: 0.5 + (i % 20) * 2.5 })
  }
  // Free spin wins between 5x and 1000x
  for (let i = 0; i < 100; i++) {
    books.push({ id: id++, criteria: "freespins", payoutX: 5 + (i % 25) * 40 })
  }
  // Max wins, all pay exactly 5000x
  for (let i = 0; i < 10; i++) {
    books.push({ id: id++, criteria: "maxwin", payoutX: 5000 })
  }

  return books
}

describe("optimize", () => {
  it("hits the configured RTP and hit rates exactly", async () => {
    const books = makeBooks()
    const { lutPath, segPath, outPath } = writeFixture(books)

    const result = await optimize({
      input: { lookupTable: lutPath, lookupTableSegmented: segPath },
      output: { lookupTable: outPath },
      cost: 1,
      rtp: 0.96,
      verbose: false,
      targets: {
        "0": {}, // absorbs remaining probability
        basegame: { hitRate: 4 },
        freespins: { hitRate: 150, rtp: 0.38 },
        maxwin: { hitRate: 100_000 },
      },
    })

    expect(result.totalBooks).toBe(books.length)
    expect(result.rtp).toBeCloseTo(0.96, 6)

    expect(result.criteria.basegame!.hitRate).toBeCloseTo(4, 4)
    expect(result.criteria.freespins!.hitRate).toBeCloseTo(150, 2)
    expect(result.criteria.freespins!.rtp).toBeCloseTo(0.38, 6)
    expect(result.criteria.maxwin!.hitRate).toBeCloseTo(100_000, -1)
    // Max win contribution is fixed: 5000 / 100000 = 0.05
    expect(result.criteria.maxwin!.rtp).toBeCloseTo(0.05, 6)
    expect(result.criteria["0"]!.rtp).toBe(0)
    // The free criteria (basegame) gets the remaining RTP
    expect(result.criteria.basegame!.rtp).toBeCloseTo(0.96 - 0.38 - 0.05, 6)
    // Absorber probability
    expect(result.criteria["0"]!.probability).toBeCloseTo(
      1 - 1 / 4 - 1 / 150 - 1 / 100_000,
      6,
    )
  })

  it("preserves book ids, order and payouts in the output", async () => {
    const books = makeBooks()
    const { lutPath, segPath, outPath } = writeFixture(books)

    await optimize({
      input: { lookupTable: lutPath, lookupTableSegmented: segPath },
      output: { lookupTable: outPath },
      cost: 1,
      rtp: 0.96,
      verbose: false,
      targets: {
        "0": {},
        basegame: { hitRate: 4 },
        freespins: { hitRate: 150, rtp: 0.38 },
        maxwin: { hitRate: 100_000 },
      },
    })

    const inLines = fs.readFileSync(lutPath, "utf-8").trim().split("\n")
    const outLines = fs.readFileSync(outPath, "utf-8").trim().split("\n")
    expect(outLines.length).toBe(inLines.length)

    for (let i = 0; i < inLines.length; i++) {
      const [inId, , inPayout] = inLines[i]!.split(",")
      const [outId, outWeight, outPayout] = outLines[i]!.split(",")
      expect(outId).toBe(inId)
      expect(outPayout).toBe(inPayout)
      expect(Number.isInteger(Number(outWeight))).toBe(true)
      expect(Number(outWeight)).toBeGreaterThanOrEqual(0)
    }
  })

  it("works with a bonus-style mode (cost 100, absorber with free RTP)", async () => {
    const books: Book[] = []
    let id = 1
    for (let i = 0; i < 200; i++) {
      books.push({ id: id++, criteria: "freespins", payoutX: 10 + (i % 50) * 60 })
    }
    for (let i = 0; i < 10; i++) {
      books.push({ id: id++, criteria: "maxwin", payoutX: 5000 })
    }
    const { lutPath, segPath, outPath } = writeFixture(books)

    const result = await optimize({
      input: { lookupTable: lutPath, lookupTableSegmented: segPath },
      output: { lookupTable: outPath },
      cost: 100,
      rtp: 0.96,
      verbose: false,
      targets: {
        freespins: {}, // absorber and free RTP
        maxwin: { hitRate: 5000 },
      },
    })

    expect(result.rtp).toBeCloseTo(0.96, 6)
    // maxwin: 5000x / (5000 * cost 100) = 0.01 RTP
    expect(result.criteria.maxwin!.rtp).toBeCloseTo(0.01, 6)
    expect(result.criteria.freespins!.rtp).toBeCloseTo(0.95, 6)
    expect(result.criteria.freespins!.probability).toBeCloseTo(1 - 1 / 5000, 8)
  })

  it("applies scale rules while still hitting the constraints", async () => {
    const books = makeBooks()
    const { lutPath, segPath, outPath } = writeFixture(books)

    const targets = {
      "0": {},
      basegame: { hitRate: 4 },
      freespins: { hitRate: 150, rtp: 0.38 },
      maxwin: { hitRate: 100_000 },
    }

    const base = await optimize({
      input: { lookupTable: lutPath, lookupTableSegmented: segPath },
      output: { lookupTable: outPath },
      cost: 1,
      rtp: 0.96,
      verbose: false,
      targets,
    })

    const outPathScaled = path.join(dir, "out", "scaled.csv")
    const scaled = await optimize({
      input: { lookupTable: lutPath, lookupTableSegmented: segPath },
      output: { lookupTable: outPathScaled },
      cost: 1,
      rtp: 0.96,
      verbose: false,
      targets: {
        ...targets,
        freespins: {
          ...targets.freespins,
          scale: [{ winRange: [500, 1000], factor: 5 }],
        },
      },
    })

    // Constraints still hold exactly
    expect(scaled.rtp).toBeCloseTo(0.96, 6)
    expect(scaled.criteria.freespins!.rtp).toBeCloseTo(0.38, 6)
    expect(scaled.criteria.freespins!.hitRate).toBeCloseTo(150, 2)

    // Big freespins wins are more likely than without scaling
    const weightInRange = (file: string, lo: number, hi: number) => {
      let total = 0
      let inRange = 0
      for (const line of fs.readFileSync(file, "utf-8").trim().split("\n")) {
        const [, w, p] = line.split(",")
        const x = Number(p) / 100
        total += Number(w)
        if (x >= lo && x <= hi) inRange += Number(w)
      }
      return inRange / total
    }
    expect(weightInRange(outPathScaled, 500, 1000)).toBeGreaterThan(
      weightInRange(outPath, 500, 1000),
    )
    expect(base.rtp).toBeCloseTo(scaled.rtp, 6)
  })

  it("rejects invalid target combinations", async () => {
    const books = makeBooks()
    const { lutPath, segPath, outPath } = writeFixture(books)

    const baseOpts = {
      input: { lookupTable: lutPath, lookupTableSegmented: segPath },
      output: { lookupTable: outPath },
      cost: 1,
      rtp: 0.96,
      verbose: false,
    }

    // Both rtp and avgWin
    await expect(
      optimize({
        ...baseOpts,
        targets: {
          "0": {},
          basegame: { hitRate: 4, rtp: 0.5, avgWin: 2 },
          freespins: { hitRate: 150 },
          maxwin: { hitRate: 100_000 },
        },
      }),
    ).rejects.toThrow(/both "rtp" and "avgWin"/)

    // Two absorbers
    await expect(
      optimize({
        ...baseOpts,
        targets: {
          "0": {},
          basegame: {},
          freespins: { hitRate: 150 },
          maxwin: { hitRate: 100_000 },
        },
      }),
    ).rejects.toThrow(/Only one optimization target may omit "hitRate"/)

    // Missing target for a criteria
    await expect(
      optimize({
        ...baseOpts,
        targets: {
          "0": {},
          basegame: { hitRate: 4 },
          freespins: { hitRate: 150 },
        },
      }),
    ).rejects.toThrow(/not covered by any optimization target.*"maxwin"/)
  })

  it("rejects infeasible targets with a helpful error", async () => {
    const books = makeBooks()
    const { lutPath, segPath, outPath } = writeFixture(books)

    // basegame pays between 0.5x and 48x, an avgWin of 1000x is impossible
    await expect(
      optimize({
        input: { lookupTable: lutPath, lookupTableSegmented: segPath },
        output: { lookupTable: outPath },
        cost: 1,
        rtp: 0.96,
        verbose: false,
        targets: {
          "0": {},
          basegame: { hitRate: 4, avgWin: 1000 },
          freespins: { hitRate: 150 },
          maxwin: { hitRate: 100_000 },
        },
      }),
    ).rejects.toThrow(/infeasible/)
  })

  it("matches books by winRange with fallback to criteria targets", async () => {
    const books = makeBooks()
    const { lutPath, segPath, outPath } = writeFixture(books)

    const result = await optimize({
      input: { lookupTable: lutPath, lookupTableSegmented: segPath },
      output: { lookupTable: outPath },
      cost: 1,
      rtp: 0.96,
      verbose: false,
      targets: {
        "0": {},
        basegame: { hitRate: 4 },
        // claims all books paying >= 500x, regardless of criteria
        bigwins: { match: { winRange: [500, 5000] }, hitRate: 5000, rtp: 0.1 },
        freespins: { hitRate: 150 },
      },
    })

    expect(result.rtp).toBeCloseTo(0.96, 6)
    expect(result.criteria.bigwins!.hitRate).toBeCloseTo(5000, 0)
    expect(result.criteria.bigwins!.rtp).toBeCloseTo(0.1, 6)
    expect(result.criteria.bigwins!.minWin).toBeGreaterThanOrEqual(500)
    expect(result.criteria.bigwins!.maxWin).toBe(5000)
    // freespins target only keeps its books below 500x
    expect(result.criteria.freespins!.maxWin).toBeLessThan(500)

    // book counts: maxwin books (10) + freespins >= 500x
    const expectedBig = makeBooks().filter((b) => b.payoutX >= 500).length
    expect(result.criteria.bigwins!.books).toBe(expectedBig)
  })

  it("matches books by tags", async () => {
    const books = makeBooks()
    const { lutPath, segPath, outPath } = writeFixture(books)

    // Tag some freespins books as "retrigger"
    const taggedIds = books
      .filter((b) => b.criteria === "freespins")
      .slice(0, 30)
      .map((b) => b.id)
    const tagsPath = path.join(dir, "tags_base.json")
    fs.writeFileSync(
      tagsPath,
      JSON.stringify([
        {
          search: [{ name: "retrigger", value: "true" }],
          timesTriggered: taggedIds.length,
          bookIds: taggedIds,
        },
      ]),
    )

    const result = await optimize({
      input: { lookupTable: lutPath, lookupTableSegmented: segPath, tags: tagsPath },
      output: { lookupTable: outPath },
      cost: 1,
      rtp: 0.96,
      verbose: false,
      targets: {
        "0": {},
        basegame: { hitRate: 4 },
        retriggers: { match: { tags: { retrigger: true } }, hitRate: 400, rtp: 0.15 },
        freespins: { hitRate: 150, rtp: 0.3 },
        maxwin: { hitRate: 100_000 },
      },
    })

    expect(result.rtp).toBeCloseTo(0.96, 6)
    expect(result.criteria.retriggers!.books).toBe(taggedIds.length)
    expect(result.criteria.retriggers!.hitRate).toBeCloseTo(400, 1)
    expect(result.criteria.retriggers!.rtp).toBeCloseTo(0.15, 6)
    expect(result.criteria.freespins!.books).toBe(100 - taggedIds.length)
  })

  it("combines tag, criteria and winRange matchers with AND semantics and declaration order", async () => {
    const books = makeBooks()
    const { lutPath, segPath, outPath } = writeFixture(books)

    const result = await optimize({
      input: { lookupTable: lutPath, lookupTableSegmented: segPath },
      output: { lookupTable: outPath },
      cost: 1,
      rtp: 0.96,
      verbose: false,
      targets: {
        "0": {},
        basegame: { hitRate: 4 },
        // only freespins books paying >= 500x (AND of criteria + winRange)
        bigfs: {
          match: { criteria: "freespins", winRange: [500, Infinity] },
          hitRate: 2000,
        },
        freespins: { hitRate: 150, rtp: 0.3 },
        maxwin: { hitRate: 100_000 },
      },
    })

    const expected = makeBooks().filter(
      (b) => b.criteria === "freespins" && b.payoutX >= 500,
    ).length
    expect(result.criteria.bigfs!.books).toBe(expected)
    expect(result.criteria.maxwin!.books).toBe(10) // maxwin untouched by criteria filter
    expect(result.rtp).toBeCloseTo(0.96, 6)
  })

  it("rejects invalid match definitions", async () => {
    const books = makeBooks()
    const { lutPath, segPath, outPath } = writeFixture(books)

    const baseOpts = {
      input: { lookupTable: lutPath, lookupTableSegmented: segPath },
      output: { lookupTable: outPath },
      cost: 1,
      rtp: 0.96,
      verbose: false,
    }

    // Empty match
    await expect(
      optimize({
        ...baseOpts,
        targets: {
          "0": {},
          basegame: { hitRate: 4 },
          freespins: { hitRate: 150 },
          maxwin: { hitRate: 100_000 },
          x: { match: {}, hitRate: 10 },
        },
      }),
    ).rejects.toThrow(/empty "match"/)

    // Tags matcher without input.tags
    await expect(
      optimize({
        ...baseOpts,
        targets: {
          "0": {},
          basegame: { hitRate: 4 },
          freespins: { hitRate: 150 },
          maxwin: { hitRate: 100_000 },
          x: { match: { tags: { a: 1 } }, hitRate: 10 },
        },
      }),
    ).rejects.toThrow(/"input.tags".*is not set/)

    // Invalid winRange
    await expect(
      optimize({
        ...baseOpts,
        targets: {
          "0": {},
          basegame: { hitRate: 4 },
          freespins: { hitRate: 150 },
          maxwin: { hitRate: 100_000 },
          x: { match: { winRange: [10, 5] }, hitRate: 10 },
        },
      }),
    ).rejects.toThrow(/invalid "match.winRange"/)

    // Matcher that matches no books
    await expect(
      optimize({
        ...baseOpts,
        targets: {
          "0": {},
          basegame: { hitRate: 4 },
          freespins: { hitRate: 150 },
          maxwin: { hitRate: 100_000 },
          x: { match: { winRange: [100_000, 200_000] }, hitRate: 10 },
        },
      }),
    ).rejects.toThrow(/do not match any books.*"x"/)
  })
})
