import {
  GameConfig,
  GameMode,
  GameSymbol,
  InferGameType,
  OptimizationConditions,
  OptimizationParameters,
  OptimizationScaling,
  ResultSet,
  createSlotGame,
  defineGameModes,
  defineSymbols,
  defineUserState,
} from "@slot-engine/core"
import { GENERATORS } from "./src/reels"
import { onHandleGameFlow } from "./src/onHandleGameFlow"
import {
  freeSpinsUpgradeEvaluation,
  maxwinReelsEvaluation,
  superFreespinsReelsEvaluation,
  upgradeIntoMaxwinReelsEvaluation,
} from "./src/evaluations"

export const userState = defineUserState({
  triggeredSuperFreespins: false,
  freespinsUpgradedToSuper: false,
})

export type UserStateType = typeof userState

export const symbols = defineSymbols({
  S: new GameSymbol({
    id: "S",
    properties: {
      isScatter: true,
    },
  }),
  SS: new GameSymbol({
    id: "SS",
    properties: {
      isScatter: true,
      isSuperScatter: true,
    },
  }),
  W: new GameSymbol({
    id: "W",
    properties: {
      isWild: true,
    },
  }),
  H1: new GameSymbol({
    id: "H1",
    pays: {
      3: 10,
      4: 75,
      5: 250,
    },
  }),
  H2: new GameSymbol({
    id: "H2",
    pays: {
      3: 7,
      4: 35,
      5: 150,
    },
  }),
  H3: new GameSymbol({
    id: "H3",
    pays: {
      3: 4,
      4: 10,
      5: 50,
    },
  }),
  H4: new GameSymbol({
    id: "H4",
    pays: {
      3: 3,
      4: 5,
      5: 10,
    },
  }),
  L1: new GameSymbol({
    id: "L1",
    pays: {
      3: 1,
      4: 2,
      5: 4,
    },
  }),
  L2: new GameSymbol({
    id: "L2",
    pays: {
      3: 0.8,
      4: 1.2,
      5: 2,
    },
  }),
  L3: new GameSymbol({
    id: "L3",
    pays: {
      3: 0.6,
      4: 1,
      5: 1.5,
    },
  }),
  L4: new GameSymbol({
    id: "L4",
    pays: {
      3: 0.5,
      4: 0.7,
      5: 1,
    },
  }),
  L5: new GameSymbol({
    id: "L5",
    pays: {
      3: 0.2,
      4: 0.5,
      5: 0.8,
    },
  }),
})

export type SymbolsType = typeof symbols

export const gameModes = defineGameModes({
  base: new GameMode({
    name: "base",
    cost: 1,
    rtp: 0.96,
    reelsAmount: 5,
    symbolsPerReel: [3, 3, 3, 3, 3],
    isBonusBuy: false,
    reelSets: [...Object.values(GENERATORS)],
    resultSets: [
      new ResultSet({
        criteria: "0",
        quota: 0.4,
        multiplier: 0,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
          [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 1 },
        },
      }),
      new ResultSet({
        criteria: "basegame",
        quota: 0.4,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
          [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 1 },
        },
      }),
      new ResultSet({
        criteria: "freespins",
        quota: 0.1,
        forceFreespins: true,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
          [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 3, bonus2: 1 },
        },
      }),
      new ResultSet({
        criteria: "freespinsUpgradeToSuper",
        quota: 0.01,
        forceFreespins: true,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
          [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 3, bonus2: 1 },
          evaluate: superFreespinsReelsEvaluation,
        },
        userData: { upgradeFreespins: true },
        evaluate: freeSpinsUpgradeEvaluation,
      }),
      new ResultSet({
        criteria: "superFreespins",
        quota: 0.01,
        forceFreespins: true,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
          [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 3, bonus2: 1 },
          evaluate: superFreespinsReelsEvaluation,
        },
        userData: { forceSuperFreespins: true },
      }),
      new ResultSet({
        criteria: "freespinsUpgradeToSuperMaxwin",
        quota: 0.0005,
        forceMaxWin: true,
        forceFreespins: true,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
          [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 1, bonus2: 3 },
          evaluate: upgradeIntoMaxwinReelsEvaluation,
        },
        userData: { upgradeFreespins: true },
        evaluate: freeSpinsUpgradeEvaluation,
      }),
      new ResultSet({
        criteria: "maxwin",
        quota: 0.0005,
        forceMaxWin: true,
        forceFreespins: true,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
          [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 1, bonus2: 3 },
          evaluate: maxwinReelsEvaluation,
        },
        userData: { forceSuperFreespins: true },
      }),
    ],
  }),
  bonus: new GameMode({
    name: "bonus",
    cost: 70,
    rtp: 0.96,
    reelsAmount: 5,
    symbolsPerReel: [3, 3, 3, 3, 3],
    isBonusBuy: true,
    reelSets: [...Object.values(GENERATORS)],
    resultSets: [
      new ResultSet({
        criteria: "freespins",
        quota: 0.9,
        forceFreespins: true,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
          [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 3, bonus2: 1 },
        },
      }),
      new ResultSet({
        criteria: "freespinsUpgradeToSuper",
        quota: 0.05,
        forceFreespins: true,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
          [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 1, bonus2: 2 },
          evaluate: superFreespinsReelsEvaluation,
        },
        userData: { upgradeFreespins: true },
        evaluate: freeSpinsUpgradeEvaluation,
      }),
      new ResultSet({
        criteria: "freespinsUpgradeToSuperMaxwin",
        quota: 0.005,
        forceMaxWin: true,
        forceFreespins: true,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
          [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 1, bonus2: 3 },
          evaluate: upgradeIntoMaxwinReelsEvaluation,
        },
        userData: { upgradeFreespins: true },
        evaluate: freeSpinsUpgradeEvaluation,
      }),
    ],
  }),
})

