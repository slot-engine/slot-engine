import { AnyGameModes, AnySymbols, AnyUserData } from "../types"
import { createGameConfig, GameConfigOptions } from "../game-config"
import { Simulation, SimulationConfigOptions, SimulationOptions } from "../simulation"
import { Analysis, AnalysisOpts } from "../analysis"
import { OptimizationOpts, Optimizer, OptimizerOpts } from "../optimizer"
import { isMainThread, workerData } from "worker_threads"
import { CLI_ARGS } from "../constants"

/**
 * SlotGame class that encapsulates the game configuration and state.\
 * Main entry point for the slot game.
 */
export class SlotGame<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> {
  private readonly configOpts: GameConfigOptions<TGameModes, TSymbols, TUserState>
  private simulation?: Simulation
  private optimizer?: Optimizer
  private analyzer?: Analysis

  constructor(config: GameConfigOptions<TGameModes, TSymbols, TUserState>) {
    this.configOpts = config
  }

  /**
   * Sets up the simulation configuration.\
   * Must be called before `runTasks()`.
   */
  configureSimulation(opts: SimulationOptions) {
    // @ts-ignore TODO: Fix type errors with AnyTypes
    this.simulation = new Simulation(opts, this.configOpts)
  }

  /**
   * Sets up the optimization configuration.\
   * Must be called before `runTasks()`.
   */
  configureOptimization(opts: Pick<OptimizerOpts, "gameModes">) {
    this.optimizer = new Optimizer({
      game: this,
      gameModes: opts.gameModes,
    })
  }

  /**
   * Runs the simulation based on the configured settings.
   */
  private async runSimulation(opts: SimulationConfigOptions = {}) {
    if (!this.simulation) {
      throw new Error(
        "Simulation is not configured. Do so by calling configureSimulation() first.",
      )
    }
    await this.simulation.runSimulation(opts)
  }

  /**
   * Runs the optimization based on the configured settings.
   */
  private async runOptimization(opts: OptimizationOpts) {
    if (!this.optimizer) {
      throw new Error(
        "Optimization is not configured. Do so by calling configureOptimization() first.",
      )
    }

    await this.optimizer.runOptimization(opts)
  }

  /**
   * Runs the analysis based on the configured settings.
   */
  private runAnalysis(opts: AnalysisOpts) {
    this.analyzer = new Analysis(this)
    this.analyzer.runAnalysis(opts)
  }

  /**
   * Runs the configured tasks: simulation, optimization, and/or analysis.
   */
  async runTasks(opts: TaskOptions = {}) {
    if (isMainThread && !opts._internal_ignore_args) {
      const [{ default: yargs }, { hideBin }] = await Promise.all([
        import("yargs"),
        import("yargs/helpers"),
      ])

      // Require flag to run tasks. This is needed to prevent accidental runs
      // e.g. when importing a game for usage with Panel.
      const argvParser = yargs(hideBin(process.argv)).options({
        [CLI_ARGS.RUN]: { type: "boolean", default: false },
      })
      const argv = await argvParser.parse()

      if (!argv[CLI_ARGS.RUN]) return
    }

    // Force simulation if running in a worker thread spawned for simulation
    // This allows the panel to run simulations even if doSimulation is set to false in the game file
    if (
      !isMainThread &&
      workerData &&
      typeof workerData === "object" &&
      "simStart" in workerData
    ) {
      opts.doSimulation = true
    }

    if (!opts.doSimulation && !opts.doOptimization && !opts.doAnalysis) {
      console.log("No tasks to run. Enable either simulation, optimization or analysis.")
    }

    if (opts.doSimulation) {
      await this.runSimulation(opts.simulationOpts || {})
    }

    if (opts.doAnalysis) {
      this.runAnalysis(opts.analysisOpts || { gameModes: [] })
    }

    if (opts.doOptimization) {
      await this.runOptimization(opts.optimizationOpts || { gameModes: [] })

      // Run analysis again because LUTs have changed
      if (opts.doAnalysis) {
        this.runAnalysis(opts.analysisOpts || { gameModes: [] })
      }
    }

    if (isMainThread) console.log("Done!")
  }

  /**
   * Gets the game configuration.
   */
  getConfig() {
    return createGameConfig(this.configOpts).config
  }

  getMetadata() {
    return createGameConfig(this.configOpts).metadata
  }

  clone() {
    return new SlotGame<TGameModes, TSymbols, TUserState>(this.configOpts)
  }
}

interface TaskOptions {
  _internal_ignore_args?: boolean
  doSimulation?: boolean
  doOptimization?: boolean
  doAnalysis?: boolean
  simulationOpts?: SimulationConfigOptions
  optimizationOpts?: OptimizationOpts
  analysisOpts?: AnalysisOpts
}

export type SlotGameType<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> = SlotGame<TGameModes, TSymbols, TUserState>
