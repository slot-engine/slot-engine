import fs from "fs"
import path from "path"
import assert from "assert"
import zlib from "zlib"
import readline from "readline"
import { buildSync } from "esbuild"
import { Worker, isMainThread, parentPort, workerData } from "worker_threads"
import { createGameConfig, GameConfigOptions, GameConfig } from "../game-config"
import { createGameContext, GameContext } from "../game-context"
import { createDirIfNotExists, JSONL, writeFile } from "../../utils"
import { SPIN_TYPE } from "../constants"
import { Book } from "../book"
import { Recorder, RecordItem } from "../recorder"
import { Wallet } from "../wallet"
import { ResultSet } from "../result-set"
import { pipeline } from "stream/promises"

let completedSimulations = 0
const TEMP_FILENAME = "__temp_compiled_src_IGNORE.js"
const TEMP_FOLDER = "temp_files"

export class Simulation {
  readonly gameConfigOpts: GameConfigOptions
  readonly gameConfig: GameConfig
  readonly simRunsAmount: Partial<Record<string, number>>
  readonly concurrency: number
  private debug = false
  private actualSims = 0
  private library: Map<number, Book>
  private wallet: Wallet
  private recordsWriteStream: fs.WriteStream | undefined
  private hasWrittenRecord = false

  constructor(opts: SimulationOptions, gameConfigOpts: GameConfigOptions) {
    this.gameConfig = createGameConfig(gameConfigOpts)
    this.gameConfigOpts = gameConfigOpts
    this.simRunsAmount = opts.simRunsAmount || {}
    this.concurrency = (opts.concurrency || 6) >= 2 ? opts.concurrency || 6 : 2
    this.library = new Map()
    this.wallet = new Wallet()

    const gameModeKeys = Object.keys(this.gameConfig.gameModes)
    assert(
      Object.values(this.gameConfig.gameModes)
        .map((m) => gameModeKeys.includes(m.name))
        .every((v) => v === true),
      "Game mode name must match its key in the gameModes object.",
    )

    if (isMainThread) {
      this.preprocessFiles()
    }
  }

