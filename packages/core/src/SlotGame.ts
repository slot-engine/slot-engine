import { AnyGameModes, AnySymbols, AnyUserData, CommonGameOptions } from ".."
import { GameConfig } from "./GameConfig"
import { Simulation, SimulationConfigOpts, SimulationOpts } from "./Simulation"
import { OptimizationOpts, Optimizer, OptimizerOpts } from "./optimizer"

/**
 * SlotGame class that encapsulates the game configuration and state.\
 * Main entry point for the slot game.
 */
export class SlotGame<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> {
  private readonly gameConfigOpts: CommonGameOptions<TGameModes, TSymbols, TUserState>
  private simulation?: Simulation
  private optimizer?: Optimizer

  constructor(config: CommonGameOptions<TGameModes, TSymbols, TUserState>) {
    this.gameConfigOpts = config
  }

  /**
   * Sets up the simulation configuration.\
   * Must be called before `runTasks()`.
   */
  configureSimulation(opts: SimulationConfigOpts) {
    this.simulation = new Simulation(opts, this.gameConfigOpts as any)
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
  private async runSimulation(opts: SimulationOpts = {}) {
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

  async runTasks(
    opts: {
      debug?: boolean
      doSimulation?: boolean
      doOptimization?: boolean
      simulationOpts?: SimulationOpts
      optimizationOpts?: OptimizationOpts
    } = {},
  ) {
    if (!opts.doSimulation && !opts.doOptimization) {
      console.log("No tasks to run. Enable simulation and/or optimization.")
    }

    if (opts.doSimulation) {
      await this.runSimulation({ debug: opts.debug })
    }

    if (opts.doOptimization) {
      await this.runOptimization(opts.optimizationOpts || { gameModes: [] })
    }
  }

  /**
   * Gets the game configuration.
   */
  getConfig() {
    return new GameConfig(this.gameConfigOpts)
  }
}
