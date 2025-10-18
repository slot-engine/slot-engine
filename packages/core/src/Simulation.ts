import fs from "fs"
import path from "path"
import assert from "assert"
import { buildSync } from "esbuild"
import { createDirIfNotExists, JSONL, printBoard, writeFile } from "../utils"
import { Board } from "./Board"
import { GameConfig } from "./GameConfig"
import { GameModeName } from "./GameMode"
import { ResultSet } from "./ResultSet"
import { Wallet } from "./Wallet"
import { Book } from "./Book"
import { Worker, isMainThread, parentPort, workerData } from "worker_threads"
import { RecordItem } from "./GameState"
import { zstd } from "./utils/zstd"
import { AnyGameModes, AnySymbols, AnyUserData, CommonGameOptions } from "../index"

let completedSimulations = 0
const TEMP_FILENAME = "__temp_compiled_src_IGNORE.js"

export class Simulation {
  protected readonly gameConfigOpts: CommonGameOptions
  readonly gameConfig: GameConfig
  readonly simRunsAmount: Partial<Record<GameModeName, number>>
  private readonly concurrency: number
  private wallet: Wallet
  private library: Map<string, Book>
  readonly records: RecordItem[]
  protected debug = false

  constructor(opts: SimulationConfigOpts, gameConfigOpts: CommonGameOptions) {
    this.gameConfig = new GameConfig(gameConfigOpts)
    this.gameConfigOpts = gameConfigOpts
    this.simRunsAmount = opts.simRunsAmount || {}
    this.concurrency = (opts.concurrency || 6) >= 2 ? opts.concurrency || 6 : 2
    this.wallet = new Wallet()
    this.library = new Map()
    this.records = []

    const gameModeKeys = Object.keys(this.gameConfig.config.gameModes)
    assert(
      Object.values(this.gameConfig.config.gameModes)
        .map((m) => gameModeKeys.includes(m.name))
        .every((v) => v === true),
      "Game mode name must match its key in the gameModes object.",
    )

    if (isMainThread) {
      this.preprocessFiles()
    }
  }