  async runSimulation(opts: SimulationConfigOptions) {
    const debug = opts.debug || false
    this.debug = debug

    const gameModesToSimulate = Object.keys(this.simRunsAmount)
    const configuredGameModes = Object.keys(this.gameConfig.gameModes)

    if (gameModesToSimulate.length === 0) {
      throw new Error("No game modes configured for simulation.")
    }

    this.generateReelsetFiles()

    // Code that runs when the user executes the simulations.
    // This spawns individual processes and merges the results afterwards.
    if (isMainThread) {
      const debugDetails: Record<string, Record<string, any>> = {}

      for (const mode of gameModesToSimulate) {
        completedSimulations = 0
        this.wallet = new Wallet()
        this.library = new Map()
        this.hasWrittenRecord = false

        debugDetails[mode] = {}

        console.log(`\nSimulating game mode: ${mode}`)
        console.time(mode)

        const runs = this.simRunsAmount[mode] || 0

        if (runs <= 0) continue

        if (!configuredGameModes.includes(mode)) {
          throw new Error(
            `Tried to simulate game mode "${mode}", but it's not configured in the game config.`,
          )
        }

        const booksPath = path.join(
          this.gameConfig.rootDir,
          this.gameConfig.outputDir,
          `books_${mode}.jsonl`,
        )

        const tempRecordsPath = path.join(
          this.gameConfig.rootDir,
          this.gameConfig.outputDir,
          TEMP_FOLDER,
          `temp_records_${mode}.jsonl`,
        )

        createDirIfNotExists(
          path.join(this.gameConfig.rootDir, this.gameConfig.outputDir),
        )
        createDirIfNotExists(
          path.join(this.gameConfig.rootDir, this.gameConfig.outputDir, TEMP_FOLDER),
        )

        this.recordsWriteStream = fs.createWriteStream(tempRecordsPath)

        const simNumsToCriteria = ResultSet.assignCriteriaToSimulations(this, mode)

        await this.spawnWorkersForGameMode({ mode, simNumsToCriteria })

        // Merge temporary book files into the final sorted file
        const finalBookStream = fs.createWriteStream(booksPath)
        const numSims = Object.keys(simNumsToCriteria).length
        const chunks = this.getSimRangesForChunks(numSims, this.concurrency!)

        let isFirstChunk = true
        for (let i = 0; i < chunks.length; i++) {
          const tempBookPath = path.join(
            this.gameConfig.rootDir,
            this.gameConfig.outputDir,
            TEMP_FOLDER,
            `temp_books_${mode}_${i}.jsonl`,
          )

          if (fs.existsSync(tempBookPath)) {
            if (!isFirstChunk) {
              finalBookStream.write("\n")
            }
            const content = fs.createReadStream(tempBookPath)
            for await (const chunk of content) {
              finalBookStream.write(chunk)
            }
            fs.rmSync(tempBookPath)
            isFirstChunk = false
          }
        }
        finalBookStream.end()
        await new Promise<void>((resolve) => finalBookStream.on("finish", resolve))

        if (this.recordsWriteStream) {
          await new Promise<void>((resolve) => {
            this.recordsWriteStream!.end(() => {
              resolve()
            })
          })
          this.recordsWriteStream = undefined
        }

        createDirIfNotExists(
          path.join(
            this.gameConfig.rootDir,
            this.gameConfig.outputDir,
            "optimization_files",
          ),
        )
        createDirIfNotExists(
          path.join(this.gameConfig.rootDir, this.gameConfig.outputDir, "publish_files"),
        )

        console.log(`Writing final files for game mode: ${mode} ...`)
        this.writeLookupTableCSV(mode)
        this.writeLookupTableSegmentedCSV(mode)
        this.writeRecords(mode)
        await this.writeBooksJson(mode)
        this.writeIndexJson()
        console.log(`Mode ${mode} done!`)

        debugDetails[mode].rtp =
          this.wallet.getCumulativeWins() / (runs * this.gameConfig.gameModes[mode]!.cost)

        debugDetails[mode].wins = this.wallet.getCumulativeWins()
        debugDetails[mode].winsPerSpinType = this.wallet.getCumulativeWinsPerSpinType()

        console.timeEnd(mode)
      }

      console.log("\n=== SIMULATION SUMMARY ===")
      console.table(debugDetails)
    }

    let desiredSims = 0
    let actualSims = 0
    const criteriaToRetries: Record<string, number> = {}

    // Code that runs for individual processes
    if (!isMainThread) {
      const { mode, simStart, simEnd, index } = workerData

      const simNumsToCriteria = ResultSet.assignCriteriaToSimulations(this, mode)

      // Run each simulation until the criteria is met.
      for (let simId = simStart; simId <= simEnd; simId++) {
        if (this.debug) desiredSims++

        const criteria = simNumsToCriteria[simId] || "N/A"

        if (!criteriaToRetries[criteria]) {
          criteriaToRetries[criteria] = 0
        }

        this.runSingleSimulation({ simId, mode, criteria, index })

        if (this.debug) {
          criteriaToRetries[criteria] += this.actualSims - 1
          actualSims += this.actualSims
        }
      }

      if (this.debug) {
        console.log(`Desired ${desiredSims}, Actual ${actualSims}`)
        console.log(`Retries per criteria:`, criteriaToRetries)
      }

      parentPort?.postMessage({
        type: "done",
        workerNum: index,
      })
    }
  }

  /**
   * Runs all simulations for a specific game mode.
   */
  async spawnWorkersForGameMode(opts: {
    mode: string
    simNumsToCriteria: Record<number, string>
  }) {
    const { mode, simNumsToCriteria } = opts

    const numSims = Object.keys(simNumsToCriteria).length
    const simRangesPerChunk = this.getSimRangesForChunks(numSims, this.concurrency!)

    await Promise.all(
      simRangesPerChunk.map(([simStart, simEnd], index) => {
        return this.callWorker({
          basePath: path.join(this.gameConfig.rootDir, this.gameConfig.outputDir),
          mode,
          simStart,
          simEnd,
          index,
          totalSims: numSims,
        })
      }),
    )
  }