export type GameModesType = typeof gameModes

export type GameType = InferGameType<GameModesType, SymbolsType, UserStateType>

export const game = createSlotGame<GameType>({
  id: "example-01",
  name: "Example Lines Game",
  maxWinX: 2000,
  gameModes,
  symbols,
  padSymbols: 1,
  scatterToFreespins: {
    [GameConfig.SPIN_TYPE.BASE_GAME]: {
      3: 10,
      4: 12,
      5: 15,
    },
    [GameConfig.SPIN_TYPE.FREE_SPINS]: {
      3: 6,
      4: 8,
      5: 10,
    },
  },
  userState,
  hooks: {
    onHandleGameFlow,
  },
})

game.configureSimulation({
  simRunsAmount: {
    base: 100000,
    bonus: 100000,
  },
  concurrency: 16,
})

game.configureOptimization({
  gameModes: {
    base: {
      conditions: {
        freespinsUpgradeToSuperMaxwin: new OptimizationConditions({
          rtp: 0.002,
          avgWin: 2000,
          searchConditions: {
            criteria: "freespinsUpgradeToSuperMaxwin",
          },
          priority: 10,
        }),
        maxwin: new OptimizationConditions({
          rtp: 0.008,
          avgWin: 2000,
          searchConditions: {
            criteria: "maxwin",
          },
          priority: 8,
        }),
        "0": new OptimizationConditions({
          rtp: 0,
          avgWin: 0,
          searchConditions: 0,
          priority: 6,
        }),
        freespinsUpgradeToSuper: new OptimizationConditions({
          rtp: 0.03,
          hitRate: 500,
          searchConditions: {
            criteria: "freespinsUpgradeToSuper",
          },
          priority: 4,
        }),
        superFreespins: new OptimizationConditions({
          rtp: 0.02,
          hitRate: 500,
          searchConditions: {
            criteria: "superFreespins",
          },
          priority: 3,
        }),
        freespins: new OptimizationConditions({
          rtp: 0.38,
          hitRate: 150,
          searchConditions: {
            criteria: "freespins",
          },
          priority: 2,
        }),
        basegame: new OptimizationConditions({
          rtp: 0.52,
          hitRate: 4,
          priority: 1,
        }),
      },
      scaling: new OptimizationScaling([]),
      parameters: new OptimizationParameters(),
    },
    bonus: {
      conditions: {
        freespinsUpgradeToSuperMaxwin: new OptimizationConditions({
          rtp: 0.06,
          avgWin: 2000,
          searchConditions: {
            criteria: "freespinsUpgradeToSuperMaxwin",
          },
          priority: 10,
        }),
        freespinsUpgradeToSuper: new OptimizationConditions({
          rtp: 0.2,
          hitRate: 50,
          searchConditions: {
            criteria: "freespinsUpgradeToSuper",
          },
          priority: 5,
        }),
        freespins: new OptimizationConditions({
          rtp: 0.7,
          hitRate: "x",
          searchConditions: {
            criteria: "freespins",
          },
          priority: 1,
        }),
      },
      scaling: new OptimizationScaling([]),
      parameters: new OptimizationParameters(),
    },
  },
})

game.runTasks({
  doSimulation: true,
  doOptimization: true,
  optimizationOpts: {
    gameModes: ["base"],
  },
  doAnalysis: true,
  analysisOpts: {
    gameModes: ["base"],
  },
})
