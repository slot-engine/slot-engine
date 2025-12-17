import {
  createGameConfig,
  GameConfig,
  GameConfigOptions,
  GameMetadata,
} from "../game-config"
import { createGameState, GameState } from "../game-state"
import { Recorder } from "../recorder"
import { BoardService } from "../service/board"
import { DataService } from "../service/data"
import { GameService } from "../service/game"
import { RngService } from "../service/rng"
import { WalletService } from "../service/wallet"
import { AnyGameModes, AnySymbols, AnyUserData } from "../types"

export interface GameContextOptions<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
> {
  config: GameConfig<TGameModes, TSymbols, TUserState> & GameMetadata
  state?: Partial<GameState<TUserState>>
  services?: Partial<GameContextServices>
}

export function createGameContext<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
>(opts: GameContextOptions<TGameModes, TSymbols, TUserState>) {
  const context = {
    config: opts.config,
    state: createGameState(opts.state),
    services: {} as GameContextServices,
  }

  const getContext = () => context

  function createServices() {
    return {
      game: new GameService(getContext),
      data: new DataService(getContext),
      board: new BoardService(getContext),
      wallet: new WalletService(getContext),
      rng: new RngService(getContext),
      ...opts.services,
    }
  }

  context.services = createServices()

  return context
}

export type GameContext<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> = {
  /**
   * The static configuration of the game.
   */
  config: GameConfig<TGameModes, TSymbols, TUserState>
  /**
   * Game state holding information about the current simulation.
   */
  state: GameState<TUserState>
  /**
   * Services providing game functionality.
   */
  services: GameContextServices
}

export interface GameContextServices {
  /**
   * Service providing common utility functions.
   */
  game: GameService
  /**
   * Service for interacting with the book data or recorder.
   */
  data: DataService
  /**
   * Service managing the game board and reels.
   */
  board: BoardService
  /**
   * Service providing win related functionality.
   */
  wallet: WalletService
  /**
   * Service for seeded random number generation.
   */
  rng: RngService
}

/**
 * Intended for testing purposes only.\
 * Creates a game context with a minimal configuration.
 */
export function createTestContext(opts?: Partial<GameConfigOptions>) {
  const { config, metadata } = createGameConfig({
    id: "",
    name: "",
    gameModes: {},
    symbols: {},
    scatterToFreespins: {},
    maxWinX: 10000,
    hooks: {
      onHandleGameFlow() {},
    },
    ...opts,
  })

  const ctx = createGameContext({
    config: { ...config, ...metadata },
  })

  // it needs a recorder to work properly
  ctx.services.data._setRecorder(new Recorder())

  return ctx
}