  async callWorker(opts: {
    basePath: string
    mode: string
    simStart: number
    simEnd: number
    index: number
    totalSims: number
  }) {
    const { mode, simEnd, simStart, basePath, index, totalSims } = opts

    function logArrowProgress(current: number, total: number) {
      const percentage = (current / total) * 100
      const progressBarLength = 50
      const filledLength = Math.round((progressBarLength * current) / total)
      const bar = "█".repeat(filledLength) + "-".repeat(progressBarLength - filledLength)
      process.stdout.write(`\r[${bar}] ${percentage.toFixed(2)}%   (${current}/${total})`)
      if (current === total) {
        process.stdout.write("\n")
      }
    }

    return new Promise((resolve, reject) => {
      const scriptPath = path.join(basePath, TEMP_FILENAME)

      const worker = new Worker(scriptPath, {
        workerData: {
          mode,
          simStart,
          simEnd,
          index,
        },
      })

      const tempBookPath = path.join(
        basePath,
        TEMP_FOLDER,
        `temp_books_${mode}_${index}.jsonl`,
      )
      const bookStream = fs.createWriteStream(tempBookPath)

      worker.on("message", (msg) => {
        if (msg.type === "log") {
        } else if (msg.type === "complete") {
          completedSimulations++

          if (completedSimulations % 250 === 0) {
            logArrowProgress(completedSimulations, totalSims)
          }

          // Write data to global library
          const book = Book.fromSerialized(msg.book)

          const bookData = {
            id: book.id,
            payoutMultiplier: book.payout,
            events: book.events,
          }

          const prefix = book.id === simStart ? "" : "\n"
          bookStream.write(prefix + JSONL.stringify([bookData]))

          book.events = []
          this.library.set(book.id, book)

          if (this.recordsWriteStream) {
            for (const record of msg.records) {
              const recordPrefix = this.hasWrittenRecord ? "\n" : ""
              this.recordsWriteStream.write(recordPrefix + JSONL.stringify([record]))
              this.hasWrittenRecord = true
            }
          }

          this.wallet.mergeSerialized(msg.wallet)
        } else if (msg.type === "done") {
          resolve(true)
        }
      })

      worker.on("error", (error) => {
        process.stdout.write(`\n${error.message}\n`)
        process.stdout.write(`\n${error.stack}\n`)
        reject(error)
      })

      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`))
        }
      })
    })
  }

  /**
   * Will run a single simulation until the specified criteria is met.
   */
  runSingleSimulation(opts: {
    simId: number
    mode: string
    criteria: string
    index: number
  }) {
    const { simId, mode, criteria } = opts

    const ctx = createGameContext({
      config: this.gameConfig,
    })

    ctx.state.currentGameMode = mode
    ctx.state.currentSimulationId = simId
    ctx.state.isCriteriaMet = false

    const resultSet = ctx.services.game.getResultSetByCriteria(
      ctx.state.currentGameMode,
      criteria,
    )

    ctx.state.currentResultSet = resultSet

    while (!ctx.state.isCriteriaMet) {
      this.actualSims++
      this.resetSimulation(ctx)

      this.handleGameFlow(ctx)

      if (resultSet.meetsCriteria(ctx)) {
        ctx.state.isCriteriaMet = true
      }
    }

    ctx.services.wallet._getWallet().writePayoutToBook(ctx)
    ctx.services.wallet._getWallet().confirmWins(ctx)

    if (ctx.services.data._getBook().payout >= ctx.config.maxWinX) {
      ctx.state.triggeredMaxWin = true
    }

    ctx.services.data.record({
      criteria: resultSet.criteria,
    })

    ctx.config.hooks.onSimulationAccepted?.(ctx)

    this.confirmRecords(ctx)

    parentPort?.postMessage({
      type: "complete",
      simId,
      book: ctx.services.data._getBook().serialize(),
      wallet: ctx.services.wallet._getWallet().serialize(),
      records: ctx.services.data._getRecords(),
    })
  }

  /**
   * If a simulation does not meet the required criteria, reset the state to run it again.
   *
   * This also runs once before each simulation to ensure a clean state.
   */
  protected resetSimulation(ctx: GameContext) {
    this.resetState(ctx)
    ctx.services.board.resetBoard()
    ctx.services.data._setRecorder(new Recorder())
    ctx.services.wallet._setWallet(new Wallet())
    ctx.services.data._setBook(
      new Book({
        id: ctx.state.currentSimulationId,
        criteria: ctx.state.currentResultSet.criteria,
      }),
    )
    Object.values(ctx.config.gameModes).forEach((mode) => {
      mode._resetTempValues()
    })
  }

  protected resetState(ctx: GameContext) {
    ctx.services.rng.setSeedIfDifferent(ctx.state.currentSimulationId)
    ctx.state.currentSpinType = SPIN_TYPE.BASE_GAME
    ctx.state.currentFreespinAmount = 0
    ctx.state.totalFreespinAmount = 0
    ctx.state.triggeredMaxWin = false
    ctx.state.triggeredFreespins = false
    ctx.state.userData = ctx.config.userState || {}
  }

  /**
   * Contains and executes the entire game logic:
   * - Drawing the board
   * - Evaluating wins
   * - Updating wallet
   * - Handling free spins
   * - Recording events
   *
   * You can customize the game flow by implementing the `onHandleGameFlow` hook in the game configuration.
   */
  protected handleGameFlow(ctx: GameContext) {
    this.gameConfig.hooks.onHandleGameFlow(ctx)
  }

  /**
   * Creates a CSV file in the format "simulationId,weight,payout".
   *
   * `weight` defaults to 1.
   */
  private writeLookupTableCSV(gameMode: string) {
    const rows: string[] = []

    for (const [bookId, book] of this.library.entries()) {
      rows.push(`${book.id},1,${Math.round(book.payout)}`)
    }

    rows.sort((a, b) => Number(a.split(",")[0]) - Number(b.split(",")[0]))

    let outputFileName = `lookUpTable_${gameMode}.csv`
    let outputFilePath = path.join(
      this.gameConfig.rootDir,
      this.gameConfig.outputDir,
      outputFileName,
    )
    writeFile(outputFilePath, rows.join("\n"))

    outputFileName = `lookUpTable_${gameMode}_0.csv`
    outputFilePath = path.join(
      this.gameConfig.rootDir,
      this.gameConfig.outputDir,
      "publish_files",
      outputFileName,
    )
    writeFile(outputFilePath, rows.join("\n"))

    return outputFilePath
  }

  /**
   * Creates a CSV file in the format "simulationId,criteria,payoutBase,payoutFreespins".
   */
  private writeLookupTableSegmentedCSV(gameMode: string) {
    const rows: string[] = []

    for (const [bookId, book] of this.library.entries()) {
      rows.push(`${book.id},${book.criteria},${book.basegameWins},${book.freespinsWins}`)
    }

    rows.sort((a, b) => Number(a.split(",")[0]) - Number(b.split(",")[0]))

    const outputFileName = `lookUpTableSegmented_${gameMode}.csv`

    const outputFilePath = path.join(
      this.gameConfig.rootDir,
      this.gameConfig.outputDir,
      outputFileName,
    )
    writeFile(outputFilePath, rows.join("\n"))

    return outputFilePath
  }

  private async writeRecords(mode: string) {
    const tempRecordsPath = path.join(
      this.gameConfig.rootDir,
      this.gameConfig.outputDir,
      TEMP_FOLDER,
      `temp_records_${mode}.jsonl`,
    )

    const forceRecordsPath = path.join(
      this.gameConfig.rootDir,
      this.gameConfig.outputDir,
      `force_record_${mode}.json`,
    )

    // Use a local Map to aggregate records efficiently without cluttering the main Recorder
    // Key is the stringified search criteria
    const aggregatedRecords = new Map<string, RecordItem>()

    if (fs.existsSync(tempRecordsPath)) {
      const fileStream = fs.createReadStream(tempRecordsPath)

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      })

      for await (const line of rl) {
        if (line.trim() === "") continue
        const record: RecordItem = JSON.parse(line)

        const key = JSON.stringify(record.search)

        let existing = aggregatedRecords.get(key)
        if (!existing) {
          existing = {
            search: record.search,
            timesTriggered: 0,
            bookIds: [],
          }
          aggregatedRecords.set(key, existing)
        }

        existing.timesTriggered += record.timesTriggered

        for (const bookId of record.bookIds) {
          existing.bookIds.push(bookId)
        }
      }
    }

    fs.rmSync(forceRecordsPath, { force: true })

    const writeStream = fs.createWriteStream(forceRecordsPath, { encoding: "utf-8" })
    writeStream.write("[\n")

    let isFirst = true
    for (const record of aggregatedRecords.values()) {
      if (!isFirst) {
        writeStream.write(",\n")
      }
      writeStream.write(JSON.stringify(record))
      isFirst = false
    }

    writeStream.write("\n]")
    writeStream.end()

    await new Promise<void>((resolve) => {
      writeStream.on("finish", () => resolve())
    })

    fs.rmSync(tempRecordsPath, { force: true })
  }

  private writeIndexJson() {
    const outputFilePath = path.join(
      this.gameConfig.rootDir,
      this.gameConfig.outputDir,
      "publish_files",
      "index.json",
    )

    const modes = Object.keys(this.simRunsAmount).map((id) => {
      const mode = this.gameConfig.gameModes[id]
      assert(mode, `Game mode "${id}" not found in game config.`)

      return {
        name: mode.name,
        cost: mode.cost,
        events: `books_${mode.name}.jsonl.zst`,
        weights: `lookUpTable_${mode.name}_0.csv`,
      }
    })

    writeFile(outputFilePath, JSON.stringify({ modes }, null, 2))
  }

  private async writeBooksJson(gameMode: string) {
    const outputFilePath = path.join(
      this.gameConfig.rootDir,
      this.gameConfig.outputDir,
      `books_${gameMode}.jsonl`,
    )

    const compressedFilePath = path.join(
      this.gameConfig.rootDir,
      this.gameConfig.outputDir,
      "publish_files",
      `books_${gameMode}.jsonl.zst`,
    )

    fs.rmSync(compressedFilePath, { force: true })

    if (fs.existsSync(outputFilePath)) {
      await pipeline(
        fs.createReadStream(outputFilePath),
        zlib.createZstdCompress(),
        fs.createWriteStream(compressedFilePath),
      )
    }
  }

  /**
   * Compiles user configured game to JS for use in different Node processes
   */
  private preprocessFiles() {
    const builtFilePath = path.join(
      this.gameConfig.rootDir,
      this.gameConfig.outputDir,
      TEMP_FILENAME,
    )
    fs.rmSync(builtFilePath, { force: true })
    buildSync({
      entryPoints: [this.gameConfig.rootDir],
      bundle: true,
      platform: "node",
      outfile: path.join(
        this.gameConfig.rootDir,
        this.gameConfig.outputDir,
        TEMP_FILENAME,
      ),
      external: ["esbuild"],
    })
  }

  private getSimRangesForChunks(total: number, chunks: number): [number, number][] {
    const base = Math.floor(total / chunks)
    const remainder = total % chunks
    const result: [number, number][] = []

    let current = 1

    for (let i = 0; i < chunks; i++) {
      const size = base + (i < remainder ? 1 : 0)
      const start = current
      const end = current + size - 1
      result.push([start, end])
      current = end + 1
    }

    return result
  }

  /**
   * Generates reelset CSV files for all game modes.
   */
  private generateReelsetFiles() {
    for (const mode of Object.values(this.gameConfig.gameModes)) {
      if (mode.reelSets && mode.reelSets.length > 0) {
        for (const reelSet of Object.values(mode.reelSets)) {
          reelSet.associatedGameModeName = mode.name
          reelSet.generateReels(this.gameConfig)
        }
      } else {
        throw new Error(
          `Game mode "${mode.name}" has no reel sets defined. Cannot generate reelset files.`,
        )
      }
    }
  }

  /**
   * Confirms all pending records and adds them to the main records list.
   */
  confirmRecords(ctx: GameContext) {
    const recorder = ctx.services.data._getRecorder()

    for (const pendingRecord of recorder.pendingRecords) {
      const search = Object.entries(pendingRecord.properties)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name))

      let record = recorder.records.find((r) => {
        if (r.search.length !== search.length) return false
        for (let i = 0; i < r.search.length; i++) {
          if (r.search[i]!.name !== search[i]!.name) return false
          if (r.search[i]!.value !== search[i]!.value) return false
        }
        return true
      })
      if (!record) {
        record = {
          search,
          timesTriggered: 0,
          bookIds: [],
        }
        recorder.records.push(record)
      }
      record.timesTriggered++
      if (!record.bookIds.includes(pendingRecord.bookId)) {
        record.bookIds.push(pendingRecord.bookId)
      }
    }

    recorder.pendingRecords = []
  }
}

export type SimulationOptions = {
  /**
   * Object containing the game modes and their respective simulation runs amount.
   */
  simRunsAmount: Partial<Record<string, number>>
  /**
   * Number of concurrent processes to use for simulations.
   *
   * Default: 6
   */
  concurrency?: number
}

export type SimulationConfigOptions = {
  debug?: boolean
}
