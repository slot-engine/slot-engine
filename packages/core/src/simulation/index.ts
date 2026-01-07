import fs from "fs"
import path from "path"
import assert from "assert"
import zlib from "zlib"
import readline from "readline"
import { buildSync } from "esbuild"
import { Worker, isMainThread, parentPort, workerData } from "worker_threads"
import {
  createGameConfig,
  GameConfigOptions,
  GameConfig,
  GameMetadata,
} from "../game-config"
import { createGameContext, GameContext } from "../game-context"
import { copy, createDirIfNotExists, JSONL, round, writeFile } from "../../utils"
import { SPIN_TYPE } from "../constants"
import { Book } from "../book"
import { Recorder, RecordItem } from "../recorder"
import { Wallet } from "../wallet"
import { ResultSet } from "../result-set"
import { pipeline } from "stream/promises"
import { createCriteriaSampler, hashStringToInt, splitCountsAcrossChunks } from "./utils"
import { io, Socket } from "socket.io-client"
import chalk from "chalk"
import {
  createPermanentFilePaths,
  createTemporaryFilePaths,
  FilePaths,
} from "../utils/file-paths"

let completedSimulations = 0
const TEMP_FILENAME = "__temp_compiled_src_IGNORE.js"
const TEMP_FOLDER = "temp_files"

/**
 * Class for handling simulations of the slot game.
 *
 * High level overview:
 * - Main thread compiles user code to JS and spawns workers
 * - Workers run compiled code to execute simulations
 * - Workers send data to main thread
 * - Main thread merges data and writes files
 *
 * Notes:
 * - Backpressure system with credits to avoid overwhelming the main thread
 * - Limited amount of credits
 * - Worker uses credit to return data to main thread
 * - After writing data, main thread gives worker new credit
 * - Prevents workers sending more data than the main thread can write in time
 */
export class Simulation {
  readonly gameConfigOpts: GameConfigOptions
  readonly gameConfig: GameConfig & GameMetadata
  readonly simRunsAmount: Partial<Record<string, number>>
  readonly concurrency: number
  private debug = false
  private actualSims = 0
  private wallet: Wallet = new Wallet()
  private summary: SimulationSummary = {}
  private recordsWriteStream: fs.WriteStream | undefined
  private hasWrittenRecord = false
  private readonly streamHighWaterMark = 500 * 1024 * 1024
  private readonly maxPendingSims: number
  private readonly maxHighWaterMark: number
  private panelPort: number = 7770
  private panelActive: boolean = false
  private panelWsUrl: string | undefined
  private socket: Socket | undefined

  PATHS = {} as FilePaths

  // Worker related
  private credits = 0
  private creditWaiters: Array<() => void> = []
  private creditListenerInit = false

  constructor(opts: SimulationOptions, gameConfigOpts: GameConfigOptions) {
    const { config, metadata } = createGameConfig(gameConfigOpts)
    this.gameConfig = { ...config, ...metadata }
    this.gameConfigOpts = gameConfigOpts
    this.simRunsAmount = opts.simRunsAmount || {}
    this.concurrency = (opts.concurrency || 6) >= 2 ? opts.concurrency || 6 : 2
    this.maxPendingSims = opts.maxPendingSims ?? 250
    this.maxHighWaterMark = (opts.maxDiskBuffer ?? 50) * 1024 * 1024

    const gameModeKeys = Object.keys(this.gameConfig.gameModes)
    assert(
      Object.values(this.gameConfig.gameModes)
        .map((m) => gameModeKeys.includes(m.name))
        .every((v) => v === true),
      "Game mode name must match its key in the gameModes object.",
    )

    const basePath = path.join(this.gameConfig.rootDir, this.gameConfig.outputDir)

    this.PATHS = {
      ...createPermanentFilePaths(basePath),
      ...createTemporaryFilePaths(basePath, TEMP_FOLDER),
    }
  }

