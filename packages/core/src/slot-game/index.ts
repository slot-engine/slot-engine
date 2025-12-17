import { AnyGameModes, AnySymbols, AnyUserData } from "../types"
import { createGameConfig, GameConfigOptions } from "../game-config"
import { Simulation, SimulationConfigOptions, SimulationOptions } from "../simulation"
import { Analysis, AnalysisOpts } from "../analysis"
import { OptimizationOpts, Optimizer, OptimizerOpts } from "../optimizer"
import { isMainThread } from "worker_threads"

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
  private async runAnalysis(opts: AnalysisOpts) {
    if (!this.optimizer) {
      throw new Error(
        "Optimization must be configured to run analysis. Do so by calling configureOptimization() first.",
      )
    }
    this.analyzer = new Analysis(this.optimizer)
    await this.analyzer.runAnalysis(opts.gameModes)
  }

  /**
   * Runs the configured tasks: simulation, optimization, and/or analysis.
   */
  async runTasks(
    opts: {
      doSimulation?: boolean
      doOptimization?: boolean
      doAnalysis?: boolean
      simulationOpts?: SimulationConfigOptions
      optimizationOpts?: OptimizationOpts
      analysisOpts?: AnalysisOpts
    } = {},
  ) {
    if (!opts.doSimulation && !opts.doOptimization && !opts.doAnalysis) {
      console.log("No tasks to run. Enable either simulation, optimization or analysis.")
    }

    if (opts.doSimulation) {
      await this.runSimulation(opts.simulationOpts || {})
    }

    if (opts.doOptimization) {
      await this.runOptimization(opts.optimizationOpts || { gameModes: [] })
    }

    if (opts.doAnalysis) {
      await this.runAnalysis(opts.analysisOpts || { gameModes: [] })
    }

    if (isMainThread) console.log("Finishing up...")
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
}