  async runSimulation(opts: SimulationOpts) {
    const debug = opts.debug || false
    this.debug = debug

    const gameModesToSimulate = Object.keys(this.simRunsAmount)
    const configuredGameModes = Object.keys(this.gameConfig.config.gameModes)

    if (gameModesToSimulate.length === 0) {
      throw new Error("No game modes configured for simulation.")
    }

    this.gameConfig.generateReelsetFiles()

    // Code that runs when the user executes the simulations.
    // This spawns individual processes and merges the results afterwards.
    if (isMainThread) {
      const debugDetails: Record<string, Record<string, any>> = {}

      for (const mode of gameModesToSimulate) {
        completedSimulations = 0
        this.wallet = new Wallet()
        this.library = new Map()

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

        const simNumsToCriteria = ResultSet.assignCriteriaToSimulations(this, mode)

        await this.spawnWorkersForGameMode({ mode, simNumsToCriteria })

        createDirIfNotExists(
          path.join(
            process.cwd(),
            this.gameConfig.config.outputDir,
            "optimization_files",
          ),
        )
        createDirIfNotExists(
          path.join(process.cwd(), this.gameConfig.config.outputDir, "publish_files"),
        )

        Simulation.writeLookupTableCSV({
          gameMode: mode,
          library: this.library,
          gameConfig: this.gameConfig.config,
        })
        Simulation.writeLookupTableSegmentedCSV({
          gameMode: mode,
          library: this.library,
          gameConfig: this.gameConfig.config,
        })
        Simulation.writeRecords({
          gameMode: mode,
          records: this.records,
          gameConfig: this.gameConfig.config,
          debug: this.debug,
        })
        await Simulation.writeBooksJson({
          gameMode: mode,
          library: this.library,
          gameConfig: this.gameConfig.config,
        })
        Simulation.writeIndexJson({
          gameConfig: this.gameConfig.config,
        })

        debugDetails[mode].rtp =
          this.wallet.getCumulativeWins() /
          (runs * this.gameConfig.config.gameModes[mode]!.cost)

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
        const ctx = new SimulationContext(this.gameConfigOpts)

        if (!criteriaToRetries[criteria]) {
          criteriaToRetries[criteria] = 0
        }

        ctx.runSingleSimulation({ simId, mode, criteria, index })

        if (this.debug) {
          criteriaToRetries[criteria] += ctx.actualSims - 1
          actualSims += ctx.actualSims
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
          basePath: this.gameConfig.config.outputDir,
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
      const scriptPath = path.join(process.cwd(), basePath, TEMP_FILENAME)

      const worker = new Worker(scriptPath, {
        workerData: {
          mode,
          simStart,
          simEnd,
          index,
        },
      })

      worker.on("message", (msg) => {
        if (msg.type === "log") {
          //console.log(`[Worker ${msg.workerNum}] ${msg.message}`)
        } else if (msg.type === "complete") {
          completedSimulations++

          if (completedSimulations % 250 === 0) {
            logArrowProgress(completedSimulations, totalSims)
          }

          // Write data to global library
          const book = Book.fromSerialized(msg.book)
          this.library.set(book.id.toString(), book)
          this.wallet.mergeSerialized(msg.wallet)
          this.mergeRecords(msg.records)
        } else if (msg.type === "done") {
          resolve(true)
        }
      })

      worker.on("error", (error) => {
        console.error("Error:", error)
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
   * Creates a CSV file in the format "simulationId,weight,payout".
   *
   * `weight` defaults to 1.
   */
  private static writeLookupTableCSV(opts: {
    gameMode: string
    library: Map<string, Book>
    gameConfig: GameConfig["config"]
  }) {
    const { gameMode, library, gameConfig } = opts

    const rows: string[] = []

    for (const [bookId, book] of library.entries()) {
      rows.push(`${book.id},1,${Math.round(book.getPayout())}`)
    }

    rows.sort((a, b) => Number(a.split(",")[0]) - Number(b.split(",")[0]))

    let outputFileName = `lookUpTable_${gameMode}.csv`
    let outputFilePath = path.join(gameConfig.outputDir, outputFileName)
    writeFile(outputFilePath, rows.join("\n"))

    outputFileName = `lookUpTable_${gameMode}_0.csv`
    outputFilePath = path.join(gameConfig.outputDir, outputFileName)
    writeFile(outputFilePath, rows.join("\n"))

    return outputFilePath
  }

  /**
   * Creates a CSV file in the format "simulationId,criteria,payoutBase,payoutFreespins".
   */
  private static writeLookupTableSegmentedCSV(opts: {
    gameMode: string
    library: Map<string, Book>
    gameConfig: GameConfig["config"]
  }) {
    const { gameMode, library, gameConfig } = opts

    const rows: string[] = []

    for (const [bookId, book] of library.entries()) {
      rows.push(
        `${book.id},${book.criteria},${book.getBasegameWins()},${book.getFreespinsWins()}`,
      )
    }

    rows.sort((a, b) => Number(a.split(",")[0]) - Number(b.split(",")[0]))

    const outputFileName = `lookUpTableSegmented_${gameMode}.csv`

    const outputFilePath = path.join(gameConfig.outputDir, outputFileName)
    writeFile(outputFilePath, rows.join("\n"))

    return outputFilePath
  }

  private static writeRecords(opts: {
    gameMode: string
    records: RecordItem[]
    gameConfig: GameConfig["config"]
    fileNameWithoutExtension?: string
    debug?: boolean
  }) {
    const { gameMode, fileNameWithoutExtension, records, gameConfig, debug } = opts

    const outputFileName = fileNameWithoutExtension
      ? `${fileNameWithoutExtension}.json`
      : `force_record_${gameMode}.json`

    const outputFilePath = path.join(gameConfig.outputDir, outputFileName)
    writeFile(outputFilePath, JSON.stringify(records, null, 2))

    if (debug) Simulation.logSymbolOccurrences(records)

    return outputFilePath
  }

  private static writeIndexJson(opts: { gameConfig: GameConfig["config"] }) {
    const { gameConfig } = opts

    const outputFilePath = path.join(
      process.cwd(),
      gameConfig.outputDir,
      "publish_files",
      "index.json",
    )

    const modes = Object.entries(gameConfig.gameModes).map(([mode, modeConfig]) => ({
      name: mode,
      cost: modeConfig.cost,
      events: `books_${mode}.jsonl.zst`,
      weights: `lookUpTable_${mode}_0.csv`,
    }))

    writeFile(outputFilePath, JSON.stringify({ modes }, null, 2))
  }

  private static async writeBooksJson(opts: {
    gameMode: string
    library: Map<string, Book>
    gameConfig: GameConfig["config"]
    fileNameWithoutExtension?: string
  }) {
    const { gameMode, fileNameWithoutExtension, library, gameConfig } = opts

    const outputFileName = fileNameWithoutExtension
      ? `${fileNameWithoutExtension}.jsonl`
      : `books_${gameMode}.jsonl`

    const outputFilePath = path.join(gameConfig.outputDir, outputFileName)
    const books = Array.from(library.values())
      .map((b) => b.serialize())
      .map((b) => ({
        id: b.id,
        payoutMultiplier: b.payout,
        events: b.events,
      }))
      .sort((a, b) => a.id - b.id)

    const contents = JSONL.stringify(books)

    writeFile(outputFilePath, contents)

    const compressedFileName = fileNameWithoutExtension
      ? `${fileNameWithoutExtension}.jsonl.zst`
      : `books_${gameMode}.jsonl.zst`

    const compressedFilePath = path.join(
      process.cwd(),
      gameConfig.outputDir,
      "publish_files",
      compressedFileName,
    )

    fs.rmSync(compressedFilePath, { force: true })

    await zstd("-f", outputFilePath, "-o", compressedFilePath)
  }

  private static logSymbolOccurrences(records: RecordItem[]) {
    const validRecords = records.filter(
      (r) =>
        r.search.some((s) => s.name === "symbolId") &&
        r.search.some((s) => s.name === "kind"),
    )

    const structuredRecords = validRecords
      .map((r) => {
        const symbolEntry = r.search.find((s) => s.name === "symbolId")
        const kindEntry = r.search.find((s) => s.name === "kind")
        const spinTypeEntry = r.search.find((s) => s.name === "spinType")
        return {
          symbol: symbolEntry ? symbolEntry.value : "unknown",
          kind: kindEntry ? kindEntry.value : "unknown",
          spinType: spinTypeEntry ? spinTypeEntry.value : "unknown",
          timesTriggered: r.timesTriggered,
        }
      })
      .sort((a, b) => {
        if (a.symbol < b.symbol) return -1
        if (a.symbol > b.symbol) return 1
        if (a.kind < b.kind) return -1
        if (a.kind > b.kind) return 1
        if (a.spinType < b.spinType) return -1
        if (a.spinType > b.spinType) return 1
        return 0
      })

    console.table(structuredRecords)
  }

  /**
   * Compiles user configured game to JS for use in different Node processes
   */
  private preprocessFiles() {
    const builtFilePath = path.join(this.gameConfig.config.outputDir, TEMP_FILENAME)
    fs.rmSync(builtFilePath, { force: true })
    buildSync({
      entryPoints: [process.cwd()],
      bundle: true,
      platform: "node",
      outfile: path.join(this.gameConfig.config.outputDir, TEMP_FILENAME),
      external: ["esbuild", "@mongodb-js/zstd"],
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

  private mergeRecords(otherRecords: RecordItem[]) {
    for (const otherRecord of otherRecords) {
      let record = this.records.find((r) => {
        if (r.search.length !== otherRecord.search.length) return false
        for (let i = 0; i < r.search.length; i++) {
          if (r.search[i]!.name !== otherRecord.search[i]!.name) return false
          if (r.search[i]!.value !== otherRecord.search[i]!.value) return false
        }
        return true
      })
      if (!record) {
        record = {
          search: otherRecord.search,
          timesTriggered: 0,
          bookIds: [],
        }
        this.records.push(record)
      }
      record.timesTriggered += otherRecord.timesTriggered
      for (const bookId of otherRecord.bookIds) {
        if (!record.bookIds.includes(bookId)) {
          record.bookIds.push(bookId)
        }
      }
    }
  }
}

export type SimulationConfigOpts = {
  /**
   * Object containing the game modes and their respective simulation runs amount.
   */
  simRunsAmount: Partial<Record<GameModeName, number>>
  /**
   * Number of concurrent processes to use for simulations.
   *
   * Default: 6
   */
  concurrency?: number
}

/**
 * @internal
 */
export type AnySimulationContext<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> = SimulationContext<TGameModes, TSymbols, TUserState>

/**
 * @internal
 */
export class SimulationContext<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
> extends Board<TGameModes, TSymbols, TUserState> {
  constructor(opts: CommonGameOptions<any, any, TUserState>) {
    super(opts)
  }

  actualSims = 0

  /**
   * Will run a single simulation until the specified criteria is met.
   */
  runSingleSimulation(opts: {
    simId: number
    mode: string
    criteria: string
    index: number
  }) {
    const { simId, mode, criteria, index } = opts

    this.state.currentGameMode = mode
    this.state.currentSimulationId = simId
    this.state.isCriteriaMet = false

    while (!this.state.isCriteriaMet) {
      this.actualSims++
      this.resetSimulation()

      const resultSet = this.getGameModeCriteria(this.state.currentGameMode, criteria)
      this.state.currentResultSet = resultSet
      this.state.book.criteria = resultSet.criteria

      this.handleGameFlow()

      if (resultSet.meetsCriteria(this)) {
        this.state.isCriteriaMet = true
        this.config.hooks.onSimulationAccepted?.(this)
        this.record({
          criteria: resultSet.criteria,
        })
      }
    }

    this.wallet.confirmWins(this)
    this.confirmRecords()

    parentPort?.postMessage({
      type: "complete",
      simId,
      book: this.state.book.serialize(),
      wallet: this.wallet.serialize(),
      records: this.getRecords(),
    })
  }

  /**
   * If a simulation does not meet the required criteria, reset the state to run it again.
   *
   * This also runs once before each simulation to ensure a clean state.
   */
  protected resetSimulation() {
    this.resetState()
    this.resetBoard()
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
  protected handleGameFlow() {
    this.config.hooks.onHandleGameFlow(this)
  }
}

export interface SimulationOpts {
  debug?: boolean
}