  async runSimulation(opts: SimulationConfigOptions) {
    const debug = opts.debug || false
    this.debug = debug
    let statusMessage = ""

    const gameModesToSimulate = Object.keys(this.simRunsAmount)
    const configuredGameModes = Object.keys(this.gameConfig.gameModes)

    if (gameModesToSimulate.length === 0) {
      throw new Error("No game modes configured for simulation.")
    }

    this.generateReelsetFiles()

    // Code that runs when the user executes the simulations.
    // This spawns individual processes and merges the results afterwards.
    if (isMainThread) {
      this.preprocessFiles()

      // Workers can use websocket to send data to panel if configured
      this.panelPort = opts.panelPort || 7770
      this.panelWsUrl = `http://localhost:${this.panelPort}`

      await new Promise<void>((resolve) => {
        try {
          this.socket = io(this.panelWsUrl, {
            path: "/ws",
            transports: ["websocket", "polling"],
            withCredentials: true,
            autoConnect: false,
            reconnection: false,
          })
          this.socket.connect()
          this.socket.once("connect", () => {
            this.panelActive = true
            resolve()
          })
          this.socket.once("connect_error", () => {
            this.socket?.close()
            this.socket = undefined
            resolve()
          })
        } catch (error) {
          this.socket = undefined
          resolve()
        }
      })

      for (const mode of gameModesToSimulate) {
        completedSimulations = 0
        this.wallet = new Wallet()
        this.hasWrittenRecord = false

        const startTime = Date.now()
        statusMessage = `Simulating mode "${mode}" with ${this.simRunsAmount[mode]} runs.`
        console.log(statusMessage)
        if (this.socket && this.panelActive) {
          this.socket.emit("simulationStatus", statusMessage)
        }

        const runs = this.simRunsAmount[mode] || 0
        if (runs <= 0) continue

        if (!configuredGameModes.includes(mode)) {
          throw new Error(
            `Tried to simulate game mode "${mode}", but it's not configured in the game config.`,
          )
        }

        this.summary[mode] = {
          total: { numSims: runs, bsWins: 0, fsWins: 0, rtp: 0 },
          criteria: {},
        }

        const booksPath = this.PATHS.books(mode)
        const tempRecordsPath = this.PATHS.tempRecords(mode)

        createDirIfNotExists(this.PATHS.base)
        createDirIfNotExists(path.join(this.PATHS.base, TEMP_FOLDER))

        this.recordsWriteStream = fs
          .createWriteStream(tempRecordsPath, {
            highWaterMark: this.maxHighWaterMark,
          })
          .setMaxListeners(30)

        const criteriaCounts = ResultSet.getNumberOfSimsForCriteria(this, mode)
        const totalSims = Object.values(criteriaCounts).reduce((a, b) => a + b, 0)
        assert(
          totalSims === runs,
          `Criteria mismatch for mode "${mode}". Expected ${runs}, got ${totalSims}`,
        )

        const chunks = this.getSimRangesForChunks(totalSims, this.concurrency!)
        const chunkSizes = chunks.map(([s, e]) => Math.max(0, e - s + 1))
        const chunkCriteriaCounts = splitCountsAcrossChunks(criteriaCounts, chunkSizes)

        await this.spawnWorkersForGameMode({
          mode,
          chunks,
          chunkCriteriaCounts,
          totalSims,
        })

        createDirIfNotExists(this.PATHS.optimizationFiles)
        createDirIfNotExists(this.PATHS.publishFiles)

        statusMessage = `Writing final files for game mode "${mode}". This may take a while...`
        console.log(statusMessage)
        if (this.socket && this.panelActive) {
          this.socket.emit("simulationStatus", statusMessage)
        }

        // Merge temporary book files into the final sorted file.
        // Also write index file for lookup
        try {
          const finalBookStream = fs.createWriteStream(booksPath, {
            highWaterMark: this.streamHighWaterMark,
          })

          const bookIndexStream = fs.createWriteStream(this.PATHS.booksIndex(mode), {
            highWaterMark: this.streamHighWaterMark,
          })
          let offset = 0n

          for (let i = 0; i < chunks.length; i++) {
            const tempBookPath = this.PATHS.tempBooks(mode, i)
            if (!fs.existsSync(tempBookPath)) continue

            const rl = readline.createInterface({
              input: fs.createReadStream(tempBookPath),
              crlfDelay: Infinity,
            })

            for await (const line of rl) {
              const indexBuffer = Buffer.alloc(8)
              indexBuffer.writeBigUInt64LE(offset)
              if (!bookIndexStream.write(indexBuffer)) {
                await new Promise<void>((resolve) =>
                  bookIndexStream.once("drain", resolve),
                )
              }

              const lineWithNewline = line + "\n"
              if (!finalBookStream.write(lineWithNewline)) {
                await new Promise<void>((resolve) =>
                  finalBookStream.once("drain", resolve),
                )
              }
              offset += BigInt(Buffer.byteLength(lineWithNewline, "utf8"))
            }

            fs.rmSync(tempBookPath)
          }

          finalBookStream.end()
          bookIndexStream.end()
          await Promise.all([
            new Promise<void>((r) => finalBookStream.on("finish", () => r())),
            new Promise<void>((r) => bookIndexStream.on("finish", () => r())),
          ])
        } catch (error) {
          throw new Error(`Error merging book files: ${(error as Error).message}`)
        }

        // Merge temporary LUTs
        const lutPath = this.PATHS.lookupTable(mode)
        const lutPathPublish = this.PATHS.lookupTablePublish(mode)
        const lutSegmentedPath = this.PATHS.lookupTableSegmented(mode)

        await this.mergeCsv(
          chunks,
          lutPath,
          (i) => `temp_lookup_${mode}_${i}.csv`,
          this.PATHS.lookupTableIndex(mode),
        )
        fs.copyFileSync(lutPath, lutPathPublish)
        await this.mergeCsv(
          chunks,
          lutSegmentedPath,
          (i) => `temp_lookup_segmented_${mode}_${i}.csv`,
          this.PATHS.lookupTableSegmentedIndex(mode),
        )

        if (this.recordsWriteStream) {
          await new Promise<void>((resolve) => {
            this.recordsWriteStream!.end(() => {
              resolve()
            })
          })
          this.recordsWriteStream = undefined
        }

        await this.writeRecords(mode)
        await this.writeBooksJson(mode)
        this.writeIndexJson()

        const endTime = Date.now()
        const prettyTime = new Date(endTime - startTime).toISOString().slice(11, -1)

        statusMessage = `Mode ${mode} done! Time taken: ${prettyTime}`
        console.log(statusMessage)
        if (this.socket && this.panelActive) {
          this.socket.emit("simulationStatus", statusMessage)
        }
      }

      await this.printSimulationSummary()
    }

    let desiredSims = 0
    let actualSims = 0
    const criteriaToRetries: Record<string, number> = {}

    // Code that runs for individual processes
    if (!isMainThread) {
      const { mode, simStart, simEnd, index, criteriaCounts } = workerData as {
        mode: string
        simStart: number
        simEnd: number
        index: number
        criteriaCounts: Record<string, number>
      }

      const seed = (hashStringToInt(mode) + index) >>> 0
      const nextCriteria = createCriteriaSampler(criteriaCounts, seed)

      // Run each simulation until the criteria is met.
      for (let simId = simStart; simId <= simEnd; simId++) {
        if (this.debug) desiredSims++

        const criteria = nextCriteria()

        if (!criteriaToRetries[criteria]) criteriaToRetries[criteria] = 0

        await this.acquireCredit()

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

      parentPort?.removeAllListeners()
      parentPort?.close()
    }

    if (this.socket && this.panelActive) {
      // Wait a bit for the simulationSummary event to be sent first
      await new Promise((resolve) => setTimeout(resolve, 500))
      this.socket?.close()
    }
  }

  /**
   * Runs all simulations for a specific game mode.
   */
  async spawnWorkersForGameMode(opts: {
    mode: string
    chunks: [number, number][]
    chunkCriteriaCounts: Array<Record<string, number>>
    totalSims: number
  }) {
    const { mode, chunks, chunkCriteriaCounts, totalSims } = opts

    await Promise.all(
      chunks.map(([simStart, simEnd], index) => {
        return this.callWorker({
          basePath: this.PATHS.base,
          mode,
          simStart,
          simEnd,
          index,
          totalSims,
          criteriaCounts: chunkCriteriaCounts[index]!,
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
    criteriaCounts: Record<string, number>
  }) {
    const { mode, simEnd, simStart, basePath, index, totalSims, criteriaCounts } = opts

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

    const write = async (stream: fs.WriteStream, chunk: string) => {
      if (!stream.write(chunk)) {
        await new Promise<void>((resolve) => stream.once("drain", resolve))
      }
    }

    return new Promise((resolve, reject) => {
      const scriptPath = path.join(basePath, TEMP_FILENAME)

      const startTime = Date.now()

      const worker = new Worker(scriptPath, {
        workerData: {
          mode,
          simStart,
          simEnd,
          index,
          criteriaCounts,
        },
      })

      worker.postMessage({ type: "credit", amount: this.maxPendingSims })

      const tempBookPath = this.PATHS.tempBooks(mode, index)
      const bookStream = fs.createWriteStream(tempBookPath, {
        highWaterMark: this.maxHighWaterMark,
      })

      const tempLookupPath = this.PATHS.tempLookupTable(mode, index)
      const lookupStream = fs.createWriteStream(tempLookupPath, {
        highWaterMark: this.maxHighWaterMark,
      })

      const tempLookupSegPath = this.PATHS.tempLookupTableSegmented(mode, index)
      const lookupSegmentedStream = fs.createWriteStream(tempLookupSegPath, {
        highWaterMark: this.maxHighWaterMark,
      })

      let writeChain: Promise<void> = Promise.resolve()

      worker.on("message", (msg) => {
        if (msg.type === "log") {
          return
        }

        if (msg.type === "complete") {
          writeChain = writeChain
            .then(async () => {
              completedSimulations++

              if (
                completedSimulations % 250 === 0 ||
                completedSimulations === totalSims
              ) {
                logArrowProgress(completedSimulations, totalSims)
              }

              if (this.socket && this.panelActive) {
                if (
                  completedSimulations % 1000 === 0 ||
                  completedSimulations === totalSims
                ) {
                  // Time remaining in seconds
                  const elapsedTime = Date.now() - startTime
                  const simsLeft = totalSims - completedSimulations
                  const timePerSim = elapsedTime / completedSimulations
                  const timeRemaining = Math.round((simsLeft * timePerSim) / 1000)

                  this.socket.emit("simulationProgress", {
                    mode,
                    percentage: (completedSimulations / totalSims) * 100,
                    current: completedSimulations,
                    total: totalSims,
                    timeRemaining,
                  })

                  this.socket.emit(
                    "simulationShouldStop",
                    this.gameConfig.id,
                    (shouldStop: boolean) => {
                      if (shouldStop) {
                        worker.terminate()
                      }
                    },
                  )
                }
              }

              const book = msg.book as ReturnType<Book["serialize"]>
              const bookData = {
                id: book.id,
                payoutMultiplier: book.payout,
                events: book.events,
              }

              if (!this.summary[mode]?.criteria[book.criteria]) {
                this.summary[mode]!.criteria[book.criteria] = {
                  numSims: 0,
                  bsWins: 0,
                  fsWins: 0,
                  rtp: 0,
                }
              }
              const bsWins = round(book.basegameWins, 4)
              const fsWins = round(book.freespinsWins, 4)
              this.summary[mode]!.criteria[book.criteria]!.numSims += 1
              this.summary[mode]!.total.bsWins += bsWins
              this.summary[mode]!.total.fsWins += fsWins
              this.summary[mode]!.criteria[book.criteria]!.bsWins! += bsWins
              this.summary[mode]!.criteria[book.criteria]!.fsWins! += fsWins

              const prefix = book.id === simStart ? "" : "\n"
              await write(bookStream, prefix + JSONL.stringify([bookData]))
              await write(lookupStream, `${book.id},1,${Math.round(book.payout)}\n`)
              await write(
                lookupSegmentedStream,
                `${book.id},${book.criteria},${book.basegameWins},${book.freespinsWins}\n`,
              )

              if (this.recordsWriteStream) {
                for (const record of msg.records) {
                  const recordPrefix = this.hasWrittenRecord ? "\n" : ""
                  await write(
                    this.recordsWriteStream,
                    recordPrefix + JSONL.stringify([record]),
                  )
                  this.hasWrittenRecord = true
                }
              }

              this.wallet.mergeSerialized(msg.wallet)

              worker.postMessage({ type: "credit", amount: 1 })
            })
            .catch(reject)

          return
        }

        if (msg.type === "done") {
          writeChain
            .then(async () => {
              bookStream.end()
              lookupStream.end()
              lookupSegmentedStream.end()

              await Promise.all([
                new Promise<void>((r) => bookStream.on("finish", () => r())),
                new Promise<void>((r) => lookupStream.on("finish", () => r())),
                new Promise<void>((r) => lookupSegmentedStream.on("finish", () => r())),
              ])

              resolve(true)
            })
            .catch(reject)

          return
        }
      })

      worker.on("error", (error) => {
        process.stdout.write(`\n${error.message}\n`)
        process.stdout.write(`\n${error.stack}\n`)
        reject(error)
      })

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.log(chalk.yellow(`\nWorker stopped with exit code ${code}`))
          reject()
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

  private initCreditListener() {
    if (this.creditListenerInit) return
    this.creditListenerInit = true

    parentPort?.on("message", (msg: any) => {
      if (msg?.type !== "credit") return
      const amount = Number(msg?.amount ?? 0)
      if (!Number.isFinite(amount) || amount <= 0) return

      this.credits += amount

      while (this.credits > 0 && this.creditWaiters.length > 0) {
        this.credits -= 1
        const resolve = this.creditWaiters.shift()!
        resolve()
      }
    })
  }

  private acquireCredit() {
    this.initCreditListener()

    if (this.credits > 0) {
      this.credits -= 1
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      this.creditWaiters.push(resolve)
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
    ctx.state.userData = copy(ctx.config.userState)
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

  private async writeRecords(mode: string) {
    const tempRecordsPath = this.PATHS.tempRecords(mode)
    const forceRecordsPath = this.PATHS.forceRecords(mode)

    const allSearchKeysAndValues = new Map<string, Set<string>>()

    // Use a local Map to aggregate records efficiently without cluttering the main Recorder
    // Key is the stringified search criteria
    const aggregatedRecords = new Map<string, RecordItem>()

    if (fs.existsSync(tempRecordsPath)) {
      const fileStream = fs.createReadStream(tempRecordsPath, {
        highWaterMark: this.streamHighWaterMark,
      })

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      })

      for await (const line of rl) {
        if (line.trim() === "") continue
        const record: RecordItem = JSON.parse(line)

        for (const entry of record.search) {
          if (!allSearchKeysAndValues.has(entry.name)) {
            allSearchKeysAndValues.set(entry.name, new Set<string>())
          }
          allSearchKeysAndValues.get(entry.name)!.add(String(entry.value))
        }

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
    fs.rmSync(this.PATHS.forceKeys(mode), { force: true })

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

    const forceJson = Object.fromEntries(
      Array.from(allSearchKeysAndValues.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, values]) => [key, Array.from(values)]),
    )
    writeFile(this.PATHS.forceKeys(mode), JSON.stringify(forceJson, null, 2))

    fs.rmSync(tempRecordsPath, { force: true })
  }

  private writeIndexJson() {
    const outputFilePath = this.PATHS.indexJson

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
    const outputFilePath = this.PATHS.books(gameMode)
    const compressedFilePath = this.PATHS.booksCompressed(gameMode)

    fs.rmSync(compressedFilePath, { force: true })

    if (fs.existsSync(outputFilePath)) {
      await pipeline(
        fs.createReadStream(outputFilePath),
        zlib.createZstdCompress(),
        fs.createWriteStream(compressedFilePath),
      )
    }

    // We can save space by removing uncompressed file if panel is not active.
    // For active panel, we need this file for easier data access.
    if (!this.panelActive) {
      fs.rmSync(outputFilePath, { force: true })
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
      external: ["esbuild", "yargs"],
    })
  }

  private getSimRangesForChunks(total: number, chunks: number): [number, number][] {
    const realChunks = Math.min(chunks, Math.max(total, 1))
    const base = Math.floor(total / realChunks)
    const remainder = total % realChunks
    const result: [number, number][] = []

    let current = 1
    for (let i = 0; i < realChunks; i++) {
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

  private async mergeCsv(
    chunks: [number, number][],
    outPath: string,
    tempName: (i: number) => string,
    lutIndexPath: string,
  ) {
    try {
      fs.rmSync(outPath, { force: true })

      const lutStream = fs.createWriteStream(outPath, {
        highWaterMark: this.streamHighWaterMark,
      })
      const lutIndexStream = lutIndexPath
        ? fs.createWriteStream(lutIndexPath, {
            highWaterMark: this.streamHighWaterMark,
          })
        : undefined
      let offset = 0n

      for (let i = 0; i < chunks.length; i++) {
        const tempLutChunk = path.join(this.PATHS.base, TEMP_FOLDER, tempName(i))
        if (!fs.existsSync(tempLutChunk)) continue

        if (lutIndexStream) {
          // If an index file is needed, read line by line to track offsets
          const rl = readline.createInterface({
            input: fs.createReadStream(tempLutChunk),
            crlfDelay: Infinity,
          })

          for await (const line of rl) {
            if (!line.trim()) continue
            const indexBuffer = Buffer.alloc(8)
            indexBuffer.writeBigUInt64LE(offset)
            if (!lutIndexStream.write(indexBuffer)) {
              await new Promise<void>((resolve) => lutIndexStream.once("drain", resolve))
            }

            const lineWithNewline = line + "\n"
            if (!lutStream.write(lineWithNewline)) {
              await new Promise<void>((resolve) => lutStream.once("drain", resolve))
            }
            offset += BigInt(Buffer.byteLength(lineWithNewline, "utf8"))
          }
        } else {
          // No index, stream normally
          const tempChunkStream = fs.createReadStream(tempLutChunk, {
            highWaterMark: this.streamHighWaterMark,
          })
          for await (const buf of tempChunkStream) {
            if (!lutStream.write(buf)) {
              await new Promise<void>((resolve) => lutStream.once("drain", resolve))
            }
          }
        }

        fs.rmSync(tempLutChunk)
      }

      lutStream.end()
      lutIndexStream?.end()
      await Promise.all([
        new Promise<void>((resolve) => lutStream.on("finish", resolve)),
        lutIndexStream
          ? new Promise<void>((resolve) => lutIndexStream.on("finish", resolve))
          : Promise.resolve(),
      ])
    } catch (error) {
      throw new Error(`Error merging CSV files: ${(error as Error).message}`)
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

  async printSimulationSummary() {
    Object.entries(this.summary).forEach(([mode, modeSummary]) => {
      const modeCost = this.gameConfig.gameModes[mode]!.cost

      Object.entries(modeSummary.criteria).forEach(([criteria, criteriaSummary]) => {
        const totalWins = criteriaSummary.bsWins + criteriaSummary.fsWins
        const rtp = totalWins / (criteriaSummary.numSims * modeCost)
        this.summary[mode]!.criteria[criteria]!.rtp = round(rtp, 4)
        this.summary[mode]!.criteria[criteria]!.bsWins = round(criteriaSummary.bsWins, 4)
        this.summary[mode]!.criteria[criteria]!.fsWins = round(criteriaSummary.fsWins, 4)
      })

      const totalWins = modeSummary.total.bsWins + modeSummary.total.fsWins
      const rtp = totalWins / (modeSummary.total.numSims * modeCost)
      this.summary[mode]!.total.rtp = round(rtp, 4)
      this.summary[mode]!.total.bsWins = round(modeSummary.total.bsWins, 4)
      this.summary[mode]!.total.fsWins = round(modeSummary.total.fsWins, 4)
    })

    const maxLineLength = 50
    let output = chalk.green.bold("\nSimulation Summary\n")

    for (const [mode, modeSummary] of Object.entries(this.summary)) {
      output += "-".repeat(maxLineLength) + "\n\n"
      output += chalk.bold.bgWhite(`Mode: ${mode}\n`)
      output += `Simulations: ${modeSummary.total.numSims}\n`
      output += `Basegame Wins: ${modeSummary.total.bsWins}\n`
      output += `Freespins Wins: ${modeSummary.total.fsWins}\n`
      output += `RTP (unoptimized): ${modeSummary.total.rtp}\n`

      output += chalk.bold("\n    Result Set Summary:\n")
      for (const [criteria, criteriaSummary] of Object.entries(modeSummary.criteria)) {
        output += chalk.gray("    " + "-".repeat(maxLineLength - 4)) + "\n"
        output += chalk.bold(`    Criteria: ${criteria}\n`)
        output += `    Simulations: ${criteriaSummary.numSims}\n`
        output += `    Basegame Wins: ${criteriaSummary.bsWins}\n`
        output += `    Freespins Wins: ${criteriaSummary.fsWins}\n`
        output += `    RTP (unoptimized): ${criteriaSummary.rtp}\n`
      }
    }

    console.log(output)

    writeFile(this.PATHS.simulationSummary, JSON.stringify(this.summary, null, 2))

    if (this.socket && this.panelActive) {
      this.socket.emit("simulationSummary", {
        summary: this.summary,
      })
    }
  }
}

export type SimulationOptions = {
  /**
   * Object containing the game modes and their respective simulation runs amount.
   */
  simRunsAmount: Record<string, number>
  /**
   * Number of concurrent processes to use for simulations.
   *
   * Default: 6
   */
  concurrency?: number
  /**
   * The maximum number of simulation results to keep pending in memory before writing to disk.
   *
   * Higher values may speed up simulations but use more RAM.
   *
   * Default: 250
   */
  maxPendingSims?: number
  /**
   * The maximum data buffer in MB for writing simulation results to disk.
   *
   * Higher values may speed up simulations but use more RAM.
   *
   * Default: 50
   */
  maxDiskBuffer?: number
}

export type SimulationConfigOptions = {
  debug?: boolean
  panelPort?: number
}

export type SimulationSummary = Record<
  string,
  {
    total: {
      numSims: number
      bsWins: number
      fsWins: number
      rtp: number
    }
    criteria: Record<
      string,
      {
        numSims: number
        bsWins: number
        fsWins: number
        rtp: number
      }
    >
  }
>
